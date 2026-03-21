import { useMemo } from 'react';
import { useStorage } from './useStorage';
import { enabledModules } from '@/utils/storage';
import { modules } from '@/features/registry';
import type { FeatureModule } from '@/features/types';

export function useModules(): {
  all: FeatureModule[];
  active: FeatureModule[];
  enabled: Record<string, boolean> | undefined;
  setEnabled: (value: Record<string, boolean>) => Promise<void>;
} {
  const [enabled, setEnabled] = useStorage(enabledModules);

  const active = useMemo(() => {
    if (!enabled) return [];
    return modules.filter((m) => enabled[m.id]);
  }, [enabled]);

  return { all: modules, active, enabled, setEnabled };
}
