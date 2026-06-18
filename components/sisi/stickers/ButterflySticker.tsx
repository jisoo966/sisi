export default function ButterflySticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Body */}
      <ellipse cx="12" cy="12" rx="0.9" ry="5.5" stroke="currentColor" strokeWidth="0.65" fill="currentColor" fillOpacity="0.1"/>
      {/* Head */}
      <circle cx="12" cy="5.5" r="1" stroke="currentColor" strokeWidth="0.55" fill="currentColor" fillOpacity="0.08"/>
      {/* Antennae */}
      <path d="M11.5 4.8C10.5 3.5 9.5 3 9 2.5" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round"/>
      <circle cx="8.8" cy="2.3" r="0.45" fill="currentColor"/>
      <path d="M12.5 4.8C13.5 3.5 14.5 3 15 2.5" stroke="currentColor" strokeWidth="0.5" strokeLinecap="round"/>
      <circle cx="15.2" cy="2.3" r="0.45" fill="currentColor"/>
      {/* Upper wings */}
      <path
        d="M11.2 8C11.2 8 6 6.5 4.5 9.5C3.5 12 5.5 14.5 8 14.5C10 14.5 11.2 12.5 11.2 12.5"
        stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
      <path
        d="M12.8 8C12.8 8 18 6.5 19.5 9.5C20.5 12 18.5 14.5 16 14.5C14 14.5 12.8 12.5 12.8 12.5"
        stroke="currentColor" strokeWidth="0.7" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
      {/* Upper wing veins */}
      <path d="M11.2 9.5C9.5 9 7.5 9.5 6 10.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.5"/>
      <path d="M11.2 11C9 10.8 7 11.5 5.5 12.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.5"/>
      <path d="M12.8 9.5C14.5 9 16.5 9.5 18 10.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.5"/>
      <path d="M12.8 11C15 10.8 17 11.5 18.5 12.5" stroke="currentColor" strokeWidth="0.3" strokeLinecap="round" opacity="0.5"/>
      {/* Eyespots — upper wings */}
      <circle cx="8.5" cy="11" r="1.1" stroke="currentColor" strokeWidth="0.4" opacity="0.5"/>
      <circle cx="8.5" cy="11" r="0.4" fill="currentColor" opacity="0.4"/>
      <circle cx="15.5" cy="11" r="1.1" stroke="currentColor" strokeWidth="0.4" opacity="0.5"/>
      <circle cx="15.5" cy="11" r="0.4" fill="currentColor" opacity="0.4"/>
      {/* Lower wings */}
      <path
        d="M11.2 13C11.2 13 7 13 5.5 15.5C4.5 17.5 6 19.5 8.5 19C10.5 18.5 11.2 16.5 11.2 15.5"
        stroke="currentColor" strokeWidth="0.65" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
      <path
        d="M12.8 13C12.8 13 17 13 18.5 15.5C19.5 17.5 18 19.5 15.5 19C13.5 18.5 12.8 16.5 12.8 15.5"
        stroke="currentColor" strokeWidth="0.65" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"
      />
    </svg>
  );
}
