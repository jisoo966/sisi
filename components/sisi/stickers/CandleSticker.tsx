export default function CandleSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Flame — outer */}
      <path
        d="M12 2C12 2 9.5 4.5 9.5 6.5C9.5 8.5 10.5 9.5 12 9.5C13.5 9.5 14.5 8.5 14.5 6.5C14.5 4.5 12 2 12 2Z"
        stroke="currentColor" strokeWidth="0.65" strokeLinejoin="round" fill="currentColor" fillOpacity="0.08"
      />
      {/* Flame — inner core */}
      <path
        d="M12 4.5C12 4.5 10.8 5.8 10.8 7C10.8 7.8 11.4 8.2 12 8.2C12.6 8.2 13.2 7.8 13.2 7C13.2 5.8 12 4.5 12 4.5Z"
        stroke="currentColor" strokeWidth="0.4" opacity="0.55"
      />
      {/* Wick */}
      <line x1="12" y1="9.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      {/* Candle body */}
      <rect x="8.5" y="10.5" width="7" height="11" rx="0.3"
        stroke="currentColor" strokeWidth="0.75" fill="currentColor" fillOpacity="0.05"/>
      {/* Wax drip — left */}
      <path d="M8.5 13C8.5 13 7.8 13.5 7.5 14.5C7.5 15.5 8 16 8.5 16"
        stroke="currentColor" strokeWidth="0.55" strokeLinecap="round" fill="currentColor" fillOpacity="0.08"/>
      {/* Wax drip — right */}
      <path d="M15.5 11.5C15.5 11.5 16.2 12 16.5 13C16.5 14 16 14.5 15.5 14.5"
        stroke="currentColor" strokeWidth="0.55" strokeLinecap="round" fill="currentColor" fillOpacity="0.08"/>
      {/* Horizontal line texture on candle */}
      <line x1="9" y1="13.5" x2="15" y2="13.5" stroke="currentColor" strokeWidth="0.3" opacity="0.35"/>
      <line x1="9" y1="16" x2="15" y2="16" stroke="currentColor" strokeWidth="0.3" opacity="0.35"/>
      <line x1="9" y1="18.5" x2="15" y2="18.5" stroke="currentColor" strokeWidth="0.3" opacity="0.35"/>
      {/* Base plate */}
      <rect x="7.5" y="21.5" width="9" height="1.2" rx="0.2"
        stroke="currentColor" strokeWidth="0.55" fill="currentColor" fillOpacity="0.07"/>
      {/* Flame halo glow lines */}
      <line x1="12" y1="1.2" x2="12" y2="2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.5"/>
      <line x1="10" y1="1.8" x2="10.5" y2="2.5" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.4"/>
      <line x1="14" y1="1.8" x2="13.5" y2="2.5" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.4"/>
    </svg>
  );
}
