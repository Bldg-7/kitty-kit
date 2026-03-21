import type { ComponentType } from 'react';

export interface FeatureModule {
  id: string;
  name: string;
  description: string;
  PopupCard: ComponentType;
  OptionsPanel: ComponentType;
  background: {
    onEnabled: () => void | Promise<void>;
    onDisabled: () => void | Promise<void>;
  };
}
