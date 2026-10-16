"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Birds — a little bird crossing the sky now and then (bought on the Map).
 *
 * Unlike the butterflies (slow, hovering, rising and falling a few px), the
 * bird has somewhere to be: one at a time, high in the sky, it crosses the
 * whole screen in 7–11s along a gentle swoop, beating its wings quickly
 * (01 → 02 → 03 → 02, ~90ms a pose). Then the sky is quiet again for a while
 * (25–60s). The three poses share one canvas aligned on the eye, so the body
 * holds still while the wings move. Reduced motion: no flights.
 */

const FRAMES = [1, 2, 3].map((n) => `/assets/sisi/birds/bird-0${n}.webp`);

type Flight = { id: number; left: boolean; top: number; w: number; dur: number; swoop: number };

const between = (a: number, b: number) => a + Math.random() * (b - a);

export function Birds() {
  const [flight, setFlight] = useState<Flight | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const plan = (wait: number) => {
      t = setTimeout(() => {
        if (document.hidden) return plan(5000);
        setFlight({
          id: ++seq.current,
          left: Math.random() < 0.5,
          top: between(10, 26),
          w: Math.round(between(40, 52)),
          dur: between(7, 11),
          swoop: between(14, 28),
        });
      }, wait);
    };
    plan(between(4000, 10000));
    const done = () => plan(between(25000, 60000));
    window.addEventListener("sisi:bird-landed", done);
    return () => {
      clearTimeout(t);
      window.removeEventListener("sisi:bird-landed", done);
    };
  }, []);

  return (
    <div className="bd-box" aria-hidden>
      {flight && (
        <span
          key={flight.id}
          className={`bd-fly${flight.left ? " is-left" : ""}`}
          style={{ top: `${flight.top.toFixed(1)}%`, width: flight.w, animationDuration: `${flight.dur.toFixed(1)}s` }}
          onAnimationEnd={(e) => {
            if (e.target !== e.currentTarget) return;
            setFlight(null);
            window.dispatchEvent(new CustomEvent("sisi:bird-landed"));
          }}
        >
          <span className="bd-swoop" style={{ animationDuration: `${flight.dur.toFixed(1)}s`, ["--swoop" as string]: `${flight.swoop.toFixed(0)}px` } as React.CSSProperties}>
            <span className="bd-wings">
              {/* eslint-disable @next/next/no-img-element */}
              {FRAMES.map((src, i) => (
                <img key={i} src={src} alt="" draggable={false} className={`bd-f bd-f${i}`} />
              ))}
              {/* eslint-enable @next/next/no-img-element */}
            </span>
          </span>
        </span>
      )}
      <style jsx global>{`
        .bd-box { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 3; }
        .bd-fly { position: absolute; left: 0; display: block; aspect-ratio: 528 / 453; will-change: transform; animation: bd-right linear 1 both; }
        .bd-fly.is-left { animation-name: bd-left; }
        .bd-fly.is-left .bd-wings { scale: -1 1; }
        @keyframes bd-right { from { transform: translateX(-80px); } to { transform: translateX(calc(100vw + 60px)); } }
        @keyframes bd-left { from { transform: translateX(calc(100vw + 60px)); } to { transform: translateX(-80px); } }
        /* a gentle swoop: down a little through the middle, back up at the end */
        .bd-swoop { display: block; width: 100%; height: 100%; animation: bd-swoop ease-in-out 1 both; }
        @keyframes bd-swoop { 0% { translate: 0 0; } 50% { translate: 0 var(--swoop); } 100% { translate: 0 calc(var(--swoop) * -0.3); } }
        .bd-wings { position: relative; display: block; width: 100%; height: 100%; }
        .bd-f { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; animation: steps(1, end) infinite 360ms; }
        .bd-f0 { animation-name: bd-f0; }
        .bd-f1 { animation-name: bd-f1; }
        .bd-f2 { animation-name: bd-f2; }
        /* 01 · 02 · 03 · 02 */
        @keyframes bd-f0 { 0% { opacity: 1; } 25%, 100% { opacity: 0; } }
        @keyframes bd-f1 { 0% { opacity: 0; } 25% { opacity: 1; } 50% { opacity: 0; } 75%, 100% { opacity: 1; } }
        @keyframes bd-f2 { 0%, 25% { opacity: 0; } 50% { opacity: 1; } 75%, 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}
