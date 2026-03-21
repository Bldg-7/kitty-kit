import { useModules } from '@/hooks/useModules';
import { browser } from 'wxt/browser';

export function App() {
  const { active } = useModules();

  const openOptions = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div style={{ padding: 12, fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
      <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Kitty Kit</h2>

      {active.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>
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
        active.map((mod) => <mod.PopupCard key={mod.id} />)
      )}
    </div>
  );
}
