"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useStarAscent — Journey → Stars as a cinematic camera move (~4.8s).
 * Not navigation, not scrolling, not a crossfade.
 *
 * One value drives everything: the camera height `c` (in screen heights).
 * Each depth group moves by its OWN parallax rate × c, so the scene separates
 * into planes instead of sliding as one picture:
 *
 *   distant sky (day + night)   0.15×
 *   land (hills + meadow + path  0.75×   one piece — the fox stays in the
 *         + companion + front)            meadow and leaves through the bottom
 *   rear clouds                 0.70×
 *   front clouds                1.25×   (cover ~99% of the screen mid-way)
 *
 * While the clouds fully cover the screen (c ≈ 0.84–1.42) the environment
 * underneath switches from day to Star mode, hidden from view.
 *
 * Timeline (enter):
 *   0.0–0.5s  landscape decelerates (world clock, 450ms)      — page
 *   0.5–1.1s  companion finishes its steps + looks up, UI fades — page/CSS
 *   1.1–2.4s  slow initial ascent
 *   2.4–3.5s  faster cloud passage (environment switch ≈ 3.2s)
 *   3.5–4.8s  long soft deceleration into the star world;
 *             star layers revealed aura → glow → mark
 *   +0.25s    settle → input unlocked
 * Return: the same curve backwards, compressed to 3.0s (clouds → meadow),
 * then the companion looks toward the user for 0.6s → walk resumes (3.6s).
 *
 * The curve is a cubic Hermite spline (continuous position AND velocity),
 * so speed changes are always gradual. Only transform + opacity are
 * written, directly on the group elements (compositor-only).
 * prefers-reduced-motion → a 250ms crossfade, no camera movement.
 */

/** Camera height at rest in the star world (screen heights). */
const C_END = 2.465;
/**
 * Environment switch point — the middle of the full-cover window: the front
 * cloud bank covers 100% of the screen for c ≈ 0.84–1.42 (≈2.8–3.3s).
 */
const C_SWITCH = 1.126;
const SWITCH_BAND = 0.03;

/**
 * The land (hills, meadow + path + companion, foreground grass/trees) moves
 * as ONE piece: with separate rates the hills detached from the path and a
 * strip of sky opened between them, which read as the ground coming apart.
 * Depth during the ascent comes from sky vs land vs rear/front clouds.
 */
const LAND_RATE = 0.75;
const RATE = {
  sky: 0.15,
  hills: LAND_RATE,
  meadow: LAND_RATE,
  fore: LAND_RATE,
  rear: 0.7,
  front: 1.25,
};

/** [time ms, c, dc/dt per ms] */
type Key = [number, number, number];
const ENTER: Key[] = [
  [1100, 0, 0],
  [2400, 0.45, 0.0008], // slow initial ascent
  [3500, 1.65, 0.0011], // faster cloud passage
  [4800, C_END, 0], // long soft deceleration
];
export const ASCENT_MS = 4800;
const SETTLE_MS = 250;
/** Star layers begin to appear once the clouds have parted. */
const REVEAL_AT_MS = 3500;
/**
 * Return (~3.6s, quicker than the ascent): the enter curve played backwards
 * and time-compressed (3.7s of camera → 3.0s), then a 0.6s beat where the
 * companion looks toward the user before the walk resumes.
 */
const RETURN_CAMERA_MS = 3000;
const RETURN_LOOK_MS = 600;
export const RETURN_MS = RETURN_CAMERA_MS + RETURN_LOOK_MS;
const RETURN_TIME_SCALE = (ASCENT_MS - ENTER[0][0]) / RETURN_CAMERA_MS;
/** When the postcard may rise in (after the arrival settles). */
export const STAR_CARD_DELAY_S = (ASCENT_MS + SETTLE_MS) / 1000;

function hermite(keys: Key[], t: number): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t0, v0, m0] = keys[i - 1];
    const [t1, v1, m1] = keys[i];
    if (t <= t1) {
      const d = t1 - t0;
      const s = (t - t0) / d;
      const s2 = s * s;
      const s3 = s2 * s;
      return (
        (2 * s3 - 3 * s2 + 1) * v0 +
        (s3 - 2 * s2 + s) * d * m0 +
        (-2 * s3 + 3 * s2) * v1 +
        (s3 - s2) * d * m1
      );
    }
  }
  return keys[keys.length - 1][1];
}
const smooth = (x: number) => {
  const s = Math.min(1, Math.max(0, x));
  return s * s * s * (s * (s * 6 - 15) + 10);
};

type Els = Record<"day" | "hills" | "meadow" | "fore" | "night" | "rear" | "front", HTMLElement>;

function ty(el: HTMLElement, screens: number) {
  el.style.transform = `translate3d(0, calc(${screens.toFixed(4)} * 100dvh), 0)`;
}
function show(el: HTMLElement, opacity: number) {
  el.style.opacity = opacity.toFixed(3);
  el.style.visibility = opacity <= 0.001 ? "hidden" : "visible";
}

/** Position every group for camera height c (and night mix n). */
function applyCamera(e: Els, c: number) {
  const n = smooth((c - (C_SWITCH - SWITCH_BAND)) / (2 * SWITCH_BAND));
  ty(e.day, RATE.sky * c);
  ty(e.hills, RATE.hills * c);
  ty(e.meadow, RATE.meadow * c);
  ty(e.fore, RATE.fore * c);
  ty(e.night, RATE.sky * (c - C_END));
  ty(e.rear, RATE.rear * c);
  ty(e.front, RATE.front * c);
  show(e.day, 1 - n);
  show(e.hills, 1 - n);
  show(e.meadow, 1 - n);
  show(e.fore, 1 - n);
  show(e.night, n);
  show(e.rear, smooth(c / 0.25));
  show(e.front, smooth(c / 0.2));
  return n;
}

export type AscentEnv = "day" | "night";

export function useStarAscent(isStarView: boolean) {
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState<AscentEnv>("day");
  const [starRevealed, setStarRevealed] = useState(false);
  /** True for the short beat after landing when the fox looks at the user. */
  const [landing, setLanding] = useState(false);
  const cRef = useRef(0);

  useEffect(() => {
    const q = (s: string) => document.querySelector<HTMLElement>(s);
    const found = {
      day: q(".jw-day"),
      hills: q(".jw-hills"),
      meadow: q(".jw-meadow"),
      fore: q(".jw-fore"),
      night: q(".jw-night"),
      rear: q(".jw-clouds-rear"),
      front: q(".jw-clouds-front"),
    };
    if (Object.values(found).some((v) => !v)) return;
    const e = found as Els;

    // Already resting in the meadow (initial mount): just place everything.
    if (!isStarView && cRef.current < 0.0005) {
      applyCamera(e, 0);
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = cRef.current;
    let raf = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let lastNight = from >= C_SWITCH;
    setBusy(true);
    if (!isStarView) setStarRevealed(false);

    const finish = () => {
      if (!isStarView && !reduced) {
        // Landed in the meadow: the companion looks toward the user briefly.
        setLanding(true);
        settleTimer = setTimeout(() => {
          setLanding(false);
          setBusy(false);
        }, RETURN_LOOK_MS);
      } else {
        settleTimer = setTimeout(() => setBusy(false), SETTLE_MS);
      }
    };

    if (reduced) {
      // 250ms crossfade, no camera travel: day groups at rest ↔ night at rest.
      const start = performance.now();
      const tick = (now: number) => {
        const p = smooth((now - start) / 250);
        const n = isStarView ? p : 1 - p;
        ty(e.day, 0); ty(e.hills, 0); ty(e.meadow, 0); ty(e.fore, 0); ty(e.night, 0);
        show(e.rear, 0); show(e.front, 0);
        show(e.day, 1 - n); show(e.hills, 1 - n); show(e.meadow, 1 - n); show(e.fore, 1 - n);
        show(e.night, n);
        if (n > 0.5 !== lastNight) {
          lastNight = n > 0.5;
          setEnv(lastNight ? "night" : "day");
        }
        if (p < 1) raf = requestAnimationFrame(tick);
        else {
          cRef.current = isStarView ? C_END : 0;
          if (isStarView) setStarRevealed(true);
          finish();
        }
      };
      raf = requestAnimationFrame(tick);
      return () => {
        cancelAnimationFrame(raf);
        if (settleTimer) clearTimeout(settleTimer);
      };
    }

    // Camera path for this run.
    let cAt: (t: number) => number;
    let end: number;
    if (isStarView) {
      if (from < 0.001) {
        cAt = (t) => hermite(ENTER, t);
        end = ASCENT_MS;
      } else {
        cAt = (t) => from + (C_END - from) * smooth(t / 1800);
        end = 1800;
      }
    } else if (from >= C_END - 0.001) {
      cAt = (t) => hermite(ENTER, ASCENT_MS - t * RETURN_TIME_SCALE);
      end = RETURN_CAMERA_MS;
    } else {
      cAt = (t) => from * (1 - smooth(t / 1800));
      end = 1800;
    }

    let revealed = false;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(now - start, end);
      const c = cAt(t);
      cRef.current = c;
      const n = applyCamera(e, c);
      if (n > 0.5 !== lastNight) {
        lastNight = n > 0.5;
        setEnv(lastNight ? "night" : "day");
      }
      if (isStarView && !revealed && t >= Math.min(REVEAL_AT_MS, end * 0.7)) {
        revealed = true;
        setStarRevealed(true);
      }
      if (t < end) raf = requestAnimationFrame(tick);
      else finish();
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (settleTimer) clearTimeout(settleTimer);
    };
  }, [isStarView]);

  return { busy, env, starRevealed, landing };
}
