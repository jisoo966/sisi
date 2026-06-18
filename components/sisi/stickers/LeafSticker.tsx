export default function LeafSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Leaf outline — elongated, slightly asymmetric */}
      <path
        d="M12 2.5C12 2.5 18.5 5 18.5 11.5C18.5 17 14 20.5 12 21.5C10 20.5 5.5 17 5.5 11.5C5.5 5 12 2.5 12 2.5Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.06"
      />
      {/* Midrib */}
      <line x1="12" y1="3.5" x2="12" y2="21" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      {/* Lateral veins — left */}
      <path d="M12 8L9 10.5" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 11L8 13" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 14L9 16" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 17L10.5 18.5" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.5"/>
      {/* Lateral veins — right */}
      <path d="M12 8L15 10.5" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 11L16 13" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 14L15 16" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.65"/>
      <path d="M12 17L13.5 18.5" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.5"/>
      {/* Tertiary veins — subtle */}
      <path d="M9 10.5L7.8 11.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.35"/>
      <path d="M8 13L7 14" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.35"/>
      <path d="M15 10.5L16.2 11.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.35"/>
      <path d="M16 13L17 14" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.35"/>
      {/* Tip accent */}
      <circle cx="12" cy="3.2" r="0.5" fill="currentColor" opacity="0.5"/>
    </svg>
  );
}
