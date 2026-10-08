/**
 * lib/momentStore — ONE canonical saved record for everything the user keeps.
 *
 * Created only by:
 *   Journey Capture    source journey_capture   type general          star optional
 *   Star Check-in      source star_check_in     type something_good | small_step   star required
 *   Picture it         source star_check_in     type visualization    star required
 *   Sísí conversation  source sisi_conversation (only on explicit save)          star optional
 *   A thought for your walk
 *                      source sisi_note         type companion_note   star optional
 *
 * Moments, a Star's Full Journey, and every other view read THIS record —
 * never a copy. Editing / deleting / (dis)connecting a Star changes it
 * everywhere at once.
 *
 * Storage
 *   device (local-only build): localStorage "sisi:moments-v1"
 *   Supabase (later): the existing `signs` table, extended additively by
 *     supabase/migrations/004_unified_moments.sql (not applied yet)
 *
 * Migration of older device data (non-destructive, idempotent):
 *   "sisi:postcards"  → journey_capture moments (photo + text)
 *   "sisi:signs"      → star_check_in moments
 *   "sisi:moment-links" pairs a postcard with the sign that duplicated its
 *     words — the pair becomes ONE moment (photo + text + star).
 *   The old keys are left untouched (backup). Every imported id is remembered
 *   in "sisi:moments-imported" so nothing is imported twice and a deleted
 *   Moment never comes back. Older screens that still write postcards keep
 *   working: their new records are picked up the same way.
 */

import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";

export type MomentSource = "journey_capture" | "star_check_in" | "sisi_conversation" | "sisi_note";
export type MomentType = "general" | "something_good" | "small_step" | "companion_note" | "visualization";

export type Moment = {
  id: string;
  userId: string | null;
  source: MomentSource;
  type: MomentType;
  text: string | null;
  /** dataURL on this device; a storage URL when signed in */
  image: string | null;
  imageWidth?: number;
  imageHeight?: number;
  starId: string | null;
  createdAt: string;
  updatedAt: string;
};

const KEY = "sisi:moments-v1";
const IMPORTED = "sisi:moments-imported";

/* ── device storage ─────────────────────────────────────────────────── */

function readLocal(): Moment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}
function writeLocal(list: Moment[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  notify();
}

type LegacySign = { id: string; starId: string; text: string; createdAt: string; kind?: string };
type LegacyPostcard = { id: string; text?: string; image: string; width?: number; height?: number; takenAt?: string; createdAt: string };

/** Older type names → the current ones. */
export function toMomentType(kind: unknown): MomentType {
  if (kind === "something_good" || kind === "good") return "something_good";
  if (kind === "small_step" || kind === "step_taken" || kind === "step") return "small_step";
  if (kind === "companion_note") return "companion_note";
  if (kind === "visualization") return "visualization";
  return "general";
}

function syncLegacy(list: Moment[]): Moment[] {
  if (typeof window === "undefined") return list;
  let imported: Set<string>;
  try {
    imported = new Set(JSON.parse(localStorage.getItem(IMPORTED) ?? "[]"));
  } catch {
    imported = new Set();
  }
  const read = <T,>(k: string, fallback: T): T => {
    try {
      return JSON.parse(localStorage.getItem(k) ?? "null") ?? fallback;
    } catch {
      return fallback;
    }
  };
  const signs = read<LegacySign[]>("sisi:signs", []);
  const postcards = read<LegacyPostcard[]>("sisi:postcards", []);
  const links = read<Record<string, { starId: string; signId?: string }>>("sisi:moment-links", {});
  const have = new Set(list.map((m) => m.id));
  const added: Moment[] = [];

  for (const p of postcards) {
    if (imported.has(`p:${p.id}`) || have.has(p.id)) continue;
    const link = links[p.id];
    const sign = link?.signId ? signs.find((s) => s.id === link.signId) : undefined;
    const at = p.takenAt || p.createdAt;
    added.push({
      id: p.id,
      userId: null,
      source: "journey_capture",
      type: "general",
      text: (p.text || sign?.text || "").trim() || null,
      image: p.image,
      imageWidth: p.width,
      imageHeight: p.height,
      starId: link?.starId ?? null,
      createdAt: at,
      updatedAt: at,
    });
    imported.add(`p:${p.id}`);
    if (link?.signId) imported.add(`s:${link.signId}`); // the duplicated words
  }
  for (const s of signs) {
    if (imported.has(`s:${s.id}`) || have.has(s.id)) continue;
    const type = toMomentType(s.kind);
    added.push({
      id: s.id,
      userId: null,
      source: "star_check_in",
      type,
      text: s.text,
      image: null,
      starId: s.starId ?? null,
      createdAt: s.createdAt,
      updatedAt: s.createdAt,
    });
    imported.add(`s:${s.id}`);
  }
  if (added.length) {
    const next = [...list, ...added];
    localStorage.setItem(KEY, JSON.stringify(next));
    localStorage.setItem(IMPORTED, JSON.stringify(Array.from(imported)));
    return next;
  }
  return list;
}

/* ── change notifications (so open views stay in step) ─────────────── */

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function onMomentsChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ── signed-in (Supabase) ──────────────────────────────────────────── */

async function currentUser() {
  if (LOCAL_ONLY) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

type Row = {
  id: string;
  user_id: string;
  star_id: string | null;
  text: string | null;
  source: string | null;
  type: string | null;
  image_url: string | null;
  image_width: number | null;
  image_height: number | null;
  created_at: string;
  updated_at: string | null;
};
const fromRow = (r: Row): Moment => ({
  id: r.id,
  userId: r.user_id,
  starId: r.star_id,
  text: r.text,
  source: (["journey_capture", "star_check_in", "sisi_conversation", "sisi_note"].includes(r.source ?? "")
    ? r.source
    : r.star_id
      ? "star_check_in"
      : "journey_capture") as MomentSource,
  type: toMomentType(r.type),
  image: r.image_url,
  imageWidth: r.image_width ?? undefined,
  imageHeight: r.image_height ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? r.created_at,
});

/* ── public API ─────────────────────────────────────────────────────── */

/** Every saved Moment, newest first. */
export async function loadMoments(): Promise<Moment[]> {
  const user = await currentUser();
  if (user) {
    const { data, error } = await createClient()
      .from("signs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadMoments", error);
      return [];
    }
    return (data as Row[]).map(fromRow);
  }
  const list = syncLegacy(readLocal());
  return [...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** One Star's Full Journey: the same records, filtered. */
export async function loadStarMoments(starId: string): Promise<Moment[]> {
  return (await loadMoments()).filter((m) => m.starId === starId);
}

export async function createMoment(input: {
  source: MomentSource;
  type: MomentType;
  text?: string | null;
  image?: string | null;
  imageWidth?: number;
  imageHeight?: number;
  starId?: string | null;
}): Promise<Moment> {
  if (input.source === "star_check_in" && !input.starId) throw new Error("a Star reflection needs a Star");
  const now = new Date().toISOString();
  const user = await currentUser();
  const m: Moment = {
    id: crypto.randomUUID(),
    userId: user?.id ?? null,
    source: input.source,
    type: input.type,
    text: input.text?.trim() || null,
    image: input.image ?? null,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    starId: input.starId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  if (user) {
    let imageUrl = m.image;
    if (m.image?.startsWith("data:")) {
      // same bucket as postcards
      const blob = await (await fetch(m.image)).blob();
      const path = `${user.id}/${m.id}.jpg`;
      const up = await createClient().storage.from("postcards").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw up.error;
      imageUrl = path;
    }
    const { error } = await createClient().from("signs").insert({
      id: m.id,
      user_id: user.id,
      star_id: m.starId,
      text: m.text,
      source: m.source,
      type: m.type,
      image_url: imageUrl,
      image_width: m.imageWidth ?? null,
      image_height: m.imageHeight ?? null,
    });
    if (error) throw error;
    notify();
    return m;
  }
  writeLocal([m, ...syncLegacy(readLocal())]);
  return m;
}

/** Edit text, change the type, or connect / disconnect a Star (null). */
export async function updateMoment(
  id: string,
  patch: Partial<Pick<Moment, "text" | "type" | "starId">>,
): Promise<void> {
  const updatedAt = new Date().toISOString();
  const user = await currentUser();
  if (user) {
    const row: Record<string, unknown> = { updated_at: updatedAt };
    if (patch.text !== undefined) row.text = patch.text?.trim() || null;
    if (patch.type !== undefined) row.type = patch.type;
    if (patch.starId !== undefined) row.star_id = patch.starId;
    const { error } = await createClient().from("signs").update(row).eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    notify();
    return;
  }
  const list = syncLegacy(readLocal()).map((m) =>
    m.id === id
      ? {
          ...m,
          ...(patch.text !== undefined ? { text: patch.text?.trim() || null } : {}),
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.starId !== undefined ? { starId: patch.starId } : {}),
          updatedAt,
        }
      : m,
  );
  writeLocal(list);
}

/** a deleted Moment, for a few seconds: "Deleted · Undo" brings it back as it was */
export const MOMENT_DELETED = "sisi:moment-deleted";

/** Put a just-deleted Moment back exactly as it was (same id, same day). */
export async function restoreMoment(m: Moment): Promise<void> {
  const user = await currentUser();
  if (user) {
    const { error } = await createClient().from("signs").insert({
      id: m.id,
      user_id: user.id,
      star_id: m.starId,
      text: m.text,
      source: m.source,
      type: m.type,
      image_url: m.image,
      image_width: m.imageWidth ?? null,
      image_height: m.imageHeight ?? null,
      created_at: m.createdAt,
      updated_at: m.updatedAt,
    });
    if (error) throw error;
    notify();
    return;
  }
  const list = syncLegacy(readLocal()).filter((x) => x.id !== m.id);
  writeLocal([m, ...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
}

/** Remove a Moment from every view (it was saved once, so once is enough). */
export async function deleteMoment(id: string): Promise<void> {
  const gone = (await loadMoments()).find((m) => m.id === id) ?? null;
  if (gone && typeof window !== "undefined") window.dispatchEvent(new CustomEvent<Moment>(MOMENT_DELETED, { detail: gone }));
  const user = await currentUser();
  if (user) {
    const { error } = await createClient().from("signs").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    notify();
    return;
  }
  writeLocal(syncLegacy(readLocal()).filter((m) => m.id !== id));
}

/** A Star was deleted: its Moments stay, just no longer connected. */
export async function detachStar(starId: string): Promise<void> {
  const user = await currentUser();
  if (user) {
    await createClient().from("signs").update({ star_id: null }).eq("star_id", starId).eq("user_id", user.id);
    notify();
    return;
  }
  writeLocal(syncLegacy(readLocal()).map((m) => (m.starId === starId ? { ...m, starId: null } : m)));
}

/** Labels shown on cards and notes. */
export const TYPE_LABEL: Partial<Record<MomentType, string>> = {
  something_good: "A sign",
  small_step: "A step I took",
  companion_note: "A note from Sísí",
  visualization: "Pictured it",
};
