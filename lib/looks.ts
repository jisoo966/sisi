"use client";

/**
 * lib/looks — how each place is dressed: which trees, which flowers, which
 * little lives. Saved per place (coming back to a place restores its last
 * look); the place itself is lib/worlds' equipped world.
 *
 * A preview (trying something in the Map before choosing it) lives only in
 * memory: it shows on the Journey, and cancelling or closing the Map drops
 * it. Nothing saved changes until a look is applied.
 */

import { useEffect, useState } from "react";
import type { WorldId } from "@/lib/starlight";
import { CATALOG, fitsPlace, itemById } from "@/lib/shopCatalog";

export type Look = {
  /** a trees item id, or null: no added trees */
  trees: string | null;
  /** a flowers item id, or null: the place's own ground only */
  flowers: string | null;
  /** the butterflies' colour, or null: none */
  butterflies: "ivory" | "lavender" | null;
  fish: boolean;
  bird: boolean;
};

export const EMPTY_LOOK: Look = { trees: null, flowers: null, butterflies: null, fish: false, bird: false };

const KEY = "sisi:looks-v1";
const EVENT = "sisi:looks";

type Saved = Partial<Record<WorldId, Look>>;

function read(): Saved {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export const savedLooks = (): Saved => read();

export function lookFor(place: WorldId): Look {
  return { ...EMPTY_LOOK, ...(read()[place] ?? {}) };
}

/** Save a place's look (throws if the device refuses: the caller keeps the preview). */
export function saveLook(place: WorldId, look: Look) {
  const all = read();
  all[place] = look;
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Fill in a place's look only where nothing is saved yet (migration). */
export function seedLook(place: WorldId, look: Look) {
  const all = read();
  if (all[place]) return;
  all[place] = look;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore
  }
}

const fits = (id: string | null, place: WorldId) => {
  const it = id ? itemById(id) : undefined;
  return !!it && fitsPlace(it, place);
};

/** only what can live in this place (fish need water, willows the pond…) */
export function fitLook(place: WorldId, look: Look): Look {
  return {
    trees: fits(look.trees, place) ? look.trees : null,
    flowers: fits(look.flowers, place) ? look.flowers : null,
    butterflies: look.butterflies,
    fish: look.fish && fits("lives:fish", place),
    bird: look.bird,
  };
}

/**
 * The look a place shows: its saved look, keeping only what is owned and fits;
 * a place never dressed yet wears what you already own that suits it.
 */
export function effectiveLook(place: WorldId, saved: Look | undefined, owned: Set<string>): Look {
  const has = (id: string | null) => !!id && owned.has(id);
  if (saved) {
    const l = fitLook(place, { ...EMPTY_LOOK, ...saved });
    return {
      trees: has(l.trees) ? l.trees : null,
      flowers: has(l.flowers) ? l.flowers : null,
      butterflies: has("lives:butterflies") ? l.butterflies : null,
      fish: l.fish && has("lives:fish"),
      bird: l.bird && has("lives:bird"),
    };
  }
  const first = (kind: string) => CATALOG.find((i) => i.kind === kind && owned.has(i.id) && fitsPlace(i, place))?.id ?? null;
  return {
    trees: first("trees"),
    flowers: first("flowers"),
    butterflies: has("lives:butterflies") ? "ivory" : null,
    fish: has("lives:fish") && fits("lives:fish", place),
    bird: has("lives:bird"),
  };
}

/* ── preview (memory only) ─────────────────────────────────────────── */

export type Preview = { place: WorldId; look: Look } | null;
let preview: Preview = null;

export function setPreview(p: Preview) {
  preview = p;
  window.dispatchEvent(new CustomEvent(EVENT));
}
export const currentPreview = () => preview;

/** the saved looks and the live preview, kept current */
export function useLooks(): { saved: Saved; preview: Preview } {
  const [state, setState] = useState<{ saved: Saved; preview: Preview }>({ saved: {}, preview: null });
  useEffect(() => {
    const sync = () => setState({ saved: read(), preview });
    sync();
    window.addEventListener(EVENT, sync);
    const st = (e: StorageEvent) => e.key === KEY && sync();
    window.addEventListener("storage", st);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", st);
    };
  }, []);
  return state;
}
