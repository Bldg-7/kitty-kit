import { browser } from 'wxt/browser';
import * as store from './storage';

const ALARM_NAME = 'history-cleaner';

// history.search() caps its result set (and sorts it newest-first), so a
// single search never sees more than this many old entries. A large Firefox
// profile — Firefox keeps years of history, unlike Chrome's 90-day expiry —
// can easily have far more than this, and the *oldest* entries would be the
// ones left over. Cleanup therefore keeps searching until nothing deletable is
// left instead of trusting one page of results.
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
 * Deletes visits older than `cutoff`, honouring the domain whitelist.
 *
 * - Without a whitelist, one `history.deleteRange()` call removes every visit
 *   in the range at once. This is exact (recent visits to the same URL are
 *   kept), has no result cap, and is far faster than per-URL deletion, which
 *   in Firefox costs on the order of 10 ms per URL.
 * - With a whitelist, entries must be inspected individually, so the search +
 *   `deleteUrl` sweep is repeated until a pass finds nothing left to delete.
 */
async function deleteOlderThan(cutoff: number, wl: string[]): Promise<number> {
  if (wl.length === 0) {
    const found = await searchOlderThan(cutoff);
    if (found.length === 0) {
      await store.lastDeleteCountCapped.setValue(false);
      return 0;
    }
    await browser.history.deleteRange({ startTime: 0, endTime: cutoff });
    // deleteRange itself has no cap, but the count comes from the capped
    // search, so flag it as a lower bound when the search was full.
    await store.lastDeleteCountCapped.setValue(found.length >= PAGE_SIZE);
    return found.length;
  }

  await store.lastDeleteCountCapped.setValue(false);
  let deleted = 0;
  // Loop while a pass still makes progress. A pass that deletes nothing means
  // everything left in range is whitelisted (or undeletable), so stop.
  for (;;) {
    const results = await searchOlderThan(cutoff);
    let deletedThisPass = 0;
    for (const item of results) {
      if (!item.url || isWhitelisted(item.url, wl)) continue;
      try {
        await browser.history.deleteUrl({ url: item.url });
        deletedThisPass++;
      } catch (err) {
        // Keep sweeping so a single bad URL can't abort the whole cleanup, but
        // don't hide it: a run that "deletes nothing" is otherwise undebuggable.
        console.warn(`[kitty-kit] history-cleaner: failed to delete ${item.url}`, err);
      }
    }
    deleted += deletedThisPass;
    if (deletedThisPass === 0 || results.length < PAGE_SIZE) break;
  }
  return deleted;
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

      const deleted = await deleteOlderThan(cutoff, wl);

      await store.lastDeleteCount.setValue(deleted);
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
