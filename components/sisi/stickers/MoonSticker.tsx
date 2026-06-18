export default function MoonSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Outer crescent */}
      <path
        d="M16.5 4C13 4.5 9.5 7.5 9.5 12C9.5 16.5 13 19.5 16.5 20C14 20.5 8 19.5 6.5 14.5C5.5 10.5 7 6.5 10 4.5C12 3.2 14.5 3.5 16.5 4Z"
        stroke="currentColor" strokeWidth="0.75" strokeLinejoin="round"
        fill="currentColor" fillOpacity="0.06"
      />
      {/* Filigree surface lines */}
      <path d="M10.5 8.5C11.5 8 12.8 7.8 13.8 8.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.55"/>
      <path d="M9.8 11.5C11 11 13 10.8 14.5 11.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.55"/>
      <path d="M10.2 14.5C11.2 14 12.8 13.9 14 14.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.55"/>
      {/* Small stars */}
      <path d="M19 7L19.5 8.2L20.8 8L19.8 9L20.2 10.3L19 9.5L17.8 10.3L18.2 9L17.2 8L18.5 8.2Z" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round"/>
      <circle cx="20.5" cy="13" r="0.5" fill="currentColor"/>
      <circle cx="18.5" cy="16.5" r="0.4" fill="currentColor"/>
    </svg>
  );
}
