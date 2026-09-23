"use client";

import { useEffect, useRef } from "react";

/**
 * useLookUpTimeline — the star look-up as one choreographed camera move
 * (storyboard frames 1→6).
 *
 * Enter (ms):
 *     0 –  900  fox stops and looks up, trail of light (sky + meadow still)
 *   900 – 2100  camera tilts: clouds pour in from the top, meadow sinks (→2400)
 *  2100 – 2600  inside the clouds — the camera keeps drifting slowly
 *  2600 – 3700  clouds part, the night sky and the star arrive (frames 5–6)
 * Return: everything eases back down in ~2s.
 *
 * Smoothness rules:
 *   - The sky path is ONE C1-continuous curve (cubic Hermite through the
 *     key points with matched tangents). The camera never stops dead inside
 *     the clouds and restarts — it slows down and speeds up again.
 *   - Transforms are written straight onto the two moving elements (not as
 *     CSS variables on the stage root, which would re-style the whole scene
 *     every frame). Only transform + opacity change → compositor-only.
 */

/** Must match --sky-height in globals.css (320dvh). */
const SKY_SCREENS = 3.2;

/** Sky progress 0..1: 0 = bottom slice (day), 1 = top slice (night).
 *  viewport top at image fraction f → progress = 1 − f × 3.2 / 2.2 */
const IN_CLOUDS_A = 1 - (0.37 * 3.2) / 2.2; // ≈ 0.462
const IN_CLOUDS_B = 1 - (0.33 * 3.2) / 2.2; // ≈ 0.520
/** Final resting point: cloud tops frame the bottom of the night sky. */
const NIGHT = 1 - (0.05 * 3.2) / 2.2; // ≈ 0.927

export const LOOK_UP_TOTAL_MS = 3700;
/** When the postcard may rise in (after the camera has arrived). */
export const LOOK_UP_CARD_DELAY_S = 3.75;

/** Key point: time (ms), value, tangent (value per ms). */
type Key = [t: number, v: number, m: number];

/** Cubic Hermite through keys — continuous position AND velocity. */
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

/** Gentle start + gentle stop (smootherstep). */
const smoother = (x: number) => {
  const s = Math.min(1, Math.max(0, x));
  return s * s * s * (s * (s * 6 - 15) + 10);
};
const between = (t: number, t0: number, t1: number) => (t - t0) / (t1 - t0);

export function useLookUpTimeline(isStarView: boolean) {
  const cur = useRef({ sky: 0, land: 0, op: 0 });

  useEffect(() => {
    const sky = document.querySelector<HTMLElement>(".journey-sky-group");
    const land = document.querySelector<HTMLElement>(".journey-landscape-group");
    if (!sky || !land) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = { ...cur.current };

    let skyAt: (t: number) => number;
    let landAt: (t: number) => number;
    let opAt: (t: number) => number;
    let end: number;

    if (reduced) {
      const to = isStarView ? 1 : 0;
      end = 260;
      skyAt = (t) => from.sky + ((isStarView ? NIGHT : 0) - from.sky) * smoother(t / 250);
      landAt = (t) => from.land + (to - from.land) * smoother(t / 250);
      opAt = (t) => (isStarView ? 1 : t < 250 ? from.op : 0);
    } else if (isStarView) {
      if (from.sky < 0.01) {
        // Drift speed inside the clouds, shared by both neighbouring keys
        // so velocity is continuous through the cloud beat.
        const drift = (IN_CLOUDS_B - IN_CLOUDS_A) / 500;
        const keys: Key[] = [
          [900, 0, 0],
          [2100, IN_CLOUDS_A, drift],
          [2600, IN_CLOUDS_B, drift],
          [3700, NIGHT, 0],
        ];
        skyAt = (t) => hermite(keys, t);
        landAt = (t) => from.land + (1 - from.land) * smoother(between(t, 900, 2400));
        opAt = (t) => from.op + (1 - from.op) * smoother(between(t, 850, 1150));
        end = 3700;
      } else {
        // Re-entering mid-way: glide straight up from where we are.
        skyAt = (t) => from.sky + (NIGHT - from.sky) * smoother(t / 1600);
        landAt = (t) => from.land + (1 - from.land) * smoother(t / 1200);
        opAt = () => 1;
        end = 1600;
      }
    } else {
      skyAt = (t) => from.sky * (1 - smoother(t / 2000));
      landAt = (t) => from.land * (1 - smoother(between(t, 500, 2000)));
      opAt = (t) => (t < 2000 ? from.op : 0);
      end = 2010;
    }

    const apply = (v: { sky: number; land: number; op: number }) => {
      cur.current = v;
      // 100dvh − sky-height, scaled by how far we still are from the top.
      sky.style.transform = `translate3d(-50%, calc(${(-(SKY_SCREENS - 1) * (1 - v.sky)).toFixed(4)} * 100dvh), 0)`;
      sky.style.opacity = v.op.toFixed(3);
      land.style.transform = `translate3d(0, calc(${v.land.toFixed(4)} * 100dvh), 0)`;
    };

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      apply({ sky: skyAt(t), land: landAt(t), op: opAt(t) });
      if (t < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isStarView]);
}
