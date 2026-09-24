"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BASE_GROUND_SPEED, worldClock } from "@/lib/worldMotion";

/**
 * ParallaxLayer — one continuous horizontal band (ground, path, vegetation).
 *
 * Position is DERIVED from the shared world clock, not accumulated per layer:
 *
 *   travelled = groundDistance × (speed / BASE_GROUND_SPEED)
 *   x         = −(travelled mod tileWidth)
 *
 * So two layers with the same speed (walking ground + walking path) always
 * use the exact same source value — they can never drift apart.
 *
 * Enough copies are rendered to cover the stage plus one tile. The modulo
 * wrap only ever happens when the left-most copy is completely outside the
 * viewport, so nothing jumps or appears inside the view. Copies overlap by
 * `seamOverlap` px to hide sub-pixel seams.
 *
 * The PNG is never modified: <img> at height:100%, width:auto.
 */

type Props = {
  src: string;
  /** Pixels per second while walking (at speed multiplier 1). */
  speed: number;
  zIndex?: number;
  align?: "bottom" | "top" | "cover";
  /** Layer height as a fraction of the stage (image keeps its aspect). */
  heightPct?: number;
  /** CSS `bottom` override (align="bottom" only). */
  bottom?: string;
  opacity?: number;
  filter?: string;
  maskImage?: string;
  /** Px each copy overlaps the next (1–2 hides sub-pixel seams). */
  seamOverlap?: number;
  ariaLabel?: string;
  className?: string;
};

export function ParallaxLayer({
  src,
  speed,
  zIndex = 1,
  align = "bottom",
  heightPct = 1,
  bottom,
  opacity,
  filter,
  maskImage,
  seamOverlap = 1,
  ariaLabel,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const laneRef = useRef<HTMLDivElement>(null);
  const tileRef = useRef(0);
  const [copies, setCopies] = useState(2);

  // Measure tile width + needed copies (on load and on resize). Runs before
  // paint so the first frame is already in place (no jump when the page is
  // handed over from Moments mid-meadow).
  useLayoutEffect(() => {
    const measure = () => {
      const lane = laneRef.current;
      const box = containerRef.current;
      const first = lane?.firstElementChild as HTMLImageElement | null;
      if (!lane || !box || !first || !first.complete || first.offsetWidth === 0) return;
      const tile = first.offsetWidth - seamOverlap;
      tileRef.current = tile;
      const travelled = worldClock().getDistance() * (speed / BASE_GROUND_SPEED);
      lane.style.transform = `translate3d(${-(((travelled % tile) + tile) % tile)}px,0,0)`;
      const need = Math.max(2, Math.ceil(box.offsetWidth / tile) + 1);
      setCopies((c) => (c === need ? c : need));
    };
    const lane = laneRef.current;
    const imgs = lane ? Array.from(lane.querySelectorAll("img")) : [];
    imgs.forEach((im) => im.addEventListener("load", measure));
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    measure();
    return () => {
      imgs.forEach((im) => im.removeEventListener("load", measure));
      ro.disconnect();
    };
  }, [src, seamOverlap, copies, speed]);

  // Drive the transform from the shared clock.
  useEffect(() => {
    let animating = false;
    return worldClock().subscribe((f) => {
      const lane = laneRef.current;
      const tile = tileRef.current;
      if (!lane || tile <= 0) return;
      const travelled = f.groundDistance * (speed / BASE_GROUND_SPEED);
      // wrap into (−tile, 0] even for negative distances (after Moments)
      const x = -(((travelled % tile) + tile) % tile);
      lane.style.transform = `translate3d(${x}px,0,0)`;
      const moving = f.groundDelta > 0;
      if (moving !== animating) {
        animating = moving;
        lane.style.willChange = moving ? "transform" : "auto";
      }
    });
  }, [speed]);

  const onImgError = () => {
    if (containerRef.current) containerRef.current.style.display = "none";
  };

  return (
    <div
      ref={containerRef}
      className={`parallax-layer align-${align} ${className}`}
      style={{
        zIndex,
        height: heightPct >= 1 ? "100%" : `${Math.max(0, heightPct * 100)}%`,
        ...(bottom !== undefined && align === "bottom" ? { bottom } : {}),
        ...(opacity !== undefined ? { opacity } : {}),
        ...(filter ? { filter } : {}),
        ...(maskImage ? { maskImage, WebkitMaskImage: maskImage } : {}),
      }}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
    >
      <div className="parallax-lane" ref={laneRef}>
        {Array.from({ length: copies }).map((_, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={src}
            alt=""
            className="parallax-img"
            draggable={false}
            onError={onImgError}
            style={{ marginRight: `-${seamOverlap}px` }}
          />
        ))}
      </div>

      <style jsx>{`
        .parallax-layer {
          position: absolute;
          left: 0;
          right: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .align-bottom { bottom: 0; }
        .align-top    { top: 0; }
        .align-cover  { top: 0; bottom: 0; }
        .parallax-lane {
          position: absolute;
          left: 0;
          height: 100%;
          width: max-content;
          display: flex;
        }
        .align-bottom .parallax-lane { bottom: 0; align-items: flex-end; }
        .align-top .parallax-lane { top: 0; align-items: flex-start; }
        .align-cover .parallax-lane { top: 0; }
        .parallax-img {
          height: 100%;
          width: auto;
          max-width: none;
          display: block;
          user-select: none;
          -webkit-user-drag: none;
        }
      `}</style>
    </div>
  );
}
