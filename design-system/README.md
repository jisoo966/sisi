# Sísí design system

One visual language for every screen. Page files compose these pieces; they don't restyle them.

| Layer | File |
|---|---|
| Tokens: five colours, spacing, safe areas, layers, motion | `design-system/tokens.css` |
| Type: Sentient (self-hosted WOFF2) + Inter, type scale, `t-*` roles | `design-system/typography.css` |
| Motion keyframes, reduced motion | `design-system/motion.css` |
| Component styles (`ds-*`) | `components/ds/ds.css` |
| Components | `components/ds/*.tsx` (import from `@/components/ds`) |
| Visual sheet of every component | `/test-ui` |

## Components (spec name → where it lives)

| Spec | Implementation |
|---|---|
| PrimaryButton, SecondaryButton, TextAction, IconButton, DestructiveMenuAction (+ OverflowMenu) | `components/ds/buttons.tsx` |
| MemoryPaper, FocusPaper | `components/ds/paper.tsx` |
| SisiSpeechBubble | `components/sisi/SisiSpeechBubble.tsx` (re-exported from `@/components/ds`) |
| ModalPortal, ModalBackdrop, ModalDialog, ConfirmationDialog | `components/ds/modal.tsx` (renders into `#sisi-overlay-root`) |
| StickerNavigation (+ Host) | `components/ds/StickerNavigation.tsx` (`BottomNavV2` is an alias) |
| StatusChip, FilterChip, ReplyChip, StarConnectionRow | `components/ds/chips.tsx` |
| Icons (outlined, 1.5px; `StarGlyph` is the only filled gold icon) | `components/ds/icons.tsx` |
| MomentCard | Memory Trail card (`moments/MomentsWorld.tsx`) · list row (`moments/MomentsList.tsx`) |
| MomentDetail | `components/sisi/moments/shared.tsx` (used by Moments and the vertical trail) |
| SisiConversationPanel | `components/sisi/journey-v2/CompanionSheet.tsx` (on FocusPaper) |
| SisiCompanion | `components/sisi/journey-v2/WalkingCat.tsx`, `SisiChatCharacter.tsx` |

## Rules in one place

- Colours: `--sisi-blue`, `--sisi-ink`, `--sisi-paper`, `--sisi-gold` (Stars only), `--sisi-coral` (rare accents only). Variations are opacity only. Tailwind: `ink`, `paper`, `sisi-blue`, `star`, `coral` (legacy names map to these).
- Primary actions: ink on paper, paper on dark/blue. Never gold, coral or blue.
- Delete lives in a three-dot menu and always asks first (`ConfirmationDialog destructive`).
- Sentient for everything people read as voice; Inter (`t-meta`, `t-status`, `ds-helper`, chips) for dates, statuses, helpers and errors.
- Overlays always use `ModalPortal`; the navigation dims and becomes inert beneath them.
