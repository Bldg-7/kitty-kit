import { storage } from 'wxt/utils/storage';

export const retentionDays = storage.defineItem<number>(
  'local:historyCleaner:retentionDays',
  { defaultValue: 30 },
);

export const whitelist = storage.defineItem<string[]>(
  'local:historyCleaner:whitelist',
  { defaultValue: [] },
);

export const lastRun = storage.defineItem<number | null>(
  'local:historyCleaner:lastRun',
  { defaultValue: null },
);

export const lastDeleteCount = storage.defineItem<number>(
  'local:historyCleaner:lastDeleteCount',
  { defaultValue: 0 },
);
