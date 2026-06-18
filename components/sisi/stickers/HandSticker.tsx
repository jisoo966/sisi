export default function HandSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Index finger pointing up */}
      <path
        d="M10.5 12V5.5C10.5 4.7 11 4 12 4C13 4 13.5 4.7 13.5 5.5V12"
        stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"
      />
      {/* Middle finger (curled) */}
      <path
        d="M13.5 12.5V8.5C13.5 7.7 14 7 15 7C16 7 16.5 7.7 16.5 8.5V13"
        stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"
      />
      {/* Ring finger (curled) */}
      <path
        d="M16.5 13.5V10C16.5 9.2 17 8.5 17.8 8.5C18.6 8.5 19 9.2 19 10V14"
        stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"
      />
      {/* Thumb */}
      <path
        d="M10.5 13C10 13 9 13.2 8.5 14C8 14.8 8.2 15.8 9 16.2"
        stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"
      />
      {/* Palm */}
      <path
        d="M9 16C9 16 8.5 17.5 9 18.5C9.5 19.5 10.5 20 12 20C14 20 16 19 17 18C18 17 19 15.5 19 14V13.5"
        stroke="currentColor" strokeWidth="0.75" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Cuff */}
      <path d="M9 18.5C9 18.5 9.5 21 12 21C14.5 21 15.5 19.5 15.5 19.5" stroke="currentColor" strokeWidth="0.65" strokeLinecap="round"/>
      {/* Knuckle lines */}
      <line x1="11.5" y1="8" x2="12.5" y2="8" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.6"/>
      <line x1="11.5" y1="10" x2="12.5" y2="10" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.6"/>
      {/* Fingernail */}
      <path d="M10.8 5.8C10.8 5.8 11.5 5.2 12.2 5.8" stroke="currentColor" strokeWidth="0.35" strokeLinecap="round" opacity="0.7"/>
    </svg>
  );
}
