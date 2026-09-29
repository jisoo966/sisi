/**
 * lib/starVisits — how a Star opens.
 *
 * Every visit opens the Star's timeline. Sísí's quiet invitation ("Shall
 * we spend a quiet moment with it?") appears only on a later visit from
 * the sky — never on the first visit, never right after the Star was
 * created, never from "Visit Star", and at most once a day per Star.
 */

import type { StarEntry } from "@/components/sisi/journey-v2/StarMemoryCard";

const KEY = "sisi:star-visits";
type Visits = Record<string, { count: number; invited?: string }>;

const today = () => new Date().toDateString();

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
  if (from === "created") entry = "celebrate";
  else if (from === "sky" && prev.count >= 1 && prev.invited !== today()) {
    entry = "quick";
    next.invited = today();
  }
  v[starId] = next;
  write(v);
  return entry;
}
