/**
 * lib/starCare — how much time has been given to each Star.
 *
 * Care = its Moments (pictured, reflected, small steps, notes…) + the days
 * walked with it. It only ever grows: resting never dims a Star (no streaks).
 * The Star screen and the sky read the same numbers, so a Star looks as
 * bright in the sky as it does up close.
 */

import type { Sign } from "@/lib/myStars";
import { starlightRows } from "@/lib/starlight";
import { activities } from "@/lib/starActivity";

/** Days walked with each Star (from the Starlight ledger). */
function walksByStar(): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of starlightRows()) {
    if (r.source_type !== "walk_with_it_completed" || !r.star_id) continue;
    m.set(r.star_id, (m.get(r.star_id) ?? 0) + 1);
  }
  return m;
}

/** Care for one Star, given its Moments. */
export function careFor(starId: string, signs: Sign[]): number {
  const m = marksFor(starId, signs);
  return m.pictured + m.walked + m.reflected;
}

/** Care for every Star at once (for the sky). */
export function careByStar(signs: Sign[]): Record<string, number> {
  const ids = new Set<string>();
  for (const s of signs) if (s.starId) ids.add(s.starId);
  walksByStar().forEach((_, id) => ids.add(id));
  for (const a of activities()) ids.add(a.starId);
  const out: Record<string, number> = {};
  ids.forEach((id) => (out[id] = careFor(id, signs)));
  return out;
}

/** 0 → 1: how much brighter a Star has grown (a gentle curve, full by ~12). */
export function careGlow(care: number): number {
  return Math.min(1, Math.sqrt(Math.max(0, care) / 12));
}

/** The local days (YYYY-MM-DD) Sísí and this Star walked together, newest first. */
export function daysTogether(starId: string): string[] {
  const days = new Set<string>();
  for (const r of starlightRows()) {
    if (r.source_type === "walk_with_it_completed" && r.star_id === starId) days.add(r.earned_date_local);
  }
  // the day you set out with it counts (not only once its Starlight was earned)
  for (const a of activities()) if (a.kind === "walk" && a.starId === starId) days.add(a.day);
  return Array.from(days).sort().reverse();
}

/** Picture it, lived through (written or not) */
export function picturedTimes(starId: string, signs: Sign[]): number {
  const done = activities().filter((a) => a.kind === "picture" && a.starId === starId).length;
  const written = signs.filter((s) => s.starId === starId && s.momentType === "visualization").length;
  return Math.max(done, written); // older pictures were only remembered by their words
}

/** What has been done for a Star, one count per activity (the three marks
 *  on its screen): Picture it · Walk with it · Reflect on today. */
export type StarMarks = { pictured: number; walked: number; reflected: number };
export function marksFor(starId: string, signs: Sign[]): StarMarks {
  const mine = signs.filter((s) => s.starId === starId);
  return {
    pictured: picturedTimes(starId, signs),
    walked: daysTogether(starId).length,
    // every written record on this wish — a sign, a step, or a moment kept on the way
    reflected: mine.filter((s) => s.momentType !== "visualization").length,
  };
}
