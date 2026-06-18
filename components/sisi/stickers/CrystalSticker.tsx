export default function CrystalSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Main gem body — elongated hexagon */}
      <path
        d="M12 2L17.5 7L19 12L17.5 17L12 22L6.5 17L5 12L6.5 7Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.05"
      />
      {/* Girdle line */}
      <path d="M5 12L12 12L19 12" stroke="currentColor" strokeWidth="0.4" opacity="0.5"/>
      {/* Upper facets — crown */}
      <line x1="12" y1="2" x2="12" y2="12" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      <line x1="17.5" y1="7" x2="12" y2="12" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      <line x1="6.5" y1="7" x2="12" y2="12" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      {/* Upper side facets */}
      <line x1="9" y1="3.8" x2="8" y2="9.5" stroke="currentColor" strokeWidth="0.3" opacity="0.4"/>
      <line x1="15" y1="3.8" x2="16" y2="9.5" stroke="currentColor" strokeWidth="0.3" opacity="0.4"/>
      {/* Lower facets — pavilion */}
      <line x1="12" y1="12" x2="17.5" y2="17" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      <line x1="12" y1="12" x2="6.5" y2="17" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      <line x1="12" y1="12" x2="12" y2="22" stroke="currentColor" strokeWidth="0.4" opacity="0.55"/>
      {/* Highlight line — vintage sparkle */}
      <path d="M9 5.5L10.5 7.5" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.7"/>
      <path d="M8 4.5L8.5 5" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  );
}
