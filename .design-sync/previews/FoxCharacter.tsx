import { FoxCharacter } from 'sisi-app';

/*
 * Only the "walking" state has a shipped asset (public/fox/walking-clean.webp).
 * The other FoxState values (sittingSmall, sittingTall, sideProfile1/2,
 * walkingAway, sleeping) reference public/fox/*.png files that don't exist
 * in the repo yet — see .design-sync/NOTES.md.
 */
export function Walking() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <FoxCharacter state="walking" size={160} />
    </div>
  );
}

export function Floating() {
  return (
    <div style={{ background: '#F5EFE6', padding: 20 }}>
      <FoxCharacter state="walking" size={120} floating />
    </div>
  );
}
