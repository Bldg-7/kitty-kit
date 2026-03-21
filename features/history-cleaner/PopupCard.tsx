import { Card } from '@/components/Card';
import { useStorage } from '@/hooks/useStorage';
import { browser } from 'wxt/browser';
import * as store from './storage';

export function PopupCard() {
  const [lastRunTs] = useStorage(store.lastRun);
  const [deleteCount] = useStorage(store.lastDeleteCount);

  const handleRunNow = () => {
    browser.runtime.sendMessage({ type: 'history-cleaner:run-now' });
  };

  const lastRunText = lastRunTs
    ? new Date(lastRunTs).toLocaleString()
    : 'Never';

  return (
    <Card title="History Cleaner">
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>
        Last run: {lastRunText}
      </p>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
        Deleted: <strong>{deleteCount ?? 0}</strong> entries
      </p>
      <button
        onClick={handleRunNow}
        style={{
          padding: '4px 12px',
          fontSize: 12,
          border: '1px solid #d1d5db',
          borderRadius: 4,
          backgroundColor: '#f3f4f6',
          cursor: 'pointer',
        }}
      >
        Run Now
      </button>
    </Card>
  );
}
