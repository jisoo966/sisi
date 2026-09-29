import { ReactNode } from "react";

// Inline SVG noise as a data URL — avoids extra network request
const PAPER_NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>
  <filter id='n'>
    <feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/>
    <feColorMatrix type='saturate' values='0'/>
  </filter>
  <rect width='256' height='256' filter='url(%23n)' opacity='0.35'/>
</svg>`;

const NOISE_URL = `url("data:image/svg+xml,${PAPER_NOISE_SVG.replace(/\n\s*/g, " ")}")`;

type PaperBackgroundProps = {
  children: ReactNode;
  className?: string;
  /** Skip the edge vignette — useful inside cards */
  noEdge?: boolean;
};

export default function PaperBackground({
  children,
  className = "",
  noEdge = false,
}: PaperBackgroundProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ backgroundColor: "var(--sisi-paper)" }}
    >
      {/* Layer 1: paper grain noise */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: NOISE_URL,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
          opacity: 0.055,
          mixBlendMode: "multiply",
        }}
      />

      {/* Layer 2: warm-to-cool gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(245, 239, 221,0.18) 0%, rgba(245, 239, 221,0.12) 50%, rgba(245, 239, 221,0.08) 100%)",
        }}
      />

      {/* Layer 3: inner shadow / page edge */}
      {!noEdge && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            boxShadow: "inset 0 0 48px rgba(16, 45, 50,0.045), inset 0 0 8px rgba(16, 45, 50,0.03)",
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
