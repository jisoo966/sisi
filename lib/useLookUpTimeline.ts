"use client";

import { useEffect, useRef } from "react";

/**
 * useLookUpTimeline — the star look-up as one choreographed timeline
 * (storyboard frames 1→6). Writes three CSS variables on .journey-stage-v2
 * every frame; globals.css turns them into transforms:
 *
 *   --look-sky     0 → 1   vertical sky: day (bottom) → clouds → night (top)
 *   --look-land    0 → 1   meadow + fox sink below the screen
 *   --look-sky-op  0 → 1   vertical sky visibility (the fixed sky never moves)
 *
 * Enter (ms):
 *     0 –  900  fox stops and looks up, trail of light (sky + meadow still)
 *   900 – 2100  camera tilts: clouds pour in from the top, meadow sinks (→2400)
 *  2100 – 2600  inside the clouds (slow drift — storyboard frame 4)
 *  2600 – 3700  clouds part, the night sky and the star arrive (frames 5–6)
 * Return: everything eases back down in ~1.9s; the meadow rises back in once
 * the clouds have passed.
 *
 * A multi-stage timeline (with a slow "inside the clouds" beat) can't be
 * expressed by a single CSS transition, hence the rAF driver.
 */

type Seg = [t: number, value: number, ease?: (x: number) => number];

const inOut = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const linear = (x: number) => x;

/**
 * Sky progress values at which the viewport sits inside the cloud band of
 * sky-vertical.png (dense clouds at ~27–62% of the image height) when the
 * sky is rendered at --sky-height: 320dvh.
 *   viewport top at image fraction f  →  progress = 1 − f × 3.2 / 2.2
 */
const IN_CLOUDS_A = 1 - (0.37 * 3.2) / 2.2; // ≈ 0.462
const IN_CLOUDS_B = 1 - (0.33 * 3.2) / 2.2; // ≈ 0.520
/** Final resting point: a little below the very top, so cloud tops frame
 *  the bottom of the night sky (storyboard frames 5–6). */
const NIGHT = 1 - (0.05 * 3.2) / 2.2; // ≈ 0.927

const ENTER = {
  sky: [[0, 0], [900, 0], [2100, IN_CLOUDS_A, inOut], [2600, IN_CLOUDS_B, linear], [3700, NIGHT, inOut]] as Seg[],
  land: [[0, 0], [900, 0], [2400, 1, inOut]] as Seg[],
  op: [[0, 0], [900, 0], [1150, 1, linear]] as Seg[],
};
export const LOOK_UP_TOTAL_MS = 3700;
/** When the postcard may rise in (after the camera has arrived). */
export const LOOK_UP_CARD_DELAY_S = 3.75;

function sample(track: Seg[], t: number): number {
  if (t <= track[0][0]) return track[0][1];
  for (let i = 1; i < track.length; i++) {
    const [t1, v1, ease = linear] = track[i];
    const [t0, v0] = track[i - 1];
    if (t <= t1) {
      const x = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
      return v0 + (v1 - v0) * ease(x);
    }
  }
  return track[track.length - 1][1];
}

export function useLookUpTimeline(isStarView: boolean) {
  const cur = useRef({ sky: 0, land: 0, op: 0 });

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".journey-stage-v2");
    if (!stage) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = { ...cur.current };

    let tracks: { sky: Seg[]; land: Seg[]; op: Seg[] };
    if (reduced) {
      const v = isStarView ? 1 : 0;
      tracks = {
        sky: [[0, from.sky], [250, isStarView ? NIGHT : 0, linear]],
        land: [[0, from.land], [250, v, linear]],
        op: [[0, from.op], [isStarView ? 0 : 250, v, linear]],
      };
    } else if (isStarView) {
      // Start from wherever we are (e.g. a quick back-and-forth).
      tracks = {
        sky: [[0, from.sky], ...ENTER.sky.slice(1)],
        land: [[0, from.land], ...ENTER.land.slice(1)],
        op: [[0, from.op], ...ENTER.op.slice(1)],
      };
    } else {
      tracks = {
        sky: [[0, from.sky], [1900, 0, inOut]],
        land: [[0, from.land], [600, from.land], [1900, 0, inOut]],
        op: [[0, from.op], [1900, from.op], [1950, 0, linear]],
      };
    }
    const end = Math.max(...[tracks.sky, tracks.land, tracks.op].map((t) => t[t.length - 1][0]));

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      const v = {
        sky: sample(tracks.sky, t),
        land: sample(tracks.land, t),
        op: sample(tracks.op, t),
      };
      cur.current = v;
      stage.style.setProperty("--look-sky", v.sky.toFixed(4));
      stage.style.setProperty("--look-land", v.land.toFixed(4));
      stage.style.setProperty("--look-sky-op", v.op.toFixed(3));
      if (t < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isStarView]);
}
