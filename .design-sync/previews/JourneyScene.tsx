import { JourneyScene } from 'sisi-app';

// JourneyScene renders `absolute inset-0`, so it needs a sized, positioned
// parent. The real background is a video (public/journey/world-smooth.mp4,
// ~12MB — not shipped in this preview bundle); the poster image still shows
// via the <video poster> fallback.
export function Default() {
  return (
    <div style={{ position: 'relative', width: 320, height: 220 }}>
      <JourneyScene />
    </div>
  );
}
