/**
 * Sísí icons — one outlined family (Lucide geometry, ISC licence), drawn
 * inline so there's no extra dependency. 1.5px stroke, rounded caps,
 * currentColor. Only Stars may use a filled gold glyph (`StarGlyph`).
 */

type IconProps = { size?: number; className?: string; strokeWidth?: number; title?: string };

function Svg({ size = 20, className, strokeWidth = 1.5, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export const IconClose = (p: IconProps) => (<Svg {...p}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>);
export const IconMore = (p: IconProps) => (<Svg {...p}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Svg>);
export const IconBack = (p: IconProps) => (<Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>);
export const IconChevronRight = (p: IconProps) => (<Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>);
export const IconChevronDown = (p: IconProps) => (<Svg {...p}><path d="m6 9 6 6 6-6" /></Svg>);
export const IconCamera = (p: IconProps) => (<Svg {...p}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></Svg>);
export const IconList = (p: IconProps) => (<Svg {...p}><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></Svg>);
export const IconMenu = (p: IconProps) => (<Svg {...p}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>);
export const IconPlus = (p: IconProps) => (<Svg {...p}><path d="M5 12h14" /><path d="M12 5v14" /></Svg>);
export const IconSend = (p: IconProps) => (<Svg {...p}><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></Svg>);
export const IconPencil = (p: IconProps) => (<Svg {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></Svg>);
export const IconTrash = (p: IconProps) => (<Svg {...p}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></Svg>);
export const IconUnlink = (p: IconProps) => (<Svg {...p}><path d="m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71" /><path d="m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71" /><path d="M8 2v3" /><path d="M2 8h3" /><path d="M16 22v-3" /><path d="M22 16h-3" /></Svg>);
export const IconImage = (p: IconProps) => (<Svg {...p}><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></Svg>);
export const IconBell = (p: IconProps) => (<Svg {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Svg>);
export const IconBag = (p: IconProps) => (<Svg {...p}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>);
export const IconPlay = (p: IconProps) => (<Svg {...p}><path d="m7 4 13 8-13 8V4z" /></Svg>);
export const IconPause = (p: IconProps) => (<Svg {...p}><path d="M8 4v16" /><path d="M16 4v16" /></Svg>);
export const IconSettings = (p: IconProps) => (<Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>);
export const IconMusic = (p: IconProps) => (<Svg {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></Svg>);
export const IconShare = (p: IconProps) => (<Svg {...p}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="m16 6-4-4-4 4" /><path d="M12 2v13" /></Svg>);
export const IconDownload = (p: IconProps) => (<Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></Svg>);
export const IconStar = (p: IconProps) => (<Svg {...p}><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5L2.6 9.3l6.5-.9z" /></Svg>);

/** The one filled icon: a small gold four-point Star (Stars only). */
export function StarGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 1.5c.6 5.2 3.3 7.9 8.5 8.5v.1c-5.2.6-7.9 3.3-8.5 8.5h-.1c-.6-5.2-3.3-7.9-8.5-8.5V10c5.2-.6 7.9-3.3 8.5-8.5z" transform="translate(0 2)" fill="var(--sisi-gold)" />
    </svg>
  );
}
