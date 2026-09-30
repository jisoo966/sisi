# Environment & magic assets — where to drop them

Transparent PNG (or WebP), same screen-print/gouache texture as the existing art,
padded edges, shared walking baseline. Drop a file at its path and it appears —
no code change. Until then the app uses a quiet stand-in (see `lib/envAssets.ts`).

## In use — Sísí environment pack 1 (`public/sisi-assets/`)
| File | How it's used |
|---|---|
| `weather/rain-particles` | one sheet, three layers: far 55% / 15% · mid 75% / 22% · near 110% / 15%, each offset and timed differently; loops one tile left + four down (the streaks' slant), so it wraps seamlessly |
| `weather/snow-particles` | 17 flakes sampled from the sheet (`SNOW_FLAKES` in `lib/envAssets.ts`); far dots, mid flakes, a few large near flakes with their own size, opacity, drift and fall time |
| `weather/fog-far` | between the far and mid landscape, 60% opacity, fades in over 4s; Sísí, path, foreground and UI stay sharp |
| `effects/sisi-glint-frames` | SisiGlint: the five stages crossfade once in ~1.25s (Starlight, World discovery, new Star, Fulfilled ceremony) |

The supplied PNGs stay untouched; the app loads lossless WebP copies of the same pixels (rain full size; snow, fog and glint at half size, never shown larger).

## Magic — `public/assets/magic/`
| File | Used by |
|---|---|
| `fulfilled-star-glow.png` | fulfilled Stars (reserved) |
| `small-path-light.png` | lights along the path (reserved) |
| `fulfilled-flower.png` | the flower a fulfilled Star leaves on the Journey (stand-in: grass-06-coral) |

## Weather — `public/assets/weather/`
| File | Notes |
|---|---|
| `cloudy-sky-overlay.png` | soft veil over the sky, never grey |
| `puddle-highlight.png`, `wet-grass-overlay.png` | reserved for rain |

## Worlds — `public/V2/worlds/<world-id>/`
World ids: `morning-meadow`, `cloud-garden`, `golden-afternoon`, `evening-field`, `quiet-winter`.
Slots (`.webp`, except `discovery-object.png`): `preview`, `sky-morning`, `sky-afternoon`, `sky-evening`,
`background-far`, `landscape-mid`, `ground-seamless`, `foreground-grass-seamless`,
`foreground-tree-left`, `foreground-tree-right`, `cloud-01`…`03`, `discovery-object.png`, `ambient-overlay`.
Today `preview` and `discovery-object` are read; the scene slots are wired next, once a pack arrives.
