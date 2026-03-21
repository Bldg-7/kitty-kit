import type { FeatureModule } from '../types';
import { PopupCard } from './PopupCard';
import { OptionsPanel } from './OptionsPanel';
import * as background from './background';

export const trackingCleaner: FeatureModule = {
  id: 'tracking-cleaner',
  name: 'Tracking Cleaner',
  description: 'Remove tracking query parameters from URLs',
  PopupCard,
  OptionsPanel,
  background: {
    onEnabled: background.enable,
    onDisabled: background.disable,
  },
};
