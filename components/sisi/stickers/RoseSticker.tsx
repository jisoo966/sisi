export default function RoseSticker({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Stem */}
      <path d="M12 22V15.5" stroke="currentColor" strokeWidth="0.75" strokeLinecap="round"/>
      {/* Left leaf */}
      <path d="M12 19C12 19 9 18.5 8 16.5C9.5 16.5 11.5 17.5 12 19Z"
        stroke="currentColor" strokeWidth="0.55" strokeLinejoin="round" fill="currentColor" fillOpacity="0.07"/>
      {/* Right leaf */}
      <path d="M12 17.5C12 17.5 15 17 16 15C14.5 15 12.5 16 12 17.5Z"
        stroke="currentColor" strokeWidth="0.55" strokeLinejoin="round" fill="currentColor" fillOpacity="0.07"/>
      {/* Sepal */}
      <path d="M10 15.5C10 15.5 11 14.5 12 14.5C13 14.5 14 15.5 14 15.5"
        stroke="currentColor" strokeWidth="0.55" strokeLinecap="round"/>
      {/* Outer petals */}
      <path d="M8.5 13C8 11 9 8.5 12 8.5C15 8.5 16 11 15.5 13C15 11.5 13.5 10.5 12 10.5C10.5 10.5 9 11.5 8.5 13Z"
        stroke="currentColor" strokeWidth="0.65" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"/>
      <path d="M9 8.5C8 6.5 9.5 4.5 12 4.5C14.5 4.5 16 6.5 15 8.5"
        stroke="currentColor" strokeWidth="0.6" strokeLinecap="round"/>
      {/* Side petals */}
      <path d="M8.5 11.5C7 11 6 9 7 7.5C7.5 9 8 10.5 8.5 11.5Z"
        stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"/>
      <path d="M15.5 11.5C17 11 18 9 17 7.5C16.5 9 16 10.5 15.5 11.5Z"
        stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.05"/>
      {/* Center spiral */}
      <path d="M12 11C12 11 11.2 10.5 11.5 9.5C12.5 9.5 13 10.5 12 11Z"
        stroke="currentColor" strokeWidth="0.5" fill="currentColor" fillOpacity="0.12"/>
      <path d="M12 9.5C12 9.5 11.8 8.5 12.5 8.2" stroke="currentColor" strokeWidth="0.4" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}
