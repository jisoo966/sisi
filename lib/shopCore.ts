/**
 * lib/shopCore — the rules of spending Starlight, as plain functions over the
 * ledger (no storage, no network: lib/shop runs them; the tests check them).
 *
 * One ledger is the single source of truth:
 *   earning     rows with a positive amount (lib/starlight awards)
 *   spending    a "purchase" row: amount = −price, source_id = the item
 *   gifts       a "grant" row: amount 0, source_id = the item
 * So what you own is exactly the purchase and grant rows, and the balance is
 * the sum of all rows. A purchase is ONE appended row: taking the Starlight
 * and giving the item can't happen apart. The ledger's (source_type,
 * source_id) is unique, so the same item can't be bought twice.
 */

import type { LedgerRow } from "@/lib/starlight";
import { CATALOG, itemById, BASE_PLACE } from "@/lib/shopCatalog";

export const balanceOf = (rows: LedgerRow[]) => Math.max(0, rows.reduce((n, r) => n + r.amount, 0));

export function ownedOf(rows: LedgerRow[]): Set<string> {
  const owned = new Set<string>([`place:${BASE_PLACE}`]);
  for (const r of rows) if (r.source_type === "purchase" || r.source_type === "grant") owned.add(r.source_id);
  return owned;
}

export type PurchasePlan =
  | { ok: true; row: LedgerRow; balanceAfter: number }
  | { ok: false; reason: "unknown" | "owned" | "short"; need?: number };

/** What buying `itemId` would do to these rows (nothing is written here). */
export function planPurchase(
  rows: LedgerRow[],
  itemId: string,
  make: { id: string; now: string; today: string; userId?: string | null },
): PurchasePlan {
  const item = itemById(itemId);
  if (!item) return { ok: false, reason: "unknown" };
  if (ownedOf(rows).has(itemId)) return { ok: false, reason: "owned" };
  const balance = balanceOf(rows);
  if (balance < item.price) return { ok: false, reason: "short", need: item.price - balance };
  return {
    ok: true,
    balanceAfter: balance - item.price,
    row: {
      id: make.id,
      user_id: make.userId ?? null,
      source_type: item.price > 0 ? "purchase" : "grant",
      source_id: itemId,
      star_id: null,
      amount: -item.price,
      earned_date_local: make.today,
      created_at: make.now,
    },
  };
}

/** A gift of an item (once): nothing to pay, nothing taken. */
export function planGrant(rows: LedgerRow[], itemId: string, make: { id: string; now: string; today: string }): LedgerRow | null {
  if (!itemById(itemId) || ownedOf(rows).has(itemId)) return null;
  return { id: make.id, user_id: null, source_type: "grant", source_id: itemId, star_id: null, amount: 0, earned_date_local: make.today, created_at: make.now };
}

export { CATALOG };
