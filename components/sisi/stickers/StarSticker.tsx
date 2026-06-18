export default function StarSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer star */}
      <path
        d="M12 2.3L14.4 8.75L21.15 9.05L15.85 13.35L17.65 19.95L12 16.2L6.3 19.85L8.15 13.3L2.7 9.0L9.6 8.8Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round" fill="none"
      />
      {/* Fine inner radial lines */}
      <line x1="12" y1="5.4" x2="12" y2="8.4" stroke="currentColor" strokeWidth="0.35" opacity="0.55"/>
      <line x1="18.5" y1="10.8" x2="16.1" y2="12.2" stroke="currentColor" strokeWidth="0.35" opacity="0.55"/>
      <line x1="16.5" y1="17.9" x2="14.3" y2="15.8" stroke="currentColor" strokeWidth="0.35" opacity="0.55"/>
      <line x1="7.5" y1="17.9" x2="9.6" y2="15.8" stroke="currentColor" strokeWidth="0.35" opacity="0.55"/>
      <line x1="5.4" y1="10.8" x2="7.9" y2="12.1" stroke="currentColor" strokeWidth="0.35" opacity="0.55"/>
      {/* Center */}
      <circle cx="12" cy="12.1" r="0.85" fill="currentColor"/>
    </svg>
  );
}
