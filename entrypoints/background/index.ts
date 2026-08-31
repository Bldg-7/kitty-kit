import { browser } from 'wxt/browser';
import { enabledModules } from '@/utils/storage';
import { modules } from '@/features/registry';
import { runCleanup } from '@/features/history-cleaner/background';

export default defineBackground(() => {
  const activeModuleIds = new Set<string>();

  async function syncModulesOnce() {
    const enabled = await enabledModules.getValue();

    for (const mod of modules) {
      const shouldBeEnabled = enabled[mod.id] === true;
      const isActive = activeModuleIds.has(mod.id);

      try {
        if (shouldBeEnabled && !isActive) {
          await mod.background.onEnabled();
          activeModuleIds.add(mod.id);
        } else if (!shouldBeEnabled && isActive) {
          await mod.background.onDisabled();
          activeModuleIds.delete(mod.id);
        }
      } catch (err) {
        // Isolate each module: one enable/disable failure must not abort the
        // loop and silently skip the remaining modules. Leave activeModuleIds
        // untouched so the next sync retries this module.
        console.error(`[kitty-kit] module "${mod.id}" failed to sync`, err);
      }
    }
  }

  // Serialize syncModules so overlapping storage events cannot interleave.
  // activeModuleIds is mutated after awaits, so concurrent runs could read a
  // stale membership value and take the wrong branch (leaving a module's real
  // state out of sync with what the UI shows).
  let syncChain: Promise<void> = Promise.resolve();
  function syncModules() {
    syncChain = syncChain
      .then(syncModulesOnce)
      .catch((err) => {
        console.error('[kitty-kit] syncModules failed', err);
      });
    return syncChain;
  }

  syncModules();

  enabledModules.watch(() => syncModules());

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === 'history-cleaner:run-now') {
      runCleanup();
    }
  });
});
