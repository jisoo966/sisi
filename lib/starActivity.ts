/**
 * lib/starActivity — what was done with a Star, written or not.
 *
 * A Star's marks must match what the person did: Picture it counts when the
 * ritual is lived through (with or without words after), Walk with it counts
 * on the day you set out with it. Words kept on the way are Moments (their own
 * store); this log only remembers that the time was given.
 */

import { localDate } from "@/lib/starlight";

export type ActivityKind = "picture" | "walk";
export type Activity = { starId: string; kind: ActivityKind; day: string; at: string };

const KEY = "sisi:star-activity-v1";

export function activities(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** remember it (a walk once a day per Star; each Picture it is its own) */
export function logActivity(starId: string, kind: ActivityKind) {
  const list = activities();
  const day = localDate();
  if (kind === "walk" && list.some((a) => a.kind === "walk" && a.starId === starId && a.day === day)) return;
  list.push({ starId, kind, day, at: new Date().toISOString() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // full: the Starlight ledger still remembers walks
  }
}
