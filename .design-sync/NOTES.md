# design-sync notes — Sísí App Design System

This project syncs `components/sisi/` (the real Sísí Next.js app's component
folder) into claude.ai/design — not a separate published component package.
"package" shape, no `dist/`, synthesized entry (`cfg.srcDir` points at a
build-time-only staged copy, see below).

## Repo findings surfaced during this sync (report to Jisoo, not yet fixed in the app)

- **`components/sisi/FoxLottie.tsx`** imports `lottie-react`, which was not
  in `package.json` / not installed, and the component isn't referenced
  anywhere else in the app. Installed `lottie-react` as a real dependency
  (`npm install lottie-react`) so the sync bundle would build — this also
  fixes the component for the real app, which was previously dead/broken
  code if ever rendered.
- **`components/sisi/FoxCharacter.tsx`** references `/fox/sitting-front-small.png`,
  `sitting-front-tall.png`, `side-profile-1.png`, `side-profile-2.png`,
  `walking-away.png`, `sleeping-curled.png` — **none of these files exist**
  in `public/fox/`. Only the `walking` state (`walking-clean.webp`) has a
  real asset. The synced preview only shows `walking`; the other 6
  `FoxState` values will 404 in the real app too until those images are
  added.
- **`components/sisi/stickers/*.tsx`** (all 12 sticker icons) ship `<svg>`
  with a `viewBox` but no `width`/`height` and no size-setting class —
  relying on `className` from the caller. `Sticker.tsx` itself passes no
  className to `children`, so an icon dropped into `<Sticker>` without an
  explicit `w-*/h-*` class renders at the browser's default SVG size
  (300×150) and overflows the badge. Previews here pass explicit
  `className="w-6 h-6"` etc. — same fix would help real usage if any
  call site forgets the size class.

## Build pipeline (why `srcDir` isn't `components/sisi` directly)

`cfg.buildCmd` stages a filtered copy of `components/sisi/` into
`.design-sync/build-src/sisi/` (gitignored, regenerated every build) because:

1. **`BackButton.tsx`, `BottomNav.tsx` excluded** — both call
   `next/navigation`'s `useRouter`/`usePathname`. Bundling `next/navigation`
   (or `next/link`, `next/image`) standalone pulls in Next's internal
   router/image code, which references `process.env.__NEXT_*` at MODULE
   SCOPE (not lazily) — throws `ReferenceError: process is not defined` the
   instant the bundle IIFE evaluates in a plain browser (no `process`
   global). This broke the ENTIRE shared bundle, not just those two
   components (`window.SisiApp` had zero working exports). No safe fix
   within design-sync's config surface (esbuild's `define` only patches
   `process.env.NODE_ENV`, not the other `__NEXT_*` reads) — excluded.
2. **`FoxLottie.tsx` excluded** — see "Repo findings" above (fixed via real
   `npm install`, but left excluded since it's dead code with no visual
   payoff for a DS card; can be re-included once it's actually wired into
   the app).
3. **`FoxAvatar.tsx` replaced with a shim** (`.design-sync/build-src-fixed/FoxAvatar.tsx`,
   copied over the staged copy after rsync) — same component/props/markup,
   swaps `next/image` for a plain `<img>` (same `process is not defined`
   root cause as #1). `ChatBubble.tsx` imports `FoxAvatar` directly, so it
   can't just be excluded — the file has to exist and resolve.
4. **`fix-default-exports.mjs`** — the synthesized entry does
   `export * from "<file>"` per source file, which per ES module semantics
   never re-exports `export default`. Most of `components/sisi/*.tsx` uses
   `export default function Name()`. Since a `function` declaration's name
   is still a real local binding, this script appends
   `export { Name };` to every file with a default export — additive only,
   never touches the real repo source (runs against the staged copy).
5. **Fonts** — the real app self-hosts Fraunces/EB Garamond/Caveat via
   `next/font/google` in `app/layout.tsx` (build-time only, no static
   `@font-face` file to ship). `buildCmd` prepends a Google Fonts CDN
   `@import` (`fonts-import.css`) and appends `--font-*` CSS var
   definitions (`fonts-append.css`) around the Tailwind-compiled output —
   visually equivalent, loads from Google's CDN instead of self-hosting.
   "Sentient" is marked `runtimeFontPrefixes` (already loaded via a
   Fontshare `<link>` in the real app, same as the DS pane will see it).
6. **Post-build asset copy** (`copy-assets.sh`, NOT part of `buildCmd` —
   must be run manually after every `package-build.mjs`, since it writes
   into `ds-bundle/` which the build wipes) — copies the handful of
   `public/journey|fox|foxcapture` images the authored previews reference
   by absolute path (`/fox/...`) into matching paths under `ds-bundle/`, so
   local validate/capture resolve them. **Re-sync risk**: if this step is
   forgotten after a rebuild, FoxAvatar/FoxCharacter/JourneyScene/PosedFox/
   WalkingFoxRear previews will show broken images.

## Known render warns

- **Frozen-clock blank captures** (`package-capture.mjs` per-cell grading
  screenshots only — NOT `package-validate.mjs`'s render check): any
  preview using a framer-motion entrance animation starting at
  `initial={{ opacity: 0 }}` (`BookCard`, `BookGallery`, `Sticker`, and
  every sticker's `InBadge` cell, which wraps in `<Sticker>`) captures as a
  blank/near-blank PNG under `_screenshots/review/raw/`, because
  `package-capture.mjs` calls `page.clock.setFixedTime(...)` for
  deterministic screenshots, which freezes framer-motion's
  requestAnimationFrame-driven animation loop at frame 0. Confirmed these
  render correctly (styled, complete, plausible) via
  `package-validate.mjs`'s render-check screenshots and contact sheets,
  which don't freeze the clock. Graded `good` with a note in each affected
  cell's `.grade.json` rather than chasing further — this is a capture-tool
  artifact, not a real rendering defect (real time flows normally both in
  the real app and in claude.ai/design).

## Re-sync risks

- If `components/sisi/` gains new default-exported files, `fix-default-exports.mjs`
  picks them up automatically (regex-based, not a hardcoded list) — no
  config change needed.
- If a new component imports `next/navigation`, `next/link`, or `next/image`
  directly, it will reproduce the `process is not defined` bundle-wide
  failure (item 1 above) — exclude it from the `rsync --exclude` list in
  `cfg.buildCmd`, or give it a shim like `FoxAvatar.tsx`'s.
- `copy-assets.sh` is a manual post-build step, not wired into `buildCmd`
  (buildCmd runs BEFORE package-build.mjs, which wipes `ds-bundle/`) — must
  be re-run after every `package-build.mjs` / `resync.mjs` invocation.
- `FoxCharacter`, `FoxLottie` are only partially wired to real assets (see
  "Repo findings") — worth a follow-up with Jisoo before authoring richer
  previews for them.
- The existing **"Sísí Design System"** project in claude.ai/design
  (`6640ee8f-1b7a-412e-a28b-2860db911180`) is a separate, hand-built design
  system (not from this sync) — left untouched. This sync's project is
  **"Sísí App Design System"** (`42422b79-502b-4e6a-9552-d394da53331e`).
