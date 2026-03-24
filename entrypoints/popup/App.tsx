import { useState } from 'react';
import { useModules } from '@/hooks/useModules';
import { browser } from 'wxt/browser';
import type { CSSProperties } from 'react';

const tabs = [
  { id: 'header-modifier', label: 'Headers' },
  { id: 'tracking-cleaner', label: 'Tracking' },
  { id: 'history-cleaner', label: 'History' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const s = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    fontSize: 14,
    minWidth: 360,
  } satisfies CSSProperties,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    borderBottom: '1px solid #e5e7eb',
  } satisfies CSSProperties,
  title: {
    margin: 0,
    fontSize: 15,
    fontWeight: 700,
  } satisfies CSSProperties,
  settingsBtn: {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    color: '#374151',
  } satisfies CSSProperties,
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  } satisfies CSSProperties,
  tab: (active: boolean) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: 12,
    fontWeight: active ? 600 : 400,
    color: active ? '#4f46e5' : '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s',
  }) satisfies CSSProperties,
  body: {
    padding: 12,
  } satisfies CSSProperties,
  empty: {
    textAlign: 'center' as const,
    padding: '24px 0',
    color: '#9ca3af',
    fontSize: 13,
  } satisfies CSSProperties,
};

export function App() {
  const { active, enabled } = useModules();
  const [activeTab, setActiveTab] = useState<TabId>('header-modifier');

  const openOptions = () => {
    browser.runtime.openOptionsPage();
  };

  const currentModule = active.find((m) => m.id === activeTab);

  // Filter tabs to only show enabled modules
  const enabledTabs = tabs.filter((t) => enabled?.[t.id]);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>Kitty Kit</h2>
        <button onClick={openOptions} style={s.settingsBtn}>Settings</button>
      </div>

      {enabledTabs.length === 0 ? (
        <div style={s.empty}>
          <p style={{ margin: '0 0 8px' }}>No active modules.</p>
          <button
            onClick={openOptions}
            style={{
              padding: '6px 16px',
              fontSize: 13,
              border: '1px solid #6366f1',
              borderRadius: 4,
              backgroundColor: '#6366f1',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Open Settings
          </button>
        </div>
      ) : (
        <>
          <div style={s.tabBar}>
            {enabledTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={s.tab(activeTab === t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={s.body}>
            {currentModule ? (
              <currentModule.PopupCard />
            ) : (
              <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>
                Select a tab above.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
