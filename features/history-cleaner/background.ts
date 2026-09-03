import { browser } from 'wxt/browser';
import * as store from './storage';

const ALARM_NAME = 'history-cleaner';

// history.search() caps its result set (and sorts it newest-first). Deletion
// itself does not depend on the search (deleteRange covers the whole span), so
// the cap only limits the reported counts and how many pages of a whitelisted
// domain can be enumerated per search.
const PAGE_SIZE = 10000;

function isWhitelisted(url: string, wl: string[]): boolean {
  if (wl.length === 0) return false;
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }
  return wl.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

async function searchOlderThan(cutoff: number) {
  return browser.history.search({
    text: '',
    startTime: 0,
    endTime: cutoff,
    maxResults: PAGE_SIZE,
  });
}

/**
 * Collects every visit time before `cutoff` that belongs to a whitelisted
 * domain. Pages are enumerated both from the generic cutoff search and from a
 * per-domain text search, so a whitelisted domain with more pages than one
 * search returns is still fully protected.
 */
async function collectProtectedVisitTimes(
  cutoff: number,
  wl: string[],
  seed: Browser.history.HistoryItem[],
): Promise<number[]> {
  const urls = new Set<string>();
  for (const item of seed) {
    if (item.url && isWhitelisted(item.url, wl)) urls.add(item.url);
  }
  for (const domain of wl) {
    const hits = await browser.history.search({
      text: domain,
      startTime: 0,
      endTime: cutoff,
      maxResults: PAGE_SIZE,
    });
    for (const item of hits) {
      if (item.url && isWhitelisted(item.url, wl)) urls.add(item.url);
    }
  }

  const times = new Set<number>();
  for (const url of urls) {
    const visits = await browser.history.getVisits({ url });
    for (const v of visits) {
      if (typeof v.visitTime === 'number' && v.visitTime <= cutoff) {
        times.add(Math.floor(v.visitTime));
      }
    }
  }
  return [...times].sort((a, b) => a - b);
}

/**
 * Deletes every visit in [0, cutoff] except those at the given (sorted, ms)
 * timestamps, by issuing deleteRange over the gaps between them. Firefox
 * treats endTime as inclusive and reports visit times truncated to the
 * millisecond, so a gap ends 1 ms before a protected visit and the next one
 * starts 1 ms after it; Chrome's endTime is exclusive, so the gap can end at
 * the protected time itself. A stray visit inside that 1 ms guard survives,
 * which real browsing never produces.
 */
async function deleteVisitsBeforeExcept(cutoff: number, protectedTimes: number[]): Promise<number> {
  let start = 0;
  let calls = 0;
  for (const t of protectedTimes) {
    const end = import.meta.env.FIREFOX ? t - 1 : t;
    if (end > start || (end === start && import.meta.env.FIREFOX)) {
      await browser.history.deleteRange({ startTime: start, endTime: end });
      calls++;
    }
    start = Math.max(start, t + 1);
  }
  if (start <= cutoff) {
    await browser.history.deleteRange({ startTime: start, endTime: cutoff });
    calls++;
  }
  return calls;
}

/**
 * Deletes visits made before `cutoff`. Only visits are removed: a page that
 * was visited again after the cutoff keeps those later visits, and pages on
 * whitelisted domains keep all of theirs.
 *
 * Deletion is done with `history.deleteRange()` rather than one
 * `history.deleteUrl()` per page: deleteUrl drops *every* visit of the page,
 * including ones after the cutoff, and per-URL deletion is slow in Firefox
 * (~10 ms each) and limited by the search result cap.
 *
 * Returns the number of (non-whitelisted) pages that had visits before the
 * cutoff, as reported by the capped search.
 */
async function deleteOlderThan(cutoff: number, wl: string[]): Promise<number> {
  const found = await searchOlderThan(cutoff);
  await store.lastDeleteCountCapped.setValue(found.length >= PAGE_SIZE);
  if (found.length === 0) return 0;

  if (wl.length === 0) {
    await browser.history.deleteRange({ startTime: 0, endTime: cutoff });
    return found.length;
  }

  const skipped = found.filter((item) => item.url && isWhitelisted(item.url, wl)).length;
  const protectedTimes = await collectProtectedVisitTimes(cutoff, wl, found);
  await deleteVisitsBeforeExcept(cutoff, protectedTimes);
  return found.length - skipped;
}

let inFlight: Promise<void> | null = null;

// `running` is persisted so the popup can show progress, which means a
// background restart mid-sweep (Chrome's MV3 service worker can be evicted)
// would otherwise leave it stuck at true and the "Run Now" button disabled.
// Nothing is in flight when this script (re)loads, so clear it here.
store.running.setValue(false).catch(() => {});

/**
 * Runs one cleanup. Concurrent calls (the startup run, the daily alarm and the
 * popup's "Run Now" can overlap) share the in-flight run instead of starting
 * duplicate sweeps over the same entries.
 */
function runCleanup(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    await store.running.setValue(true);
    try {
      const days = await store.retentionDays.getValue();
      const wl = await store.whitelist.getValue();
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      const cleaned = await deleteOlderThan(cutoff, wl);

      if (await store.clearSearchHistory.getValue()) {
        // Remembered search terms live in form history, which the extension
        // APIs only expose through browsingData and only as "everything" (the
        // `since` option filters newer-than, not older-than). since: 0 clears
        // all of it in both browsers.
        await browser.browsingData.removeFormData({ since: 0 });
      }

      await store.lastDeleteCount.setValue(cleaned);
      await store.lastError.setValue(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[kitty-kit] history-cleaner: cleanup failed', err);
      await store.lastError.setValue(message);
      throw err;
    } finally {
      await store.lastRun.setValue(Date.now());
      await store.running.setValue(false);
      inFlight = null;
    }
  })();
  return inFlight;
}

function handleAlarm(alarm: Browser.alarms.Alarm) {
  if (alarm.name === ALARM_NAME) {
    runCleanup().catch(() => {
      // Already recorded in storage and the console by runCleanup.
    });
  }
}

export async function enable() {
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });

  // Register the alarm handler at most once — enable() can run again on every
  // re-enable / background restart, and duplicate listeners would run the
  // cleanup multiple times per alarm.
  if (!browser.alarms.onAlarm.hasListener(handleAlarm)) {
    browser.alarms.onAlarm.addListener(handleAlarm);
  }

  await runCleanup();
}

export async function disable() {
  if (browser.alarms.onAlarm.hasListener(handleAlarm)) {
    browser.alarms.onAlarm.removeListener(handleAlarm);
  }
  await browser.alarms.clear(ALARM_NAME);
}

export { runCleanup };
