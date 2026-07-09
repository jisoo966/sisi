import { Sticker, StarSticker, HeartSticker, MoonSticker } from 'sisi-app';

// The *Sticker icon SVGs ship with no width/height (viewBox only), so they
// need an explicit size className wherever they're used — see
// .design-sync/NOTES.md.

export function Variants() {
  return (
    <div style={{ display: 'flex', gap: 14, background: '#F5EFE6', padding: 20 }}>
      <Sticker variant="gold" rotation={0}>
        <StarSticker className="w-6 h-6" />
      </Sticker>
      <Sticker variant="rose" rotation={0}>
        <HeartSticker className="w-6 h-6" />
      </Sticker>
      <Sticker variant="sage" rotation={0}>
        <MoonSticker className="w-6 h-6" />
      </Sticker>
      <Sticker variant="plum" rotation={0}>
        <StarSticker className="w-6 h-6" />
      </Sticker>
      <Sticker variant="coral" rotation={0}>
        <HeartSticker className="w-6 h-6" />
      </Sticker>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F5EFE6', padding: 20 }}>
      <Sticker size="sm" rotation={0}>
        <StarSticker className="w-4 h-4" />
      </Sticker>
      <Sticker size="md" rotation={0}>
        <StarSticker className="w-6 h-6" />
      </Sticker>
      <Sticker size="lg" rotation={0}>
        <StarSticker className="w-8 h-8" />
      </Sticker>
    </div>
  );
}

export function Square() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <Sticker shape="square" variant="plum" rotation={-3}>
        <MoonSticker className="w-6 h-6" />
      </Sticker>
    </div>
  );
}
