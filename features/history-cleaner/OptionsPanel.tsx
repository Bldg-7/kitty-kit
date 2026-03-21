import { useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import * as store from './storage';

export function OptionsPanel() {
  const [days, setDays] = useStorage(store.retentionDays);
  const [wl, setWl] = useStorage(store.whitelist);
  const [newDomain, setNewDomain] = useState('');

  const addDomain = async () => {
    const trimmed = newDomain.trim();
    if (!trimmed || !wl) return;
    if (!wl.includes(trimmed)) {
      await setWl([...wl, trimmed]);
    }
    setNewDomain('');
  };

  const removeDomain = async (domain: string) => {
    if (!wl) return;
    await setWl(wl.filter((d) => d !== domain));
  };

  const inputStyle = {
    padding: '4px 8px',
    fontSize: 13,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    marginRight: 4,
  };

  const btnStyle = {
    padding: '4px 10px',
    fontSize: 12,
    border: '1px solid #d1d5db',
    borderRadius: 4,
    cursor: 'pointer',
    backgroundColor: '#f3f4f6',
  };

  const tagStyle = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    padding: '2px 8px',
    fontSize: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    margin: '2px 4px 2px 0',
  };

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Retention Period</h4>
      <div style={{ marginBottom: 16 }}>
        <input
          type="number"
          min={1}
          value={days ?? 30}
          onChange={(e) => setDays(parseInt(e.target.value, 10) || 30)}
          style={{ ...inputStyle, width: 60 }}
        />
        <span style={{ fontSize: 13, color: '#6b7280' }}> days</span>
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Domain Whitelist</h4>
      <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
        History entries from these domains will not be deleted.
      </p>
      <div style={{ marginBottom: 8 }}>
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDomain()}
          placeholder="example.com"
          style={inputStyle}
        />
        <button onClick={addDomain} style={btnStyle}>Add</button>
      </div>
      <div>
        {wl?.map((d) => (
          <span key={d} style={tagStyle}>
            {d}
            <button onClick={() => removeDomain(d)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}
