export default function EyeSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Triangle */}
      <path
        d="M12 3L21.5 20H2.5Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.04"
      />
      {/* Eye almond */}
      <path
        d="M8.5 13.5C9.5 11.5 14.5 11.5 15.5 13.5C14.5 15.5 9.5 15.5 8.5 13.5Z"
        stroke="currentColor" strokeWidth="0.65" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.06"
      />
      {/* Iris */}
      <circle cx="12" cy="13.5" r="1.5" stroke="currentColor" strokeWidth="0.6"/>
      {/* Pupil */}
      <circle cx="12" cy="13.5" r="0.6" fill="currentColor"/>
      {/* Iris cross-hatch lines */}
      <line x1="12" y1="12" x2="12" y2="15" stroke="currentColor" strokeWidth="0.3" opacity="0.5"/>
      <line x1="10.5" y1="13.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="0.3" opacity="0.5"/>
      {/* Radiating rays above triangle */}
      <line x1="12" y1="1.2" x2="12" y2="2.6" stroke="currentColor" strokeWidth="0.55" strokeLinecap="round"/>
      <line x1="14.5" y1="1.6" x2="13.8" y2="2.9" stroke="currentColor" strokeWidth="0.45" strokeLinecap="round"/>
      <line x1="9.5" y1="1.6" x2="10.2" y2="2.9" stroke="currentColor" strokeWidth="0.45" strokeLinecap="round"/>
      <line x1="16.5" y1="2.8" x2="15.5" y2="3.8" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round"/>
      <line x1="7.5" y1="2.8" x2="8.5" y2="3.8" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round"/>
    </svg>
  );
}
