/**
 * lib/envAssets — where the environment and magic artwork lives.
 *
 * Files listed here may not have arrived yet. Every component that uses
 * them checks (`useAsset`) and falls back quietly — to existing art, or to
 * nothing — so the app never shows a broken image while the packs are on
 * their way. Drop the transparent PNG/WebP files into these paths and they
 * appear without code changes.
 */

import { useEffect, useState } from "react";

/** Sísí environment pack 1 (/public/sisi-assets): the supplied PNGs are kept
 *  as they are; the app loads lossless WebP copies of the same pixels
 *  (snow / fog / glint at half size — they are never shown larger). */
export const PACK = {
  rain: { src: "/sisi-assets/weather/rain-particles.webp", w: 1536, h: 1024 },
  snow: { src: "/sisi-assets/weather/snow-particles.webp", w: 768, h: 512 },
  fog: { src: "/sisi-assets/weather/fog-far.webp", w: 1086, h: 362 },
  /** five stages: dot → small star → full star → dissolving → glow */
  glint: { src: "/sisi-assets/effects/sisi-glint-frames.webp", w: 1086, h: 362, frame: 217, cy: 178.5, cx: [98, 250, 472, 716, 947] },
} as const;

/** Individual flakes on the snow sheet (px on the half-size sheet): x, y, w, h. */
export const SNOW_FLAKES: [number, number, number, number][] = [
  // large flakes
  [95, 40, 196, 201], [504, 56, 182, 189], [377, 313, 159, 155],
  // medium flakes / soft snowballs
  [354, 107, 106, 110], [65, 354, 96, 97], [204, 275, 92, 91], [633, 269, 76, 76], [608, 397, 61, 65],
  // small
  [300, 395, 51, 50], [62, 222, 41, 40], [458, 252, 36, 37],
  // dots
  [662, 52, 35, 34], [318, 250, 33, 32], [559, 308, 32, 32], [307, 56, 32, 31], [122, 296, 31, 30], [212, 427, 31, 32],
];

export const MAGIC = {
  glint: ["/assets/magic/sisi-glint-01.png", "/assets/magic/sisi-glint-02.png", "/assets/magic/sisi-glint-03.png"],
  fulfilledStarGlow: "/assets/magic/fulfilled-star-glow.png",
  smallPathLight: "/assets/magic/small-path-light.png",
  fulfilledFlower: "/assets/magic/fulfilled-flower.png",
} as const;

export const WEATHER = {
  rainFar: "/assets/weather/rain-far.png",
  rainMid: "/assets/weather/rain-mid.png",
  rainNear: "/assets/weather/rain-near.png",
  snow: ["/assets/weather/snowflake-01.png", "/assets/weather/snowflake-02.png", "/assets/weather/snowflake-03.png"],
  fogFar: "/sisi-assets/weather/fog-far.webp",
  cloudyOverlay: "/assets/weather/cloudy-sky-overlay.png",
  puddle: "/assets/weather/puddle-highlight.png",
  wetGrass: "/assets/weather/wet-grass-overlay.png",
} as const;

/** Existing art used until the new pieces arrive. */
export const FALLBACK = {
  glint: "/assets/sisi-star-mark-painted-512.png",
  fulfilledFlower: "/V2/time-of-day/grass-06-coral.png",
} as const;

const known = new Map<string, boolean>();
const waiting = new Map<string, Promise<boolean>>();

/** Does this file exist? (checked once per session, cached) */
export function assetExists(src: string): Promise<boolean> {
  if (known.has(src)) return Promise.resolve(known.get(src)!);
  let p = waiting.get(src);
  if (!p) {
    p = new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = src;
    }).then((ok) => {
      known.set(src, ok);
      return ok;
    });
    waiting.set(src, p);
  }
  return p;
}

/** `src` once it has loaded; the fallback (or null) otherwise. */
export function useAsset(src: string, fallback: string | null = null): string | null {
  const [ok, setOk] = useState<boolean | null>(known.has(src) ? known.get(src)! : null);
  useEffect(() => {
    let alive = true;
    assetExists(src).then((v) => alive && setOk(v));
    return () => {
      alive = false;
    };
  }, [src]);
  return ok ? src : ok === false ? fallback : null;
}
