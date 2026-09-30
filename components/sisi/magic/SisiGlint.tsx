"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PACK } from "@/lib/envAssets";

/**
 * SisiGlint — the one small piece of magic, from the hand-printed
 * five-stage sprite (/sisi-assets/effects/sisi-glint-frames):
 *
 *   dot → small star → full ivory star with a coral-gold centre →
 *   dissolving into particles → faint grainy glow
 *
 * Optionally a tiny golden mote first travels from `from` to `at`.
 * ~1.2s, plays once (never loops). Used for earned Starlight, a World
 * discovery, a new Star and the Fulfilled ceremony.
 *
 * Reduced motion: no travel — the full star simply fades in and out.
 *
 *   <SisiGlint at={{ x, y }} from={{ x, y }} size={56} onDone={…} />
 */

type Pt = { x: number; y: number };

const TRAVEL_MS = 650;
/** frame start times and the total, ms — quick to bloom, slower to fade */
const FRAMES_AT = [0, 130, 300, 620, 900];
const TOTAL_MS = 1250;

export function SisiGlint({
  at,
  from,
  size = 64,
  onDone,
}: {
  /** where it blooms (viewport px) */
  at: Pt;
  /** optional start: a small light travels from here first */
  from?: Pt | null;
  /** on-screen size of one frame (the star itself is ~60% of it) */
  size?: number;
  /** @deprecated the particles are part of the artwork now */
  particles?: number;
  onDone?: () => void;
}) {
  const [phase, setPhase] = useState<"travel" | "bloom">(from ? "travel" : "bloom");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    const travel = from && !r ? TRAVEL_MS : 0;
    if (!travel) setPhase("bloom");
    const t1 = setTimeout(() => setPhase("bloom"), travel);
    const t2 = setTimeout(() => onDone?.(), travel + (r ? 800 : TOTAL_MS) + 60);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (typeof document === "undefined") return null;
  const root = document.getElementById("sisi-overlay-root") ?? document.body;
  const start = from && !reduced ? from : at;
  const g = PACK.glint;
  const k = size / g.frame;
  const frame = (i: number): React.CSSProperties => ({
    backgroundImage: `url(${g.src})`,
    backgroundSize: `${g.w * k}px ${g.h * k}px`,
    backgroundPosition: `${-(g.cx[i] - g.frame / 2) * k}px ${-(g.cy - g.frame / 2) * k}px`,
  });
  const frames = reduced ? [2] : [0, 1, 2, 3, 4];

  return createPortal(
    <div className={`glint${reduced ? " is-reduced" : ""}`} aria-hidden>
      {phase === "travel" && (
        <span
          className="glint-mote"
          style={{ left: start.x, top: start.y, ["--dx" as string]: `${at.x - start.x}px`, ["--dy" as string]: `${at.y - start.y}px` }}
        />
      )}
      {phase === "bloom" && (
        <span className="glint-bloom" style={{ left: at.x, top: at.y, width: size, height: size, margin: `${-size / 2}px 0 0 ${-size / 2}px` }}>
          {frames.map((i, n) => {
            const t0 = FRAMES_AT[i];
            const t1 = i < 4 ? FRAMES_AT[i + 1] : TOTAL_MS;
            return (
              <span
                key={i}
                className="glint-frame"
                style={{
                  ...frame(i),
                  animationName: reduced ? "glint-still" : i === 4 ? "glint-last" : "glint-frame",
                  animationDuration: reduced ? "800ms" : `${t1 - t0 + 140}ms`,
                  animationDelay: reduced ? "0ms" : `${t0}ms`,
                  zIndex: n,
                }}
              />
            );
          })}
        </span>
      )}
      <style jsx global>{`
        .glint { position: fixed; inset: 0; z-index: var(--z-toast); pointer-events: none; }
        .glint-mote {
          position: absolute; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%;
          background: var(--sisi-gold); box-shadow: 0 0 6px 2px rgba(241, 196, 94, 0.45);
          animation: glint-travel ${TRAVEL_MS}ms cubic-bezier(0.45, 0, 0.25, 1) both;
        }
        @keyframes glint-travel {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 1; }
        }
        .glint-bloom { position: absolute; display: block; }
        .glint-frame {
          position: absolute; inset: 0; background-repeat: no-repeat; opacity: 0;
          animation-timing-function: ease-in-out; animation-fill-mode: both; animation-iteration-count: 1;
        }
        /* each stage fades in, holds, and crossfades into the next */
        @keyframes glint-frame { 0% { opacity: 0; } 22% { opacity: 1; } 78% { opacity: 1; } 100% { opacity: 0; } }
        /* the glow lingers, then fades naturally */
        @keyframes glint-last { 0% { opacity: 0; transform: scale(0.96); } 20% { opacity: 1; } 100% { opacity: 0; transform: scale(1.08); } }
        @keyframes glint-still { 0%, 100% { opacity: 0; } 45% { opacity: 1; } }
      `}</style>
    </div>,
    root,
  );
}
