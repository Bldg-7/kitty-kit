import { browser } from 'wxt/browser';
import * as store from './storage';
import type { Profile, Rule, HeaderAction } from './types';

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
        ...(rule.urlPattern && rule.urlPattern !== '<all_urls>'
          ? { urlFilter: rule.urlPattern }
          : {}),
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

let _cachedRules: Rule[] = [];

async function refreshRuleCache() {
  const allProfiles = await store.profiles.getValue();
  _cachedRules = getActiveRules(allProfiles);
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

  for (const rule of _cachedRules) {
    if (rule.urlPattern && rule.urlPattern !== '<all_urls>') {
      if (!details.url.includes(rule.urlPattern.replace(/\*/g, ''))) continue;
    }

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

  for (const rule of _cachedRules) {
    if (rule.urlPattern && rule.urlPattern !== '<all_urls>') {
      if (!details.url.includes(rule.urlPattern.replace(/\*/g, ''))) continue;
    }

    for (const action of rule.headers) {
      if (action.direction !== 'response') continue;
      headers = applyHeaderAction(headers as any[], action) as any;
    }
  }

  return { responseHeaders: headers };
}

function applyWebRequestRules() {
  refreshRuleCache();
  const filter = { urls: ['<all_urls>'] };

  if (browser.webRequest?.onBeforeSendHeaders?.hasListener(requestHeaderListener)) {
    browser.webRequest.onBeforeSendHeaders.removeListener(requestHeaderListener);
  }
  if (browser.webRequest?.onHeadersReceived?.hasListener(responseHeaderListener)) {
    browser.webRequest.onHeadersReceived.removeListener(responseHeaderListener);
  }

  browser.webRequest?.onBeforeSendHeaders?.addListener(
    requestHeaderListener,
    filter,
    ['blocking', 'requestHeaders'],
  );
  browser.webRequest?.onHeadersReceived?.addListener(
    responseHeaderListener,
    filter,
    ['blocking', 'responseHeaders'],
  );
}

export async function enable() {
  const isChrome = typeof browser.declarativeNetRequest?.updateDynamicRules === 'function';

  if (isChrome) {
    await applyDeclarativeNetRequestRules();
    store.profiles.watch(() => applyDeclarativeNetRequestRules());
  } else {
    applyWebRequestRules();
    store.profiles.watch(() => { refreshRuleCache(); applyWebRequestRules(); });
  }
}

export async function disable() {
  const existingRules = await browser.declarativeNetRequest?.getDynamicRules?.();
  if (existingRules) {
    const removeRuleIds = existingRules
      .filter((r) => r.id >= RULE_ID_START)
      .map((r) => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
  }

  if (browser.webRequest?.onBeforeSendHeaders?.hasListener(requestHeaderListener)) {
    browser.webRequest.onBeforeSendHeaders.removeListener(requestHeaderListener);
  }
  if (browser.webRequest?.onHeadersReceived?.hasListener(responseHeaderListener)) {
    browser.webRequest.onHeadersReceived.removeListener(responseHeaderListener);
  }
}
