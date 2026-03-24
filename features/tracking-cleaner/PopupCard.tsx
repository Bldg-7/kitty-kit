import { useState } from 'react';
import { useStorage } from '@/hooks/useStorage';
import * as store from './storage';
import { browser } from 'wxt/browser';

export function PopupCard() {
  const [cleanCount] = useStorage(store.cleanCount);
  const [excluded, setExcluded] = useStorage(store.excludedDomains);
  const [currentHost, setCurrentHost] = useState<string | null>(null);

  useState(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.url) {
        try {
          setCurrentHost(new URL(tabs[0].url).hostname);
        } catch { /* ignore invalid URLs */ }
      }
    });
  });

  const isExcluded = currentHost ? excluded?.includes(currentHost) : false;

  const toggleExclude = async () => {
    if (!currentHost || !excluded) return;
    if (isExcluded) {
      await setExcluded(excluded.filter((d) => d !== currentHost));
    } else {
      await setExcluded([...excluded, currentHost]);
    }
  };

  return (
    <>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#6b7280' }}>
        Cleaned: <strong>{cleanCount ?? 0}</strong> tracking params
      </p>
      {currentHost && (
        <button
          onClick={toggleExclude}
          style={{
            padding: '4px 12px',
            fontSize: 12,
            border: '1px solid #d1d5db',
            borderRadius: 4,
            backgroundColor: isExcluded ? '#fee2e2' : '#f3f4f6',
            cursor: 'pointer',
          }}
        >
          {isExcluded ? `Remove ${currentHost} from exclusions` : `Exclude ${currentHost}`}
        </button>
      )}
    </>
  );
}
