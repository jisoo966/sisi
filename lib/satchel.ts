/**
 * lib/satchel — optional customization (opened from the travel satchel).
 *
 * Exactly three categories — SiSi · Trail · World. SiSi's core identity never
 * changes (small accessories only; no swapping to another animal).
 * Nothing is bought or spent (Starlight is never spent — lib/starlight).
 * Worlds live in lib/worlds (opened by cumulative Starlight thresholds).
 *
 * The catalog starts with the defaults that exist today; new items are
 * added here as their artwork arrives (preview + `apply` hook in Journey).
 *
 * Storage: Supabase `satchel_items` (migration 003); localStorage for
 * guests or until the migration is applied.
 */

import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { SCENE_THEME_EVENT } from "@/lib/sceneTheme";

export type SatchelCategory = "sisi" | "trail" | "world";

export type SatchelItem = {
  id: string;
  category: SatchelCategory;
  name: string;
  /** ✦ Lights needed; 0 = owned from the start. */
  cost: number;
  /** Small preview image. */
  preview: string;
};

export const SATCHEL_CATALOG: SatchelItem[] = [
  // SiSi — scarf · small charm · small travel accessory (art to come)
  { id: "sisi-plain", category: "sisi", name: "Just Sísí", cost: 0, preview: "/V2/sisi/sisi-sitting.webp?v=2" },
  // Trail — sparse flowers · path variation · walking-light (art to come)
  { id: "trail-plain", category: "trail", name: "Quiet path", cost: 0, preview: "/V2/themes/quiet-path-preview.webp" },
  // a cream footbridge over a pond (lib/sceneTheme)
  { id: "trail-bridge-pond", category: "trail", name: "Bridge & Pond", cost: 0, preview: "/V2/themes/bridge-pond/preview.webp" },
  // World — Quiet Meadow · Blue Riverside · Whispering Forest … (art to come)
  { id: "world-quiet-meadow", category: "world", name: "Quiet Meadow", cost: 0, preview: "/V2/parallax/journey-sky-fixed.png" },
];

export type SatchelState = { owned: Set<string>; equipped: Record<SatchelCategory, string> };

const KEY = "sisi:satchel";
const DEFAULT_EQUIPPED: Record<SatchelCategory, string> = {
  sisi: "sisi-plain",
  trail: "trail-plain",
  world: "world-quiet-meadow",
};

function readLocal(): SatchelState {
  let owned: string[] = [];
  let equipped = { ...DEFAULT_EQUIPPED };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (v) {
      owned = v.owned ?? [];
      equipped = { ...equipped, ...(v.equipped ?? {}) };
    }
  } catch {
    // ignore
  }
  return { owned: withDefaults(owned), equipped };
}
function writeLocal(s: SatchelState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ owned: Array.from(s.owned), equipped: s.equipped }));
  } catch {
    // ignore
  }
}
function withDefaults(ids: string[]) {
  return new Set([...ids, ...SATCHEL_CATALOG.filter((i) => i.cost === 0).map((i) => i.id)]);
}

async function uid(): Promise<string | null> {
  if (LOCAL_ONLY) return null; // redesign branch: device-only data
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function loadSatchel(): Promise<SatchelState> {
  const u = await uid();
  if (u) {
    const { data, error } = await createClient()
      .from("satchel_items")
      .select("item_id, category, equipped")
      .eq("user_id", u);
    if (!error && data) {
      const equipped = { ...DEFAULT_EQUIPPED };
      for (const r of data) if (r.equipped) equipped[r.category as SatchelCategory] = r.item_id as string;
      return { owned: withDefaults(data.map((r) => r.item_id as string)), equipped };
    }
  }
  return readLocal();
}

async function save(state: SatchelState, changed: SatchelItem[]) {
  const u = await uid();
  if (u) {
    const rows = changed.map((i) => ({
      user_id: u,
      item_id: i.id,
      category: i.category,
      equipped: state.equipped[i.category] === i.id,
    }));
    const { error } = await createClient().from("satchel_items").upsert(rows);
    if (!error) return;
  }
  writeLocal(state);
}

/** Equip an owned item (nothing is ever bought). */
export async function chooseItem(
  state: SatchelState,
  item: SatchelItem,
): Promise<{ state: SatchelState; ok: boolean }> {
  const owned = new Set(state.owned);
  if (!owned.has(item.id)) return { state, ok: false };
  const prevId = state.equipped[item.category];
  const next: SatchelState = { owned, equipped: { ...state.equipped, [item.category]: item.id } };
  const prev = SATCHEL_CATALOG.find((i) => i.id === prevId);
  await save(next, prev && prev.id !== item.id ? [item, prev] : [item]);
  // the path changes at once, wherever Sísí is walking
  if (item.category === "trail" && typeof window !== "undefined") {
    writeLocal(next); // the scene reads this phone's choice
    window.dispatchEvent(new CustomEvent(SCENE_THEME_EVENT, { detail: item.id }));
  }
  return { state: next, ok: true };
}
