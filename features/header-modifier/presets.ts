import type { Rule } from './types';

export interface Preset {
  id: string;
  name: string;
  description: string;
  createRule: () => Rule;
}

let presetCounter = 0;
function nextId() {
  return `preset-${Date.now()}-${presetCounter++}`;
}

export const presets: Preset[] = [
  {
    id: 'cors-bypass',
    name: 'CORS Bypass',
    description: 'Remove CORS restrictions by modifying response headers',
    createRule: () => ({
      id: nextId(),
      enabled: true,
      urlPattern: '<all_urls>',
      resourceTypes: ['xmlhttprequest'],
      headers: [
        { operation: 'set', header: 'Access-Control-Allow-Origin', value: '*', direction: 'response' },
        { operation: 'set', header: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS', direction: 'response' },
        { operation: 'set', header: 'Access-Control-Allow-Headers', value: '*', direction: 'response' },
        { operation: 'remove', header: 'Access-Control-Allow-Credentials', direction: 'response' },
      ],
    }),
  },
  {
    id: 'csp-remove',
    name: 'Remove CSP',
    description: 'Remove Content-Security-Policy headers',
    createRule: () => ({
      id: nextId(),
      enabled: true,
      urlPattern: '<all_urls>',
      resourceTypes: ['main_frame', 'sub_frame'],
      headers: [
        { operation: 'remove', header: 'Content-Security-Policy', direction: 'response' },
        { operation: 'remove', header: 'Content-Security-Policy-Report-Only', direction: 'response' },
        { operation: 'remove', header: 'X-Frame-Options', direction: 'response' },
      ],
    }),
  },
  {
    id: 'cache-disable',
    name: 'Disable Cache',
    description: 'Force no-cache headers on requests',
    createRule: () => ({
      id: nextId(),
      enabled: true,
      urlPattern: '<all_urls>',
      headers: [
        { operation: 'set', header: 'Cache-Control', value: 'no-cache, no-store, must-revalidate', direction: 'request' },
        { operation: 'set', header: 'Pragma', value: 'no-cache', direction: 'request' },
      ],
    }),
  },
  {
    id: 'custom-ua',
    name: 'Custom User-Agent',
    description: 'Override the User-Agent header',
    createRule: () => ({
      id: nextId(),
      enabled: true,
      urlPattern: '<all_urls>',
      headers: [
        { operation: 'set', header: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', direction: 'request' },
      ],
    }),
  },
];
