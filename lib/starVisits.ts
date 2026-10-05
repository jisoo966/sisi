/**
 * lib/starVisits — how a Star opens.
 *
 * Every visit opens the one Star screen (the Star as bright as the time
 * given to it, the wish, Sísí's line, "Spend a quiet moment"); right after
 * a Star is created it opens with the small celebration instead.
 */

import type { StarEntry } from "@/components/sisi/journey-v2/StarMemoryCard";

const KEY = "sisi:star-visits";
type Visits = Record<string, { count: number; invited?: string }>;


function read(): Visits {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function write(v: Visits) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

/** Record a visit and decide how the Star opens. */
export function entryForVisit(starId: string, from: "sky" | "visit" | "created"): StarEntry {
  if (typeof window === "undefined") return "journey";
  const v = read();
  const prev = v[starId] ?? { count: 0 };
  const next = { ...prev, count: prev.count + 1 };
  let entry: StarEntry = "journey";
  // one Star screen for every visit: the Star, the wish, Sísí's line and
  // "Spend a quiet moment" (the separate invitation step is folded into it)
  if (from === "created") entry = "celebrate";
  v[starId] = next;
  write(v);
  return entry;
}
