"use client";

import { useEffect, useState } from "react";

/**
 * lib/sceneTheme — the ground Sísí walks on (chosen in Customize → the path tab).
 *
 *   trail-plain        the quiet meadow path (the original layers)
 *   trail-bridge-pond  a cream footbridge over a pond, fish below (day set v1,
 *                      public/V2/themes/bridge-pond; PNG originals in masters/)
 *
 * The sky, clouds and Sísí stay the same; a theme swaps the midground, the
 * ground, the grass line behind the path and the path itself, and may add
 * its own layers (the pond's low foreground, its fish). The Journey and the
 * Moments Trail read the same theme, so the hand-over between them matches.
 */

export type SceneThemeId = "trail-plain" | "trail-bridge-pond";

export type SceneTheme = {
  id: SceneThemeId;
  midground: string;
  ground: string;
  path: string;
  /** where the path image rests so the walking line meets --walking-baseline */
  pathBottom: string;
  /** one grass line for every hour (else the time-of-day strips) */
  strip?: { src: string; ih: number; bottom: number };
  /** drawn in front of the fish, with the ground's own transform */
  foreground?: string;
  fish?: string[];
};

const T = "/V2/themes/bridge-pond";

export const SCENE_THEMES: Record<SceneThemeId, SceneTheme> = {
  "trail-plain": {
    id: "trail-plain",
    midground: "/V2/parallax/journey-midground-vegetation.webp",
    ground: "/V2/parallax/journey-walking-ground.webp",
    path: "/V2/parallax/journey-walking-path.webp",
    // the path band's centre (row 409.5 of 768) on the baseline
    pathBottom: "calc(var(--walking-baseline) - 18.67%)",
  },
  "trail-bridge-pond": {
    id: "trail-bridge-pond",
    midground: `${T}/journey-midground-pond.webp`,
    ground: `${T}/journey-walking-ground-pond.webp`,
    path: `${T}/journey-walking-path-bridge.webp`,
    // the deck's walking line is row 422 of 768: (768 − 422) / 768 × 40% = 18.02%
    pathBottom: "calc(var(--walking-baseline) - 18.02%)",
    // the pond's far bank, painted to its last row
    strip: { src: `${T}/meadow-strip-pond.webp`, ih: 242, bottom: 241 },
    foreground: `${T}/pond-foreground.webp`,
    fish: [`${T}/fish-coral.webp`, `${T}/fish-ivory.webp`],
  },
};

const KEY = "sisi:satchel";
export const SCENE_THEME_EVENT = "sisi:scene-theme";

/** the path chosen on this phone (the satchel's "trail" slot) */
export function sceneThemeLocal(): SceneThemeId {
  if (typeof window === "undefined") return "trail-plain";
  try {
    const id = JSON.parse(localStorage.getItem(KEY) ?? "null")?.equipped?.trail;
    return id in SCENE_THEMES ? (id as SceneThemeId) : "trail-plain";
  } catch {
    return "trail-plain";
  }
}

export function useSceneTheme(): SceneTheme {
  const [id, setId] = useState<SceneThemeId>("trail-plain");
  useEffect(() => {
    setId(sceneThemeLocal());
    const h = (e: Event) => setId(((e as CustomEvent<SceneThemeId>).detail ?? sceneThemeLocal()) as SceneThemeId);
    window.addEventListener(SCENE_THEME_EVENT, h);
    return () => window.removeEventListener(SCENE_THEME_EVENT, h);
  }, []);
  return SCENE_THEMES[id] ?? SCENE_THEMES["trail-plain"];
}
