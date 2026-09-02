import { useStorage } from '@/hooks/useStorage';
import { browser } from 'wxt/browser';
import * as store from './storage';

export function PopupCard() {
  const [lastRunTs] = useStorage(store.lastRun);
  const [deleteCount] = useStorage(store.lastDeleteCount);
  const [countCapped] = useStorage(store.lastDeleteCountCapped);
  const [running] = useStorage(store.running);
  const [lastError] = useStorage(store.lastError);

  const handleRunNow = () => {
    browser.runtime.sendMessage({ type: 'history-cleaner:run-now' });
  };

  const lastRunText = lastRunTs
    ? new Date(lastRunTs).toLocaleString()
    : 'Never';

  return (
    <>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
        Last run: {lastRunText}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
        Deleted: <strong>{deleteCount ?? 0}{countCapped ? '+' : ''}</strong> entries
      </p>
      {lastError && (
        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#dc2626' }}>
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
