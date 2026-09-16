import { browser } from 'wxt/browser';
import * as store from './storage';
import type { Profile, Rule, HeaderAction, UrlMatchType } from './types';

const RULE_ID_START = 1000;

function getActiveRules(profiles: Profile[]): Rule[] {
  return profiles
    .filter((p) => p.enabled)
    .flatMap((p) => p.rules.filter((r) => r.enabled));
}

function toResourceType(t: string): string {
  const map: Record<string, string> = {
    main_frame: 'main_frame',
    sub_frame: 'sub_frame',
    stylesheet: 'stylesheet',
    script: 'script',
    image: 'image',
    font: 'font',
    xmlhttprequest: 'xmlhttprequest',
    ping: 'ping',
    media: 'media',
    websocket: 'websocket',
    other: 'other',
  };
  return map[t] ?? t;
}

// The resource types a rule applies to. Both dispatch paths read this so a
// rule covers the same requests in either build: an unset or empty list means
// main_frame only.
function getResourceTypes(rule: Rule): string[] {
  return rule.resourceTypes && rule.resourceTypes.length > 0
    ? rule.resourceTypes.map(toResourceType)
    : ['main_frame'];
}

// A pattern written as a bare origin ('https://example.com') would never match
// on its own: the browser normalizes every request URL to carry a path, so the
// URL seen here is always 'https://example.com/'. Normalize the pattern the same
// way so both spellings mean the same rule. A pattern that is not an absolute
// URL is matched verbatim.
function normalizeUrlPattern(pattern: string): string {
  try {
    return new URL(pattern).href;
  } catch {
    return pattern;
  }
}

// Firefox reports a couple of request types under names the
// declarativeNetRequest vocabulary -- which rules are written in -- spells
// differently. Accept either spelling so one rule covers the same requests in
// both builds.
const RESOURCE_TYPE_ALIASES: Record<string, string> = {
  beacon: 'ping',
  imageset: 'image',
};

function coversResourceType(types: Set<string>, type: string): boolean {
  return types.has(type) || types.has(RESOURCE_TYPE_ALIASES[type] ?? '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isMatchAllPattern(pattern: string): boolean {
  return !pattern || pattern === '<all_urls>';
}

function getUrlMatchType(rule: Rule): UrlMatchType {
  return rule.urlMatchType ?? 'wildcard';
}

function buildDnrUrlCondition(rule: Rule): Record<string, string> {
  if (isMatchAllPattern(rule.urlPattern)) return {};
  switch (getUrlMatchType(rule)) {
    case 'equals':
      return { regexFilter: '^' + escapeRegex(normalizeUrlPattern(rule.urlPattern)) + '$' };
    case 'contains':
      return { regexFilter: escapeRegex(rule.urlPattern) };
    case 'wildcard':
      return { urlFilter: rule.urlPattern };
    case 'regex':
      return { regexFilter: rule.urlPattern };
  }
}

function buildUrlMatcher(rule: Rule): (url: string) => boolean {
  if (isMatchAllPattern(rule.urlPattern)) return () => true;
  switch (getUrlMatchType(rule)) {
    case 'equals': {
      const target = normalizeUrlPattern(rule.urlPattern);
      return (url) => url === target;
    }
    case 'contains':
      return (url) => url.includes(rule.urlPattern);
    case 'wildcard': {
      // Chrome's declarativeNetRequest urlFilter matches the pattern as a
      // substring of the URL. Anchoring it here made the same rule match
      // nothing in the Firefox build ('example.com' or 'https://example.com'
      // never matched any request), so leave it unanchored; '*' still spans
      // any run of characters.
      const re = new RegExp(escapeRegex(rule.urlPattern).replace(/\\\*/g, '.*'));
      return (url) => re.test(url);
    }
    case 'regex': {
      try {
        const re = new RegExp(rule.urlPattern);
        return (url) => re.test(url);
      } catch {
        return () => false;
      }
    }
  }
}

function headerActionToDNR(action: HeaderAction) {
  const base = { header: action.header.toLowerCase() };
  if (action.operation === 'remove') {
    return { ...base, operation: 'remove' as const };
  }
  if (action.operation === 'append') {
    return { ...base, operation: 'append' as const, value: action.value ?? '' };
  }
  return { ...base, operation: 'set' as const, value: action.value ?? '' };
}

async function applyDeclarativeNetRequestRules() {
  const allProfiles = await store.profiles.getValue();
  const rules = getActiveRules(allProfiles);

  const existingRules = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules
    .filter((r) => r.id >= RULE_ID_START)
    .map((r) => r.id);

  const addRules = rules
    .map((rule, i) => {
      const requestHeaders = rule.headers
        .filter((h) => h.direction === 'request' && h.header.trim() !== '')
        .map(headerActionToDNR);
      const responseHeaders = rule.headers
        .filter((h) => h.direction === 'response' && h.header.trim() !== '')
        .map(headerActionToDNR);

      // modifyHeaders requires at least one request or response header. A rule
      // whose header names are all blank would otherwise emit an invalid rule
      // and make updateDynamicRules reject the ENTIRE batch — silently
      // disabling every rule (and, without per-module isolation, later modules
      // too). Drop such rules instead.
      if (requestHeaders.length === 0 && responseHeaders.length === 0) {
        return null;
      }

      const dnrRule: any = {
        id: RULE_ID_START + i,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          ...(requestHeaders.length > 0 ? { requestHeaders } : {}),
          ...(responseHeaders.length > 0 ? { responseHeaders } : {}),
        },
        condition: {
          ...buildDnrUrlCondition(rule),
          resourceTypes: getResourceTypes(rule),
        },
      };

      return dnrRule;
    })
    .filter((r) => r !== null);

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}

type CompiledRule = {
  rule: Rule;
  matches: (url: string) => boolean;
  types: Set<string>;
};

let _cachedRules: CompiledRule[] = [];

async function refreshRuleCache() {
  const allProfiles = await store.profiles.getValue();
  _cachedRules = getActiveRules(allProfiles).map((rule) => ({
    rule,
    matches: buildUrlMatcher(rule),
    types: new Set(getResourceTypes(rule)),
  }));
}

function applyHeaderAction(
  headers: Array<{ name: string; value?: string }>,
  action: HeaderAction,
): Array<{ name: string; value?: string }> {
  const lowerName = action.header.toLowerCase();

  switch (action.operation) {
    case 'remove':
      return headers.filter((h) => h.name.toLowerCase() !== lowerName);
    case 'set': {
      const filtered = headers.filter((h) => h.name.toLowerCase() !== lowerName);
      filtered.push({ name: action.header, value: action.value ?? '' });
      return filtered;
    }
    case 'append':
      headers.push({ name: action.header, value: action.value ?? '' });
      return headers;
  }
}

function requestHeaderListener(
  details: Browser.webRequest.OnBeforeSendHeadersDetails,
): Browser.webRequest.BlockingResponse | undefined {
  let headers = details.requestHeaders ?? [];
  let modified = false;

  for (const { rule, matches, types } of _cachedRules) {
    // The webRequest filter cannot express per-rule resource types, so apply
    // the rule's own list here — otherwise every rule fired on every request.
    if (!coversResourceType(types, details.type)) continue;
    if (!matches(details.url)) continue;

    for (const action of rule.headers) {
      if (action.direction !== 'request') continue;
      if (action.header.trim() === '') continue;
      headers = applyHeaderAction(headers as any[], action) as any;
      modified = true;
    }
  }

  // Don't flag every request as header-modified when nothing matched — return
  // undefined so non-matching requests pass through untouched.
  return modified ? { requestHeaders: headers } : undefined;
}

function responseHeaderListener(
  details: Browser.webRequest.OnHeadersReceivedDetails,
): Browser.webRequest.BlockingResponse | undefined {
  let headers = details.responseHeaders ?? [];
  let modified = false;

  for (const { rule, matches, types } of _cachedRules) {
    // The webRequest filter cannot express per-rule resource types, so apply
    // the rule's own list here — otherwise every rule fired on every request.
    if (!coversResourceType(types, details.type)) continue;
    if (!matches(details.url)) continue;

    for (const action of rule.headers) {
      if (action.direction !== 'response') continue;
      if (action.header.trim() === '') continue;
      headers = applyHeaderAction(headers as any[], action) as any;
      modified = true;
    }
  }

  return modified ? { responseHeaders: headers } : undefined;
}

function registerWebRequestListeners() {
  const filter = { urls: ['<all_urls>'] };

  if (!browser.webRequest.onBeforeSendHeaders.hasListener(requestHeaderListener)) {
    browser.webRequest.onBeforeSendHeaders.addListener(
      requestHeaderListener,
      filter,
      ['blocking', 'requestHeaders'],
    );
  }
  if (!browser.webRequest.onHeadersReceived.hasListener(responseHeaderListener)) {
    browser.webRequest.onHeadersReceived.addListener(
      responseHeaderListener,
      filter,
      ['blocking', 'responseHeaders'],
    );
  }
}

function unregisterWebRequestListeners() {
  if (browser.webRequest?.onBeforeSendHeaders?.hasListener(requestHeaderListener)) {
    browser.webRequest.onBeforeSendHeaders.removeListener(requestHeaderListener);
  }
  if (browser.webRequest?.onHeadersReceived?.hasListener(responseHeaderListener)) {
    browser.webRequest.onHeadersReceived.removeListener(responseHeaderListener);
  }
}

let _unwatchProfiles: (() => void) | null = null;

export async function enable() {
  if (import.meta.env.FIREFOX) {
    await refreshRuleCache();
    registerWebRequestListeners();
    _unwatchProfiles ??= store.profiles.watch(() => { refreshRuleCache(); });
  } else {
    await applyDeclarativeNetRequestRules();
    _unwatchProfiles ??= store.profiles.watch(() => { applyDeclarativeNetRequestRules(); });
  }
}

export async function disable() {
  _unwatchProfiles?.();
  _unwatchProfiles = null;

  if (import.meta.env.FIREFOX) {
    unregisterWebRequestListeners();
    return;
  }

  const existingRules = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules
    .filter((r) => r.id >= RULE_ID_START)
    .map((r) => r.id);
  if (removeRuleIds.length > 0) {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
  }
}
