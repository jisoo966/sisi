"use client";

import { useEffect, useRef, useState } from "react";
import { ParallaxLayer } from "@/components/sisi/journey-v2/ParallaxLayer";
import { LAYER_SPEED } from "@/lib/worldMotion";
import type { SkyPhase } from "@/lib/timeOfDay";

/**
 * MeadowStrip — the continuous time-of-day grass line (meadow-strip-*),
 * always present, moving 1:1 with the ground and the path.
 *
 * It sits just behind the walking path on the shared baseline: the strip's
 * flat lower edge is tucked under the path, only its grass tips rise above.
 * Same height and baseline for every time of day (never stretched); when
 * the time changes, the matching strip crossfades in slowly with the sky.
 * Tiles overlap by 2px so no sub-pixel seam shows.
 */

const STRIP: Record<SkyPhase, { src: string; ih: number; bottom: number }> = {
  // ih: image height; bottom: lowest painted row (measured)
  morning: { src: "/V2/time-of-day/meadow-strip-morning.png", ih: 232, bottom: 226 },
  afternoon: { src: "/V2/time-of-day/meadow-strip-afternoon.png", ih: 242, bottom: 214 },
  evening: { src: "/V2/time-of-day/meadow-strip-evening.png", ih: 241, bottom: 200 },
};
/** strip height (for a 242px image) as a fraction of the stage height */
const BASE_H = 0.12;
export const MEADOW_FADE_MS = 15000;

type Layer = { id: number; phase: SkyPhase; shown: boolean };

export function MeadowStrip({ phase, zIndex = 2 }: { phase: SkyPhase | null; zIndex?: number }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!phase) return;
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (top && top.phase === phase) return ls;
      const id = nextId.current++;
      if (!top) return [{ id, phase, shown: true }]; // fresh launch: right away
      return [top, { id, phase, shown: false }];
    });
  }, [phase]);
  useEffect(() => {
    const incoming = layers.find((l) => !l.shown);
    if (!incoming) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => setLayers((ls) => ls.map((l) => (l.id === incoming.id ? { ...l, shown: true } : l)))),
    );
    return () => cancelAnimationFrame(raf);
  }, [layers]);
  useEffect(() => {
    if (layers.length < 2 || !layers[layers.length - 1].shown) return;
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), MEADOW_FADE_MS + 300);
    return () => clearTimeout(t);
  }, [layers]);

  return (
    <div className="jw-strip" style={{ zIndex }} aria-hidden>
      {layers.map((l, i) => {
        const S = STRIP[l.phase];
        const h = BASE_H * (S.ih / 242);
        const below = ((S.ih - S.bottom) / S.ih) * h; // transparent rows under the grass
        return (
          <div key={l.id} className="jw-strip-layer" style={{ opacity: l.shown ? 1 : 0, zIndex: i }}>
            <ParallaxLayer
              src={S.src}
              speed={LAYER_SPEED.walkingGround}
              align="bottom"
              heightPct={h}
              // painted bottom exactly on the baseline (tucked under the path)
              bottom={`calc(var(--walking-baseline) - ${(below * 100).toFixed(3)}%)`}
              seamOverlap={2}
            />
          </div>
        );
      })}
      <style jsx global>{`
        .jw-strip, .jw-strip-layer { position: absolute; inset: 0; pointer-events: none; }
        .jw-strip-layer { transition: opacity ${MEADOW_FADE_MS}ms ease-in-out; }
        @media (prefers-reduced-motion: reduce) { .jw-strip-layer { transition-duration: 4000ms; } }
      `}</style>
    </div>
  );
}
