import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => {
    const common = {
      name: 'Kitty Kit',
      description: 'Personal browser toolkit — tracking cleaner, history cleaner, header modifier',
      permissions: [
        'storage',
        'history',
        'alarms',
        'declarativeNetRequest',
        'tabs',
        'activeTab',
      ],
      host_permissions: ['<all_urls>'],
    };

    if (browser === 'firefox') {
      return {
        ...common,
        permissions: [
          ...common.permissions,
          'webRequest',
          'webRequestBlocking',
        ],
        browser_specific_settings: {
          gecko: {
            id: 'kitty-kit@example.com',
            strict_min_version: '109.0',
          },
        },
      };
    }

    return {
      ...common,
      permissions: [
        ...common.permissions,
        'declarativeNetRequestFeedback',
      ],
    };
  },
});
