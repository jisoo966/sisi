/**
 * lib/hints — one-time, contextual guidance (no multi-screen tutorial).
 *
 *   talk        Journey: "Tap Sísí whenever you want to talk."
 *   capture     Journey Capture: "Save something from the life you’re walking through."
 *   starSaved   first Star reflection: "Saved to your Star. You can also find this in Moments."
 *   moments     first Moments visit: "Your life along the way"
 *   tapStar     Star World: "Tap your Star" (until a Star has been tapped once)
 *
 * Once dismissed (or the thing it explains has been done) it never returns.
 */

export type HintKey = "talk" | "capture" | "starSaved" | "moments" | "tapStar" | "firstStarlight" | "customize" | "pencilTold";
const KEY = "sisi:hints-v1";

function read(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function hintDone(key: HintKey): boolean {
  return !!read()[key];
}

export function markHint(key: HintKey) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [key]: true }));
  } catch {
    // ignore
  }
}
