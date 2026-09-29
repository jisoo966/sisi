import { ReactNode, CSSProperties } from "react";

// Inline SVG grain — single network-free texture
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.70' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)' opacity='0.32'/%3E%3C/svg%3E")`;

type PaperPageProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** 'page' = centered max-width like a book page; 'card' = compact */
  variant?: "page" | "card";
  /** Accent color used for the thin top rule  */
  accent?: "gold" | "rose" | "sage" | "none";
};

const RULES = {
  gold:  "var(--sisi-gold)",
  rose:  "var(--sisi-coral)",
  sage:  "rgba(16, 45, 50, 0.6)",
  none:  "transparent",
};

export default function PaperPage({
  children,
  className = "",
  style,
  variant = "page",
  accent = "none",
}: PaperPageProps) {
  const isPage = variant === "page";

  return (
    <div
      className={`relative ${className}`}
      style={{
        background: "var(--sisi-paper)",
        backgroundImage: GRAIN,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
        // Edge shadow — suggests the page sitting on a surface
        boxShadow: isPage
          ? "0 1px 2px rgba(16, 45, 50,0.04), 0 4px 12px rgba(16, 45, 50,0.08), inset 0 0 40px rgba(16, 45, 50,0.025)"
          : "0 1px 2px rgba(16, 45, 50,0.04), 0 2px 6px rgba(16, 45, 50,0.06)",
        maxWidth: isPage ? 640 : undefined,
        ...style,
      }}
    >
      {/* Grain layer — multiply blend keeps it subtle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", opacity: 0.045, mixBlendMode: "multiply" }}
      />

      {/* Top rule — single accent line, 1px, very quiet */}
      {accent !== "none" && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: RULES[accent], opacity: 0.35 }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
