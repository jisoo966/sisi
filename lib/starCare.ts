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
  return signs.filter((s) => s.starId === starId).length + (walksByStar().get(starId) ?? 0);
}

/** Care for every Star at once (for the sky). */
export function careByStar(signs: Sign[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of signs) if (s.starId) out[s.starId] = (out[s.starId] ?? 0) + 1;
  walksByStar().forEach((n, id) => (out[id] = (out[id] ?? 0) + n));
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
  return Array.from(days).sort().reverse();
}

/** What has been done for a Star, one count per activity (the three marks
 *  on its screen): Picture it · Walk with it · Reflect on today. */
export type StarMarks = { pictured: number; walked: number; reflected: number };
export function marksFor(starId: string, signs: Sign[]): StarMarks {
  const mine = signs.filter((s) => s.starId === starId);
  return {
    pictured: mine.filter((s) => s.momentType === "visualization").length,
    walked: daysTogether(starId).length,
    reflected: mine.filter((s) => s.kind === "small_step" || s.kind === "something_good").length,
  };
}
