import { VintageDateMark } from 'sisi-app';

export function Formats() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#F5EFE6', padding: 20 }}>
      <VintageDateMark date="2026-05-14" format="short" />
      <VintageDateMark date="2026-05-14" format="long" />
      <VintageDateMark date="2026-05-14" format="chapter" />
    </div>
  );
}

export function Tinted() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <VintageDateMark date="2026-05-14" format="chapter" tint />
    </div>
  );
}
