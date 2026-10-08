"use client";

/**
 * lib/haptics — Sísí's one haptic language. Components never call
 * navigator.vibrate themselves; they name a moment:
 *
 *   select     selecting a Star                      light
 *   breath     inhale → exhale                        very light
 *   footprint  a Star Path footprint is added         two subtle taps
 *   wish       the wish shimmer reaches the Star      medium
 *   fulfilled  a wish marked fulfilled                medium · pause · light
 *   starlight  a little Starlight gathers ("✦ +1")    very light · pause · light
 *   error      something could not be saved           two short taps
 *
 * Never for scrolling, typing, ordinary navigation taps or continuous
 * breathing animation.
 *
 * Respects: the haptics-off preference (Menu → Vibration), the device /
 * browser capability, and reduced motion (for the visual fallback).
 * Where vibration isn't available (iOS Safari, desktop), it silently falls
 * back to a 0.97 → 1 press on the control that was used — nothing else.
 */

export type HapticKind = "select" | "breath" | "footprint" | "wish" | "fulfilled" | "starlight" | "error";

const PATTERN: Record<HapticKind, number | number[]> = {
  select: 10,
  breath: 6,
  footprint: [8, 80, 8],
  wish: 22,
  fulfilled: [22, 160, 10],
  starlight: [6, 70, 12],
  error: [14, 60, 14],
};

const KEY = "sisi:haptics";
const EVENT = "sisi:haptics-pref";

export function hapticsSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}
export function hapticsEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
export function setHapticsEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }));
}
export function onHapticsPref(fn: (on: boolean) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<{ on: boolean }>).detail.on);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** the visual stand-in: the control settles 0.97 → 1 once */
function press(el: Element | null | undefined) {
  if (!el || reducedMotion()) return;
  el.classList.remove("hx-press");
  // restart the animation
  void (el as HTMLElement).offsetWidth;
  el.classList.add("hx-press");
  setTimeout(() => el.classList.remove("hx-press"), 260);
}

/**
 * Play one haptic moment. `from` is the control that caused it (used only
 * for the visual fallback). Returns true if the device vibrated.
 */
export function haptic(kind: HapticKind, from?: Element | null): boolean {
  if (typeof window === "undefined" || !hapticsEnabled()) return false;
  if (hapticsSupported()) {
    try {
      if (navigator.vibrate(PATTERN[kind])) return true;
    } catch {
      // fall through to the visual stand-in
    }
  }
  press(from);
  return false;
}
