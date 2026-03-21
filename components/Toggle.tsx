import { type CSSProperties } from 'react';

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
  } satisfies CSSProperties,
  track: (checked: boolean): CSSProperties => ({
    width: 36,
    height: 20,
    borderRadius: 10,
    backgroundColor: checked ? '#6366f1' : '#d1d5db',
    position: 'relative',
    transition: 'background-color 0.2s',
    flexShrink: 0,
  }),
  thumb: (checked: boolean): CSSProperties => ({
    width: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#fff',
    position: 'absolute',
    top: 2,
    left: checked ? 18 : 2,
    transition: 'left 0.2s',
  }),
};

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label style={styles.container}>
      <div style={styles.track(checked)} onClick={() => onChange(!checked)}>
        <div style={styles.thumb(checked)} />
      </div>
      {label && <span>{label}</span>}
    </label>
  );
}
