/**
 * lib/moments — the Moments archive (Memory Trail + list).
 *
 * Everything the user chose to keep, newest first. Every moment is the ONE
 * canonical record in lib/momentStore — the same record a Star's Full
 * Journey shows — plus:
 *   star    the day a Star began
 *   rest    a Star at Rest — its moments stay here, it can return to the sky
 */

import type { EntryKind, Sign, Star } from "@/lib/myStars";
import { loadSigns, loadStars } from "@/lib/myStars";
import { loadMoments, type MomentSource, type MomentType } from "@/lib/momentStore";

export type MomentItem = {
  type: "moment";
  key: string;
  at: string;
  text: string;
  image?: string;
  starId?: string;
  /** the canonical record (edit / delete / connect through it) */
  momentId: string;
  source: MomentSource;
  mtype: MomentType;
  /** the connected Star's wish, for the card */
  starTitle?: string;
  /** @deprecated kept for older callers — same as momentId */
  signId?: string;
  postcardId?: string;
  /** "Something good" / "A step I took" entry on a Star */
  kind?: EntryKind;
};
export type StarItem = { type: "star"; key: string; at: string; star: Star };
export type RestItem = {
  type: "rest";
  key: string;
  at: string;
  star: Star;
  count: number;
  first?: string;
  last?: string;
};
export type TrailItem = MomentItem | StarItem | RestItem;

export async function loadTrail(): Promise<{ items: TrailItem[]; stars: Star[]; signs: Sign[] }> {
  const [moments, signs, stars] = await Promise.all([loadMoments(), loadSigns(), loadStars()]);
  const wish = new Map(stars.map((s) => [s.id, s.wish]));

  const items: TrailItem[] = [];

  moments.forEach((m) => {
    const kind = m.type === "something_good" || m.type === "small_step" ? m.type : undefined;
    // a Star that no longer exists: keep the Moment, just without the link
    const starId = m.starId && wish.has(m.starId) ? m.starId : undefined;
    items.push({
      type: "moment",
      key: `s-${m.id}`,
      at: m.createdAt,
      text: m.text ?? "",
      image: m.image ?? undefined,
      starId,
      starTitle: starId ? wish.get(starId) : undefined,
      momentId: m.id,
      signId: m.id,
      source: m.source,
      mtype: m.type,
      kind,
    });
  });

  stars.forEach((star) => {
    items.push({ type: "star", key: `b-${star.id}`, at: star.createdAt, star });
    if (star.restedAt) {
      const own = signs.filter((s) => s.starId === star.id).map((s) => s.createdAt).sort();
      items.push({
        type: "rest",
        key: `r-${star.id}`,
        at: star.restedAt,
        star,
        count: own.length,
        first: own[0],
        last: own[own.length - 1],
      });
    }
  });

  items.sort((a, b) => (a.at < b.at ? 1 : -1));
  return { items, stars, signs };
}

export function monthLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export function whenLabel(iso: string, withYear = false): string {
  try {
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${date} · ${time}`;
  } catch {
    return "";
  }
}

export function rangeLabel(first?: string, last?: string): string {
  if (!first) return "";
  const f = new Date(first);
  const l = new Date(last ?? first);
  const m = (d: Date) => d.toLocaleDateString("en-US", { month: "long" });
  const y = l.getFullYear();
  return f.getMonth() === l.getMonth() && f.getFullYear() === l.getFullYear()
    ? `${m(f)} ${y}`
    : `${m(f)}–${m(l)} ${y}`;
}

/** The label an entry carries on its Star and in Moments. */
export const ENTRY_LABEL: Record<EntryKind, string> = {
  something_good: "A sign",
  small_step: "A step I took",
};

/**
 * A real photo the person kept (camera / library / upload) — not app
 * artwork. Text-only Moments stay typographic; nothing decorative stands in.
 */
export function isRealPhoto(image?: string | null): boolean {
  if (!image) return false;
  if (image.startsWith("data:image/") || /^https?:\/\//.test(image) || image.startsWith("blob:")) return true;
  // same-origin static paths are illustration assets (/V2/…, /assets/…, /journey/…)
  return false;
}
