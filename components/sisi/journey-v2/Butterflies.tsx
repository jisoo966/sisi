"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Butterflies — a few butterflies in the air (Butterfly Forest).
 *
 * Each is one of the set's wing poses (01 → 02 → 03 → 02, ~110ms a frame)
 * drifting slowly across the open air above the path, 8–18 px/s, some to
 * the left and some to the right (mirrored), rising and falling 5–12px over
 * 3–5s. 2–4 at a time: some are already on their way when you arrive, and a
 * new one comes in from either side after an uneven pause.
 * Reduced motion: a still pose, resting in the air.
 */

type Kind = string[]; // wing frames 01, 02, 03
type Fly = {
  id: number;
  frames: Kind;
  w: number;
  left: boolean;
  /** % of the stage above the walking baseline */
  height: number;
  dur: number;
  delay: number;
  rise: number;
  riseS: number;
  flapMs: number;
};

const between = (a: number, b: number) => a + Math.random() * (b - a);
const MAX = 4;

export function Butterflies({ kinds }: { kinds: Kind[] }) {
  const [flies, setFlies] = useState<Fly[]>([]);
  const [still, setStill] = useState(false);
  const seq = useRef(0);
  const kindsRef = useRef(kinds);
  kindsRef.current = kinds;

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    setStill(reduced);
    const make = (midway: number): Fly => {
      const W = window.innerWidth;
      const speed = between(8, 18);
      const dur = (W + 120) / speed;
      const k = kindsRef.current;
      return {
        id: ++seq.current,
        frames: k[Math.floor(Math.random() * k.length)],
        w: Math.round(between(24, 36)),
        left: Math.random() < 0.5,
        height: between(6, 34),
        dur,
        delay: -midway * dur,
        rise: between(5, 12),
        riseS: between(3, 5),
        flapMs: Math.round(between(100, 125)),
      };
    };
    // arriving: a few already on their way
    setFlies([make(between(0.15, 0.4)), make(between(0.45, 0.8)), ...(Math.random() < 0.5 ? [make(between(0.1, 0.9))] : [])]);
    if (reduced) return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const next = () => {
      t = setTimeout(() => {
        setFlies((list) => (list.length >= MAX || document.hidden ? list : [...list, make(0)]));
        next();
      }, between(5000, 14000));
    };
    next();
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="bf-box" aria-hidden>
      {flies.map((f) => (
        <span
          key={f.id}
          className={`bf-fly${f.left ? " is-left" : ""}`}
          style={{
            bottom: `calc(var(--walking-baseline) + ${f.height.toFixed(1)}%)`,
            width: f.w,
            animationDuration: `${f.dur.toFixed(1)}s`,
            animationDelay: `${f.delay.toFixed(1)}s`,
            ...(still ? { animation: "none", left: `${(10 + ((f.id * 37) % 80)).toFixed(0)}%` } : {}),
          }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setFlies((list) => list.filter((x) => x.id !== f.id));
          }}
        >
          <span
            className="bf-rise"
            style={{ animationDuration: `${f.riseS.toFixed(2)}s`, ["--rise" as string]: `${f.rise.toFixed(1)}px` } as React.CSSProperties}
          >
            <span className="bf-wings" style={{ animationDuration: `${f.flapMs * 4}ms`, ...(still ? { animation: "none" } : {}) }}>
              {/* eslint-disable @next/next/no-img-element */}
              {f.frames.map((src, i) => (
                <img key={i} src={src} alt="" draggable={false} className={`bf-f bf-f${i}`} />
              ))}
              {/* eslint-enable @next/next/no-img-element */}
            </span>
          </span>
        </span>
      ))}
      <style jsx global>{`
        .bf-box { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 4; }
        .bf-fly {
          position: absolute; left: 0; display: block; aspect-ratio: 4 / 3; will-change: transform;
          animation: bf-right linear 1 both;
        }
        .bf-fly.is-left { animation-name: bf-left; }
        .bf-fly.is-left .bf-wings { scale: -1 1; }
        @keyframes bf-right { from { transform: translateX(-70px); } to { transform: translateX(calc(100vw + 50px)); } }
        @keyframes bf-left { from { transform: translateX(calc(100vw + 50px)); } to { transform: translateX(-70px); } }
        .bf-rise { display: block; width: 100%; height: 100%; animation: bf-rise ease-in-out infinite alternate; }
        @keyframes bf-rise { from { translate: 0 calc(var(--rise) / -2); } to { translate: 0 calc(var(--rise) / 2); } }
        /* the wings: three poses stacked, shown one at a time — 01 · 02 · 03 · 02 */
        .bf-wings { position: relative; display: block; width: 100%; height: 100%; animation: bf-flap steps(1, end) infinite; }
        .bf-f { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
        .bf-wings .bf-f0 { animation: inherit; animation-name: bf-f0; }
        .bf-wings .bf-f1 { animation: inherit; animation-name: bf-f1; }
        .bf-wings .bf-f2 { animation: inherit; animation-name: bf-f2; }
        @keyframes bf-flap { from { opacity: 1; } to { opacity: 1; } }
        @keyframes bf-f0 { 0% { opacity: 1; } 25%, 100% { opacity: 0; } }
        @keyframes bf-f1 { 0% { opacity: 0; } 25% { opacity: 1; } 50% { opacity: 0; } 75% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes bf-f2 { 0%, 25% { opacity: 0; } 50% { opacity: 1; } 75%, 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .bf-f0 { opacity: 1; }
          .bf-wings .bf-f { animation: none; }
        }
      `}</style>
    </div>
  );
}
