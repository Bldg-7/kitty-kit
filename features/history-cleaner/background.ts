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
    } catch {
      continue;
    }
    await browser.history.deleteUrl({ url: item.url });
    deleted++;
  }

  await store.lastRun.setValue(Date.now());
  await store.lastDeleteCount.setValue(deleted);
}

export async function enable() {
  await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1440 });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      runCleanup();
    }
  });

  await runCleanup();
}

export async function disable() {
  await browser.alarms.clear(ALARM_NAME);
}

export { runCleanup };
