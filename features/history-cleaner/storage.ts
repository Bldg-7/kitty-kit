import { storage } from 'wxt/utils/storage';

export const retentionDays = storage.defineItem<number>(
  'local:historyCleaner:retentionDays',
  { defaultValue: 30 },
);

export const whitelist = storage.defineItem<string[]>(
  'local:historyCleaner:whitelist',
  { defaultValue: [] },
);

/**
 * Also wipe remembered search terms (the address bar's "recent searches" and
 * search box history) on each run. Browsers expose these only through
 * browsingData, which cannot filter by date, so all of them are removed.
 */
export const clearSearchHistory = storage.defineItem<boolean>(
  'local:historyCleaner:clearSearchHistory',
  { defaultValue: false },
);

export const lastRun = storage.defineItem<number | null>(
  'local:historyCleaner:lastRun',
  { defaultValue: null },
);

export const lastDeleteCount = storage.defineItem<number>(
  'local:historyCleaner:lastDeleteCount',
  { defaultValue: 0 },
);

/** True when lastDeleteCount is a lower bound (the counting search hit its cap). */
export const lastDeleteCountCapped = storage.defineItem<boolean>(
  'local:historyCleaner:lastDeleteCountCapped',
  { defaultValue: false },
);

/** True while a cleanup is in progress (a large Firefox history can take minutes). */
export const running = storage.defineItem<boolean>(
  'local:historyCleaner:running',
  { defaultValue: false },
);

/** Message of the error that aborted the last run, or null when it succeeded. */
export const lastError = storage.defineItem<string | null>(
  'local:historyCleaner:lastError',
  { defaultValue: null },
);
