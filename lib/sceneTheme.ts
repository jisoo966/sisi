"use client";

import type { SpriteArt } from "@/components/sisi/journey-v2/PassingSprites";
import { useEquippedWorld, type WorldId } from "@/lib/worlds";

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
  strip?: { src: string; ih: number; bottom: number };
  /** the near bank, drawn in front of the fish: its art, height (fraction of
   *  the stage) and rest */
  foreground?: string;
  foregroundHeight?: number;
  foregroundBottom?: string;
  fish?: string[];
  /** the theme's own bigger trees on the far shore, behind Sísí (a layer of
   *  depth between the far reeds and the bridge) */
  midTrees?: SpriteArt[];
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

export const SCENE_THEMES: Record<SceneThemeId, SceneTheme> = {
  "trail-plain": {
    id: "trail-plain",
    midground: "/V2/parallax/journey-midground-vegetation.webp",
    ground: "/V2/parallax/journey-walking-ground.webp",
    path: "/V2/parallax/journey-walking-path.webp",
    // the path band's centre (row 409.5 of 768) on the baseline
    pathBottom: "calc(var(--walking-baseline) - 18.67%)",
    midgroundHeight: 0.18,
    midgroundBottom: "calc(var(--walking-baseline) - 1.5%)",
    groundBottom: "calc(var(--walking-baseline) - 1% - 26.95%)",
  },
  "trail-bridge-pond": {
    id: "trail-bridge-pond",
    midground: `${T}/journey-midground-pond.webp`,
    ground: `${T}/journey-walking-ground-pond.webp`,
    path: `${T}/journey-walking-path-bridge.webp`,
    // the deck's walking line is row 422 of 768: (768 − 422) / 768 × 40% = 18.02%
    pathBottom: "calc(var(--walking-baseline) - 18.02%)",
    // raised (and a touch larger) so the reeds and willows show above the far bank
    midgroundHeight: 0.23,
    midgroundBottom: "calc(var(--walking-baseline) + 2.5%)",
    // the water begins at row 500 of 768 (34.9% of the box): its top edge sits
    // just under the deck, never showing above the far bank's plants
    groundBottom: "calc(var(--walking-baseline) - 34.4%)",
    // speeds in step with the bridge (32 px/s, locked to Sísí's paws):
    //   far reeds ⅓ · far bank ~0.8 · bridge 1 · near bank 1⅓
    midgroundSpeed: 11,
    stripSpeed: 26,
    foregroundSpeed: 43,
    // the water is calm: its surface moves at ~30% of a full flow (≈12 px/s
    // while walking, 2 px/s of its own when Sísí stops) — never a strong
    // current against her; a 1–2px ripple and a breathing light under the
    // bridge keep it alive (PondFish, .jw-pond-*)
    groundSpeed: 10,
    groundDrift: 2,
    // the pond's far bank, painted to its last row
    strip: { src: `${T}/meadow-strip-pond.webp`, ih: 242, bottom: 241 },
    // the near bank, as in the reference: the tall bank art (the same as the
    // far bank, nearer and larger) along the bottom, so the water's lower edge
    // is covered (pond-foreground.webp is not used). 15% of the stage: on a
    // phone there is less room under the deck than in the wide reference, and
    // a band of open water (and its fish) must stay in view
    foreground: `${T}/meadow-strip-pond.webp`,
    foregroundHeight: 0.15,
    foregroundBottom: "0%",
    fish: [`${T}/fish-coral.webp`, `${T}/fish-ivory.webp`],
    // the two willows of this set's midground, cut out (willow-0x.webp) and
    // drawn nearer and larger — only this theme's own art
    midTrees: [
      { src: `${T}/willow-01.webp`, iw: 366, ih: 358, box: [0, 0, 366, 358] },
      { src: `${T}/willow-02.webp`, iw: 411, ih: 481, box: [0, 0, 411, 481] },
    ],
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
    // (the forest floor itself stays behind the clover and the flowers)
    groundHeight: 1.04,
    groundBottom: "calc(var(--walking-baseline) - 29.75%)",
    // the one front layer: the forest's flower bank (flowers and leaf tips on
    // top, 2172×242) resting on the clover's lower half, down to the bottom
    foreground: `${F}/meadow-strip-forest.webp`,
    foregroundHeight: 0.224,
    foregroundBottom: "0%",
    // the clover (2000×337, Jisoo's) comes up over the path's lower edge, so
    // Sísí walks on the path, not on a shelf: its full leaves (from row ~70)
    // stop just below her paws, only the tips reach the path
    // like the pond's water: the clover is the whole band under the path, from
    // just over its lower edge down to the bottom of the screen, so nothing
    // shows between it and the flower bank resting in front of it
    verge: { src: `${F}/forest-clover-verge.webp`, heightPct: 0.3, bottom: "calc(var(--walking-baseline) - 28.3%)" },
    midgroundSpeed: 11,
    stripSpeed: 26,
    foregroundSpeed: 43,
    // the forest's own bank behind the path, painted to its last row
    strip: { src: `${F}/meadow-strip-forest.webp`, ih: 242, bottom: 241 },
    backdrop: `${F}/forest-background.webp`,
    // roots (row 638 of 768) on the baseline; the canvas ~0.9 of the stage tall,
    // so the crowns run off the top: (768 − 638) / 768 × 89.8% = 15.2%
    bigTrees: { src: `${F}/forest-main-trees.webp`, heightPct: 0.898, bottom: "calc(var(--walking-baseline) - 15.2%)" },
    butterflies: [
      [`${F}/butterfly-ivory-01.webp`, `${F}/butterfly-ivory-02.webp`, `${F}/butterfly-ivory-03.webp`],
      [`${F}/butterfly-lavender-01.webp`, `${F}/butterfly-lavender-02.webp`, `${F}/butterfly-lavender-03.webp`],
    ],
  },
};

/** each place on the Map, and the ground it walks on */
export const PLACE_SCENE: Record<WorldId, SceneThemeId> = {
  "quiet-meadow": "trail-plain",
  "bridge-pond": "trail-bridge-pond",
  "butterfly-forest": "butterfly-forest",
};

/** (kept for lib/satchel's old path slot; the Map decides now) */
export const SCENE_THEME_EVENT = "sisi:scene-theme";

/** the ground of the place chosen on the Map */
export function useSceneTheme(): SceneTheme {
  const place = useEquippedWorld();
  return SCENE_THEMES[PLACE_SCENE[place]] ?? SCENE_THEMES["trail-plain"];
}
