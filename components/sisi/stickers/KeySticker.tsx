export default function KeySticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Bow — outer ring */}
      <circle cx="9" cy="7" r="4.5" stroke="currentColor" strokeWidth="0.75" fill="currentColor" fillOpacity="0.05"/>
      {/* Bow — inner hole */}
      <circle cx="9" cy="7" r="2" stroke="currentColor" strokeWidth="0.6"/>
      {/* Decorative ring detail */}
      <circle cx="9" cy="7" r="3.2" stroke="currentColor" strokeWidth="0.3" opacity="0.4"/>
      {/* Shoulder collar */}
      <rect x="12.8" y="6.2" width="1.2" height="1.6" rx="0.1" stroke="currentColor" strokeWidth="0.55"/>
      {/* Shaft */}
      <line x1="13" y1="7" x2="21.5" y2="7" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      {/* Teeth / wards */}
      <line x1="19" y1="7" x2="19" y2="9.2" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="21" y1="7" x2="21" y2="8.5" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round"/>
      <line x1="17" y1="7" x2="17" y2="9.8" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round"/>
      {/* Ornate bow lines */}
      <path d="M6.5 5C7 4.2 8 3.8 9 3.8" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.5"/>
      <path d="M5.8 7C5.5 6.5 5.5 5.5 5.8 5" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.5"/>
      {/* Decorative dot at center of bow */}
      <circle cx="9" cy="7" r="0.55" fill="currentColor"/>
    </svg>
  );
}
