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
      return { regexFilter: '^' + escapeRegex(rule.urlPattern) + '$' };
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
    case 'equals':
      return (url) => url === rule.urlPattern;
    case 'contains':
      return (url) => url.includes(rule.urlPattern);
    case 'wildcard': {
      const re = new RegExp('^' + escapeRegex(rule.urlPattern).replace(/\\\*/g, '.*') + '$');
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

  const addRules = rules.map((rule, i) => {
    const requestHeaders = rule.headers
      .filter((h) => h.direction === 'request')
      .map(headerActionToDNR);
    const responseHeaders = rule.headers
      .filter((h) => h.direction === 'response')
      .map(headerActionToDNR);

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
        ...(rule.resourceTypes && rule.resourceTypes.length > 0
          ? { resourceTypes: rule.resourceTypes.map(toResourceType) }
          : { resourceTypes: ['main_frame'] }),
      },
    };

    return dnrRule;
  });

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}

type CompiledRule = {
  rule: Rule;
  matches: (url: string) => boolean;
};

let _cachedRules: CompiledRule[] = [];

async function refreshRuleCache() {
  const allProfiles = await store.profiles.getValue();
  _cachedRules = getActiveRules(allProfiles).map((rule) => ({
    rule,
    matches: buildUrlMatcher(rule),
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

  for (const { rule, matches } of _cachedRules) {
    if (!matches(details.url)) continue;

    for (const action of rule.headers) {
      if (action.direction !== 'request') continue;
      headers = applyHeaderAction(headers as any[], action) as any;
    }
  }

  return { requestHeaders: headers };
}

function responseHeaderListener(
  details: Browser.webRequest.OnHeadersReceivedDetails,
): Browser.webRequest.BlockingResponse | undefined {
  let headers = details.responseHeaders ?? [];

  for (const { rule, matches } of _cachedRules) {
    if (!matches(details.url)) continue;

    for (const action of rule.headers) {
      if (action.direction !== 'response') continue;
      headers = applyHeaderAction(headers as any[], action) as any;
    }
  }

  return { responseHeaders: headers };
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

export async function enable() {
  if (import.meta.env.FIREFOX) {
    await refreshRuleCache();
    registerWebRequestListeners();
    store.profiles.watch(() => { refreshRuleCache(); });
  } else {
    await applyDeclarativeNetRequestRules();
    store.profiles.watch(() => applyDeclarativeNetRequestRules());
  }
}

export async function disable() {
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
