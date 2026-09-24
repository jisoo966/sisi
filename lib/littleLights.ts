/**
 * lib/littleLights — the ONE reward in SiSi.
 *
 * A Little Light is received after a meaningful Star practice (writing one
 * sentence, seeing it, walking with it, a meaningful talk with SiSi, a small
 * real-world step, an evening reflection). Never for opening the app, never
 * per chat message, no streaks, no expiry, no penalties.
 *
 * Rules
 *   - one Light per practice kind per day
 *   - at most MAX_PER_DAY Lights per day in total
 *
 * Storage: Supabase `light_ledger` (migration 003) for signed-in users;
 * localStorage for guests, or until the migration has been applied.
 */

import { createClient } from "@/lib/supabase/client";

export type PracticeKind = "write" | "see" | "walk" | "talk" | "step" | "evening";

type Entry = { at: string; kind: PracticeKind | "spend"; delta: number; starId?: string; itemId?: string };

const KEY = "sisi:little-lights-v2";
const MAX_PER_DAY = 3;

// ── local ledger ─────────────────────────────────────────
function readLocal(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLocal(log: Entry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(log.slice(-600)));
  } catch {
    // ignore
  }
}

// ── remote ledger (falls back to local on any error) ─────
async function userId(): Promise<string | null> {
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function readLedger(): Promise<{ log: Entry[]; remote: string | null }> {
  const uid = await userId();
  if (uid) {
    const { data, error } = await createClient()
      .from("light_ledger")
      .select("delta, kind, star_id, item_id, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (!error && data) {
      return {
        remote: uid,
        log: data.map((r) => ({
          at: r.created_at as string,
          kind: r.kind as Entry["kind"],
          delta: r.delta as number,
          starId: (r.star_id as string) ?? undefined,
          itemId: (r.item_id as string) ?? undefined,
        })),
      };
    }
  }
  return { log: readLocal(), remote: null };
}

async function append(e: Entry, remote: string | null) {
  if (remote) {
    const { error } = await createClient().from("light_ledger").insert({
      user_id: remote,
      delta: e.delta,
      kind: e.kind,
      star_id: e.starId && /^[0-9a-f-]{36}$/i.test(e.starId) ? e.starId : null,
      item_id: e.itemId ?? null,
    });
    if (!error) return;
    console.warn("light_ledger insert failed, keeping it on this device:", error.message);
  }
  writeLocal([...readLocal(), e]);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

function allowed(log: Entry[], kind: PracticeKind) {
  const today = dayKey(new Date());
  const todays = log.filter((e) => e.delta > 0 && dayKey(new Date(e.at)) === today);
  return todays.length < MAX_PER_DAY && !todays.some((e) => e.kind === kind);
}

// ── public API ───────────────────────────────────────────
export async function lightBalance(): Promise<number> {
  const { log } = await readLedger();
  return Math.max(0, log.reduce((n, e) => n + e.delta, 0));
}

/** Grant one Light for a completed practice. Resolves true if granted. */
export async function earnLight(kind: PracticeKind, starId?: string): Promise<boolean> {
  const { log, remote } = await readLedger();
  if (!allowed(log, kind)) return false;
  await append({ at: new Date().toISOString(), kind, delta: 1, starId }, remote);
  return true;
}

/** Spend Lights on a satchel item. Resolves true if affordable. */
export async function spendLights(amount: number, itemId: string): Promise<boolean> {
  const { log, remote } = await readLedger();
  const balance = log.reduce((n, e) => n + e.delta, 0);
  if (balance < amount) return false;
  await append({ at: new Date().toISOString(), kind: "spend", delta: -amount, itemId }, remote);
  return true;
}

/**
 * The one gentle action recommended today — stable for the whole day,
 * rotating across days so the practice never feels like a chore.
 */
export function recommendedPractice(date = new Date()): "write" | "see" | "walk" | "talk" {
  const order = ["write", "see", "walk", "write", "talk"] as const;
  const n = Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / 864e5);
  return order[((n % order.length) + order.length) % order.length];
}
