import type { SpriteArt } from "@/components/sisi/journey-v2/PassingSprites";

/**
 * Time-of-day asset set (public/V2/time-of-day). `box` = the painted area in
 * image px (measured); anything outside it (edge bits from the source sheet)
 * is cropped at render time — the PNGs are used exactly as supplied.
 */
const T = (f: string) => `/V2/time-of-day/${f}`;

export const FAR_TREES: SpriteArt[] = [
  { src: T("tree-far-01.png"), iw: 512, ih: 485, box: [114, 80, 434, 400] },
  { src: T("tree-far-02.png"), iw: 507, ih: 504, box: [99, 24, 397, 419] },
  { src: T("tree-far-03.png"), iw: 506, ih: 497, box: [10, 100, 449, 412] },
];

export const FRONT_TREES: SpriteArt[] = [
  { src: T("tree-front-01.png"), iw: 487, ih: 480, box: [2, 0, 487, 476] },
  { src: T("tree-front-02.png"), iw: 512, ih: 481, box: [26, 0, 499, 477] },
  { src: T("tree-front-03.png"), iw: 498, ih: 486, box: [3, 0, 490, 480] },
];

export const GRASS: SpriteArt[] = [
  { src: T("grass-01.png"), iw: 491, ih: 459, box: [20, 104, 477, 444] },
  { src: T("grass-02-seedheads.png"), iw: 507, ih: 445, box: [51, 109, 493, 436] },
  { src: T("grass-03.png"), iw: 493, ih: 488, box: [42, 129, 479, 478] },
  { src: T("grass-04.png"), iw: 489, ih: 511, box: [18, 173, 489, 398] },
  { src: T("grass-05.png"), iw: 512, ih: 494, box: [81, 81, 491, 400] },
  { src: T("grass-06-coral.png"), iw: 496, ih: 511, box: [78, 145, 477, 396] },
];

/** The time-of-day grade for grass and ground (see lib/timeOfDay). */
export const TOD_GRADE = "brightness(var(--tod-b, 1)) saturate(var(--tod-s, 1))";
