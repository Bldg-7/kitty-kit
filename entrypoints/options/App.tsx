import { useState } from 'react';
import { Toggle } from '@/components/Toggle';
import { useModules } from '@/hooks/useModules';

export function App() {
  const { all, enabled, setEnabled } = useModules();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule = all.find((m) => m.id === selectedId);

  const toggleModule = async (id: string) => {
    if (!enabled) return;
    await setEnabled({ ...enabled, [id]: !enabled[id] });
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700 }}>Kitty Kit Settings</h1>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: '0 0 240px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#6b7280' }}>Modules</h3>
          {all.map((mod) => (
            <div
              key={mod.id}
              style={{
                padding: '10px 12px',
                marginBottom: 6,
                borderRadius: 6,
                border: `1px solid ${selectedId === mod.id ? '#6366f1' : '#e5e7eb'}`,
                backgroundColor: selectedId === mod.id ? '#eef2ff' : '#fff',
                cursor: 'pointer',
              }}
              onClick={() => setSelectedId(mod.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{mod.name}</span>
                <Toggle
                  checked={enabled?.[mod.id] === true}
                  onChange={() => toggleModule(mod.id)}
                />
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>{mod.description}</p>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {selectedModule ? (
            <div>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>
                {selectedModule.name}
              </h3>
              {enabled?.[selectedModule.id] ? (
                <selectedModule.OptionsPanel />
              ) : (
                <p style={{ color: '#9ca3af', fontSize: 13 }}>
                  Enable this module to configure its settings.
                </p>
              )}
            </div>
          ) : (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>
              <p>Select a module to configure.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
