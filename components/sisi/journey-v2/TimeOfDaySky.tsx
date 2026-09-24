"use client";

import { useEffect, useRef, useState } from "react";
import { SKY_SRC, type SkyPhase, type TimeOfDay } from "@/lib/timeOfDay";

/**
 * TimeOfDaySky — the fixed sky (no horizontal movement), for the Journey and
 * Moments alike, so both pages always show the same sky when they hand over.
 *
 *   - the sky painting is anchored at the bottom, just under the meadow line,
 *     so the evening's coral horizon sits behind the far vegetation
 *   - a change of phase crossfades over ~3.2s; never a hard swap; at most
 *     two sky layers are mounted
 *   - late at night an inky-blue overlay deepens slowly
 *
 * Keeps the `journey-sky-fixed` class so existing layer rules still apply.
 */

const FADE_MS = 3200;

type Layer = { id: number; phase: SkyPhase; shown: boolean };

export function TimeOfDaySky({ tod }: { tod: TimeOfDay | null }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const nextId = useRef(1);
  const first = useRef(true);

  useEffect(() => {
    if (!tod) return;
    setLayers((ls) => {
      const top = ls[ls.length - 1];
      if (top && top.phase === tod.phase) return ls;
      const id = nextId.current++;
      if (first.current || ls.length === 0) {
        first.current = false;
        return [{ id, phase: tod.phase, shown: true }];
      }
      // keep only the current sky under the incoming one
      return [top, { id, phase: tod.phase, shown: false }];
    });
  }, [tod]);

  // fade the incoming layer in, then retire the one beneath it
  useEffect(() => {
    const incoming = layers.find((l) => !l.shown);
    if (!incoming) return;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        setLayers((ls) => ls.map((l) => (l.id === incoming.id ? { ...l, shown: true } : l))),
      ),
    );
    return () => cancelAnimationFrame(raf);
  }, [layers]);
  useEffect(() => {
    if (layers.length < 2 || !layers[layers.length - 1].shown) return;
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), FADE_MS + 200);
    return () => clearTimeout(t);
  }, [layers]);

  return (
    <div className="journey-sky-fixed tod-sky" aria-hidden>
      {layers.map((l, i) => (
        <div
          key={l.id}
          className="tod-sky-layer"
          style={{
            backgroundImage: `url(${SKY_SRC[l.phase]})`,
            opacity: l.shown ? 1 : 0,
            zIndex: i,
          }}
        />
      ))}
      <div className="tod-sky-ink" style={{ opacity: tod?.ink ?? 0 }} />
      <style jsx global>{`
        .tod-sky.journey-sky-fixed {
          position: absolute;
          left: 0;
          right: 0;
          width: auto;
          /* extra sky above for the Stars camera move */
          top: -40%;
          height: auto;
          /* the painting ends just under the meadow line */
          bottom: calc(var(--walking-baseline) - 3%);
          pointer-events: none;
          background: #3a7ef0;
        }
        .tod-sky-layer {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center bottom;
          background-repeat: no-repeat;
          transition: opacity ${FADE_MS}ms ease-in-out;
        }
        .tod-sky-ink {
          position: absolute;
          inset: 0;
          z-index: 5;
          background: #0b1a33;
          transition: opacity 3s ease-in-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .tod-sky-layer { transition-duration: 1200ms; }
        }
      `}</style>
    </div>
  );
}
