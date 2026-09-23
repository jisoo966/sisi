"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ForegroundOccluder — an occasional foreground element (a tree, a flowering
 * stem, a rock) that sweeps across the viewport in front of the companion,
 * briefly occluding 10–25% of the cat.
 *
 * Spec:
 *   - Not continuous. Waits 15–25s between passes (randomized).
 *   - Passes at ratio 1.15 (faster than the main meadow ratio 0.50) →
 *     unmistakably front-of-cat, cinematic "we walked past a tree" feeling.
 *   - Position vertically anchored to the ground (aligned to walking baseline)
 *     so it looks like it's rooted next to the cat, not floating.
 *   - Alpha transparency is preserved. The PNG's own composition (trunk,
 *     canopy, leaves) determines what pixels occlude the cat.
 *
 * Multiple asset sources are supported — a random one is picked per pass
 * so repeated appearances feel organic.
 */

type Props = {
  /**
   * Array of PNG paths. A random one is chosen per pass. Each PNG must have
   * a transparent background and be tall enough to reach the walking
   * baseline from the top of the world.
   */
  sources: string[];
  /** Ratio 1.15 by default */
  ratio?: number;
  /** Base speed pixels/second (matches ParallaxLayer default) */
  baseSpeed?: number;
  /** Pause everything */
  paused?: boolean;
  /** Min seconds between passes */
  intervalMin?: number;
  /** Max seconds between passes */
  intervalMax?: number;
  /** CSS z-index (should sit above the companion) */
  zIndex?: number;
  /** Start with a hidden idle period so the first tree doesn't spawn on load */
  initialDelayMs?: number;
  /**
   * Tree height as a fraction of the viewport (0..1). Default 0.75.
   * Smaller = more distant tree feel + more sky visible above the canopy.
   */
  heightPct?: number;
  /**
   * CSS `bottom` value for the tree's base. Default "0" (rooted at viewport
   * bottom). Pass `"var(--walking-baseline)"` to plant trees on the same
   * grass horizon the cat stands on — they'll rise from the ground instead
   * of appearing to grow out from below-screen.
   */
  groundBase?: string;
};

type Pass = {
  id: number;
  src: string;
  /** current translateX in px */
  x: number;
  /** total travel budget (= viewport width + tree width) */
  budget: number;
  /** measured tree width once img loads (0 while unknown) */
  measuredWidth: number;
};

export function ForegroundOccluder({
  sources,
  ratio = 1.15,
  baseSpeed = 40,
  paused = false,
  intervalMin = 15,
  intervalMax = 25,
  zIndex = 6,
  initialDelayMs = 4000,
  heightPct = 0.75,
  groundBase = "0",
}: Props) {
  const [active, setActive] = useState<Pass | null>(null);
  const passIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number | null>(null);
  const nextSpawnRef = useRef<number>(0);
  const speedFactorRef = useRef(1);
  const targetSpeedRef = useRef(1);

  useEffect(() => {
    targetSpeedRef.current = paused ? 0 : 1;
  }, [paused]);

  // Schedule the first spawn after an initial idle
  useEffect(() => {
    nextSpawnRef.current = performance.now() + initialDelayMs;
  }, [initialDelayMs]);

  useEffect(() => {
    if (sources.length === 0) return;

    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Eased pause
      const delta = targetSpeedRef.current - speedFactorRef.current;
      speedFactorRef.current += delta * Math.min(dt * 5, 1);

      // If no active pass, check if it's time to spawn one
      if (!active) {
        if (now >= nextSpawnRef.current && !paused) {
          const src = sources[Math.floor(Math.random() * sources.length)];
          const vw = containerRef.current?.offsetWidth ?? window.innerWidth;
          const pass: Pass = {
            id: ++passIdRef.current,
            src,
            x: vw, // enters from right
            budget: 0, // set after image measures
            measuredWidth: 0,
          };
          setActive(pass);
        }
      } else {
        // Advance the pass — moves left
        const speed = baseSpeed * ratio * speedFactorRef.current;
        active.x -= speed * dt;

        // Once image is measured, compute the exit threshold
        const el = imgRef.current;
        if (el && el.complete && el.offsetWidth > 0 && active.measuredWidth === 0) {
          active.measuredWidth = el.offsetWidth;
          active.budget =
            (containerRef.current?.offsetWidth ?? window.innerWidth) +
            active.measuredWidth;
        }

        // Off left → done, schedule next
        if (
          active.measuredWidth > 0 &&
          active.x <= -active.measuredWidth - 4
        ) {
          const gapSec =
            intervalMin + Math.random() * (intervalMax - intervalMin);
          nextSpawnRef.current = now + gapSec * 1000;
          setActive(null);
        } else if (el) {
          el.style.transform = `translate3d(${active.x}px, 0, 0)`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // The `active` reference is read via closure — safe to omit from deps.
    // We restart the loop only when the sources array changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, baseSpeed, ratio, intervalMin, intervalMax, paused]);

  return (
    <div
      ref={containerRef}
      className="fg-occluder"
      style={{ zIndex }}
      aria-hidden
    >
      {active && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={active.src}
          alt=""
          className="fg-tree"
          draggable={false}
          onLoad={(e) => {
            // Immediately position at right edge so we don't see a 1-frame flash
            const w = e.currentTarget.offsetWidth;
            active.measuredWidth = w;
            active.budget =
              (containerRef.current?.offsetWidth ?? window.innerWidth) + w;
          }}
          onError={() => {
            // Missing PNG → skip this pass silently, schedule the next.
            const gapSec =
              intervalMin + Math.random() * (intervalMax - intervalMin);
            nextSpawnRef.current = performance.now() + gapSec * 1000;
            setActive(null);
          }}
        />
      )}

      <style jsx>{`
        .fg-occluder {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .fg-tree {
          position: absolute;
          bottom: ${groundBase};
          left: 0;
          height: ${Math.max(0, Math.min(1, heightPct)) * 100}%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          will-change: transform;
        }
      `}</style>
    </div>
  );
}
