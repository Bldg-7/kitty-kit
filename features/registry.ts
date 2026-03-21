import type { FeatureModule } from './types';
import { trackingCleaner } from './tracking-cleaner';
import { historyCleaner } from './history-cleaner';
import { headerModifier } from './header-modifier';

export const modules: FeatureModule[] = [
  trackingCleaner,
  historyCleaner,
  headerModifier,
];
