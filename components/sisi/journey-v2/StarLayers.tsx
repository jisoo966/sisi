"use client";

/**
 * StarLayers — the Current Star as three hand-painted PNG layers stacked on
 * the same canvas and centre point: aura (bottom), glow, painted mark (top).
 *
 * Idle: the aura breathes (scale 1.15 ↔ 1.25), the glow softly changes
 * opacity, the mark makes a very small irregular twinkle. No rotation, no
 * CSS glow effects — the painted PNGs carry the look.
 *
 * `selected`  swell to 1.18 over 500ms and brighten aura + glow.
 * `focused`   Star World tap: the painted glow alone expands and brightens.
 * `staged`    layers start hidden and appear in order aura → glow → mark
 *             when `revealed` becomes true.
 *
 * The -512 files are the originals scaled down whole (the 1254px originals
 * stay in /assets).
 */

type Props = {
  selected?: boolean;
  /** Star World: this star was tapped — only its painted glow expands. */
  focused?: boolean;
  staged?: boolean;
  revealed?: boolean;
  alt?: string;
};

export function StarLayers({
  selected = false,
  focused = false,
  staged = false,
  revealed = true,
  alt = "",
}: Props) {
  const cls = [
    "sisi-star",
    selected ? "is-selected" : "",
    focused ? "is-focused" : "",
    staged ? "is-staged" : "",
    staged && revealed ? "is-revealed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <span className="sisi-star__slot sisi-star__slot--aura">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__aura" src="/assets/sisi-star-aura-painted-512.png" alt="" draggable={false} />
      </span>
      <span className="sisi-star__slot sisi-star__slot--glow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__glow" src="/assets/sisi-star-glow-painted-512.png" alt="" draggable={false} />
      </span>
      <span className="sisi-star__slot sisi-star__slot--mark">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sisi-star__mark" src="/assets/sisi-star-mark-painted-512.png" alt={alt} draggable={false} />
      </span>

      <style jsx global>{`
        .sisi-star {
          position: relative;
          width: 48px;
          aspect-ratio: 1;
          transform: scale(1);
          transform-origin: center;
          transition: transform 500ms cubic-bezier(0.33, 1, 0.68, 1);
        }
        .sisi-star__slot {
          position: absolute;
          inset: 0;
          display: block;
          pointer-events: none;
        }
        .sisi-star__slot > img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          user-select: none;
          -webkit-user-drag: none;
          transform-origin: center;
        }
        /* Slot opacity = the layer's "brightness" headroom: idle sits below 1
           so selection can brighten by raising it (opacity only, no filters).
           Idle result: aura 0.30–0.38, glow 0.56–0.72, mark 1. */
        .sisi-star__slot--aura { z-index: 1; opacity: 0.72; }
        .sisi-star__slot--glow { z-index: 2; opacity: 0.75; }
        .sisi-star__slot--mark { z-index: 3; opacity: 1; }
        .sisi-star__slot--aura,
        .sisi-star__slot--glow {
          transition: opacity 500ms ease;
        }

        .sisi-star__aura {
          opacity: 0.47;
          transform: scale(1.2);
          animation: sisiStarAura 6.4s ease-in-out infinite;
        }
        .sisi-star__glow {
          opacity: 0.83;
          transform: scale(0.94);
          animation: sisiStarGlow 4.3s ease-in-out infinite;
        }
        .sisi-star__mark {
          animation: sisiStarTwinkle 5.7s ease-in-out infinite;
        }
        @keyframes sisiStarAura {
          0%, 100% { transform: scale(1.15); opacity: 0.42; }
          50%      { transform: scale(1.25); opacity: 0.53; }
        }
        @keyframes sisiStarGlow {
          0%, 100% { transform: scale(0.94); opacity: 0.75; }
          45%      { transform: scale(0.94); opacity: 0.96; }
          70%      { transform: scale(0.94); opacity: 0.85; }
        }
        @keyframes sisiStarTwinkle {
          0%, 100% { transform: scale(1);     opacity: 1; }
          13%      { transform: scale(1.018); opacity: 1; }
          21%      { transform: scale(0.992); opacity: 0.94; }
          47%      { transform: scale(1);     opacity: 1; }
          58%      { transform: scale(1.012); opacity: 0.97; }
          81%      { transform: scale(0.996); opacity: 1; }
        }

        /* Selected (star tap / Stars tab): swell to 1.18 over 500ms and
           brighten aura + glow by lifting their slot opacity. */
        .sisi-star.is-selected { transform: scale(1.18); }
        .sisi-star.is-selected .sisi-star__slot--aura,
        .sisi-star.is-selected .sisi-star__slot--glow { opacity: 1; }

        /* Staged reveal (star world): aura → glow → painted mark. */
        .sisi-star.is-staged .sisi-star__slot {
          opacity: 0;
          transform: scale(0.86);
          transition:
            opacity 700ms ease,
            transform 1100ms cubic-bezier(0.22, 1, 0.36, 1);
          transition-delay: 0ms;
        }
        .sisi-star.is-staged.is-revealed .sisi-star__slot { transform: scale(1); }
        .sisi-star.is-staged.is-revealed .sisi-star__slot--aura { opacity: 0.72; transition-delay: 0ms; }
        .sisi-star.is-staged.is-revealed .sisi-star__slot--glow { opacity: 0.75; transition-delay: 350ms; }
        .sisi-star.is-staged.is-revealed .sisi-star__slot--mark { opacity: 1; transition-delay: 700ms; }

        /* Focused (tapped in the Star World): expand only the painted glow. */
        .sisi-star .sisi-star__slot--glow {
          transition:
            opacity 500ms ease,
            transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .sisi-star.is-focused .sisi-star__slot--glow,
        .sisi-star.is-staged.is-revealed.is-focused .sisi-star__slot--glow {
          opacity: 1;
          transform: scale(1.6);
          transition-delay: 0ms;
        }

        @media (prefers-reduced-motion: reduce) {
          .sisi-star__aura,
          .sisi-star__glow,
          .sisi-star__mark { animation: none; }
          .sisi-star.is-staged .sisi-star__slot { transition-duration: 200ms; transition-delay: 0ms !important; }
        }
      `}</style>
    </div>
  );
}
