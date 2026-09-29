# Sísí Design System — Phase 0 Audit

Branch: `redesign/one-world` (HEAD `810a964`, working tree clean)
Scope audited: `app/`, `components/`, `lib/`, `app/globals.css`, `tailwind.config.ts`, `app/layout.tsx`

---

## 1. Fonts — files and exact family names

**No font files exist in the repo.** Every font is loaded remotely:

| Font | Source | Registered family name | Weights / styles loaded |
|---|---|---|---|
| Sentient | Fontshare CDN `<link>` in `app/layout.tsx` | `'Sentient'` (confirmed from the served `@font-face` rules) | 200, 300, 400, 500, 700 — **normal only, no italic** |
| Inter | `next/font/google` | `--font-inter` (hashed family) | variable |
| Fraunces | `next/font/google` | `--font-fraunces` | variable |
| EB Garamond | `next/font/google` | `--font-eb-garamond` | variable |
| Caveat | `next/font/google` | `--font-caveat` | variable |

Problems found:

- **Sentient Italic is not loaded.** There are 124 `italic` uses across 45 files. Every one renders as a browser-synthesised (fake) slant.
- **Five Sentient weights are downloaded**, including 200, 300 and 700, which the new system does not use. The new system needs only 400, 400 italic and 500.
- **`.font-sentient` forces weight 300** (Light) in `globals.css:28`. It is used 179 times, many of them below 18px, which the new rule forbids.
- **Three extra families still load on every page:**
  - Fraunces: 65 references
  - EB Garamond: 197 references
  - Caveat: 22 references

  They appear in 35 files, including the new Journey/Moments components, where they are the fallbacks inside `--font-editorial`.
- **Recommendation:** self-host Sentient as WOFF2 in `public/fonts/sentient/`, with three files: Regular, Italic and Medium. Fontshare's ITF Free Font License permits self-hosting. This also makes the PWA work offline. Inter stays on `next/font`, which already self-hosts it at build time.

## 2. Duplicated styling

### Colour

- **82 distinct hex colours and 227 distinct rgba values** across the codebase.
- **Three competing palettes** exist:
  - brand v1 in `tailwind.config.ts` and `:root`: cream, plum, brown, mustard, rose, sage, lavender;
  - "journey" v2: cobalt `#3B5BB8`, navy, oxblood, purple `#B19CD9`, frost;
  - the current world, hard-coded inline: `#18333a`, `#102d32`, `#f5efdd`, `#2b2f45` and others.
- **Royal-blue CTA `#3d74d8` / `#4384e3`** is used in 13 files:
  - `app/journey/page.tsx`
  - `CompanionCues`, `CompanionSheet`, `CreateStarFlow`, `DailyPractice`, `EveningReflection`, `MomentCapture`, `SatchelDrawer`, `StarMemoryCard`, `StarView`
  - `moments/MemoryTrail`, `moments/shared`
  - `stars/NewStarSky`
- **Sky paintings:** `TimeOfDaySky.tsx` uses painted-sky horizon colours (`rgb(46,123,241)` etc.) and a separate night navy `#0b1a33`. These belong to illustration assets, so they stay. Only the UI-side overlay colour moves to Ink.

### Paper surfaces — 9 separate implementations

| Prefix | File | Role → shared target |
|---|---|---|
| `.sisi-speech` | `SisiSpeechBubble.tsx` | already the shared bubble ✓ (needs token colours) |
| `.cs-paper / .cs-sheet` | `CompanionSheet.tsx` | FocusPaper (conversation) |
| `.dp-paper / .dp-sheet` | `DailyPractice.tsx` | FocusPaper (writing) |
| `.mc-paper / .mc-sheet` | `MomentCapture.tsx` | FocusPaper (writing) |
| `.sd-paper` | `SatchelDrawer.tsx` | FocusPaper |
| `.sms-paper / .sms-card` | `StarMemoryCard.tsx` | FocusPaper + MemoryPaper |
| `.mm-*` card + `Unfold` | `moments/shared.tsx` | MemoryPaper + ModalDialog |
| torn-edge papers | `CreateStarFlow`, `EveningReflection`, `NewStarSky`, `StarView`, `PaperToast`, `SpendTimeCTA` | MemoryPaper / FocusPaper |
| legacy | `PaperPage`, `PaperBackground`, `ChatBubble` | legacy routes only |

- **`lib/tornEdge.ts` is already shared**, but each paper component re-declares its own padding, shadow, font and radius.
- **Only the speech bubble and the nav use the new `paper-grain.webp`.** The other papers use flat fills.

### Buttons

- `rounded-full` / `999px` pill buttons are built inline in about 20 files.
- Local button classes include `.mm-btn`, `.mm-btn--primary`, `.mm-btn--danger`, `.mm-textbtn`, `.sms-cta` and `.cs-*` action buttons.
- **Delete appears as a visible button in the Moment edit view**: `shared.tsx:241` (`mm-btn--danger`).

### Navigation

- `journey-v2/BottomNavV2.tsx` (ground and Sky Dock variants) is used by `/journey`, `/gallery` and `/messages`.
- `components/sisi/BottomNav.tsx` (legacy) is used by `/my-stars` and `/messages`.
- **Order is already Moments / Journey / Stars ✓.**

### Modals, sheets and overlays

- **13 components create their own `position: fixed` overlay.** Only `moments/shared.tsx` uses a portal to `document.body`.
- **Confirmation dialogs are implemented three ways:**
  - `window.confirm` in `journey/page.tsx:353`;
  - a local `ConfirmDeleteModal` in `my-stars/[id]`;
  - an inline confirm state in `moments/shared.tsx`.

### z-index

- **More than 35 distinct values** (0–13, 20–31, 40–60, 100, 110, 1000, 1001), with no scale.

### Viewport

- `svh`, `dvh` and `100vh` (2 places) are mixed.
- `--safe-*` is declared only inside `.journey-stage-v2`, not at `:root`.

### Animation

- Easing `[0.22, 1, 0.36, 1]` is re-declared per file.
- **Spring entrances** (nav slide-up, some sheets) conflict with the no-bounce rule.

## 3. Safe to consolidate (visual only, no state or data)

- `SisiSpeechBubble`: already the target; switch it to tokens.
- `PaperToast` and `SpendTimeCTA`: become MemoryPaper / TextAction.
- `CaptureFAB`: becomes IconButton.
- All inline pill buttons: become PrimaryButton / SecondaryButton / TextAction.
- `BottomNavV2` visual shell: becomes `StickerNavigation`. The routing and handler props stay as they are.
- `lib/tornEdge.ts`: moves under MemoryPaper.
- The three confirm patterns: become one `ConfirmationDialog`.
- The `Unfold` modal shell in `moments/shared.tsx`: becomes `ModalPortal`. The Moment logic inside stays.
- The legacy colour aliases in `tailwind.config.ts` and `:root`: remap to the five tokens. The class names stay, so nothing breaks.

## 4. Business logic to preserve untouched

Only the styling layer of these changes; the logic stays exactly as it is.

**Data**

- `lib/momentStore.ts`: canonical Moment record (`starId`, `source`, `type`, `text`, `image`, timestamps) and the legacy import.
- `lib/myStars.ts`: Stars, stored in Supabase when signed in and in localStorage otherwise.
- `lib/momentLinks.ts`, `lib/moments.ts`, `lib/momentsTimeline.ts`
- `lib/chatSessions.ts`
- `lib/littleLights.ts`
- `lib/satchel.ts`
- `lib/postcards.ts`
- `lib/angelMessages.ts`
- `lib/dataMode.ts`
- `app/api/*`: chat (listen-first prompt and markers), angel messages, Stripe, cron.

**World and motion**

- `lib/worldMotion.ts` (speed clock)
- `lib/worldHandoff.ts`
- `lib/useStarAscent.ts`
- `lib/journeyWorld.ts`
- `lib/timeOfDay.ts`
- `lib/useJourneyPhase.ts`

**Components with state**

- `app/journey/page.tsx`: 1,140 lines of orchestration covering speed, walk lines, star modes and handoffs.
- `CompanionSheet`: streaming, marker parsing, action gating.
- `StarMemoryCard`: nine modes, check-in writes.
- `CreateStarFlow`, `DailyPractice`, `EveningReflection`, `MomentCapture`, `SatchelDrawer`
- `moments/MemoryTrail`, `MomentsWorld`, `MomentsScreen`, `MomentsList`, `shared.tsx`: edit, delete and link mutations.
- `stars/NewStarSky`, `StarWorld`, `SkyStarV2`, `StarView`
- `WalkingCat`, `TrailFox`: cadence was just fixed. **Do not touch.**
- All illustration and animation layers: `CloudField`, `MeadowStrip`, `PassingSprites`, `ParallaxLayer`, `Foreground*`, `TimeOfDaySky`.

## 5. Other risks found

- **Desktop phone frame.** `.phone-frame` gets `transform: translate(0)` at ≥500px, which makes the frame the containing block for fixed elements. A body-level portal escapes the 430px frame, so on desktop the modal covers the whole window, not the phone. The fix is a portal root *inside* the frame (`#sisi-overlay-root`) that is still outside every transformed world container.
- **Legacy routes on the old v1 brand**: `/my-stars`, `/my-stars/[id]`, `/messages`, `/messages/chat`, `/moment`, `/postcard*`, `/meditations`, `/gallery-legacy`, `/onboarding`, `/login`, `/intro`. They use Fraunces/Garamond and plum/cream. Several are already redirected (`/chat`, `/capture`, `/me`, `/postcards`).
- **Voice-rule conflict.** `CLAUDE.md` says "always lowercase", but the current world copy and this spec use sentence case ("Keep this in Moments"). This refactor follows the spec.
- **No `src/` directory.** The spec's `src/` tree has to be adapted to the root-level `app/`, `components/` and `lib/` layout.

## 6. Proposed incremental plan (each step = one commit, verified before the next)

**Phase 1: foundation, additive only**

1. Add `design-system/tokens.css`, `typography.css` and `motion.css`, imported by `app/globals.css`:
   - five colours plus opacity derivatives;
   - type scale, spacing, safe-area, z-index and motion tokens;
   - reduced motion.
2. Self-host Sentient (Regular, Italic, Medium; WOFF2) and add `--font-editorial` / `--font-ui`.
   - Remove the Fontshare `<link>`.
   - Remove the Light-300 default from `.font-sentient`.
3. Remap the legacy aliases:
   - Tailwind `cream` / `plum` / `journey-*` → tokens;
   - `font-garamond` / `font-fraunces` → the editorial font.

   This is one change with visible effect everywhere. The class names stay.

**Phase 2: shared components** (new files in `components/ds/`; nothing deleted)

4. Buttons: `PrimaryButton`, `SecondaryButton`, `TextAction`, `IconButton`, `DestructiveMenuAction`.
5. Paper: `SisiSpeechBubble` (tokens), `MemoryPaper`, `FocusPaper`.
6. Modals: `ModalPortal` (portal root inside the phone frame), `ConfirmationDialog`, focus trap and inert background.
7. Navigation and chips: `StickerNavigation` (wrapping BottomNavV2's props), `StatusChip`, `FilterChip`.
8. Add a `/test-ui` gallery page showing every component and variant, for visual sign-off.

**Phase 3: migration, one surface per commit**

9. Journey: cues, walk-finish, capture, daily practice, evening reflection. Remove the royal blue.
10. Sísí conversation: `CompanionSheet` onto FocusPaper. Marker logic stays untouched.
11. Stars: `StarMemoryCard`, `CreateStarFlow`, `NewStarSky`, `StarView`.
12. Moments: `MomentCard`, `MomentDetail` (menu with delete/disconnect, `StarConnectionRow`), `MemoryTrail`, `MomentsList`.
13. Legacy routes: tokens and fonts only (via step 3), unless asked otherwise.

**Phase 4: cleanup**

14. Remove the now-unused local CSS blocks, and the Fraunces / EB Garamond / Caveat loaders.
15. Playwright matrix: 320×568, 375×667, 390×844, 430×932, covering long text, the keyboard, safe areas, reduced motion, 200% text, and Moment/Star mutations.
