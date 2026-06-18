export default function HeartSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Heart shape */}
      <path
        d="M12 20.5C12 20.5 3 14.5 3 8.5C3 5.5 5.5 3.5 8 3.5C9.8 3.5 11.2 4.5 12 5.8C12.8 4.5 14.2 3.5 16 3.5C18.5 3.5 21 5.5 21 8.5C21 14.5 12 20.5 12 20.5Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.06"
      />
      {/* Vintage inner detail lines */}
      <path d="M9 7C8 7.5 7 9 7.5 11" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.5"/>
      <path d="M8 12.5C9 14 10.5 16 12 17.5" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.5"/>
      {/* Fine hatching on right lobe */}
      <path d="M15.5 6.5C16.5 7 17.5 8.5 17.2 10" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.4"/>
      <path d="M16.5 10.5C16 11.8 15 13" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.4"/>
      {/* Center ornament — small flourish */}
      <path d="M12 9.5C12 9.5 11 10.8 12 12C13 10.8 12 9.5 12 9.5Z" stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.2"/>
      {/* Tiny decorative dots */}
      <circle cx="9.5" cy="5.5" r="0.4" fill="currentColor" opacity="0.6"/>
      <circle cx="14.5" cy="5.5" r="0.4" fill="currentColor" opacity="0.6"/>
    </svg>
  );
}
