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
            id: 'settimeout1000@gmail.com',
            strict_min_version: '109.0',
          },
        },
        data_collection_permissions: {
          local_storage_usage: true,
          personal_data_collection: false,
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
