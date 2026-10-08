/**
 * lib/fxAssets — the individual sprites of the Sísí effects sheets.
 *
 * The four supplied sheets (Starlight Trail · Star Birth · Fulfilled Bloom ·
 * Ambient Magic) are cropped into separate transparent sprites by
 * `scripts/crop-effects.py` into /public/sisi-assets/effects/<group>/.
 * No sheet is ever displayed whole, and every sprite is trimmed to its
 * visible pixels (transparent padding is not part of its bounds).
 */

import { SPRITE_ASPECT } from "./fxSpriteMeta";

const E = (group: string, name: string) => `/sisi-assets/effects/${group}/${name}.webp`;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export const FX = {
  /** SisiGlint's five stages, one shared centred box */
  glint: range(5).map((n) => E("glint", `frame-${n}`)),
  trail: {
    /** large → tiny: 4-point stars, then round motes */
    motes: range(6).map((n) => E("trail", `mote-${n}`)),
    trailLong: E("trail", "trail-long"),
    trailMedium: E("trail", "trail-medium"),
    trailShort: E("trail", "trail-short"),
    arrivalRipple: E("trail", "arrival-ripple"),
    arrivalRippleLarge: E("trail", "arrival-ripple-large"),
  },
  /** six stages on one shared canvas, aligned to the same centre:
   *  seed · gathering · small star · opening · glowing · settled */
  birth: range(6).map((n) => E("birth", `frame-${n}`)),
  bloom: {
    halo: E("bloom", "halo"),
    petals: range(7).map((n) => E("bloom", `petal-${n}`)),
    ripple: E("bloom", "ripple"),
    rippleWide: E("bloom", "ripple-wide"),
    grains: range(5).map((n) => E("bloom", `grain-${n}`)),
  },
  ambient: {
    fireflies: range(3).map((n) => E("ambient", `firefly-${n}`)),
    petals: range(2).map((n) => E("ambient", `petal-${n}`)),
    grassGlow: E("ambient", "grass-glow"),
    shootingStar: E("ambient", "shooting-star"),
    dust: range(3).map((n) => E("ambient", `dust-${n}`)),
  },
} as const;

/** visible width ÷ height of a sprite (1 when unknown) */
export function aspect(src: string): number {
  return SPRITE_ASPECT[src] ?? 1;
}

/**
 * Trail-shaped sprites (trail-short, shooting-star): where the bright head
 * sits in the image (fractions) and which way it points (degrees, screen
 * space, 0 = right, 90 = down). Measured from the crops.
 */
export const HEADED = {
  heading: 155,
  trailShortHead: { fx: 0.13, fy: 0.68 },
  shootingHead: { fx: 0.11, fy: 0.79 },
} as const;

/** Other art already in the app, used by World discovery objects. */
export const FX_STANDIN = {
  starAura: "/assets/sisi-star-aura-painted-512.webp",
  starMark: "/assets/sisi-star-mark-painted-512.webp",
  warmFlower: "/V2/time-of-day/grass-06-coral.webp",
  cloud: "/V2/time-of-day/cloud-04-mid-rounded.webp",
} as const;

export const FX_BLOOM_ALL: string[] = [FX.bloom.halo, ...FX.bloom.petals, FX.bloom.ripple, ...FX.bloom.grains];
export const FX_BIRTH_ALL: string[] = [...FX.birth, FX.trail.motes[5], FX.trail.motes[4]];

/** Preload a set of images (e.g. before a ceremony) — resolves when decoded or failed. */
export function preload(srcs: readonly string[]): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return Promise.all(
    srcs.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => (img.decode ? img.decode().catch(() => undefined).then(() => resolve()) : resolve());
          img.onerror = () => resolve();
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}
