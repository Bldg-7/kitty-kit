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

/** Breakdown of the last run, so a run that "deleted nothing" can be explained. */
export interface RunStats {
  /** Entries the history search reported as older than the cutoff. */
  found: number;
  /** Entries skipped because their domain is whitelisted. */
  skipped: number;
  /** Entries whose deletion threw. */
  failed: number;
  /** Message of the first deletion error, if any. */
  firstFailure: string | null;
  /** Which deletion strategy ran. */
  mode: 'deleteRange' | 'deleteUrl';
  /** The cutoff timestamp (ms) the run used. */
  cutoff: number;
}

export const lastStats = storage.defineItem<RunStats | null>(
  'local:historyCleaner:lastStats',
  { defaultValue: null },
);
