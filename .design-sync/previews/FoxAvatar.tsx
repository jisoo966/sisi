import { FoxAvatar } from 'sisi-app';

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F5EFE6', padding: 20 }}>
      <FoxAvatar size={32} />
      <FoxAvatar size={48} />
      <FoxAvatar size={64} />
    </div>
  );
}
