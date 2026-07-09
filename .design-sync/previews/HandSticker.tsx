import { Sticker, HandSticker } from 'sisi-app';

export function InBadge() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <Sticker variant="rose" rotation={0}>
        <HandSticker className="w-6 h-6" />
      </Sticker>
    </div>
  );
}

export function Large() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20, color: '#3D2E25' }}>
      <HandSticker className="w-24 h-24" />
    </div>
  );
}
