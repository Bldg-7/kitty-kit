import { storage } from 'wxt/utils/storage';
import type { Profile } from './types';

export const profiles = storage.defineItem<Profile[]>(
  'local:headerModifier:profiles',
  { defaultValue: [] },
);
