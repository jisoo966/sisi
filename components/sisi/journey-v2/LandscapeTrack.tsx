"use client";

import { useEffect, useRef } from "react";

/**
 * LandscapeTrack — the horizontal Journey world.
 *
 * Rules (per Phase-3 landscape spec):
 *   - Moves continuously right → left
 *   - Cat is stationary; the moving track creates the walking illusion
 *   - Uses reusable horizontal panorama segments (starts with 2 for MVP)
 *   - Contains NO clouds / stars / moon / celestial UI (sky owns those)
 *   - Pauses SMOOTHLY (eased deceleration) before entering Sky mode
 *   - Segments recycle completely outside the viewport — no visible reset
 *   - All segments share the same horizon + walking baseline
 *   - 1px overlap between segments to hide subpixel seams
 *
 * Architecture is future-proof for:
 *   - Different landscape environments (meadow, pink trees, river…)
 *   - Transition segments between environments
 *   - Multiple parallax layers moving at different speeds (feed the same
 *     `paused`/`speed` props into more <LandscapeTrack> instances stacked
 *     with different z-index and different `speed`)
 */

type Props = {
  /**
   * Array of segment image URLs. Must be at least 2 for seamless recycling.
   * All segments must share the same height + horizon + baseline artwork.
   * Order defines the initial layout: [A, B, C, ...]
   */
  segments: string[];
  /**
   * Pause the track. When true, the animation eases speed → 0 (smooth stop,
   * not a hard freeze). When false, eases back to normal.
   */
  paused?: boolean;
  /**
   * Pixels-per-second of drift at full speed. Meditation pace ≈ 30–60.
   */
  speed?: number;
  /**
   * How aggressively the speed decays toward its target. Higher = faster stop.
   * 6 → reaches ~99% of target in ~600ms.
   */
  decay?: number;
  /**
   * Optional label for debugging (shows in aria-label).
   */
  ariaLabel?: string;
};

export function LandscapeTrack({
  segments,
  paused = false,
  speed = 40,
  decay = 6,
  ariaLabel = "Journey landscape",
}: Props) {
  const laneRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);              // current translateX (px, negative = shifted left)
  const speedFactorRef = useRef(1);         // 0..1 — eases toward target
  const targetSpeedRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  // Update target speed whenever the pause prop changes
  useEffect(() => {
    targetSpeedRef.current = paused ? 0 : 1;
  }, [paused]);

  // The animation loop: eased speed + segment recycling
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1); // clamp big deltas (tab-switch)
      lastTime = now;

      // Ease speed factor toward the target (exponential decay)
      const delta = targetSpeedRef.current - speedFactorRef.current;
      speedFactorRef.current += delta * Math.min(dt * decay, 1);
      // Snap tiny values to exact 0/1 to avoid perpetual tiny movement
      if (Math.abs(delta) < 0.001) {
        speedFactorRef.current = targetSpeedRef.current;
      }

      // Advance offset (negative direction = shift left)
      offsetRef.current -= speedFactorRef.current * speed * dt;

      // Apply transform + handle segment recycling
      const lane = laneRef.current;
      if (lane) {
        // Recycle: if the first segment is fully off the viewport on the left,
        // move it to the end and shift the offset back by its width. Result is
        // visually identical but keeps the lane bounded.
        const first = lane.firstElementChild as HTMLImageElement | null;
        if (first && first.complete && first.offsetWidth > 0) {
          const segW = first.offsetWidth;
          if (-offsetRef.current >= segW) {
            offsetRef.current += segW;
            lane.appendChild(first); // move to end
          }
        }
        lane.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [speed, decay]);

  // Respect reduced-motion: freeze the track
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (mq.matches) targetSpeedRef.current = 0;
      else targetSpeedRef.current = paused ? 0 : 1;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [paused]);

  return (
    <div className="landscape-track" role="img" aria-label={ariaLabel}>
      <div className="landscape-lane" ref={laneRef}>
        {segments.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${src}-${i}`}
            src={src}
            alt=""
            className="landscape-segment"
            draggable={false}
          />
        ))}
      </div>

      <style jsx>{`
        .landscape-track {
          position: absolute;
          inset: 0;
          overflow: hidden;
          /* Sky color fallback so we don't flash white behind the segments */
          background: #b6d3ea;
        }
        .landscape-lane {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: max-content;
          display: flex;
          will-change: transform;
          /* -1px right margin creates a 1px overlap between segments to hide
             subpixel seams on high-DPR screens. */
        }
        .landscape-segment {
          height: 100%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          margin-right: -1px; /* 1px overlap seam hide */
        }
      `}</style>
    </div>
  );
}
