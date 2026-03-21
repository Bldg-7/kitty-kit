import type { FeatureModule } from '../types';
import { PopupCard } from './PopupCard';
import { OptionsPanel } from './OptionsPanel';
import * as background from './background';

export const historyCleaner: FeatureModule = {
  id: 'history-cleaner',
  name: 'History Cleaner',
  description: 'Automatically delete old browser history',
  PopupCard,
  OptionsPanel,
  background: {
    onEnabled: background.enable,
    onDisabled: background.disable,
  },
};
