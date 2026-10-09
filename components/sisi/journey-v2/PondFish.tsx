"use client";

import { useMemo } from "react";

/**
 * PondFish — a few small fish in the pond (Bridge & Pond theme).
 *
 * The art is one still, right-facing fish each (256×128); they swim by
 * moving: each crosses the pond at its own depth and pace, some to the left
 * (mirrored), with a slow, gentle sway. Placed in the ground's own box
 * (same height and bottom as the ground layer), inside the water rows
 * — only the open water below the bridge, between the piles' feet and the
 * near bank. All drift one way, with the current (leftward).
 * Reduced motion: they simply rest in the water.
 */

type Props = { srcs: string[]; bottom: string; count?: number };

// deterministic, so a reload looks the same (and server = client)
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function PondFish({ srcs, bottom, count = 5 }: Props) {
  const fish = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const left = true; // all with the pond's current: leftward, as the ground flows
        const dur = 26 + rnd(i, 2) * 22; // s to cross the screen
        return {
          src: srcs[i % srcs.length],
          left,
          w: 28 + Math.round(rnd(i, 3) * 18), // 28–46 css px
          // % of the ground box above its bottom. Only the open water under the
          // bridge: above the near bank (row 684 → 10.9%) and below the piles'
          // feet (path row 590 → 19.2% of this box), less a fish's own height
          depth: 10.8 + rnd(i, 4) * 4.6,
          dur,
          delay: -rnd(i, 5) * dur, // already on their way
          sway: 2.6 + rnd(i, 6) * 1.8,
          restX: 8 + rnd(i, 7) * 84, // reduced motion: where each rests
        };
      }),
    [srcs, count],
  );
  return (
    <div className="pf-box" style={{ bottom }} aria-hidden>
      {fish.map((f, i) => (
        <span
          key={i}
          className={`pf-fish${f.left ? " is-left" : ""}`}
          style={
            {
              bottom: `${f.depth.toFixed(2)}%`,
              width: f.w,
              animationDuration: `${f.dur.toFixed(1)}s`,
              animationDelay: `${f.delay.toFixed(1)}s`,
              ["--rest-x" as string]: `${f.restX.toFixed(1)}%`,
            } as React.CSSProperties
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.src} alt="" draggable={false} style={{ animationDuration: `${f.sway.toFixed(2)}s` }} />
        </span>
      ))}
      <style jsx global>{`
        /* the ground's box: as tall as the stage, resting where the ground rests */
        .pf-box { position: absolute; left: 0; right: 0; height: 100%; pointer-events: none; overflow: hidden; z-index: 3; }
        .pf-fish {
          position: absolute; left: 0; display: block; aspect-ratio: 2 / 1;
          animation-name: pf-swim-right; animation-timing-function: linear; animation-iteration-count: infinite;
          will-change: transform;
        }
        .pf-fish.is-left { animation-name: pf-swim-left; }
        .pf-fish img { display: block; width: 100%; height: 100%; animation: pf-sway ease-in-out infinite alternate; }
        .pf-fish.is-left img { scale: -1 1; }
        @keyframes pf-swim-right { from { transform: translateX(-60px); } to { transform: translateX(calc(100vw + 60px)); } }
        @keyframes pf-swim-left { from { transform: translateX(calc(100vw + 60px)); } to { transform: translateX(-60px); } }
        @keyframes pf-sway { from { translate: 0 -1.5px; rotate: -2deg; } to { translate: 0 1.5px; rotate: 2deg; } }
        @media (prefers-reduced-motion: reduce) {
          .pf-fish { animation: none; left: var(--rest-x); }
          .pf-fish img { animation: none; }
        }
      `}</style>
    </div>
  );
}
