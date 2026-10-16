"use client";

import { fxAnchorRef } from "@/lib/fxAnchors";
import { softGlint } from "@/lib/fx";
import { haptic } from "@/lib/haptics";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WORLDS, WORLD_LOOK, equipWorld, useEquippedWorld } from "@/lib/worlds";
import type { WorldId } from "@/lib/starlight";
import { CATALOG, fitsPlace, itemById, type ItemKind, type ShopItem } from "@/lib/shopCatalog";
import { purchase, useShop } from "@/lib/shop";
import { effectiveLook, saveLook, setPreview, useLooks, type Look } from "@/lib/looks";
import { FocusPaper, IconButterfly, IconCheck, IconFlower, IconLandscape, IconLock, IconTree, PrimaryButton, StarGlyph, TextAction } from "@/components/ds";

/**
 * SatchelDrawer — the Map: where you walk, and what walks with you.
 *
 * A low ivory sheet over the Journey (nothing behind it dims), so whatever is
 * tapped is seen at once on Sísí's own walk — a preview, until it is chosen.
 *
 *   tabs    Places · Trees · Flowers · Little lives (always in this order)
 *   cards   one row of picture cards for the tab. In use = solid outline +
 *           check; yours = plain; not yet yours = dashed + its price; not for
 *           this place = faint, with where it belongs ("Grows by the pond.")
 *   bar     after a tap: "✦6 · Plant" (or "2 more Starlight needed"), or
 *           Apply for what is already yours, and Cancel. Nothing is spent,
 *           and nothing saved changes, until that button.
 *
 * Starlight (upper right) is gathered by time together and spent here; what
 * you bring along is yours for good, and choosing among what you own is free.
 * The sky is not chosen: it follows the real time of day (and the weather).
 */

type Tab = "place" | "trees" | "flowers" | "lives";
const TABS: { id: Tab; label: string; Icon: (p: { size?: number }) => React.ReactNode }[] = [
  { id: "place", label: "Places", Icon: IconLandscape },
  { id: "trees", label: "Trees", Icon: IconTree },
  { id: "flowers", label: "Flowers", Icon: IconFlower },
  { id: "lives", label: "Little lives", Icon: IconButterfly },
];

type Draft = { place: WorldId; look: Look; /** the one not-yet-owned thing being tried */ focus: string | null };

const sameLook = (a: Look, b: Look) =>
  a.trees === b.trees && a.flowers === b.flowers && a.butterflies === b.butterflies && a.fish === b.fish && a.bird === b.bird;

/** put one slot of a look back as it was (the slot an item belongs to) */
function revertSlot(look: Look, itemId: string, to: Look): Look {
  const it = itemById(itemId);
  if (!it) return look;
  if (it.kind === "trees") return { ...look, trees: to.trees };
  if (it.kind === "flowers") return { ...look, flowers: to.flowers };
  if (itemId === "lives:fish") return { ...look, fish: to.fish };
  if (itemId === "lives:bird") return { ...look, bird: to.bird };
  if (itemId === "lives:butterflies") return { ...look, butterflies: to.butterflies };
  return look;
}

/** whether a look has this item on */
function wears(look: Look, itemId: string): boolean {
  if (itemId === "lives:fish") return look.fish;
  if (itemId === "lives:bird") return look.bird;
  if (itemId === "lives:butterflies") return look.butterflies !== null;
  return look.trees === itemId || look.flowers === itemId;
}

/** what Sísí says when something new joins the walk (once, softly) */
const REACTION: Record<string, string> = {
  "place:bridge-pond": "Oh, water. Let’s cross slowly.",
  "place:butterfly-forest": "Listen. The leaves are talking.",
  "trees:teal": "They make the walk feel kinder.",
  "trees:willow": "Willows. They always look like they’re listening.",
  "trees:forest-big": "Such old trees. They’ve seen a lot of wishes.",
  "flowers:pond-reeds": "The reeds are whispering.",
  "flowers:forest": "It smells like spring here.",
  "lives:butterflies": "They found us.",
  "lives:fish": "Look, under the bridge.",
  "lives:bird": "A new friend up there.",
};
export const SHOP_BOUGHT_EVENT = "sisi:shop-bought";

const DONE: Record<ShopItem["verb"], string> = { Open: "Opened", Plant: "Planted", "Bring along": "Brought along" };

type Card = {
  id: string;
  name: string;
  art: React.ReactNode;
  /** on = in this preview; owned / locked (a price) / away (not for this place) */
  on: boolean;
  owned: boolean;
  away?: boolean;
  note: React.ReactNode;
  onPick: (el: HTMLElement) => void;
};

export function SatchelDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
  /** @deprecated the place is applied through lib/worlds */
  onEquip?: (equipped: unknown) => void;
}) {
  const { balance, owned, ready } = useShop();
  const { saved } = useLooks();
  const equipped = useEquippedWorld();
  const rowRef = useRef<HTMLUListElement>(null);
  const balRef = useRef<HTMLSpanElement | null>(null);
  const [tab, setTab] = useState<Tab>("place");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // what the walk shows now (a place you don't own falls back to the meadow)
  const place: WorldId = owned.has(`place:${equipped}`) ? equipped : "quiet-meadow";
  const applied = useMemo(() => ({ place, look: effectiveLook(place, saved[place], owned) }), [place, saved, owned]);
  const d: Draft = draft ?? { ...applied, focus: null };
  const changed = d.place !== applied.place || !sameLook(d.look, applied.look);

  // opening starts from what is in use; closing drops any preview
  useEffect(() => {
    if (!open) {
      setDraft(null);
      setNote(null);
      setDone(null);
      setPreview(null);
    }
  }, [open]);
  useEffect(() => () => setPreview(null), []);

  const tryOn = (next: Draft) => {
    setNote(null);
    setDone(null);
    setDraft(next);
    const same = next.place === applied.place && sameLook(next.look, applied.look);
    setPreview(same ? null : { place: next.place, look: next.look });
  };

  /** try a look change in this place; at most one not-yet-owned thing at a time */
  const tryItem = (itemId: string | null, change: (l: Look) => Look) => {
    const item = itemId ? itemById(itemId) : undefined;
    if (item && !fitsPlace(item, d.place)) {
      setNote(item.elsewhere ?? "Not for this place.");
      return;
    }
    const unowned = !!item && !owned.has(item.id);
    if (unowned && d.focus?.startsWith("place:")) {
      setNote(`Open ${itemById(d.focus)?.name} first.`);
      return;
    }
    let look = d.look;
    if (unowned && d.focus && d.focus !== itemId) look = revertSlot(look, d.focus, applied.look);
    look = change(look);
    // a slot that was tried and is now set back lets go of it
    const focus = unowned ? itemId : d.focus && wears(look, d.focus) ? d.focus : null;
    tryOn({ place: d.place, look, focus });
  };

  const tryPlace = (p: WorldId) => {
    if (p === d.place) return;
    const look = p === applied.place ? applied.look : effectiveLook(p, saved[p], owned);
    tryOn({ place: p, look, focus: owned.has(`place:${p}`) ? null : `place:${p}` });
  };

  const cancel = () => tryOn({ ...applied, focus: null });

  /** keep what is tried on: the place walked, and its look */
  const keep = (dr: Draft): boolean => {
    try {
      saveLook(dr.place, dr.look);
    } catch {
      setNote("That couldn’t be saved just now. Try once more.");
      return false;
    }
    if (dr.place !== equipped) equipWorld(dr.place);
    setPreview(null);
    setDraft(null);
    return true;
  };

  const focusItem = d.focus ? itemById(d.focus) : undefined;
  const need = focusItem ? Math.max(0, focusItem.price - balance) : 0;

  const buy = async (el: HTMLElement) => {
    if (!focusItem || busyRef.current) return; // a second tap waits for the first
    busyRef.current = true;
    setBusy(true);
    const dr = d;
    const r = await purchase(focusItem.id);
    busyRef.current = false;
    setBusy(false);
    if (!r.ok && r.reason !== "owned") {
      setNote(r.reason === "short" ? `${r.need ?? need} more Starlight needed` : "That didn’t go through. Nothing was spent.");
      if (r.reason !== "short") haptic("error", el);
      return;
    }
    // bought (or already yours): it joins the walk now
    if (!keep(dr)) return;
    setDone(`${DONE[focusItem.verb]} · ${focusItem.name}`);
    softGlint(balRef.current ?? el);
    haptic("starlight", el);
    window.dispatchEvent(new CustomEvent(SHOP_BOUGHT_EVENT, { detail: { id: focusItem.id, line: REACTION[focusItem.id] } }));
  };

  const apply = (el: HTMLElement) => {
    if (!keep(d)) return;
    softGlint(el);
    haptic("select", el);
  };

  /* ── the cards for each tab ── */

  const priceNote = (it: ShopItem) => (
    <>
      <StarGlyph size={12} /> {it.price}
    </>
  );
  const img = (src: string, kind: ItemKind | "none") => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={`sd-card-img is-${kind}`} src={src} alt="" draggable={false} />
  );
  const noneCard = (id: string, name: string, on: boolean, pick: () => void): Card => ({
    id,
    name,
    art: <span className="sd-none" aria-hidden />,
    on,
    owned: true,
    note: on && sameLook(d.look, applied.look) && d.place === applied.place ? "In use" : "Just the place",
    onPick: pick,
  });
  const itemCard = (it: ShopItem, on: boolean, pick: () => void): Card => {
    const away = !fitsPlace(it, d.place);
    const mine = owned.has(it.id);
    const inUse = on && !changed;
    return {
      id: it.id,
      name: it.name,
      art: img(it.preview, it.kind),
      on: on && !away,
      owned: mine,
      away,
      note: away ? it.elsewhere : inUse ? "In use" : mine ? "Yours" : it.price === 0 ? "A gift" : priceNote(it),
      onPick: pick,
    };
  };

  const items = (k: ItemKind) => CATALOG.filter((i) => i.kind === k);
  let cards: Card[] = [];
  if (tab === "place") {
    cards = WORLDS.map((w) => {
      const id = `place:${w.id}`;
      const mine = owned.has(id);
      const it = itemById(id);
      return {
        id,
        name: w.name,
        art: img(WORLD_LOOK[w.id].preview, "place"),
        on: d.place === w.id,
        owned: mine,
        note: applied.place === w.id ? "Walking here" : mine ? "Yours" : it ? priceNote(it) : "",
        onPick: () => tryPlace(w.id),
      };
    });
  } else if (tab === "trees") {
    cards = [
      noneCard("trees:none", "No trees", d.look.trees === null, () => tryItem(null, (l) => ({ ...l, trees: null }))),
      ...items("trees").map((it) => itemCard(it, d.look.trees === it.id, () => tryItem(it.id, (l) => ({ ...l, trees: it.id })))),
    ];
  } else if (tab === "flowers") {
    cards = [
      noneCard("flowers:none", "No flowers", d.look.flowers === null, () => tryItem(null, (l) => ({ ...l, flowers: null }))),
      ...items("flowers").map((it) => itemCard(it, d.look.flowers === it.id, () => tryItem(it.id, (l) => ({ ...l, flowers: it.id })))),
    ];
  } else {
    // little lives: each comes along or not (more than one at once)
    cards = items("lives").map((it) => {
      const on = it.id === "lives:butterflies" ? d.look.butterflies !== null : it.id === "lives:fish" ? d.look.fish : d.look.bird;
      return itemCard(it, on, () =>
        tryItem(on ? null : it.id, (l) =>
          it.id === "lives:butterflies"
            ? { ...l, butterflies: on ? null : (applied.look.butterflies ?? "ivory") }
            : it.id === "lives:fish"
              ? { ...l, fish: !on }
              : { ...l, bird: !on },
        ),
      );
    });
  }

  // a tap on something that can't live here only says where it belongs
  const pick = (c: Card, el: HTMLElement) => {
    if (c.away) {
      setNote((itemById(c.id)?.elsewhere as string) ?? null);
      return;
    }
    c.onPick(el);
  };

  // Keep Sísí in view: while the sheet is up, the whole world rises just
  // enough that her paws rest a little above the sheet's edge (and settles
  // back when it closes). Measured, so it fits any screen height.
  useEffect(() => {
    const el = document.documentElement;
    if (!open) {
      el.classList.remove("sd-lifting");
      return;
    }
    const measure = () => {
      const sheet = document.querySelector<HTMLElement>(".sd-focus");
      const cat = document.querySelector(".walking-cat")?.getBoundingClientRect();
      if (!sheet || !cat) return;
      // the sheet's resting top (it may still be sliding in) and where her
      // paws are without any lift
      const sheetTop = window.innerHeight - sheet.offsetHeight;
      const current = el.classList.contains("sd-lifting") ? parseFloat(el.style.getPropertyValue("--sd-lift") || "0") : 0;
      const lift = Math.max(0, Math.round(cat.bottom + current - (sheetTop - 14)));
      el.style.setProperty("--sd-lift", `${lift}px`);
      el.classList.add("sd-lifting");
    };
    const t = setTimeout(measure, 60); // once the sheet has its height
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      el.classList.remove("sd-lifting");
    };
  }, [open]);


  // the row opens on what is in use, centred
  useLayoutEffect(() => {
    if (!open) return;
    const row = rowRef.current;
    const on = row?.querySelector<HTMLElement>(".sd-card.is-on");
    if (row) row.scrollLeft = on ? on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  const showColours = tab === "lives" && d.look.butterflies !== null;
  const bar = done ? (
    <p className="sd-msg is-done" role="status">
      <IconCheck size={16} /> {done}
    </p>
  ) : note && !changed ? (
    <p className="sd-msg" role="status">{note}</p>
  ) : changed ? (
    <div className="sd-bar">
      <TextAction onClick={cancel}>Cancel</TextAction>
      <span className="sd-bar-end">
        {note && <span className="sd-bar-note" role="status">{note}</span>}
        {!focusItem ? (
          <PrimaryButton onClick={(e) => apply(e.currentTarget)}>Apply</PrimaryButton>
        ) : need > 0 ? (
          <span className="sd-bar-note" role="status">
            {need} more Starlight needed
          </span>
        ) : (
          <PrimaryButton loading={busy} disabled={busy || !ready} onClick={(e) => buy(e.currentTarget)}>
            {focusItem.price > 0 ? (
              <>
                <StarGlyph size={14} /> {focusItem.price} · {focusItem.verb}
              </>
            ) : (
              focusItem.verb
            )}
          </PrimaryButton>
        )}
      </span>
    </div>
  ) : null;

  return (
    <FocusPaper
      open={open}
      onClose={onClose}
      live
      closeLabel="Close the Map"
      title={<h2 className="sd-title">Map</h2>}
      headerExtra={
        <span
          className="sd-balance"
          ref={(el) => {
            balRef.current = el;
            fxAnchorRef("starlightCounter", el);
          }}
          aria-label={`${balance} Starlight`}
        >
          <StarGlyph size={16} />
          <span key={balance} className="sd-balance-n">{ready ? balance : "·"}</span>
          <span className="sd-balance-word">Starlight</span>
        </span>
      }
      className="sd-focus"
    >
      <div className="sd-tabs" role="tablist" aria-label="What to change">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-label={t.label}
            title={t.label}
            className={`sd-tab${tab === t.id ? " is-on" : ""}`}
            onClick={() => {
              setTab(t.id);
              setNote(null);
              setDone(null);
            }}
          >
            <t.Icon size={24} />
          </button>
        ))}
      </div>
      {/* the sheet opens with focus here (quietly), not on a tab — so no focus ring shows by itself */}
      <ul className="sd-row" ref={rowRef} tabIndex={-1} data-autofocus aria-label={TABS.find((t) => t.id === tab)?.label}>
        {cards.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`sd-card${c.on ? " is-on" : ""}${c.owned ? "" : " is-locked"}${c.away ? " is-away" : ""}`}
              aria-pressed={c.on}
              onClick={(e) => pick(c, e.currentTarget)}
            >
              <span className="sd-card-art">
                {c.art}
                {(c.on || !c.owned) && !c.away && (
                  <span className="sd-badge" aria-hidden>
                    {c.on ? <IconCheck size={18} /> : <IconLock size={16} />}
                  </span>
                )}
              </span>
              <span className="sd-card-name">{c.name}</span>
              <span className="sd-card-note">{c.note}</span>
            </button>
          </li>
        ))}
      </ul>
      {showColours && (
        <div className="sd-colours" role="radiogroup" aria-label="Butterflies' colour">
          {(["ivory", "lavender"] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={d.look.butterflies === c}
              className={`sd-colour is-${c}${d.look.butterflies === c ? " is-on" : ""}`}
              onClick={() => tryItem(null, (l) => ({ ...l, butterflies: c }))}
            >
              <span className="sd-dot" aria-hidden />
              {c === "ivory" ? "Ivory" : "Lavender"}
            </button>
          ))}
        </div>
      )}
      <div className="sd-foot">{bar}</div>
      <style jsx global>{`
        /* the world rises while the sheet is up (see the lift effect) */
        .journey-stage-v2 .jw-group { transition: translate 460ms var(--ease-sisi); }
        html.sd-lifting .journey-stage-v2 .jw-group { translate: 0 calc(-1 * var(--sd-lift, 0px)); }
        /* her words (and where her head is) rise with her, so they never cover her face */
        .journey-stage-v2 .cc-root, .journey-stage-v2 .cc-head, .journey-stage-v2 .sisi-speak-lines { transition: translate 460ms var(--ease-sisi); }
        html.sd-lifting .journey-stage-v2 .cc-root, html.sd-lifting .journey-stage-v2 .cc-head, html.sd-lifting .journey-stage-v2 .sisi-speak-lines { translate: 0 calc(-1 * var(--sd-lift, 0px)); }
        /* a low sheet: Sísí and the world stay in view above it */
        .sd-focus { max-height: min(54dvh, 440px) !important; }
        .sd-focus .ds-focus-head { padding-top: 22px; }
        .sd-focus .ds-focus-body { padding: 14px 0 calc(var(--space-5) + var(--safe-bottom)); }
        .sd-title { margin: 0; font-family: var(--font-editorial); font-weight: 400; font-size: var(--text-paper-title); line-height: 1.2; color: var(--sisi-ink); }
        .sd-soon { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; color: var(--ink-35); }
        .sd-card.is-soon .sd-card-art { background: none; }
        .sd-card.is-soon .sd-card-art::after { box-shadow: none; border: 1.5px dashed var(--ink-14); }
        .sd-card.is-soon .sd-card-name { color: var(--ink-60); }
        .sd-tab {
          display: inline-flex; align-items: center; justify-content: center;
          width: 56px; height: 48px; border: 0; border-radius: 14px; cursor: pointer;
          background: transparent; color: var(--ink-60);
          transition: background var(--motion-instant) ease, color var(--motion-instant) ease, transform var(--motion-instant) ease;
          -webkit-tap-highlight-color: transparent;
        }
        .sd-tab:active { transform: scale(0.94); }
        .sd-tab.is-on { background: var(--ink-08); color: var(--sisi-ink); }
        .sd-tab:focus-visible { outline: 2px solid var(--sisi-ink); outline-offset: 2px; }
        .sd-balance { flex: none; display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 6px; color: var(--sisi-ink); }
        .sd-balance-n { font-family: var(--font-editorial); font-size: 17px; }
        .sd-balance-word { font-family: var(--font-ui); font-size: 13px; color: var(--ink-60); letter-spacing: 0.01em; }

        /* one row of big cards that bleeds to the sheet's edges */
        .sd-row {
          list-style: none; margin: 0; display: flex; gap: 12px;
          padding: 4px var(--focus-pad) 6px; overflow-x: auto; overscroll-behavior-x: contain;
          scroll-snap-type: x mandatory; scroll-padding: 0 var(--focus-pad); scrollbar-width: none;
        }
        .sd-row::-webkit-scrollbar { display: none; }
        .sd-row > li { flex: none; scroll-snap-align: center; }
        .sd-card {
          display: flex; flex-direction: column; align-items: center; gap: 4px; width: 132px;
          padding: 0; border: 0; background: none; color: var(--sisi-ink); font: inherit; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .sd-card[aria-disabled="true"] { cursor: default; }
        .sd-card-art {
          position: relative; display: block; width: 132px; height: 112px; overflow: hidden;
          border-radius: 18px; background: var(--ink-08);
          transition: transform var(--motion-instant) ease;
        }
        /* the frame is drawn over the picture (an image would hide an inset shadow) */
        .sd-card-art::after {
          content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
          box-shadow: inset 0 0 0 1px var(--ink-14);
        }
        .sd-card:active .sd-card-art { transform: scale(0.97); }
        .sd-card.is-equipped .sd-card-art::after { box-shadow: inset 0 0 0 2px var(--sisi-ink); }
        .sd-card.is-locked .sd-card-art::after { box-shadow: none; border: 1.5px dashed var(--ink-35); }
        .sd-badge { z-index: 1; }
        .sd-row:focus { outline: none; }
        .sd-card.is-locked .sd-world-thumb, .sd-card.is-locked .sd-card-img { filter: saturate(0.35) brightness(0.92); opacity: 0.72; }
        .sd-world-thumb, .sd-card-img { display: block; width: 100%; height: 100%; object-fit: cover; }
        /* Sísí sits whole in her card */
        .sd-card-img.is-sisi { object-fit: contain; padding: 10px 12px 8px; box-sizing: border-box; }
        .sd-world-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* a small scene from the Journey's own layers */
        .sd-scene { position: relative; overflow: hidden; }
        .sd-scene img { position: absolute; display: block; pointer-events: none; }
        .sd-scene .sd-scene-sky, .sd-scene .sd-scene-own { inset: 0; width: 100%; height: 100%; object-fit: cover; }
        .sd-scene .sd-scene-cloud { width: 62%; height: auto; object-fit: contain; opacity: 0.95; }
        .sd-scene .c1 { left: 6%; top: 14%; }
        .sd-scene .c2 { right: -8%; top: 30%; width: 54%; }
        .sd-scene .sd-scene-tree { right: 12%; bottom: 13%; width: 30%; height: auto; object-fit: contain; }
        .sd-scene .sd-scene-meadow { left: 0; right: 0; bottom: 0; width: 100%; height: 34%; object-fit: cover; object-position: center top; }
        /* winter: a hush of snow-light over everything */
        .sd-scene.is-quiet-winter::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(240, 244, 250, 0.38)); }
        .sd-badge {
          position: absolute; left: 8px; top: 8px; display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%; background: var(--sisi-paper); color: var(--sisi-ink);
          box-shadow: 0 1px 3px rgba(16, 45, 50, 0.18);
        }
        .sd-card-name { margin-top: 6px; font-family: var(--font-editorial); font-size: 16px; line-height: 1.2; letter-spacing: -0.02em; text-align: center; }
        .sd-card-note { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .sd-card.is-equipped .sd-card-note { color: var(--sisi-ink); font-weight: 500; }
        /* the four kinds of things, always in this order */
        .sd-tabs { display: flex; gap: 6px; padding: 0 var(--focus-pad) 10px; }
        .sd-tabs::-webkit-scrollbar { display: none; }
        .sd-tabtext {
          flex: none; min-height: 36px; padding: 0 12px; border: 0; border-radius: 999px; cursor: pointer;
          background: transparent; color: var(--ink-60); font-family: var(--font-ui); font-size: 14px; letter-spacing: 0.005em;
          -webkit-tap-highlight-color: transparent; transition: background var(--motion-instant) ease, color var(--motion-instant) ease;
        }
        .sd-tabtext.is-on { background: var(--ink-08); color: var(--sisi-ink); font-weight: 500; }
        .sd-tabtext:focus-visible { outline: 2px solid var(--sisi-ink); outline-offset: 2px; }
        .sd-card.is-on .sd-card-art::after { box-shadow: inset 0 0 0 2px var(--sisi-ink); }
        .sd-card.is-on .sd-card-note { color: var(--sisi-ink); font-weight: 500; }
        .sd-card.is-away .sd-card-art { opacity: 0.45; }
        .sd-card.is-away .sd-card-name { color: var(--ink-60); }
        .sd-card.is-away .sd-card-note { white-space: normal; text-align: center; max-width: 112px; line-height: 1.25; }
        .sd-card-img.is-trees, .sd-card-img.is-lives { object-fit: contain; padding: 10px; box-sizing: border-box; }
        .sd-card-img.is-flowers { object-fit: cover; object-position: center bottom; }
        .sd-none { display: block; width: 100%; height: 100%; }
        /* a quiet "nothing added": the frame alone, dashed */
        .sd-card:not(.is-on) .sd-none + .sd-badge { display: none; }
        .sd-colours { display: flex; gap: 8px; padding: 6px var(--focus-pad) 0; }
        .sd-colour {
          display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 0 12px 0 8px;
          border: 1px solid var(--ink-14); border-radius: 999px; background: none; cursor: pointer;
          color: var(--ink-60); font-family: var(--font-ui); font-size: 13px; -webkit-tap-highlight-color: transparent;
        }
        .sd-colour.is-on { border-color: var(--sisi-ink); color: var(--sisi-ink); }
        .sd-dot { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--ink-14); }
        .sd-colour.is-ivory .sd-dot { background: #f4ecd8; }
        .sd-colour.is-lavender .sd-dot { background: #c9b6dc; }
        /* the bar: what the tap would do, and the way back */
        .sd-foot { min-height: 52px; padding: 10px var(--focus-pad) 0; display: flex; align-items: center; }
        .sd-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; }
        .sd-bar-end { display: inline-flex; align-items: center; gap: 10px; }
        .sd-bar-note, .sd-msg { font-family: var(--font-ui); font-size: var(--text-meta); color: var(--ink-60); letter-spacing: 0.005em; }
        .sd-msg { margin: 0; display: inline-flex; align-items: center; gap: 6px; }
        .sd-msg.is-done { color: var(--sisi-ink); animation: sd-in 360ms var(--ease-sisi) both; }
        .sd-balance-n { animation: sd-in 420ms var(--ease-sisi) both; }
        @keyframes sd-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .sd-focus { max-height: min(62dvh, 480px) !important; }
      `}</style>
    </FocusPaper>
  );
}
