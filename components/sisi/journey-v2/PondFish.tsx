"use client";

import { useEffect, useMemo, useRef } from "react";
import { BASE_GROUND_SPEED, worldClock } from "@/lib/worldMotion";

/**
 * PondFish — a few small fish in the pond (Bridge & Pond theme).
 *
 * The pond flows left; the fish face right and swim against it. On screen
 * the two add up: water −41 px/s + a coral fish's own +14 = drifting left at
 * 27 — while Sísí walks she slowly passes them; when she stops, the water
 * slows to its own drift and the fish make headway to the right.
 *
 *   coral        12–16 px/s   lively
 *   ivory         7–10 px/s   unhurried
 *   far, small    4–6 px/s    small, quiet, a little higher (nearer the bridge)
 *
 * Each rises and falls 2–4px over 3–5s, out of step. They are spread over a
 * span wider than the screen, unevenly, so 2–4 show at a time with empty
 * water between. Only the open water below the bridge: above the near bank
 * (ground row 684 → 10.9% of its box) and below the piles' feet (19.2%).
 * Reduced motion: they rest in the water.
 */

type Props = {
  srcs: string[];
  /** the ground box's bottom (the fish depths are measured in it) */
  bottom: string;
  /** the water's own speed while walking, and its drift (px/s) */
  waterSpeed: number;
  waterDrift: number;
};

// deterministic, so a reload looks the same (and server = client)
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** where the fish travel: wider than the screen, so some water stays empty */
const SPAN = 2.1; // × the stage width
const KINDS = [
  { src: 0, speed: [12, 16], w: [34, 44], depth: [10.8, 13.6], opacity: 1 },
  { src: 1, speed: [7, 10], w: [36, 46], depth: [11.4, 14.4], opacity: 1 },
  { src: 0, speed: [4, 6], w: [20, 26], depth: [15, 16.6], opacity: 0.78 },
  { src: 1, speed: [4, 6], w: [20, 24], depth: [15.2, 16.8], opacity: 0.78 },
  { src: 0, speed: [12, 16], w: [30, 38], depth: [11, 13], opacity: 1 },
  { src: 1, speed: [7, 10], w: [34, 42], depth: [12, 14.6], opacity: 1 },
] as const;

export function PondFish({ srcs, bottom, waterSpeed, waterDrift }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const fish = useMemo(
    () =>
      KINDS.map((k, i) => {
        const lerp = (r: readonly [number, number], n: number) => r[0] + (r[1] - r[0]) * rnd(i, n);
        return {
          src: srcs[k.src % srcs.length],
          speed: lerp(k.speed, 1),
          w: Math.round(lerp(k.w, 2)),
          depth: lerp(k.depth, 3),
          opacity: k.opacity,
          // uneven starts along the span (gaps of open water between)
          at: (i / KINDS.length + (rnd(i, 4) - 0.5) * 0.12) * SPAN,
          bob: 2 + rnd(i, 5) * 2, // px
          bobS: 3 + rnd(i, 6) * 2, // s
          bobDelay: -rnd(i, 7) * 5,
        };
      }),
    [srcs],
  );

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const W = boxRef.current?.offsetWidth ?? 0;
      fish.forEach((f, i) => {
        const el = fishRefs.current[i];
        if (el) el.style.transform = `translate3d(${(((f.at % 1) + 1) % 1) * W}px,0,0)`;
      });
      return;
    }
    let raf = 0;
    const tick = (now: number) => {
      const W = boxRef.current?.offsetWidth ?? 0;
      if (W > 0) {
        const t = now / 1000;
        // how far the water has carried things (the same as the water layer)
        const water = worldClock().getDistance() * (waterSpeed / BASE_GROUND_SPEED) + waterDrift * t;
        const span = W * SPAN;
        fish.forEach((f, i) => {
          const el = fishRefs.current[i];
          if (!el) return;
          const x = f.at * W + f.speed * t - water; // swimming right, carried left
          const wrapped = (((x % span) + span) % span) - f.w; // in (−w, span − w]
          el.style.transform = `translate3d(${wrapped.toFixed(1)}px,0,0)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fish, waterSpeed, waterDrift]);

  return (
    <div ref={boxRef} className="pf-box" style={{ bottom }} aria-hidden>
      {fish.map((f, i) => (
        <span
          key={i}
          ref={(el) => {
            fishRefs.current[i] = el;
          }}
          className="pf-fish"
          style={{ bottom: `${f.depth.toFixed(2)}%`, width: f.w, opacity: f.opacity }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={f.src}
            alt=""
            draggable={false}
            style={
              {
                animationDuration: `${f.bobS.toFixed(2)}s`,
                animationDelay: `${f.bobDelay.toFixed(2)}s`,
                ["--bob" as string]: `${f.bob.toFixed(1)}px`,
              } as React.CSSProperties
            }
          />
        </span>
      ))}
      <style jsx global>{`
        /* the ground's box: as tall as the stage, resting where the ground rests */
        .pf-box { position: absolute; left: 0; right: 0; height: 100%; pointer-events: none; overflow: hidden; z-index: 3; }
        .pf-fish { position: absolute; left: 0; display: block; aspect-ratio: 2 / 1; will-change: transform; }
        /* the art faces right: they swim upstream */
        .pf-fish img { display: block; width: 100%; height: 100%; animation: pf-bob ease-in-out infinite alternate; }
        @keyframes pf-bob { from { translate: 0 calc(var(--bob) / -2); rotate: -1.5deg; } to { translate: 0 calc(var(--bob) / 2); rotate: 1.5deg; } }
        @media (prefers-reduced-motion: reduce) { .pf-fish img { animation: none; } }
      `}</style>
    </div>
  );
}
