import { useState } from 'react';
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
  backBtn: { padding: 0, fontSize: 13, border: 'none', background: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 500 } as const,
  profileItem: {
    padding: '10px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    marginBottom: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as const,
};

type View = 'list' | 'detail' | 'edit-rule';

interface EditState {
  profileId: string;
  rule: Rule;
  isNew: boolean;
}

export function PopupCard() {
  const [allProfiles, setProfiles] = useStorage(store.profiles);
  const [view, setView] = useState<View>('list');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [newProfileName, setNewProfileName] = useState('');

  const profiles = allProfiles ?? [];
  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);

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
    if (selectedProfileId === id) {
      setSelectedProfileId(null);
      setView('list');
    }
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
    setView('detail');
    setEditState(null);
  };

  const openDetail = (profileId: string) => {
    setSelectedProfileId(profileId);
    setView('detail');
  };

  // --- View: Edit Rule ---
  if (view === 'edit-rule' && editState) {
    return (
      <RuleEditor
        state={editState}
        setState={setEditState}
        onSave={saveRule}
        onCancel={() => { setView('detail'); setEditState(null); }}
      />
    );
  }

  // --- View: Profile Detail ---
  if (view === 'detail' && selectedProfile) {
    const enabledRules = selectedProfile.rules.filter((r) => r.enabled).length;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <button onClick={() => setView('list')} style={s.backBtn}>← Back</button>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{selectedProfile.name}</span>
          <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>
            {enabledRules}/{selectedProfile.rules.length} rules active
          </span>
        </div>

        {selectedProfile.rules.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '12px 0' }}>No rules yet.</p>
        ) : (
          selectedProfile.rules.map((rule) => (
            <div key={rule.id} style={s.ruleItem}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Toggle checked={rule.enabled} onChange={() => toggleRule(selectedProfile.id, rule.id)} label={rule.urlPattern} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEditRule(selectedProfile.id, rule)} style={s.btn}>Edit</button>
                  <button onClick={() => removeRule(selectedProfile.id, rule.id)} style={s.btnDanger}>X</button>
                </div>
              </div>
              <div style={{ color: '#9ca3af', marginTop: 2 }}>
                {rule.headers.length} header action(s)
              </div>
            </div>
          ))
        )}

        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
          <button onClick={() => startAddRule(selectedProfile.id)} style={s.btnPrimary}>+ Rule</button>
          <select
            onChange={(e) => { if (e.target.value) { addPresetRule(selectedProfile.id, e.target.value); e.target.value = ''; } }}
            style={s.select}
            defaultValue=""
          >
            <option value="" disabled>+ Preset</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </>
    );
  }

  // --- View: Profile List ---
  return (
    <>
      {profiles.map((profile) => {
        const enabledRules = profile.rules.filter((r) => r.enabled).length;
        return (
          <div key={profile.id} style={s.profileItem} onClick={() => openDetail(profile.id)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <div onClick={(e) => e.stopPropagation()}>
                <Toggle checked={profile.enabled} onChange={() => toggleProfile(profile.id)} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile.name}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>
                  {profile.rules.length} rules · {enabledRules} active
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={(e) => { e.stopPropagation(); removeProfile(profile.id); }}
                style={s.btnDanger}
              >
                Delete
              </button>
              <span style={{ color: '#9ca3af', fontSize: 12 }}>›</span>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        <input
          value={newProfileName}
          onChange={(e) => setNewProfileName(e.target.value)}
          placeholder="Profile name"
          style={{ ...s.input, flex: 1 }}
        />
        <button onClick={addProfile} style={s.btnPrimary}>Add Profile</button>
      </div>
    </>
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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <button onClick={onCancel} style={s.backBtn}>← Back</button>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{state.isNew ? 'Add Rule' : 'Edit Rule'}</span>
      </div>

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
    </div>
  );
}
