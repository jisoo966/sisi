export default function SunSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Core circle */}
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="0.75" fill="currentColor" fillOpacity="0.07"/>
      {/* Inner ring detail */}
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="0.35" opacity="0.5"/>
      {/* Straight long rays (N, E, S, W) */}
      <line x1="12" y1="2" x2="12" y2="7.2" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      <line x1="22" y1="12" x2="16.8" y2="12" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      <line x1="12" y1="22" x2="12" y2="16.8" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      <line x1="2" y1="12" x2="7.2" y2="12" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      {/* Wavy diagonal rays (NE, SE, SW, NW) */}
      <path d="M19.2 4.7C18.8 5.4 17.9 6.4 17.2 6.8" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      <path d="M19.2 19.3C18.8 18.6 17.9 17.6 17.2 17.2" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      <path d="M4.8 19.3C5.2 18.6 6.1 17.6 6.8 17.2" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      <path d="M4.8 4.7C5.2 5.4 6.1 6.4 6.8 6.8" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      {/* Short secondary rays */}
      <line x1="15.5" y1="3.2" x2="15" y2="4.8" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="20.8" y1="8.5" x2="19.2" y2="9" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="20.8" y1="15.5" x2="19.2" y2="15" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="15.5" y1="20.8" x2="15" y2="19.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="8.5" y1="3.2" x2="9" y2="4.8" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="3.2" y1="8.5" x2="4.8" y2="9" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="3.2" y1="15.5" x2="4.8" y2="15" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
      <line x1="8.5" y1="20.8" x2="9" y2="19.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
