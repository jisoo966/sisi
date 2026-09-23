"use client";

import { useEffect, useRef, useState } from "react";

/**
 * StarTrail — storyboard frame 2: a dotted trail of light rising from the
 * companion to its star, the moment the fox stops and looks up.
 *
 * Mounted only when the Journey enters star-view. Dots light up one by one
 * from the fox toward the star (~0.6s), shimmer, then the whole trail fades
 * as the camera begins to tilt up (~0.9s, lib/useLookUpTimeline.ts).
 *
 * Positions mirror the CSS world variables (kept in sync by hand):
 *   companion x 37%, walking baseline 26%, cat width clamp(110px, 30vw, 165px)
 *   star (walking) 78% / 15%
 */

const COMPANION_X = 0.37;
const BASELINE = 0.26;
const STAR_X = 0.78;
const STAR_Y = 0.15;
/** Fox art: 648×571, head/nose area ≈ (78%, 12%) of the image. */
const HEAD_X = 0.78;
const HEAD_Y = 0.12;
const DOT_GAP = 11; // px between dots

type Pt = { x: number; y: number };

export function StarTrail() {
  const ref = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Pt[]>([]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const W = el.offsetWidth;
    const H = el.offsetHeight;
    const catW = Math.min(165, Math.max(110, window.innerWidth * 0.3));
    const catH = (catW * 571) / 648;
    const foxLeft = W * COMPANION_X - catW / 2;
    const foxTop = H * (1 - BASELINE) + catW * 0.0401 - catH;
    const from = { x: foxLeft + catW * HEAD_X, y: foxTop + catH * HEAD_Y - 6 };
    const to = { x: W * STAR_X, y: H * STAR_Y + 14 };
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    const n = Math.max(2, Math.floor(len / DOT_GAP));
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
    }
    setDots(pts);
  }, []);

  const n = dots.length;
  return (
    <div ref={ref} className="star-trail" aria-hidden>
      <svg width="100%" height="100%">
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i % 3 === 0 ? 1.7 : 1.2}
            className="trail-dot"
            style={{ animationDelay: `${150 + (i / Math.max(1, n)) * 550}ms, ${700 + (i % 5) * 90}ms` }}
          />
        ))}
      </svg>
      <style jsx>{`
        .star-trail {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          animation: trail-out 450ms ease-in 1000ms forwards;
        }
        .star-trail svg {
          display: block;
          overflow: visible;
        }
        .star-trail :global(.trail-dot) {
          fill: rgb(255, 246, 220);
          opacity: 0;
          filter: drop-shadow(0 0 2px rgba(255, 236, 190, 0.9));
          animation:
            trail-dot-in 260ms ease-out forwards,
            trail-shimmer 700ms ease-in-out infinite alternate;
        }
        @keyframes trail-dot-in {
          from { opacity: 0; }
          to   { opacity: 0.95; }
        }
        @keyframes trail-shimmer {
          from { opacity: 0.95; }
          to   { opacity: 0.55; }
        }
        @keyframes trail-out {
          to { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .star-trail { display: none; }
        }
      `}</style>
    </div>
  );
}
