import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LedgerRow } from "@/lib/starlight";
import { balanceOf, ownedOf, planGrant, planPurchase } from "@/lib/shopCore";
import { effectiveLook, fitLook, EMPTY_LOOK } from "@/lib/looks";

const today = "2026-10-16";
let n = 0;
const make = () => ({ id: `r${++n}`, now: "2026-10-16T00:00:00Z", today });
const earn = (amount: number, id = `e${++n}`, date = today): LedgerRow => ({
  id, user_id: null, source_type: "something_good_saved", source_id: id, star_id: null, amount, earned_date_local: date, created_at: "",
});

describe("buying with Starlight", () => {
  it("a purchase takes the price and gives the item, in one row", () => {
    const rows = [earn(10)];
    const p = planPurchase(rows, "trees:willow", make());
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(p.row.amount).toBe(-6);
    expect(p.balanceAfter).toBe(4);
    const after = [...rows, p.row];
    expect(balanceOf(after)).toBe(4);
    expect(ownedOf(after).has("trees:willow")).toBe(true);
  });

  it("not enough Starlight: nothing is planned, and the shortfall is told", () => {
    const p = planPurchase([earn(4)], "lives:bird", make());
    expect(p).toEqual({ ok: false, reason: "short", need: 2 });
  });

  it("the same item can't be bought twice (double tap, retry)", () => {
    const rows = [earn(20)];
    const first = planPurchase(rows, "place:bridge-pond", make());
    if (!first.ok) throw new Error("first should succeed");
    const again = planPurchase([...rows, first.row], "place:bridge-pond", make());
    expect(again).toEqual({ ok: false, reason: "owned" });
    expect(balanceOf([...rows, first.row])).toBe(5);
  });

  it("an unknown item (a made-up id) is refused", () => {
    expect(planPurchase([earn(99)], "trees:gold", make())).toEqual({ ok: false, reason: "unknown" });
  });

  it("the meadow is always yours; gifts are once only and cost nothing", () => {
    expect(ownedOf([]).has("place:quiet-meadow")).toBe(true);
    const g = planGrant([], "lives:butterflies", make());
    expect(g?.amount).toBe(0);
    expect(planGrant([g!], "lives:butterflies", make())).toBeNull();
  });

  it("the balance never goes below zero", () => {
    expect(balanceOf([earn(2), { ...earn(0), source_type: "purchase", amount: -6 }])).toBe(0);
  });
});

describe("looks", () => {
  const owned = new Set(["place:quiet-meadow", "place:bridge-pond", "trees:teal", "trees:willow", "lives:fish", "lives:butterflies"]);
  it("fish only where there is water; willows only by the pond", () => {
    const l = fitLook("quiet-meadow", { ...EMPTY_LOOK, trees: "trees:willow", fish: true });
    expect(l.trees).toBeNull();
    expect(l.fish).toBe(false);
  });
  it("a saved look keeps only what is owned", () => {
    const l = effectiveLook("bridge-pond", { ...EMPTY_LOOK, trees: "trees:willow", flowers: "flowers:forest", bird: true }, owned);
    expect(l).toEqual({ trees: "trees:willow", flowers: null, butterflies: null, fish: false, bird: false });
  });
  it("a place never dressed wears what you own that suits it", () => {
    expect(effectiveLook("bridge-pond", undefined, owned)).toEqual({ trees: "trees:willow", flowers: null, butterflies: "ivory", fish: true, bird: false });
    expect(effectiveLook("quiet-meadow", undefined, owned).trees).toBe("trees:teal");
  });
});

describe("the device ledger", () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    vi.resetModules();
    const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)), removeItem: (k: string) => void store.delete(k) };
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("window", { localStorage: ls, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal("CustomEvent", class { type: string; detail: unknown; constructor(t: string, o?: { detail?: unknown }) { this.type = t; this.detail = o?.detail; } });
    vi.doMock("@/lib/dataMode", () => ({ LOCAL_ONLY: true }));
    vi.doMock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
  });

  it("spending doesn't use up the day's earning; earned stays whole", async () => {
    const s = await import("@/lib/starlight");
    const shop = await import("@/lib/shop");
    for (let i = 0; i < 3; i++) await s.awardStarlight({ source: "something_good_saved", sourceId: `m${i}`, amount: 1 } as never);
    // 3 today (the day's maximum); seed 7 more from earlier days
    const rows = JSON.parse(store.get("sisi:starlight-v1")!);
    rows.push(earn(7, "old", "2026-10-01"));
    store.set("sisi:starlight-v1", JSON.stringify(rows));
    expect(await s.starlightBalance()).toBe(10);

    const r1 = await shop.purchase("trees:willow");
    const r2 = await shop.purchase("trees:willow"); // the double tap
    expect(r1).toEqual({ ok: true, balance: 4 });
    expect(r2).toMatchObject({ ok: false, reason: "owned" });
    expect(await s.starlightBalance()).toBe(4);
    expect(await s.starlightEarned()).toBe(10);
    // still capped today (spending gives nothing back)
    const capped = await s.awardStarlight({ source: "something_good_saved", sourceId: "m9", amount: 1 } as never);
    expect(capped.awarded).toBe(0);
  });

  it("two purchases at once can't both spend the same Starlight", async () => {
    const shop = await import("@/lib/shop");
    store.set("sisi:starlight-v1", JSON.stringify([earn(10, "old", "2026-10-01")]));
    const [a, b] = await Promise.all([shop.purchase("trees:willow"), shop.purchase("trees:teal")]);
    expect([a.ok, b.ok].filter(Boolean).length).toBe(1);
    const s = await import("@/lib/starlight");
    expect(await s.starlightBalance()).toBe(4);
  });

  it("a failed save spends nothing", async () => {
    const shop = await import("@/lib/shop");
    store.set("sisi:starlight-v1", JSON.stringify([earn(10, "old", "2026-10-01")]));
    const real = localStorage.setItem;
    localStorage.setItem = () => { throw new Error("quota"); };
    expect(await shop.purchase("trees:willow")).toEqual({ ok: false, reason: "failed" });
    localStorage.setItem = real;
    const s = await import("@/lib/starlight");
    expect(await s.starlightBalance()).toBe(10);
  });

  it("existing walkers get every place, with its decorations (and running it twice changes nothing)", async () => {
    store.set("sisi:guest-onboarded", "true");
    store.set("sisi:starlight-v1", JSON.stringify([earn(14, "old", "2026-10-01")]));
    const shop = await import("@/lib/shop");
    await shop.migrateShop();
    store.delete("sisi:shop-migrated-v1"); // as if it ran again
    await shop.migrateShop();
    const s = await import("@/lib/starlight");
    const owned = ownedOf(s.starlightRows());
    expect(owned.has("place:bridge-pond")).toBe(true);
    expect(owned.has("trees:willow") && owned.has("lives:fish") && owned.has("trees:teal")).toBe(true);
    expect(owned.has("place:butterfly-forest") && owned.has("trees:forest-big") && owned.has("flowers:forest")).toBe(true);
    expect(s.starlightRows().filter((r) => r.source_id === "place:bridge-pond").length).toBe(1);
    expect(await s.starlightBalance()).toBe(14); // still all theirs to spend
    const looks = JSON.parse(store.get("sisi:looks-v1")!);
    expect(looks["bridge-pond"].trees).toBe("trees:willow");
  });

  it("a new walker starts with the meadow and 0", async () => {
    const shop = await import("@/lib/shop");
    await shop.migrateShop();
    expect(shop.ownedNow()).toEqual(new Set(["place:quiet-meadow"]));
  });
});
