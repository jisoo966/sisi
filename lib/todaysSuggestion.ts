import type { Moment } from "@/lib/momentStore";
import type { Star } from "@/lib/myStars";

/**
 * One thing for today — when you arrive, Sísí's hello carries a single
 * suggestion that fits where you are (never a list, never a nag):
 *
 *   kept something today   "You kept something today. That’s enough."  (no button)
 *   back after a few days  "It’s good to see you again."              → keep a moment
 *   a new Star, no words   "What made you choose this wish?"            → write it
 *   an earlier moment      "Last time, you kept “…”. Has anything moved?" → write it
 *   otherwise              "Is there a moment from today to keep?"     → keep a moment
 */

export type Suggestion = {
  key: string;
  text: string;
  /** one action (none when today is already enough) */
  action?: { label: string; star: Star | null; question: string };
};

const LAST_VISIT = "sisi:last-visit";
const DAY = 24 * 60 * 60 * 1000;
const AWAY_DAYS = 3;

/** the day before this visit (read once, then today is written) */
export function readAndMarkVisit(): Date | null {
  try {
    const prev = localStorage.getItem(LAST_VISIT);
    localStorage.setItem(LAST_VISIT, new Date().toISOString());
    return prev ? new Date(prev) : null;
  } catch {
    return null;
  }
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

function snippet(text: string, max = 42): string {
  const t = text.trim().replace(/\s+/g, " ").replace(/[.。]$/, "");
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : max)}…`;
}

export function suggestionFor({
  greeting,
  name,
  stars,
  moments,
  lastVisit,
  now = new Date(),
}: {
  greeting: string;
  name: string;
  /** walking Stars, newest first */
  stars: Star[];
  moments: Moment[];
  lastVisit: Date | null;
  now?: Date;
}): Suggestion {
  const hello = name ? `${greeting}, ${name}.` : `${greeting}.`;
  const keep = "What would you like to keep from today?";
  const written = moments
    .filter((m) => m.type !== "visualization" && (m.text?.trim() || m.image))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (written.some((m) => sameDay(new Date(m.createdAt), now)))
    return { key: "today-done", text: `${hello} You kept something today. That’s enough.` };

  if (lastVisit && now.getTime() - lastVisit.getTime() >= AWAY_DAYS * DAY)
    return {
      key: "today-back",
      text: `It’s good to see you again${name ? `, ${name}` : ""}. Is there one moment you would like to keep?`,
      action: { label: "Keep a moment", star: null, question: keep },
    };

  const quiet = stars.find(
    (s) => now.getTime() - new Date(s.createdAt).getTime() < 2 * DAY && !moments.some((m) => m.starId === s.id),
  );
  if (quiet)
    return {
      key: `today-new-${quiet.id}`,
      text: `${hello} What made you choose “${snippet(quiet.wish, 32)}”?`,
      action: { label: "Tell me", star: quiet, question: "What made you choose this wish?" },
    };

  const last = written.find((m) => m.text?.trim());
  if (last?.text) {
    const star = stars.find((s) => s.id === last.starId) ?? null;
    return {
      key: `today-follow-${last.id}`,
      text: `${hello} Last time, you kept “${snippet(last.text)}”. Has anything moved since then?`,
      action: { label: "Write it", star, question: "What has moved since then?" },
    };
  }

  return { key: "today-keep", text: `${hello} Is there a moment from today you would like to keep?`, action: { label: "Keep a moment", star: null, question: keep } };
}
