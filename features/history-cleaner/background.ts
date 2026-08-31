import { browser } from 'wxt/browser';
import * as store from './storage';

const ALARM_NAME = 'history-cleaner';

async function runCleanup() {
  const days = await store.retentionDays.getValue();
  const wl = await store.whitelist.getValue();

  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const results = await browser.history.search({
    text: '',
    startTime: 0,
    endTime: cutoff,
    maxResults: 10000,
  });

  let deleted = 0;
  for (const item of results) {
    if (!item.url) continue;
    try {
      const hostname = new URL(item.url).hostname;
      if (wl.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
        continue;
      }
      await browser.history.deleteUrl({ url: item.url });
      deleted++;
    } catch {
      // Skip entries that fail to parse or delete; keep sweeping the rest so a
      // single bad URL can't abort the whole cleanup.
      continue;
    }
  }

  await store.lastRun.setValue(Date.now());
  await store.lastDeleteCount.setValue(deleted);
}

function handleAlarm(alarm: Browser.alarms.Alarm) {
  if (alarm.name === ALARM_NAME) {
    runCleanup();
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
