"use client";

import { useMemo } from "react";
import { PACK, SNOW_FLAKES, WEATHER, useAsset } from "@/lib/envAssets";
import type { WeatherState } from "@/lib/weather";

/**
 * WeatherLayer — one depth of the weather, placed between landscape layers:
 *
 *   world sky · far landscape · [far] · mid landscape · [mid] ·
 *   ground + Sísí · [near] · foreground plants/trees · UI
 *
 * Gentle only: no lightning, no violent storms (thunder = gentle rain).
 * Rain and snow use the hand-printed weather art (lib/envAssets) as soon as
 * it arrives; until then a very sparse, soft stand-in keeps the mood.
 * Fog only softens the distance (pale blue haze, never over Sísí).
 * Reduced motion: a few stationary marks and opacity only.
 * Animation pauses while the app is hidden (html.app-hidden).
 */

type Depth = "far" | "mid" | "near";

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rain: one sheet (rain-particles) reused in three layers, each scaled,
 * offset and timed differently so the repeat never lines up:
 *   far  55% · 15% opacity · slow    mid  75% · 22% · medium    near 110% · 15% · faster
 * Each loop travels one tile to the left and four tiles down — the slant of
 * the painted streaks — so the pattern wraps seamlessly.
 */
const RAIN: Record<Depth, { scale: number; opacity: number; secs: number; offset: [number, number] }> = {
  far: { scale: 0.55, opacity: 0.15, secs: 13, offset: [0, 0] },
  mid: { scale: 0.75, opacity: 0.22, secs: 10, offset: [0.37, 0.61] },
  near: { scale: 1.1, opacity: 0.15, secs: 10.5, offset: [0.71, 0.23] },
};

export function WeatherLayer({ state, depth, zIndex = 1 }: { state: WeatherState | null; depth: Depth; zIndex?: number }) {
  if (!state || state === "clear" || state === "partly" || state === "windy") return null;
  if (state === "cloudy") return depth === "far" ? <CloudyVeil zIndex={zIndex} /> : null;
  if (state === "fog") return depth === "far" ? <Fog zIndex={zIndex} /> : null;
  if (state === "rain" || state === "drizzle") {
    if (state === "drizzle" && depth === "near") return null; // drizzle: sparse and thin
    return <Rain depth={depth} light={state === "drizzle"} zIndex={zIndex} />;
  }
  if (state === "snow") return <Snow depth={depth} zIndex={zIndex} />;
  return null;
}

function Rain({ depth, light, zIndex }: { depth: Depth; light: boolean; zIndex: number }) {
  const cfg = RAIN[depth];
  const W = PACK.rain.w * cfg.scale;
  const H = PACK.rain.h * cfg.scale;
  const opacity = cfg.opacity * (light ? 0.6 : 1);
  return (
    <div className={`wx wx-rain wx-${depth}`} style={{ zIndex, ["--wx-o" as string]: opacity }} aria-hidden>
      <div
        className="wx-rain-sheet"
        style={{
          backgroundImage: `url(${PACK.rain.src})`,
          backgroundSize: `${W}px ${H}px`,
          animationDuration: `${cfg.secs}s`,
          animationDelay: `${-cfg.secs * cfg.offset[1]}s`,
          ["--x0" as string]: `${-W * cfg.offset[0]}px`,
          ["--y0" as string]: `${-H * cfg.offset[1]}px`,
          ["--x1" as string]: `${-W * cfg.offset[0] - W}px`,
          ["--y1" as string]: `${-H * cfg.offset[1] + 4 * H}px`,
        }}
      />
      <style jsx global>{`
        .wx { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .wx-rain { opacity: 0; animation: wx-in 4s ease forwards; }
        @keyframes wx-in { to { opacity: var(--wx-o, 1); } }
        .wx-rain-sheet {
          position: absolute; inset: 0; background-repeat: repeat;
          animation-name: wx-fall; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        @keyframes wx-fall { from { background-position: var(--x0) var(--y0); } to { background-position: var(--x1) var(--y1); } }
        html.app-hidden .wx *, html.app-hidden .wx, html.app-hidden .ps-sway { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          /* a few stationary marks, nothing travelling */
          .wx-rain-sheet { animation: none; background-position: var(--x0) var(--y0); }
          .wx-rain { animation-duration: 1s; }
          .wx-rain.wx-near { display: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Snow: individual flakes sampled from snow-particles, spread over three
 * depths — small, dim dots far away; a few larger flakes near — each with
 * its own size, opacity, drift and fall time. Never the whole sheet.
 */
const SNOW_DEPTH: Record<Depth, { count: number; pick: number[]; size: [number, number]; opacity: [number, number]; secs: [number, number]; drift: [number, number] }> = {
  far: { count: 16, pick: [11, 12, 13, 14, 15, 16, 8, 9, 10], size: [4, 7], opacity: [0.35, 0.6], secs: [20, 28], drift: [8, 22] },
  mid: { count: 9, pick: [6, 7, 8, 9, 10, 3, 5], size: [9, 14], opacity: [0.55, 0.8], secs: [14, 19], drift: [14, 30] },
  near: { count: 4, pick: [0, 1, 2, 3, 4], size: [18, 26], opacity: [0.75, 0.95], secs: [10, 13], drift: [20, 40] },
};

function Snow({ depth, zIndex }: { depth: Depth; zIndex: number }) {
  const cfg = SNOW_DEPTH[depth];
  const flakes = useMemo(() => {
    const r = rng(depth === "far" ? 11 : depth === "mid" ? 22 : 33);
    const lerp = (a: [number, number]) => a[0] + r() * (a[1] - a[0]);
    return Array.from({ length: cfg.count }, () => {
      const idx = cfg.pick[Math.floor(r() * cfg.pick.length)];
      const secs = lerp(cfg.secs);
      return { idx, x: r() * 100, size: lerp(cfg.size), opacity: lerp(cfg.opacity), secs, delay: -r() * secs, drift: lerp(cfg.drift) * (r() < 0.5 ? -1 : 1) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);
  return (
    <div className={`wx wx-snow wx-${depth}`} style={{ zIndex }} aria-hidden>
      {flakes.map((f, i) => {
        const [fx, fy, fw, fh] = SNOW_FLAKES[f.idx];
        // the flake's painted body is ~70% of its padded box
        const k = f.size / (Math.max(fw, fh) * 0.7);
        return (
          <span
            key={i}
            className="wx-flake"
            style={{
              left: `${f.x}%`,
              width: fw * k,
              height: fh * k,
              opacity: f.opacity,
              backgroundImage: `url(${PACK.snow.src})`,
              backgroundSize: `${PACK.snow.w * k}px ${PACK.snow.h * k}px`,
              backgroundPosition: `${-fx * k}px ${-fy * k}px`,
              animationDuration: `${f.secs}s`,
              animationDelay: `${f.delay}s`,
              ["--drift" as string]: `${f.drift}px`,
            }}
          />
        );
      })}
      <style jsx global>{`
        .wx-snow { animation: wx-in-snow 4s ease both; }
        @keyframes wx-in-snow { from { opacity: 0; } to { opacity: 1; } }
        .wx-flake {
          position: absolute; top: -40px; background-repeat: no-repeat;
          animation-name: wx-snow; animation-timing-function: linear; animation-iteration-count: infinite;
        }
        @keyframes wx-snow {
          0% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(var(--drift), 55vh, 0) rotate(40deg); }
          100% { transform: translate3d(calc(var(--drift) * -0.4), calc(100vh + 60px), 0) rotate(80deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wx-flake { animation: none; }
          .wx-flake:nth-child(3n) { top: 22%; } .wx-flake:nth-child(3n+1) { top: 46%; } .wx-flake:nth-child(3n+2) { top: 64%; }
          .wx-flake:nth-child(n+6) { display: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * Fog: fog-far sits between the far and the middle landscape, low opacity,
 * fading in over ~4s. Sísí, the path, the foreground and the UI stay sharp.
 */
function Fog({ zIndex }: { zIndex: number }) {
  return (
    <div className="wx wx-fog" style={{ zIndex }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="wx-fog-art" src={PACK.fog.src} alt="" draggable={false} />
      <style jsx global>{`
        .wx-fog { opacity: 0; animation: wx-fog-in 4s ease forwards; }
        @keyframes wx-fog-in { to { opacity: 0.6; } }
        .wx-fog-art {
          position: absolute; left: 50%; transform: translateX(-50%);
          /* stretched horizontally only as needed; its soft band rests on the far hills */
          width: max(100%, 720px); height: auto; max-width: none;
          bottom: calc(var(--walking-baseline) - 2%);
        }
        @media (prefers-reduced-motion: reduce) { .wx-fog { animation-duration: 1s; } }
      `}</style>
    </div>
  );
}

/** Cloudy: a soft veil in the sky (the scene never turns grey). */
function CloudyVeil({ zIndex }: { zIndex: number }) {
  const art = useAsset(WEATHER.cloudyOverlay, null);
  if (!art) return null;
  return (
    <div className="wx wx-cloudy" style={{ zIndex, backgroundImage: `url(${art})` }} aria-hidden>
      <style jsx global>{`
        .wx-cloudy { background-size: cover; background-position: center top; opacity: 0.7; }
      `}</style>
    </div>
  );
}
