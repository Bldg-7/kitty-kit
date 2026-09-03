import { useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import { Toggle } from '@/components/Toggle';
import * as store from './storage';

export function OptionsPanel() {
  const [days, setDays] = useStorage(store.retentionDays);
  const [wl, setWl] = useStorage(store.whitelist);
  const [clearSearch, setClearSearch] = useStorage(store.clearSearchHistory);
  const [newDomain, setNewDomain] = useState('');
  // What the user is currently typing into the retention field. Kept separate
  // from the stored value so clearing the field to type a new number doesn't
  // snap back to the stored value and append to it (e.g. "30" -> "307").
  const [daysDraft, setDaysDraft] = useState<string | null>(null);

  const effectiveDays = days ?? 30;
  const cutoffDate = new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000);

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
      <div style={{ marginBottom: 4 }}>
        <input
          type="number"
          min={0}
          step={1}
          value={daysDraft ?? String(effectiveDays)}
          onChange={(e) => {
            const raw = e.target.value;
            setDaysDraft(raw);
            const n = parseInt(raw, 10);
            if (!Number.isNaN(n) && n >= 0) setDays(n);
          }}
          onBlur={() => setDaysDraft(null)}
          style={{ ...inputStyle, width: 60 }}
        />
        <span style={{ fontSize: 13, color: '#6b7280' }}> days</span>
      </div>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#9ca3af' }}>
        Visits older than this are removed on each run; later visits to the same pages are kept. Set to <strong>0</strong> to clear all history.
      </p>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#6b7280' }}>
        {effectiveDays === 0
          ? 'Current setting: every visit up to the moment of each run is deleted.'
          : `Current setting: visits before ${cutoffDate.toLocaleDateString()} are deleted; anything newer is kept.`}
      </p>

      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Search History</h4>
      <div style={{ marginBottom: 4 }}>
        <Toggle
          checked={clearSearch === true}
          onChange={(v) => setClearSearch(v)}
          label="Also clear remembered search terms on each run"
        />
      </div>
      <p style={{ margin: '0 0 16px', fontSize: 12, color: '#9ca3af' }}>
        Removes the search terms the address bar and search box remember (Firefox shows them as "Recent searches").
        The browser API cannot filter these by date, so all of them are removed every run.
      </p>

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
