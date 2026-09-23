"use client";

import { useEffect, useRef } from "react";

/**
 * ParallaxLayer — a single horizontal parallax band.
 *
 * Renders TWO copies of the same transparent PNG side-by-side and translates
 * them right → left. When the first copy has fully left the viewport it is
 * recycled behind the second, giving an endless drift with no visible reset.
 *
 * Movement model:
 *   pixelsPerSecond = baseSpeed × ratio × breathing(time)
 * where breathing is a subtle sinusoidal variation (±speedVariation) so the
 * scene never feels like a constant mechanical treadmill.
 *
 * Pause is eased (exponential decay toward target) — matches the smooth
 * "cat stops before we look up" behavior of the earlier LandscapeTrack.
 *
 * The supplied PNGs contain real transparency. This component NEVER
 * modifies, recolors, or adds a background to them. Just <img> tags with
 * height:100%, width:auto, aspect preserved.
 */

type Props = {
  /** PNG source path. Must have real alpha channel. */
  src: string;
  /**
   * Speed multiplier relative to baseSpeed.
   *   0.08  slow clouds
   *   0.25  midground vegetation
   *   0.50  main meadow
   *   1.15  foreground trees
   */
  ratio: number;
  /** Base pixels/second at ratio=1 (default 40, meditative pace) */
  baseSpeed?: number;
  /** Pause the layer (still eases to a stop, not a hard freeze) */
  paused?: boolean;
  /** Deceleration factor for pause/resume (higher = faster) */
  decay?: number;
  /** Sinusoidal speed variation amplitude (0..1). 0.06 = ±6% breathing */
  speedVariation?: number;
  /** CSS z-index for stack ordering */
  zIndex?: number;
  /**
   * Vertical position of the image. "bottom" is default (grounds it on the
   * baseline). "top" for clouds. "cover" fills the whole area.
   */
  align?: "bottom" | "top" | "cover";
  /**
   * Height of the layer as a fraction of the parent (0..1). Default: 1 (full
   * viewport). Set smaller so tall assets don't dominate — e.g. 0.65 for
   * foreground trees means the image renders at 65% viewport height so tree
   * canopies don't reach the top of the sky.
   */
  heightPct?: number;
  /** Optional aria label for debugging */
  ariaLabel?: string;
};

export function ParallaxLayer({
  src,
  ratio,
  baseSpeed = 40,
  paused = false,
  decay = 5,
  speedVariation = 0.06,
  zIndex = 1,
  align = "bottom",
  heightPct = 1,
  ariaLabel,
}: Props) {
  const laneRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const speedFactorRef = useRef(1);
  const targetSpeedRef = useRef(1);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    targetSpeedRef.current = paused ? 0 : 1;
  }, [paused]);

  useEffect(() => {
    let lastTime = performance.now();
    startTimeRef.current = lastTime;

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Ease speed factor toward target (walking ↔ paused)
      const delta = targetSpeedRef.current - speedFactorRef.current;
      speedFactorRef.current += delta * Math.min(dt * decay, 1);
      if (Math.abs(delta) < 0.001) {
        speedFactorRef.current = targetSpeedRef.current;
      }

      // Breathing variation — soft ±speedVariation modulation, period ~18s
      const elapsed = (now - (startTimeRef.current ?? now)) / 1000;
      const breathing = 1 + speedVariation * Math.sin(elapsed * 0.35);

      // Advance offset (negative = shift left)
      const effectiveSpeed =
        baseSpeed * ratio * speedFactorRef.current * breathing;
      offsetRef.current -= effectiveSpeed * dt;

      // Recycle: first copy fully off viewport → move to end, adjust offset
      const lane = laneRef.current;
      if (lane) {
        const first = lane.firstElementChild as HTMLImageElement | null;
        if (first && first.complete && first.offsetWidth > 0) {
          const w = first.offsetWidth;
          if (-offsetRef.current >= w) {
            offsetRef.current += w;
            lane.appendChild(first);
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
  }, [baseSpeed, ratio, decay, speedVariation]);

  // Reduced-motion: freeze
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

  // If the src fails to load, silently hide the whole layer so we never
  // show a broken-image icon. The rest of the scene keeps working.
  const containerRef = useRef<HTMLDivElement>(null);
  const onImgError = () => {
    if (containerRef.current) containerRef.current.style.display = "none";
  };

  const heightStyle =
    heightPct >= 1 ? "100%" : `${Math.max(0, heightPct * 100)}%`;

  return (
    <div
      ref={containerRef}
      className={`parallax-layer align-${align}`}
      style={{ zIndex, height: heightStyle }}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      <div className="parallax-lane" ref={laneRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="parallax-img"
          draggable={false}
          onError={onImgError}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="parallax-img"
          draggable={false}
          onError={onImgError}
        />
      </div>

      <style jsx>{`
        .parallax-layer {
          position: absolute;
          left: 0;
          right: 0;
          overflow: hidden;
          pointer-events: none;
        }
        /* Align keeps the image anchored to a baseline; content that has
           empty space in its alpha channel above/below stays where painted.
           Height comes from inline style (heightPct prop) — these rules
           only pin the anchor edge. */
        .align-bottom { bottom: 0; }
        .align-top    { top: 0; }
        .align-cover  { top: 0; bottom: 0; }
        .parallax-lane {
          position: absolute;
          left: 0;
          height: 100%;
          width: max-content;
          display: flex;
          will-change: transform;
        }
        .align-bottom .parallax-lane {
          bottom: 0;
          top: auto;
          align-items: flex-end;
        }
        .align-top .parallax-lane {
          top: 0;
          align-items: flex-start;
        }
        .align-cover .parallax-lane {
          top: 0;
        }
        .parallax-img {
          height: 100%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
          /* No filter, no color-adjust — asset stays untouched */
          margin-right: -1px; /* subpixel seam guard */
        }
      `}</style>
    </div>
  );
}
