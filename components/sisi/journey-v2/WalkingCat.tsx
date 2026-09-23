"use client";

import { useEffect, useRef, useState } from "react";

/**
 * WalkingCat — animated fox with alpha, walking in place.
 *
 * Positioning:
 *   - Horizontal: anchored at 38% of the viewport width
 *     (--companion-x). This is off-center-left so the companion has
 *     more empty world ahead of it — cinematic composition.
 *   - Vertical: feet on --walking-baseline
 *   - Additional 2–3px vertical bob synchronized with a walk cycle
 *     (~1s period). Bob amplitude is subtle and eases toward 0 when
 *     the world is paused.
 *
 * Asset choice — Animated WebP as primary:
 *   macOS/iOS Safari do NOT reliably play WebM VP9 with alpha (video loads
 *   but often shows only frame 0). Animated WebP with alpha works in every
 *   modern browser like a GIF: no autoplay policy, no codec check, always
 *   animates.
 *
 * The webp is supplied with real transparency. This component does not
 * modify, recolor, or add a background to it. The bob is applied via a
 * transform on a wrapper — the pixels are untouched.
 */

type Props = {
  onTap?: () => void;
  paused?: boolean;
};

export function WalkingCat({ onTap, paused = false }: Props) {
  const [showStill, setShowStill] = useState(false);
  const bobRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const bobEnvRef = useRef(1); // envelope 0..1 that fades bob during pause
  const bobEnvTargetRef = useRef(1);

  useEffect(() => {
    setShowStill(paused);
    bobEnvTargetRef.current = paused ? 0 : 1;
  }, [paused]);

  // Vertical walking bob — 2-3px sinusoidal, ~1s period, synced with the
  // walk cycle. Applied on a wrapper; the fox img itself stays untouched.
  useEffect(() => {
    let lastTime = performance.now();
    const start = lastTime;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Ease envelope toward target so the bob fades softly on pause
      const delta = bobEnvTargetRef.current - bobEnvRef.current;
      bobEnvRef.current += delta * Math.min(dt * 6, 1);

      // 2 bobs per walk cycle (foot-plant on each side).
      // Amplitude 2.5px, period 1.0s. sin(2π · f · t) with f = 2.
      const t = (now - start) / 1000;
      const amp = 2.5 * bobEnvRef.current;
      const y = amp * Math.sin(2 * Math.PI * 2 * t);

      const el = bobRef.current;
      if (el) el.style.transform = `translate3d(0, ${y}px, 0)`;

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Sísí"
      className="walking-cat"
      style={{ pointerEvents: onTap ? "auto" : "none" }}
    >
      <div ref={bobRef} className="bob-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            showStill
              ? "/V2/fox-walk/fox-walk-preview.png"
              : "/V2/fox-walk/fox-walk.webp"
          }
          alt=""
          className="cat-media"
          draggable={false}
        />
      </div>
      {/* Preload the still so the pause swap is instantaneous */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/V2/fox-walk/fox-walk-preview.png"
        alt=""
        aria-hidden
        style={{ display: "none" }}
      />

      <style jsx>{`
        .walking-cat {
          position: absolute;
          /* Anchor at 38% viewport width (off-center-left) — cinematic
             composition with more world ahead of the cat. */
          left: var(--companion-x, 38%);
          bottom: var(--walking-baseline);
          transform: translateX(-50%);
          width: var(--cat-width);
          height: auto;
          z-index: 5;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: ${onTap ? "pointer" : "default"};
          -webkit-tap-highlight-color: transparent;
        }
        .bob-wrap {
          width: 100%;
          height: auto;
          will-change: transform;
        }
        .cat-media {
          width: 100%;
          height: auto;
          display: block;
          pointer-events: none;
        }
      `}</style>
    </button>
  );
}
