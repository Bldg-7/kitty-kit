import type { CSSProperties, ReactNode } from 'react';

const styles = {
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  } satisfies CSSProperties,
  title: {
    margin: '0 0 8px 0',
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  } satisfies CSSProperties,
};

export function Card({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div style={styles.card}>
      {title && <h3 style={styles.title}>{title}</h3>}
      {children}
    </div>
  );
}
