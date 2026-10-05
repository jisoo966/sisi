"use client";

import { useEffect, useLayoutEffect, useState } from "react";

/**
 * lib/timeOfDay — the same Sísí world, changing gently with the user's
 * local time.
 *
 *   05:00–10:59  morning    "Good morning"
 *   11:00–16:59  afternoon  "Good afternoon"
 *   17:00–04:59  evening    "Good evening"
 *     22:00 → 24:00  an inky-blue overlay rises 0 → 25% so the coral
 *                    horizon never stays bright overnight
 *     00:00 → 04:00  it deepens to 38%, then morning crossfades in at 05:00
 *
 * Grass and ground follow along a little (never Sísí or the ivory UI):
 * morning ~10% lighter, afternoon original, evening ~13% darker and ~7%
 * less saturated — exposed as CSS variables --tod-b / --tod-s.
 *
 * Testing: /journey?hour=21.5 (kept for the session) previews a time.
 */

export type SkyPhase = "morning" | "afternoon" | "evening";
export type TimeOfDay = { phase: SkyPhase; ink: number; greeting: string };

export const SKY_SRC: Record<SkyPhase, string> = {
  morning: "/V2/time-of-day/sky-morning.webp",
  afternoon: "/V2/time-of-day/sky-afternoon.webp",
  evening: "/V2/time-of-day/sky-evening.webp",
};

const GRADE: Record<SkyPhase, { b: number; s: number; cb: number }> = {
  morning: { b: 1.1, s: 1, cb: 1 },
  afternoon: { b: 1, s: 1, cb: 1 },
  // evening clouds a little dimmer — never tinted orange
  evening: { b: 0.87, s: 0.93, cb: 0.86 },
};

const OVERRIDE_KEY = "sisi:tod-hour";

let urlRead = false;
function localHour(): number {
  if (typeof window !== "undefined") {
    try {
      if (!urlRead) {
        urlRead = true;
        const q = new URLSearchParams(window.location.search).get("hour");
        if (q !== null) sessionStorage.setItem(OVERRIDE_KEY, q);
      }
      const o = sessionStorage.getItem(OVERRIDE_KEY);
      if (o !== null && !Number.isNaN(parseFloat(o))) return ((parseFloat(o) % 24) + 24) % 24;
    } catch {
      // ignore
    }
  }
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

export function timeOfDayAt(h: number): TimeOfDay {
  if (h >= 5 && h < 11) return { phase: "morning", ink: 0, greeting: "Good morning" };
  if (h >= 11 && h < 17) return { phase: "afternoon", ink: 0, greeting: "Good afternoon" };
  let ink = 0;
  if (h >= 22) ink = 0.25 * ((h - 22) / 2);
  else if (h < 5) ink = 0.25 + 0.13 * Math.min(1, h / 4);
  return { phase: "evening", ink: Math.round(ink * 1000) / 1000, greeting: "Good evening" };
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Current time of day. `null` on the very first (server-matching) render;
 * filled in before the first paint on the client, then refreshed each
 * minute so a long walk crosses into the evening on its own.
 */
/** The last time of day this tab computed — so a page change (Journey ↔
 *  Moments) starts its very first frame with the right sky, not an empty one. */
let lastTod: TimeOfDay | null = null;

export function useTimeOfDay(): TimeOfDay | null {
  const [tod, setTod] = useState<TimeOfDay | null>(() => lastTod);
  useIsoLayoutEffect(() => {
    const update = () => {
      const t = timeOfDayAt(localHour());
      lastTod = t;
      setTod((prev) =>
        prev && prev.phase === t.phase && prev.ink === t.ink && prev.greeting === t.greeting ? prev : t,
      );
      const g = GRADE[t.phase];
      const root = document.documentElement.style;
      root.setProperty("--tod-b", String(g.b));
      root.setProperty("--tod-s", String(g.s));
      root.setProperty("--tod-cb", String(g.cb));
      // what sits on the open sky reads in one colour: ink on the light
      // morning sky, ivory on the deeper afternoon / evening blue (ds.css)
      document.documentElement.dataset.sky = t.phase === "morning" ? "light" : "deep";
    };
    update();
    // Slow transitions only once the first frame is on screen: a fresh launch
    // shows the right time of day at once; a change during the walk drifts in.
    const ready = setTimeout(() => document.documentElement.classList.add("tod-ready"), 1200);
    const id = setInterval(update, 60_000);
    return () => {
      clearInterval(id);
      clearTimeout(ready);
    };
  }, []);
  return tod;
}
