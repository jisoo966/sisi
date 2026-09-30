"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { effectsLayer, prefersReducedMotion } from "@/lib/fx";
import { clampPt, type Pt } from "@/lib/fxAnchors";
import { FX } from "@/lib/fxAssets";

/**
 * SisiGlint — the one small piece of magic, five hand-printed stages cut
 * from the glint sheet into separate sprites (/sisi-assets/effects/glint/):
 *
 *   dot → small star → full ivory star with a coral-gold centre →
 *   dissolving into particles → faint grainy glow
 *
 * All five frames share one box and one centre; only their visibility
 * changes. ~1.2s, plays once. Drawn in the viewport effects layer at a
 * viewport point, clamped into the effects safe area.
 *
 * Reduced motion: only the full star fades in and out.
 *
 *   <SisiGlint at={{ x, y }} size={56} onDone={…} />
 */

/** frame start times and the total, ms — quick to bloom, slower to fade */
const FRAMES_AT = [0, 130, 300, 620, 900];
const TOTAL_MS = 1250;

export function SisiGlint({
  at,
  size = 56,
  onDone,
}: {
  /** where it blooms (viewport px) */
  at: Pt;
  /** on-screen size of the shared frame box */
  size?: number;
  onDone?: () => void;
}) {
  const [reduced, setReduced] = useState(false);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [c] = useState(() => (typeof window === "undefined" ? at : clampPt(at, size / 2)));

  useEffect(() => {
    const r = prefersReducedMotion();
    setReduced(r);
    setLayer(effectsLayer());
    const t = setTimeout(() => onDone?.(), (r ? 800 : TOTAL_MS) + 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!layer) return null;
  const frames = reduced ? [2] : [0, 1, 2, 3, 4];
  return createPortal(
    <span className="glint-box" style={{ left: c.x - size / 2, top: c.y - size / 2, width: size, height: size }} aria-hidden>
      {frames.map((i) => {
        const t0 = FRAMES_AT[i];
        const t1 = i < 4 ? FRAMES_AT[i + 1] : TOTAL_MS;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={FX.glint[i]}
            alt=""
            draggable={false}
            className="glint-frame"
            style={{
              animationName: reduced ? "glint-still" : i === 4 ? "glint-last" : "glint-frame",
              animationDuration: reduced ? "800ms" : `${t1 - t0 + 140}ms`,
              animationDelay: reduced ? "0ms" : `${t0}ms`,
            }}
          />
        );
      })}
      <style jsx global>{`
        .glint-box { position: absolute; display: block; pointer-events: none; }
        .glint-frame {
          position: absolute; inset: 0; width: 100%; height: 100%; display: block; opacity: 0;
          animation-timing-function: ease-in-out; animation-fill-mode: both; animation-iteration-count: 1;
        }
        /* each stage fades in, holds, and crossfades into the next — visibility only */
        @keyframes glint-frame { 0% { opacity: 0; } 22% { opacity: 1; } 78% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes glint-last { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes glint-still { 0%, 100% { opacity: 0; } 45% { opacity: 1; } }
        html.app-hidden .glint-frame { animation-play-state: paused !important; }
      `}</style>
    </span>,
    layer,
  );
}
