/**
 * lib/moments — the Memory Trail (Moments tab).
 *
 * One chronological trail, newest first, made of:
 *   moment  a photo moment (postcard) or a written one (sign), each linked to
 *           the Star it belongs to when known
 *   star    the day a Star began (a small light on the path)
 *   rest    a Star at Rest — its moments stay here, it can return to the sky
 */

import type { Sign, Star } from "@/lib/myStars";
import { loadSigns, loadStars } from "@/lib/myStars";
import type { Postcard } from "@/lib/postcards";
import { loadPostcards } from "@/lib/postcards";
import { momentLinks } from "@/lib/momentLinks";

export type MomentItem = {
  type: "moment";
  key: string;
  at: string;
  text: string;
  image?: string;
  starId?: string;
  postcardId?: string;
  signId?: string;
  /** "Something good" / "A step I took" entry on a Star */
  kind?: "good" | "step";
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
  const [postcards, signs, stars] = await Promise.all([loadPostcards(), loadSigns(), loadStars()]);
  const links = momentLinks();
  const linkedSignIds = new Set(
    Object.values(links)
      .map((l) => l.signId)
      .filter(Boolean) as string[],
  );

  const items: TrailItem[] = [];

  postcards.forEach((p: Postcard) => {
    const link = links[p.id];
    items.push({
      type: "moment",
      key: `p-${p.id}`,
      at: p.takenAt || p.createdAt,
      text: p.text,
      image: p.image,
      starId: link?.starId,
      postcardId: p.id,
      signId: link?.signId,
    });
  });

  signs.forEach((s) => {
    if (linkedSignIds.has(s.id)) return; // shown once, as its photo
    items.push({ type: "moment", key: `s-${s.id}`, at: s.createdAt, text: s.text, starId: s.starId, signId: s.id, kind: s.kind });
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
export const ENTRY_LABEL: Record<"good" | "step", string> = {
  good: "Something good",
  step: "A step I took",
};
