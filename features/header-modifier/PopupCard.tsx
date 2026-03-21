import { useState } from 'react';
import { Card } from '@/components/Card';
import { Toggle } from '@/components/Toggle';
import { useStorage } from '@/hooks/useStorage';
import { browser } from 'wxt/browser';
import * as store from './storage';
import { presets } from './presets';
import type { Profile, Rule, HeaderAction, HeaderOperation, HeaderDirection } from './types';

const STANDARD_HEADERS = [
  'Accept', 'Accept-Encoding', 'Accept-Language', 'Access-Control-Allow-Credentials',
  'Access-Control-Allow-Headers', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Origin',
  'Authorization', 'Cache-Control', 'Content-Security-Policy', 'Content-Security-Policy-Report-Only',
  'Content-Type', 'Cookie', 'DNT', 'Origin', 'Pragma', 'Referer', 'Sec-Fetch-Dest',
  'Sec-Fetch-Mode', 'Sec-Fetch-Site', 'User-Agent', 'X-Frame-Options',
  'X-Forwarded-For', 'X-Forwarded-Proto', 'X-Real-IP', 'X-Requested-With',
];

const s = {
  section: { marginBottom: 12 },
  btn: { padding: '4px 10px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', backgroundColor: '#f3f4f6' } as const,
  btnPrimary: { padding: '4px 10px', fontSize: 12, border: '1px solid #6366f1', borderRadius: 4, cursor: 'pointer', backgroundColor: '#6366f1', color: '#fff' } as const,
  btnDanger: { padding: '4px 10px', fontSize: 12, border: '1px solid #ef4444', borderRadius: 4, cursor: 'pointer', backgroundColor: '#fef2f2', color: '#ef4444' } as const,
  input: { padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4, width: '100%', boxSizing: 'border-box' as const },
  select: { padding: '4px 8px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4 },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 2, display: 'block' as const },
  ruleItem: { padding: '8px', border: '1px solid #e5e7eb', borderRadius: 4, marginBottom: 6, fontSize: 12 },
  headerRow: { display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' as const, flexWrap: 'wrap' as const } as const,
};

type View = 'list' | 'edit-rule';

interface EditState {
  profileId: string;
  rule: Rule;
  isNew: boolean;
}

export function PopupCard() {
  const [allProfiles, setProfiles] = useStorage(store.profiles);
  const [view, setView] = useState<View>('list');
  const [editState, setEditState] = useState<EditState | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  const profiles = allProfiles ?? [];

  const activeRuleCount = profiles
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.rules.filter((r) => r.enabled).length, 0);

  const save = (updated: Profile[]) => setProfiles(updated);

  const addProfile = async () => {
    const name = newProfileName.trim() || `Profile ${profiles.length + 1}`;
    const newProfile: Profile = {
      id: `profile-${Date.now()}`,
      name,
      enabled: true,
      rules: [],
    };
    await save([...profiles, newProfile]);
    setNewProfileName('');
  };

  const removeProfile = async (id: string) => {
    await save(profiles.filter((p) => p.id !== id));
  };

  const toggleProfile = async (id: string) => {
    await save(profiles.map((p) => p.id === id ? { ...p, enabled: !p.enabled } : p));
  };

  const toggleRule = async (profileId: string, ruleId: string) => {
    await save(profiles.map((p) =>
      p.id === profileId
        ? { ...p, rules: p.rules.map((r) => r.id === ruleId ? { ...r, enabled: !r.enabled } : r) }
        : p
    ));
  };

  const removeRule = async (profileId: string, ruleId: string) => {
    await save(profiles.map((p) =>
      p.id === profileId
        ? { ...p, rules: p.rules.filter((r) => r.id !== ruleId) }
        : p
    ));
  };

  const startAddRule = (profileId: string) => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      let urlPattern = '<all_urls>';
      if (tabs[0]?.url) {
        try {
          const u = new URL(tabs[0].url);
          urlPattern = `${u.origin}/*`;
        } catch { /* ignore */ }
      }
      setEditState({
        profileId,
        isNew: true,
        rule: {
          id: `rule-${Date.now()}`,
          enabled: true,
          urlPattern,
          headers: [{ operation: 'set', header: '', value: '', direction: 'request' }],
        },
      });
      setView('edit-rule');
    });
  };

  const startEditRule = (profileId: string, rule: Rule) => {
    setEditState({ profileId, rule: structuredClone(rule), isNew: false });
    setView('edit-rule');
  };

  const addPresetRule = async (profileId: string, presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    const rule = preset.createRule();
    await save(profiles.map((p) =>
      p.id === profileId
        ? { ...p, rules: [...p.rules, rule] }
        : p
    ));
  };

  const saveRule = async () => {
    if (!editState) return;
    const { profileId, rule, isNew } = editState;
    await save(profiles.map((p) => {
      if (p.id !== profileId) return p;
      if (isNew) return { ...p, rules: [...p.rules, rule] };
      return { ...p, rules: p.rules.map((r) => r.id === rule.id ? rule : r) };
    }));
    setView('list');
    setEditState(null);
  };

  if (view === 'edit-rule' && editState) {
    return <RuleEditor state={editState} setState={setEditState} onSave={saveRule} onCancel={() => { setView('list'); setEditState(null); }} />;
  }

  return (
    <Card title="Header Modifier">
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
        Active rules: <strong>{activeRuleCount}</strong>
      </p>

      {profiles.map((profile) => (
        <div key={profile.id} style={{ marginBottom: 12, border: '1px solid #e5e7eb', borderRadius: 6, padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Toggle checked={profile.enabled} onChange={() => toggleProfile(profile.id)} label={profile.name} />
            <button onClick={() => removeProfile(profile.id)} style={s.btnDanger}>Delete</button>
          </div>

          {profile.rules.map((rule) => (
            <div key={rule.id} style={s.ruleItem}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Toggle checked={rule.enabled} onChange={() => toggleRule(profile.id, rule.id)} label={rule.urlPattern} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEditRule(profile.id, rule)} style={s.btn}>Edit</button>
                  <button onClick={() => removeRule(profile.id, rule.id)} style={s.btnDanger}>X</button>
                </div>
              </div>
              <div style={{ color: '#9ca3af', marginTop: 2 }}>
                {rule.headers.length} header action(s)
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            <button onClick={() => startAddRule(profile.id)} style={s.btnPrimary}>+ Rule</button>
            <select
              onChange={(e) => { if (e.target.value) { addPresetRule(profile.id, e.target.value); e.target.value = ''; } }}
              style={s.select}
              defaultValue=""
            >
              <option value="" disabled>+ Preset</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <input
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          placeholder="Profile name"
          style={{ ...s.input, flex: 1 }}
        />
        <button onClick={addProfile} style={s.btnPrimary}>Add Profile</button>
      </div>
    </Card>
  );
}

function RuleEditor({
  state,
  setState,
  onSave,
  onCancel,
}: {
  state: EditState;
  setState: (s: EditState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { rule } = state;

  const update = (partial: Partial<Rule>) => {
    setState({ ...state, rule: { ...rule, ...partial } });
  };

  const updateHeader = (index: number, partial: Partial<HeaderAction>) => {
    const headers = [...rule.headers];
    headers[index] = { ...headers[index], ...partial };
    update({ headers });
  };

  const addHeader = () => {
    update({
      headers: [...rule.headers, { operation: 'set' as HeaderOperation, header: '', value: '', direction: 'request' as HeaderDirection }],
    });
  };

  const removeHeader = (index: number) => {
    update({ headers: rule.headers.filter((_, i) => i !== index) });
  };

  return (
    <Card title={state.isNew ? 'Add Rule' : 'Edit Rule'}>
      <div style={s.section}>
        <label style={s.label}>URL Pattern</label>
        <input
          value={rule.urlPattern}
          onChange={(e) => update({ urlPattern: e.target.value })}
          style={s.input}
          placeholder="<all_urls> or *://example.com/*"
        />
      </div>

      <div style={s.section}>
        <label style={s.label}>Resource Types (comma-separated, optional)</label>
        <input
          value={rule.resourceTypes?.join(', ') ?? ''}
          onChange={(e) => update({ resourceTypes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
          style={s.input}
          placeholder="main_frame, xmlhttprequest, ..."
        />
      </div>

      <div style={s.section}>
        <label style={s.label}>Headers</label>
        {rule.headers.map((h, i) => (
          <div key={i} style={s.headerRow}>
            <select value={h.direction} onChange={(e) => updateHeader(i, { direction: e.target.value as HeaderDirection })} style={{ ...s.select, width: 80 }}>
              <option value="request">Req</option>
              <option value="response">Res</option>
            </select>
            <select value={h.operation} onChange={(e) => updateHeader(i, { operation: e.target.value as HeaderOperation })} style={{ ...s.select, width: 80 }}>
              <option value="set">Set</option>
              <option value="remove">Remove</option>
              <option value="append">Append</option>
            </select>
            <input
              value={h.header}
              onChange={(e) => updateHeader(i, { header: e.target.value })}
              list="header-suggestions"
              placeholder="Header"
              style={{ ...s.input, flex: 1, width: 'auto' }}
            />
            {h.operation !== 'remove' && (
              <input
                value={h.value ?? ''}
                onChange={(e) => updateHeader(i, { value: e.target.value })}
                placeholder="Value"
                style={{ ...s.input, flex: 1, width: 'auto' }}
              />
            )}
            <button onClick={() => removeHeader(i)} style={s.btnDanger}>X</button>
          </div>
        ))}
        <datalist id="header-suggestions">
          {STANDARD_HEADERS.map((h) => <option key={h} value={h} />)}
        </datalist>
        <button onClick={addHeader} style={s.btn}>+ Header</button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={s.btn}>Cancel</button>
        <button onClick={onSave} style={s.btnPrimary}>Save</button>
      </div>
    </Card>
  );
}
