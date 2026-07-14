# Sísí — Journey DNA (achievable in app form)

> Adopted 2026-05-22. Layered on top of Direction B.
> Goal: capture Journey's emotional core in app form (no game engine, no 3D).
> Build cost: +1-2 weeks of layered design work, no infrastructure changes.

---

## The seven Journey moves we translate

| Journey | Sísí App translation |
|---|---|
| 1. Vast landscape + smallness | Horizon visible on most screens. User represented as small figure at horizon. |
| 2. Mountain destination | A faint mountain silhouette in distance on Home + Constellations. Symbolizes user's *becoming* — approached, never arrived. |
| 3. Forward motion every play | Each open = user figure advances ~0.5% toward mountain. Visible on Home over weeks. |
| 4. Companion (anonymous player) | **Pet** — single small animal character. Same one every session. Appears in every screen. |
| 5. Wordless communication | Pet reacts via micro-animation (blink, tail flick, ear twitch). No dialogue boxes. |
| 6. Ambient music | Optional looping ambient track. Toggle in header (moon icon). One track for day screens, different for Constellations night. |
| 7. Minimal chrome | No badges. No streak counters. No notification dots. Nav stays text-only. |

## The pet (the one decision that defines the product's face)

### LOCKED: White Fox

**The pet is a white fox.** Final decision. All illustration work proceeds from this.

Reasoning:
- Carries both *mystery* and *companionship* (the two emotions user committed to for Constellations first 3 seconds).
- Universally readable in Korean and Western markets.
- Single, distinctive silhouette — works at 24px favicon scale.
- Pairs with the moon (Sísí's voice in Constellations) without competing — the fox is *embodied Sísí by day*, moon is *cosmic Sísí by night*.

### Pet's role across screens

- **Onboarding**: Pet first appears alongside Sísí's welcome. *"i'm sísí. and this is who walks with you."*
- **Home**: Pet sits at bottom-left near horizon. Looks toward mountain. Tail flick on tap. Reactive to user input.
- **Collect**: Pet watches user write. Closes eyes briefly when wish is planted.
- **Letters**: Pet sits beside user's text. Tilts head when Sísí (the moon) writes back.
- **Constellations (night)**: Pet stays beside user silhouette at horizon. Looks up with user.
- **Profile**: Pet portrait next to user name on bookplate. *"your companion since [date]"*.

### Pet has no name by default

User can name the pet in Profile (optional). If unnamed, Sísí refers to it as *"your companion."*

## The star (final destination) + thresholds (chapter gates)

The destination is **not a mountain.** It is **a single small luminous star** at the very far edge of the horizon. Implied to be a morning star / dawn star. Visible on Home and Constellations.

- Day screens: pale gold tiny point at horizon edge.
- Night (Constellations): a single brighter star at the same horizon position — the cosmos rises around it.
- Reaching the star is **never possible** (asymptotic). Becoming is approached, not arrived.

### Thresholds — chapter gates along the path

Between the user and the star, **a series of arches** (frontispiece / vintage triumphal style) mark milestones in the user's archive growth. Like Journey's chapter transitions.

Each arch corresponds to a *life event in the archive*:

| Arch | Trigger | Sísí's inscribe (italic serif on tap) |
|---|---|---|
| 1st | First fragment planted (Day 1) | *"here you planted your first wish."* |
| 2nd | First constellation forms (~Day 7) | *"here a pattern first revealed itself."* |
| 3rd | Archive type named (~Day 7-14) | *"here you named who you are."* |
| 4th | First future-self letter (~Day 14) | *"here you wrote to who you'll be."* |
| 5th | First moon cycle (Day 30) | *"here you returned for the first cycle."* |
| 6th | First season (Day 90) | *"here a season turned with you."* |
| 7th | One year (Day 365) | *"here a year completed."* |
| (more thresholds emerge over time) | | |

Each arch:
- Renders small, ornate, single-color (warm brown by day, cream by night).
- Sized to not block the view.
- Tap on a passed arch = brief modal showing the user's actual entry from that moment ("you wrote this then"). Memory marker.
- Arches ahead of user are visible but faded (anticipation).
- Arches behind user are slightly luminous (memory).

### Why not a mountain

- Mountain is goal-coded, peak-coded, productivity-coded.
- Mountain is alpine — Western, hero's journey trope.
- The star + arches is cosmic, literary, time-aware, archival — matches brand spine.

### Why not the moon

- The moon is **Sísí.** Already locked in Brand Book v2.
- If user walks toward the moon, Sísí becomes the destination = becomes an oracle/guru. Violates brand voice rule.
- The star (separate from moon) is the destination. The moon (Sísí) walks alongside, witnessing.

## Movement mechanic

Each app session = small forward step. Specifically:

- Day 1: user figure at 0% of horizon path
- Each new session moves +0.1-0.5% (small enough to barely notice day-to-day, visible over weeks)
- At Day 30: figure noticeably closer to mountain
- At Day 365: figure mid-horizon
- The path is **never complete**. Even at Day 3650, mountain remains in distance.

The session-progression number is invisible UI. Only the figure's position is visible.

Critical constraint: **do not count entries, only sessions.** Counting entries reintroduces productivity-think. Sessions = "you showed up." That's all.

## Ambient music

- One ambient track for day (Home, Collect, Letters, Profile).
- One ambient track for night (Constellations).
- Looping, 3-5 minutes each, fades smoothly.
- Always default OFF until user enables once (then sticky on).
- Toggle = small moon icon top-right of every screen.
- Source: Pixabay / Free Music Archive / Bandcamp royalty-free for MVP. Compose original for V2.

## What NOT to add (in MVP)

- Walking animations between screens (V2 — animations are expensive)
- Pet voice (V2 — would need ElevenLabs or animation lip sync)
- Pet costume / customization (V2 — feature creep)
- Multiple pets (V2 — pet is identity)
- 3D anything (never — outside scope)
- Real-time player encounters (Phase 2 — Distant Lights)

## Net additional build cost

| Item | Time |
|---|---|
| Pet illustration (5-7 micro-poses) | 1 day with illustrator OR 2 days with AI generation + cleanup |
| Mountain silhouette SVG | 2 hours |
| User figure progression component | 1 day |
| Ambient music selection + integration | 0.5 day |
| Audio toggle component + persistence | 0.5 day |
| Pet integration across 6 screens | 1 day |
| **Total** | **~4-5 days on top of Direction B build** |

Acceptable. Compresses to 3 days with focused execution.

---

## What this changes about positioning

Old positioning: *"a quiet companion for what you've planted in the universe."*

New positioning (with Journey DNA): *"a quiet companion for the journey you're already on."*

Subtle but important. The journey is real. The mountain is real. The pet is real. Sísí is the moon witnessing. You are walking.

App Store positioning shift:
- Old: emotional archive
- New: emotional archive + visible becoming

This category essentially does not exist yet. We are defining it.

---

*This doc layers on Brand Book v2, MVP v4, and Code Changes Direction B. No conflicts — all extensions.*
