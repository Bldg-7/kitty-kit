import { storage } from 'wxt/utils/storage';

export const enabledModules = storage.defineItem<Record<string, boolean>>(
  'local:enabledModules',
  { defaultValue: {} },
);
