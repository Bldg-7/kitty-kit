import { useState, useEffect } from 'react';
import type { WxtStorageItem } from 'wxt/utils/storage';

export function useStorage<T>(item: WxtStorageItem<T, Record<string, unknown>>): [T | undefined, (value: T) => Promise<void>] {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    item.getValue().then(setValue);
    const unwatch = item.watch((newValue) => {
      setValue(newValue);
    });
    return unwatch;
  }, [item]);

  const update = async (newValue: T) => {
    await item.setValue(newValue);
  };

  return [value, update];
}
