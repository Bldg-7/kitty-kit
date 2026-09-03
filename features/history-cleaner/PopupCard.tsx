import { useStorage } from '@/hooks/useStorage';
import { browser } from 'wxt/browser';
import * as store from './storage';

export function PopupCard() {
  const [lastRunTs] = useStorage(store.lastRun);
  const [deleteCount] = useStorage(store.lastDeleteCount);
  const [countCapped] = useStorage(store.lastDeleteCountCapped);
  const [running] = useStorage(store.running);
  const [lastError] = useStorage(store.lastError);
  const [days] = useStorage(store.retentionDays);

  const handleRunNow = () => {
    browser.runtime.sendMessage({ type: 'history-cleaner:run-now' });
  };

  const lastRunText = lastRunTs
    ? new Date(lastRunTs).toLocaleString()
    : 'Never';

  const effectiveDays = days ?? 30;
  const scopeText = effectiveDays === 0
    ? 'Deletes all history'
    : `Deletes visits before ${new Date(Date.now() - effectiveDays * 24 * 60 * 60 * 1000).toLocaleDateString()} (${effectiveDays} days)`;

  return (
    <>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
        {scopeText}
      </p>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
        Last run: {lastRunText}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
        Cleaned: <strong>{deleteCount ?? 0}{countCapped ? '+' : ''}</strong> pages
      </p>
      {lastError && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#dc2626', overflowWrap: 'anywhere' }}>
          Last run failed: {lastError}
        </p>
      )}
      <button
        onClick={handleRunNow}
        disabled={running === true}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          backgroundColor: '#f3f4f6',
          cursor: running ? 'default' : 'pointer',
          opacity: running ? 0.6 : 1,
        }}
      >
        {running ? 'Running…' : 'Run Now'}
      </button>
    </>
  );
}
