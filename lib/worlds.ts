"use client";

/**
 * lib/worlds — which World Sísí and you are walking in.
 *
 * Worlds open with cumulative Starlight (lib/starlight WORLDS thresholds);
 * nothing is spent. Exactly one World is equipped at a time.
 *
 * World packs live in /public/V2/worlds/<world-id>/ with one file per slot
 * (see WORLD_SLOTS). Until a pack's art arrives, every slot falls back to
 * the Morning Meadow art that exists today, so choosing a World never
 * breaks the Journey — its gentle grade and cloud density still apply.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";
import { WORLDS, type WorldId } from "@/lib/starlight";

export { WORLDS, type WorldId };

export const WORLD_SLOTS = [
  "sky-morning",
  "sky-afternoon",
  "sky-evening",
  "background-far",
  "landscape-mid",
  "ground-seamless",
  "foreground-grass-seamless",
  "foreground-tree-left",
  "foreground-tree-right",
  "cloud-01",
  "cloud-02",
  "cloud-03",
  "discovery-object",
  "ambient-overlay",
  "preview",
] as const;
export type WorldSlot = (typeof WORLD_SLOTS)[number];

/** Path of a World-pack file (may not exist yet — callers fall back). */
export function worldAsset(world: WorldId, slot: WorldSlot, ext = "webp"): string {
  return `/V2/worlds/${world}/${slot}.${ext}`;
}

/** Each place's card picture and how cloudy its sky is (a forest hides it). */
export const WORLD_LOOK: Record<WorldId, { preview: string; grade: string; clouds: number; tagline: string }> = {
  "quiet-meadow": { preview: "/V2/themes/quiet-path-preview.webp", grade: "none", clouds: 1, tagline: "Where we began." },
  "bridge-pond": { preview: "/V2/themes/bridge-pond/preview.webp", grade: "none", clouds: 1, tagline: "A footbridge over still water." },
  "butterfly-forest": { preview: "/V2/themes/butterfly-forest/preview.webp", grade: "none", clouds: 0, tagline: "Light through the leaves." },
};

const KEY = "sisi:world";
const EVENT = "sisi:world-change";
export const DEFAULT_WORLD: WorldId = "quiet-meadow";
/** for now (showing every place to people): all places open, whatever the
 *  Starlight. Set back to false to bring the unlocks back. */
export const PLACES_ALL_OPEN = true;
/** places opened without Starlight (chosen before the Map existed) */
const GRANTED = "sisi:places-granted";
export function placesGranted(): WorldId[] {
  try {
    return JSON.parse(localStorage.getItem(GRANTED) ?? "[]");
  } catch {
    return [];
  }
}

async function signedInUser(): Promise<string | null> {
  if (LOCAL_ONLY) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export function equippedWorldLocal(): WorldId {
  if (typeof window === "undefined") return DEFAULT_WORLD;
  const v = localStorage.getItem(KEY) as WorldId | null;
  if (v && WORLDS.some((w) => w.id === v)) return v;
  // before the Map: the bridge chosen in Customize is kept (and stays open)
  try {
    if (JSON.parse(localStorage.getItem("sisi:satchel") ?? "null")?.equipped?.trail === "trail-bridge-pond") {
      localStorage.setItem(KEY, "bridge-pond");
      localStorage.setItem(GRANTED, JSON.stringify(Array.from(new Set([...placesGranted(), "bridge-pond"]))));
      return "bridge-pond";
    }
  } catch {
    // ignore
  }
  return DEFAULT_WORLD;
}

export async function loadEquippedWorld(): Promise<WorldId> {
  const user = await signedInUser();
  if (user) {
    const { data, error } = await createClient().from("world_choice").select("world_id").eq("user_id", user).maybeSingle();
    if (!error && data?.world_id && WORLDS.some((w) => w.id === data.world_id)) return data.world_id as WorldId;
  }
  return equippedWorldLocal();
}

/** Equip an unlocked World (callers check the threshold first). */
export async function equipWorld(id: WorldId): Promise<void> {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<WorldId>(EVENT, { detail: id }));
  const user = await signedInUser();
  if (user) {
    const { error } = await createClient().from("world_choice").upsert({ user_id: user, world_id: id, updated_at: new Date().toISOString() });
    if (error) console.warn("world_choice save failed; kept on this device:", error.message);
  }
}

export function useEquippedWorld(): WorldId {
  const [w, setW] = useState<WorldId>(DEFAULT_WORLD);
  useEffect(() => {
    setW(equippedWorldLocal());
    loadEquippedWorld().then(setW);
    const h = (e: Event) => setW((e as CustomEvent<WorldId>).detail);
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return w;
}
