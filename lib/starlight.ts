/**
 * lib/starlight — the attention and small actions given to your Stars.
 *
 * "The more attention I give to my wish, the more alive our shared world
 * becomes." Starlight is:
 *   - one global balance shared across all Stars
 *   - permanently cumulative: never spent, never removed, never decays
 *   - not a streak, not XP, not purchasable
 *
 * Earning (only after the activity is completed AND saved):
 *   picture_it_completed    +1   (once per Star per local day)
 *   walk_with_it_completed  +1   (once per local day, whichever wish — ~30s of walking with it)
 *   something_good_saved    +1   (once per saved Moment)
 *   small_step_saved        +2   (once per saved Moment)
 * At most 3 per local calendar day (a larger award is trimmed to what's left).
 *
 * Ledger rows: id · user_id · source_type · source_id · star_id · amount ·
 * earned_date_local · created_at, unique on (user_id, source_type, source_id)
 * — refreshing, double-tapping Save, reopening a Moment, going back or a
 * second tab can never earn twice. Signed in: Supabase `starlight_ledger` +
 * the `award_starlight` function (migration 005, atomic cap + uniqueness).
 * Otherwise this device (localStorage), serialized across tabs with the Web
 * Locks API.
 */

import { createClient } from "@/lib/supabase/client";
import { LOCAL_ONLY } from "@/lib/dataMode";

export type StarlightSource =
  | "picture_it_completed"
  | "walk_with_it_completed"
  | "something_good_saved"
  | "small_step_saved"
  | "world_unlocked"
  | "admin_adjustment";

export const STARLIGHT_AMOUNT: Record<"picture_it_completed" | "walk_with_it_completed" | "something_good_saved" | "small_step_saved", number> = {
  picture_it_completed: 1,
  walk_with_it_completed: 1,
  something_good_saved: 1,
  small_step_saved: 2,
};
export const DAILY_MAX = 3;

export type LedgerRow = {
  id: string;
  user_id: string | null;
  source_type: StarlightSource;
  source_id: string;
  star_id: string | null;
  amount: number;
  earned_date_local: string; // YYYY-MM-DD in the person's own day
  created_at: string;
};

export type AwardResult = {
  /** the caller shows its own feedback (no global note / glint) */
  silent?: boolean;
  /** Starlight actually added (0 when already rewarded or today's light is full) */
  awarded: number;
  /** today's maximum was reached (nothing, or less, was added) */
  capped: boolean;
  /** this exact source had already been rewarded */
  duplicate: boolean;
  balance: number;
  /** Worlds whose threshold this award crossed */
  unlocked: WorldId[];
};

const KEY = "sisi:starlight-v1";
const LEGACY_KEY = "sisi:little-lights-v2";
const EVENT = "sisi:starlight";

/* ── Worlds (thresholds on cumulative Starlight; nothing is spent) ───── */

export type WorldId = "morning-meadow" | "cloud-garden" | "golden-afternoon" | "evening-field" | "quiet-winter";
export const WORLDS: { id: WorldId; name: string; threshold: number }[] = [
  { id: "morning-meadow", name: "Morning Meadow", threshold: 0 },
  { id: "cloud-garden", name: "Cloud Garden", threshold: 12 },
  { id: "golden-afternoon", name: "Golden Afternoon", threshold: 25 },
  { id: "evening-field", name: "Evening Field", threshold: 40 },
  { id: "quiet-winter", name: "Quiet Winter", threshold: 60 },
];
export function worldsUnlockedAt(balance: number): WorldId[] {
  return WORLDS.filter((w) => balance >= w.threshold).map((w) => w.id);
}

/* ── local day ──────────────────────────────────────────────────────── */

export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ── device ledger ──────────────────────────────────────────────────── */

function readLocal(): LedgerRow[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(v)) return v;
  } catch {
    // fall through
  }
  // first run: carry over earlier Little Lights (earned ones only — nothing
  // was ever meant to be taken away) as one adjustment
  const rows: LedgerRow[] = [];
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]") as { delta: number }[];
    const earned = Array.isArray(legacy) ? legacy.filter((e) => e.delta > 0).reduce((n, e) => n + e.delta, 0) : 0;
    if (earned > 0) {
      rows.push({
        id: uid(),
        user_id: null,
        source_type: "admin_adjustment",
        source_id: "legacy-little-lights",
        star_id: null,
        amount: earned,
        earned_date_local: localDate(),
        created_at: new Date().toISOString(),
      });
    }
  } catch {
    // ignore
  }
  writeLocal(rows);
  return rows;
}
function writeLocal(rows: LedgerRow[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}
function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `sl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Serialize read-modify-write across tabs (falls back to a single-tab lock). */
let chain: Promise<unknown> = Promise.resolve();
async function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { locks?: { request: (n: string, cb: () => Promise<T>) => Promise<T> } }) : null;
  if (nav?.locks) return nav.locks.request("sisi-starlight", async () => fn());
  const run = chain.then(fn, fn);
  chain = run.catch(() => undefined);
  return run;
}

const sum = (rows: LedgerRow[]) => rows.reduce((n, r) => n + Math.max(0, r.amount), 0);

/* ── signed-in ledger ───────────────────────────────────────────────── */

async function signedInUser(): Promise<string | null> {
  if (LOCAL_ONLY) return null; // redesign branch: device-only data
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/* ── public API ─────────────────────────────────────────────────────── */

export async function starlightBalance(): Promise<number> {
  const user = await signedInUser();
  if (user) {
    const { data, error } = await createClient().from("starlight_ledger").select("amount").eq("user_id", user);
    if (!error && data) return data.reduce((n, r) => n + Math.max(0, r.amount as number), 0);
  }
  return sum(readLocal());
}

/** Everything earned for one Star (for gentle per-Star details). */
export function starlightRows(): LedgerRow[] {
  return readLocal();
}

/**
 * Award Starlight for a completed, saved activity. Safe to call more than
 * once for the same source: only the first call can add anything.
 */
export async function awardStarlight(input: {
  source: keyof typeof STARLIGHT_AMOUNT;
  sourceId: string;
  starId?: string | null;
  /** the screen shows its own words and glint */
  silent?: boolean;
}): Promise<AwardResult> {
  const want = STARLIGHT_AMOUNT[input.source];
  const today = localDate();
  const user = await signedInUser();

  if (user) {
    const { data, error } = await createClient().rpc("award_starlight", {
      p_source_type: input.source,
      p_source_id: input.sourceId,
      p_star_id: input.starId && /^[0-9a-f-]{36}$/i.test(input.starId) ? input.starId : null,
      p_amount: want,
      p_local_date: today,
      p_daily_max: DAILY_MAX,
    });
    if (!error && data) {
      const r = (Array.isArray(data) ? data[0] : data) as { awarded: number; duplicate: boolean; balance: number };
      const before = r.balance - r.awarded;
      const result: AwardResult = {
        awarded: r.awarded,
        duplicate: r.duplicate,
        capped: !r.duplicate && r.awarded < want,
        balance: r.balance,
        unlocked: crossed(before, r.balance),
      };
      afterAward({ ...result, silent: input.silent });
      return result;
    }
    console.warn("award_starlight unavailable, keeping Starlight on this device:", error?.message);
  }

  const result = await withLock(() => {
    const rows = readLocal();
    const balanceBefore = sum(rows);
    if (rows.some((r) => r.source_type === input.source && r.source_id === input.sourceId)) {
      return { awarded: 0, duplicate: true, capped: false, balance: balanceBefore, unlocked: [] } as AwardResult;
    }
    const earnedToday = rows
      .filter((r) => r.earned_date_local === today && r.source_type !== "admin_adjustment" && r.source_type !== "world_unlocked")
      .reduce((n, r) => n + r.amount, 0);
    const amount = Math.max(0, Math.min(want, DAILY_MAX - earnedToday));
    if (amount === 0) return { awarded: 0, duplicate: false, capped: true, balance: balanceBefore, unlocked: [] } as AwardResult;
    const now = new Date().toISOString();
    const next: LedgerRow[] = [
      ...rows,
      { id: uid(), user_id: null, source_type: input.source, source_id: input.sourceId, star_id: input.starId ?? null, amount, earned_date_local: today, created_at: now },
    ];
    const balance = balanceBefore + amount;
    const unlocked = crossed(balanceBefore, balance);
    // the unlock itself is remembered too (amount 0; history only)
    for (const w of unlocked)
      next.push({ id: uid(), user_id: null, source_type: "world_unlocked", source_id: w, star_id: null, amount: 0, earned_date_local: today, created_at: now });
    writeLocal(next);
    return { awarded: amount, duplicate: false, capped: amount < want, balance, unlocked } as AwardResult;
  });
  afterAward({ ...result, silent: input.silent });
  return result;
}

function crossed(before: number, after: number): WorldId[] {
  return WORLDS.filter((w) => w.threshold > 0 && before < w.threshold && after >= w.threshold).map((w) => w.id);
}

function afterAward(r: AwardResult) {
  if (r.unlocked.length) queueDiscoveries(r.unlocked);
  if (typeof window !== "undefined" && (r.awarded > 0 || r.capped)) {
    window.dispatchEvent(new CustomEvent<AwardResult>(EVENT, { detail: r }));
  }
}

/** Starlight feedback: fired after each award attempt that earned (or hit the day's limit). */
/** Sísí's one line the very first time Starlight is earned */
export const FIRST_STARLIGHT_LINE = "Your first Starlight. Gather a little more, and a new world opens.";

export function onStarlight(fn: (r: AwardResult) => void): () => void {
  const h = (e: Event) => fn((e as CustomEvent<AwardResult>).detail);
  window.addEventListener(EVENT, h);
  // another tab earned: keep balances current
  const s = (e: StorageEvent) => {
    if (e.key === KEY) starlightBalance().then((balance) => fn({ awarded: 0, capped: false, duplicate: true, balance, unlocked: [] }));
  };
  window.addEventListener("storage", s);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", s);
  };
}

/* ── World discoveries (each shown once, on the unobstructed Journey) ── */

const DISC_KEY = "sisi:world-discoveries";
type Disc = Record<string, "pending" | "shown">;
function readDisc(): Disc {
  try {
    return JSON.parse(localStorage.getItem(DISC_KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}
function queueDiscoveries(ids: WorldId[]) {
  const d = readDisc();
  for (const id of ids) if (!d[id]) d[id] = "pending";
  try {
    localStorage.setItem(DISC_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}
export function pendingDiscovery(): WorldId | null {
  const d = readDisc();
  const id = WORLDS.map((w) => w.id).find((w) => d[w] === "pending");
  return id ?? null;
}
export function markDiscoveryShown(id: WorldId) {
  const d = readDisc();
  d[id] = "shown";
  try {
    localStorage.setItem(DISC_KEY, JSON.stringify(d));
  } catch {
    // ignore
  }
}
