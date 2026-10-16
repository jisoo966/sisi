"use client";

/**
 * lib/shop — spending Starlight on what joins the walk (rules: lib/shopCore,
 * prices: lib/shopCatalog).
 *
 * Signed in (with Supabase data on): the server function purchase_item checks
 * the price, the balance and ownership, and takes the Starlight and gives the
 * item in one transaction (supabase/migrations/008_starlight_shop.sql).
 * Otherwise (today: a guest's Starlight lives on this device): the same rules
 * run under the ledger's cross-tab lock, and a purchase is one appended row.
 *
 * Existing walkers keep everything: on first run, the places they had opened
 * and the decorations their places already showed are given to them, and
 * each place keeps the look it had (runs once; safe to run again).
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";
import {
  STARLIGHT_EVENT,
  WORLDS,
  ledgerTransaction,
  localDate,
  newLedgerId,
  starlightBalance,
  starlightEarned,
  starlightRows,
  type WorldId,
} from "@/lib/starlight";
import { PLACES_ALL_OPEN, equippedWorldLocal, placesGranted } from "@/lib/worlds";
import { CATALOG, itemById } from "@/lib/shopCatalog";
import { balanceOf, ownedOf, planGrant, planPurchase } from "@/lib/shopCore";
import { effectiveLook, saveLook, savedLooks, seedLook, type Look } from "@/lib/looks";

async function signedIn(): Promise<string | null> {
  if (LOCAL_ONLY) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user && !data.user.is_anonymous ? data.user.id : null;
  } catch {
    return null;
  }
}

/** what is owned right now (this device's ledger; the demo switch opens all) */
export function ownedNow(): Set<string> {
  if (PLACES_ALL_OPEN) return new Set(CATALOG.map((i) => i.id).concat("place:quiet-meadow"));
  return ownedOf(starlightRows());
}

export type PurchaseResult = { ok: true; balance: number } | { ok: false; reason: "owned" | "short" | "unknown" | "failed"; need?: number };

/** Buy one item. Safe to call twice: the second finds it owned and takes nothing. */
export async function purchase(itemId: string): Promise<PurchaseResult> {
  if (!itemById(itemId)) return { ok: false, reason: "unknown" };
  const user = await signedIn();
  if (user) {
    const { data, error } = await createClient().rpc("purchase_item", { p_item_id: itemId, p_local_date: localDate() });
    if (error) {
      const m = error.message || "";
      if (/insufficient/i.test(m)) return { ok: false, reason: "short" };
      if (/owned/i.test(m)) return { ok: false, reason: "owned" };
      return { ok: false, reason: "failed" };
    }
    const r = (Array.isArray(data) ? data[0] : data) as { balance: number } | null;
    return { ok: true, balance: r?.balance ?? (await starlightBalance()) };
  }
  try {
    return await ledgerTransaction<PurchaseResult>((rows) => {
      const plan = planPurchase(rows, itemId, { id: newLedgerId(), now: new Date().toISOString(), today: localDate() });
      if (!plan.ok) return { append: [], result: { ok: false, reason: plan.reason, need: plan.need } };
      return { append: [plan.row], result: { ok: true, balance: plan.balanceAfter } };
    });
  } catch {
    return { ok: false, reason: "failed" }; // nothing was written
  }
}

/** Give an item without Starlight (the onboarding's butterflies). Once only. */
export async function grantItem(itemId: string): Promise<void> {
  await ledgerTransaction((rows) => {
    const row = planGrant(rows, itemId, { id: newLedgerId(), now: new Date().toISOString(), today: localDate() });
    return { append: row ? [row] : [], result: undefined };
  });
}

/** The first gift (onboarding): the ivory butterflies, on the walk at once. */
export async function bringButterflies(): Promise<void> {
  try {
    await grantItem("lives:butterflies");
    const place = equippedWorldLocal();
    const owned = ownedNow();
    const at = owned.has(`place:${place}`) ? place : "quiet-meadow";
    const look = effectiveLook(at, savedLooks()[at], owned);
    saveLook(at, { ...look, butterflies: "ivory" });
  } catch {
    // they stay free on the Map
  }
}

/* ── existing walkers: nothing is taken away (runs once) ───────────── */

const MIGRATED = "sisi:shop-migrated-v1";

function hasHistory(): boolean {
  try {
    return !!(
      localStorage.getItem("sisi:guest-onboarded") === "true" ||
      (JSON.parse(localStorage.getItem("sisi:stars") ?? "[]") as unknown[]).length ||
      localStorage.getItem("sisi:moments-v1") ||
      starlightRows().length
    );
  } catch {
    return false;
  }
}

const OLD_LOOKS: Record<WorldId, Look> = {
  "quiet-meadow": { trees: "trees:teal", flowers: null, butterflies: null, fish: false, bird: false },
  "bridge-pond": { trees: "trees:willow", flowers: "flowers:pond-reeds", butterflies: null, fish: true, bird: false },
  "butterfly-forest": { trees: "trees:forest-big", flowers: "flowers:forest", butterflies: "ivory", fish: false, bird: false },
};
const OLD_DECOR: Record<WorldId, string[]> = {
  "quiet-meadow": ["trees:teal"],
  "bridge-pond": ["trees:willow", "flowers:pond-reeds", "lives:fish"],
  "butterfly-forest": ["trees:forest-big", "flowers:forest", "lives:butterflies"],
};

export async function migrateShop(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATED) === "1") return;
    if (!hasHistory()) {
      localStorage.setItem(MIGRATED, "1"); // a new walker: starts with the meadow
      return;
    }
    // the places they had opened before (by the old cumulative rule, a gift, or in use)
    const earned = await starlightEarned();
    const granted = placesGranted();
    const using = equippedWorldLocal();
    const opened = WORLDS.filter((w) => w.threshold === 0 || earned >= w.threshold || granted.includes(w.id) || using === w.id).map((w) => w.id);
    const gifts = new Set<string>(["lives:butterflies"]);
    for (const p of opened) {
      if (p !== "quiet-meadow") gifts.add(`place:${p}`);
      OLD_DECOR[p].forEach((d) => gifts.add(d));
    }
    await ledgerTransaction((rows) => {
      const append = [];
      let seen = rows;
      for (const id of Array.from(gifts)) {
        const row = planGrant(seen, id, { id: newLedgerId(), now: new Date().toISOString(), today: localDate() });
        if (row) {
          append.push(row);
          seen = [...seen, row];
        }
      }
      return { append, result: undefined };
    });
    // each place keeps the look it had (only where none is saved yet)
    for (const p of opened) seedLook(p, OLD_LOOKS[p]);
    localStorage.setItem(MIGRATED, "1");
  } catch {
    // try again next launch: grants are once-only, looks only fill empty places
  }
}

/* ── hook ──────────────────────────────────────────────────────────── */

/** balance to spend and what is owned, kept current */
export function useShop(): { balance: number; owned: Set<string>; ready: boolean } {
  const [state, setState] = useState<{ balance: number; owned: Set<string>; ready: boolean }>({ balance: 0, owned: new Set(["place:quiet-meadow"]), ready: false });
  useEffect(() => {
    let alive = true;
    const sync = async () => {
      await migrateShop();
      const balance = await starlightBalance();
      if (alive) setState({ balance, owned: ownedNow(), ready: true });
    };
    sync();
    window.addEventListener(STARLIGHT_EVENT, sync);
    const st = (e: StorageEvent) => e.key === "sisi:starlight-v1" && sync();
    window.addEventListener("storage", st);
    return () => {
      alive = false;
      window.removeEventListener(STARLIGHT_EVENT, sync);
      window.removeEventListener("storage", st);
    };
  }, []);
  return state;
}

export { balanceOf };
