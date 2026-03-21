import type { FeatureModule } from '../types';
import { PopupCard } from './PopupCard';
import { OptionsPanel } from './OptionsPanel';
import * as background from './background';

export const headerModifier: FeatureModule = {
  id: 'header-modifier',
  name: 'Header Modifier',
  description: 'Modify HTTP request and response headers',
  PopupCard,
  OptionsPanel,
  background: {
    onEnabled: background.enable,
    onDisabled: background.disable,
  },
};
