import { storage } from 'wxt/utils/storage';

export const categoryStates = storage.defineItem<Record<string, boolean>>(
  'local:trackingCleaner:categories',
  { defaultValue: {} },
);

export const customParams = storage.defineItem<string[]>(
  'local:trackingCleaner:customParams',
  { defaultValue: [] },
);

export const excludedDomains = storage.defineItem<string[]>(
  'local:trackingCleaner:excludedDomains',
  { defaultValue: [] },
);

export const cleanCount = storage.defineItem<number>(
  'local:trackingCleaner:cleanCount',
  { defaultValue: 0 },
);
