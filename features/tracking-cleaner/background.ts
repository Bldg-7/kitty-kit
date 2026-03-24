import { browser } from 'wxt/browser';
import { getAllParams } from './rules';
import * as store from './storage';

const RULE_ID_START = 1;
const RULE_ID_MAX = 999;

async function getActiveParams(): Promise<string[]> {
  const [cats, custom] = await Promise.all([
    store.categoryStates.getValue(),
    store.customParams.getValue(),
  ]);
  return getAllParams(cats, custom);
}

async function getExcludedDomains(): Promise<string[]> {
  return store.excludedDomains.getValue();
}

async function applyDeclarativeNetRequestRules() {
  const params = await getActiveParams();
  const excluded = await getExcludedDomains();

  const existingRules = await browser.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existingRules
    .filter((r) => r.id >= RULE_ID_START && r.id <= RULE_ID_MAX)
    .map((r) => r.id);

  const addRules = params.length > 0 ? [{
    id: RULE_ID_START,
    priority: 1,
    action: {
      type: 'redirect' as const,
      redirect: {
        transform: {
          queryTransform: {
            removeParams: params,
          },
        },
      },
    },
    condition: {
      resourceTypes: ['main_frame' as const],
      ...(excluded.length > 0
        ? { excludedRequestDomains: excluded }
        : {}),
    },
  }] : [];

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: addRules as any[],
  });
}

function webRequestListener(
  details: Browser.webRequest.OnBeforeRequestDetails,
): Browser.webRequest.BlockingResponse | undefined {
  if (details.type !== 'main_frame') return;

  // Use synchronous approach for Firefox webRequest blocking
  const url = new URL(details.url);

  // We'll check params synchronously using a cached list
  // The actual param list is updated when settings change
  const cachedParams = getCachedParams();
  const cachedExcluded = getCachedExcluded();

  if (cachedExcluded.includes(url.hostname)) return;

  let modified = false;
  for (const param of cachedParams) {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      modified = true;
    }
  }

  if (modified) {
    store.cleanCount.getValue().then((count) => {
      store.cleanCount.setValue(count + 1);
    });
    return { redirectUrl: url.toString() };
  }
}

let _cachedParams: string[] = [];
let _cachedExcluded: string[] = [];

function getCachedParams(): string[] { return _cachedParams; }
function getCachedExcluded(): string[] { return _cachedExcluded; }

async function refreshCache() {
  _cachedParams = await getActiveParams();
  _cachedExcluded = await getExcludedDomains();
}

function applyWebRequestRules() {
  refreshCache();
  const filterUrls = { urls: ['<all_urls>'] };

  if (browser.webRequest?.onBeforeRequest?.hasListener(webRequestListener)) {
    browser.webRequest.onBeforeRequest.removeListener(webRequestListener);
  }
  browser.webRequest?.onBeforeRequest?.addListener(
    webRequestListener,
    filterUrls,
    ['blocking'],
  );
}

export async function enable() {
  const isChrome = typeof browser.declarativeNetRequest?.updateDynamicRules === 'function';

  if (isChrome) {
    await applyDeclarativeNetRequestRules();
    store.categoryStates.watch(() => applyDeclarativeNetRequestRules());
    store.customParams.watch(() => applyDeclarativeNetRequestRules());
    store.excludedDomains.watch(() => applyDeclarativeNetRequestRules());
  } else {
    applyWebRequestRules();
    store.categoryStates.watch(() => { refreshCache(); applyWebRequestRules(); });
    store.customParams.watch(() => { refreshCache(); applyWebRequestRules(); });
    store.excludedDomains.watch(() => { refreshCache(); applyWebRequestRules(); });
  }
}

export async function disable() {
  const existingRules = await browser.declarativeNetRequest?.getDynamicRules?.();
  if (existingRules) {
    const removeRuleIds = existingRules
      .filter((r) => r.id >= RULE_ID_START && r.id <= RULE_ID_MAX)
      .map((r) => r.id);
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: [],
    });
  }

  if (browser.webRequest?.onBeforeRequest?.hasListener(webRequestListener)) {
    browser.webRequest.onBeforeRequest.removeListener(webRequestListener);
  }
}
