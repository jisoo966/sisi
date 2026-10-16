"use client";

import type { SpriteArt } from "@/components/sisi/journey-v2/PassingSprites";
import { useEquippedWorld, type WorldId } from "@/lib/worlds";
import { FAR_TREES, TREES_FAR_V2, TREES_FRONT_V2, TREES_MID_V2 } from "@/lib/worldArt";
import { effectiveLook, fitLook, useLooks, type Look } from "@/lib/looks";
import { useShop } from "@/lib/shop";

/**
 * lib/sceneTheme — the ground of each place on the Map (lib/worlds).
 *
 *   trail-plain        Quiet Meadow: the meadow path (the original layers)
 *   trail-bridge-pond  Bridge & Pond: a cream footbridge over a pond, fish below
 *   butterfly-forest   Butterfly Forest: a path between big trees, butterflies;
 *                      its own backdrop closes over the sky
 * (assets in public/V2/themes/<place>/, PNG originals in masters/)
 *
 * Sísí stays the same; a place swaps the midground, the ground, the grass
 * line behind the path and the path itself, and may add its own layers (a
 * near bank, fish, trees, butterflies, a backdrop). The sky follows the real
 * time of day. The Journey and the Moments Trail read the same place, so the
 * hand-over between them matches.
 */

export type SceneThemeId = "trail-plain" | "trail-bridge-pond" | "butterfly-forest";

export type SceneTheme = {
  id: SceneThemeId;
  midground: string;
  ground: string;
  path: string;
  /** where the path image rests so the walking line meets --walking-baseline */
  pathBottom: string;
  /** the midground's size and rest (as a fraction / a CSS length of the stage) */
  midgroundHeight: number;
  midgroundBottom: string;
  /** where the ground image rests (the water's top hidden under the deck) */
  groundBottom: string;
  /** the ground's height as a fraction of the stage (default 1) */
  groundHeight?: number;
  /** a verge just below the path (the near side's leaf tips and flowers) */
  verge?: { src: string; heightPct: number; bottom: string };
  /** the ground is drawn in front of the verge (its flowers rest on it),
   *  trimmed above this row fraction of its image (its sparse top) */
  groundOverVerge?: number;
  /** a solid colour behind the ground, from the bottom up to the path, so a
   *  backdrop never shows through gaps between its leaves */
  floorFill?: string;
  /** px/s the ground flows by itself (a pond's water) */
  groundDrift?: number;
  /** px/s while walking, when it differs from the path's (a pond's water) */
  groundSpeed?: number;
  midgroundSpeed?: number;
  /** the grass line behind the path (the far bank) */
  stripSpeed?: number;
  /** the near bank in front of the water */
  foregroundSpeed?: number;
  /** one grass line for every hour (else the time-of-day strips) */
  strip?: { src: string; ih: number; bottom: number } | null;
  /** the near bank, drawn in front of the fish: its art, height (fraction of
   *  the stage) and rest */
  foreground?: string;
  foregroundHeight?: number;
  foregroundBottom?: string;
  fish?: string[];
  /** a place over water: the ripple and the light under the bridge */
  water?: boolean;
  /** the meadow's own grass clumps over the paws (the base meadow) */
  grassClumps?: boolean;
  /** a little bird crosses the sky now and then */
  bird?: boolean;
  /** the theme's own bigger trees on the far shore, behind Sísí (a layer of
   *  depth between the far reeds and the bridge) */
  midTrees?: SpriteArt[];
  /** their painted height, a fraction of the stage (default 0.32–0.42) */
  midTreeHeight?: [number, number];
  /** the faint far trees (default: the meadow's) */
  farTrees?: SpriteArt[];
  /** near trees passing in front of Sísí, now and then (none if absent) */
  frontTrees?: SpriteArt[];
  /** a place that closes over the sky (a forest): its own backdrop instead of
   *  the sky and clouds (the time of day still tints it) */
  backdrop?: string;
  /** big trees rooted on the path line, behind Sísí (one 2048×768 canvas) */
  bigTrees?: { src: string; heightPct: number; bottom: string };
  /** butterflies: each kind's wing frames (01 → 02 → 03 → 02) */
  butterflies?: string[][];
};

const T = "/V2/themes/bridge-pond";
const F = "/V2/themes/butterfly-forest";


/* ── each place's own ground (always there once the place is yours) ── */

const PLACE_BASE: Record<WorldId, SceneTheme> = {
  "quiet-meadow": {
    id: "trail-plain",
    midground: "/V2/parallax/journey-midground-vegetation.webp",
    ground: "/V2/parallax/journey-walking-ground.webp",
    path: "/V2/parallax/journey-walking-path.webp",
    // the path band's centre (row 409.5 of 768) on the baseline
    pathBottom: "calc(var(--walking-baseline) - 18.67%)",
    // the faint far silhouettes belong to the meadow's sky
    farTrees: FAR_TREES,
    midgroundHeight: 0.18,
    midgroundBottom: "calc(var(--walking-baseline) - 1.5%)",
    groundBottom: "calc(var(--walking-baseline) - 1% - 26.95%)",
    // the meadow's own grass: the time-of-day line behind the path, clumps over the paws
    grassClumps: true,
  },
  "bridge-pond": {
    id: "trail-bridge-pond",
    midground: `${T}/journey-midground-pond.webp`,
    ground: `${T}/journey-walking-ground-pond.webp`,
    path: `${T}/journey-walking-path-bridge.webp`,
    // the deck's walking line is row 422 of 768: (768 − 422) / 768 × 40% = 18.02%
    pathBottom: "calc(var(--walking-baseline) - 18.02%)",
    // raised (and a touch larger) so the reeds and willows show above the far bank
    midgroundHeight: 0.23,
    midgroundBottom: "calc(var(--walking-baseline) + 2.5%)",
    // the water begins at row 500 of 768: its top edge sits just under the deck
    groundBottom: "calc(var(--walking-baseline) - 34.4%)",
    // speeds in step with the bridge (32 px/s): far reeds ⅓ · far bank ~0.8 · near bank 1⅓
    midgroundSpeed: 11,
    stripSpeed: 26,
    foregroundSpeed: 43,
    // calm water: ~30% of a full flow, 2 px/s of its own when Sísí stops
    groundSpeed: 10,
    groundDrift: 2,
    water: true,
    strip: null,
  },
  "butterfly-forest": {
    id: "butterfly-forest",
    midground: `${F}/journey-midground-forest.webp`,
    ground: `${F}/journey-walking-ground-forest.webp`,
    path: `${F}/journey-walking-path-forest.webp`,
    // the path's walking line is row 422 of 768, as the bridge's
    pathBottom: "calc(var(--walking-baseline) - 18.02%)",
    midgroundHeight: 0.18,
    midgroundBottom: "calc(var(--walking-baseline) - 1.5%)",
    groundHeight: 1.04,
    groundBottom: "calc(var(--walking-baseline) - 29.75%)",
    // the clover: the whole band under the path, from just under its lower
    // edge to the bottom of the screen (its full leaves begin under the path)
    verge: { src: `${F}/forest-clover-verge.webp`, heightPct: 0.3, bottom: "calc(var(--walking-baseline) - 24.7%)" },
    midgroundSpeed: 11,
    stripSpeed: 26,
    foregroundSpeed: 43,
    backdrop: `${F}/forest-background.webp`,
    strip: null,
  },
};

/* ── what each choice adds (lib/shopCatalog names them) ────────────── */

const WILLOWS: SpriteArt[] = [
  { src: `${T}/willow-01.webp`, iw: 366, ih: 358, box: [0, 0, 366, 358] },
  { src: `${T}/willow-02.webp`, iw: 411, ih: 481, box: [0, 0, 411, 481] },
];

/** trees: behind Sísí, and (where they fit) one near her now and then */
function treesLayer(id: string | null, place: WorldId): Partial<SceneTheme> {
  if (id === "trees:teal")
    return {
      // far (slender, faint) → mid (tiered, ~2.2–2.7× Sísí) → near (rare, fastest)
      farTrees: place === "quiet-meadow" ? [...FAR_TREES, ...TREES_FAR_V2] : undefined,
      midTrees: TREES_MID_V2,
      midTreeHeight: [0.37, 0.46],
      frontTrees: TREES_FRONT_V2,
    };
  if (id === "trees:willow") return { midTrees: WILLOWS };
  // roots (row 638 of 768) on the baseline; the crowns run off the top
  if (id === "trees:forest-big") return { bigTrees: { src: `${F}/forest-main-trees.webp`, heightPct: 0.898, bottom: "calc(var(--walking-baseline) - 15.2%)" } };
  return {};
}

const FLOWER_ART: Record<string, string> = {
  "flowers:pond-reeds": `${T}/meadow-strip-pond.webp`,
  "flowers:forest": `${F}/meadow-strip-forest.webp`,
};

/** flowers: one set — the bank behind the path and the flowers in front */
function flowersLayer(id: string | null, place: WorldId): Partial<SceneTheme> {
  const src = id ? FLOWER_ART[id] : undefined;
  if (!src) return {};
  return {
    strip: { src, ih: 242, bottom: 241 },
    foreground: src,
    // on the forest's clover the bank stands a little taller; elsewhere it stays
    // low, so a band of water (and its fish) or the meadow stays in view
    foregroundHeight: place === "butterfly-forest" ? 0.224 : 0.15,
    foregroundBottom: "0%",
    grassClumps: false,
  };
}

const BUTTERFLY = (c: "ivory" | "lavender") => [1, 2, 3].map((n) => `${F}/butterfly-${c}-0${n}.webp`);

/** a place dressed in a look (items it can't use, or not owned, are left out) */
export function composeScene(place: WorldId, look: Look): SceneTheme {
  const base = PLACE_BASE[place] ?? PLACE_BASE["quiet-meadow"];
  return {
    ...base,
    ...treesLayer(look.trees, place),
    ...flowersLayer(look.flowers, place),
    butterflies: look.butterflies ? [BUTTERFLY(look.butterflies)] : undefined,
    fish: look.fish && base.water ? [`${T}/fish-coral.webp`, `${T}/fish-ivory.webp`] : undefined,
    bird: look.bird,
  };
}

/** (kept for lib/satchel's old path slot; the Map decides now) */
export const SCENE_THEME_EVENT = "sisi:scene-theme";

/** the place chosen on the Map in its saved look — or what is being tried on */
export function useSceneTheme(): SceneTheme {
  const equipped = useEquippedWorld();
  const { saved, preview } = useLooks();
  const { owned } = useShop();
  const place = preview?.place ?? (owned.has(`place:${equipped}`) ? equipped : "quiet-meadow");
  const look = preview && preview.place === place ? preview.look : effectiveLook(place, saved[place], owned);
  return composeScene(place, preview ? fitLook(place, look) : look);
}
