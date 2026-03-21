import { useState } from 'react';
import { Toggle } from '@/components/Toggle';
import { useStorage } from '@/hooks/useStorage';
import { categories } from './rules';
import * as store from './storage';

export function OptionsPanel() {
  const [catStates, setCatStates] = useStorage(store.categoryStates);
  const [customParams, setCustomParams] = useStorage(store.customParams);
  const [excluded, setExcluded] = useStorage(store.excludedDomains);
  const [newParam, setNewParam] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const toggleCategory = async (catId: string) => {
    if (!catStates) return;
    await setCatStates({ ...catStates, [catId]: catStates[catId] === false });
  };

  const addCustomParam = async () => {
    const trimmed = newParam.trim();
    if (!trimmed || !customParams) return;
    if (!customParams.includes(trimmed)) {
      await setCustomParams([...customParams, trimmed]);
    }
    setNewParam('');
  };

  const removeCustomParam = async (param: string) => {
    if (!customParams) return;
    await setCustomParams(customParams.filter((p) => p !== param));
  };

  const addDomain = async () => {
    const trimmed = newDomain.trim();
    if (!trimmed || !excluded) return;
    if (!excluded.includes(trimmed)) {
      await setExcluded([...excluded, trimmed]);
    }
    setNewDomain('');
  };

  const removeDomain = async (domain: string) => {
    if (!excluded) return;
    await setExcluded(excluded.filter((d) => d !== domain));
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    fontSize: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    margin: '2px 4px 2px 0',
  };

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>Categories</h4>
      {categories.map((cat) => (
        <div key={cat.id} style={{ marginBottom: 6 }}>
          <Toggle
            checked={catStates?.[cat.id] !== false}
            onChange={() => toggleCategory(cat.id)}
            label={`${cat.name} (${cat.params.length})`}
          />
        </div>
      ))}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>Custom Parameters</h4>
      <div style={{ marginBottom: 8 }}>
        <input
          value={newParam}
          onChange={(e) => setNewParam(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCustomParam()}
          placeholder="param_name"
          style={inputStyle}
        />
        <button onClick={addCustomParam} style={btnStyle}>Add</button>
      </div>
      <div>
        {customParams?.map((p) => (
          <span key={p} style={tagStyle}>
            {p}
            <button onClick={() => removeCustomParam(p)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>&times;</button>
          </span>
        ))}
      </div>

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>Excluded Domains</h4>
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
        {excluded?.map((d) => (
          <span key={d} style={tagStyle}>
            {d}
            <button onClick={() => removeDomain(d)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontSize: 14 }}>&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}
