import { browser } from 'wxt/browser';
import { enabledModules } from '@/utils/storage';
import { modules } from '@/features/registry';
import { runCleanup } from '@/features/history-cleaner/background';

export default defineBackground(() => {
  const activeModuleIds = new Set<string>();

  async function syncModules() {
    const enabled = await enabledModules.getValue();

    for (const mod of modules) {
      const shouldBeEnabled = enabled[mod.id] === true;
      const isActive = activeModuleIds.has(mod.id);

      if (shouldBeEnabled && !isActive) {
        await mod.background.onEnabled();
        activeModuleIds.add(mod.id);
      } else if (!shouldBeEnabled && isActive) {
        await mod.background.onDisabled();
        activeModuleIds.delete(mod.id);
      }
    }
  }

  syncModules();

  enabledModules.watch(() => syncModules());

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'history-cleaner:run-now') {
      runCleanup();
    }
  });
});
