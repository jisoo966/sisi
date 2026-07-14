# Sísí — Figma AI Prompts (Minimal Doodle Version)

> ALT VISUAL DIRECTION — One Year app reference aesthetic.
> Brand book 무시. 컨셉만 가져옴.
> Indigo doodle on warm grey. Monospace. Sparse.

---

## ① MASTER VISUAL SYSTEM (run first)

```
Design a mobile app design system in the following aesthetic — strict, do not deviate:

REFERENCE: "One Year" by Sam & Alec. Minimal iOS journaling app. Like a Moleskine notebook scanned with a blue ballpoint pen, presented as iOS interface.

COLOR PALETTE (only these — no other colors anywhere):
- Background: warm light grey #E8E5E0
- Card surface: slightly lighter warm grey #EEEBE6 or pure white #FFFFFF (iOS sheet style)
- Primary ink: deep cobalt indigo #2A2BDC (used for ALL text, illustrations, accents)
- Muted ink: faded indigo #9B9CD8 (for secondary text, hints, dates, faded states)
- Hand-drawn handwriting accent: same indigo, but in a handwritten signature font

NO other colors. No gradients. No shadows beyond standard iOS sheet shadow.

TYPOGRAPHY (strict):
- ALL UI text: monospace font — JetBrains Mono, IBM Plex Mono, or Berkeley Mono. Weight 400 only.
- ALL text lowercase. Never capitalize.
- Headlines: 18-22px monospace
- Body: 15-16px monospace
- Small labels / hints: 13px monospace
- Numbers and key data points: highlighted in deep indigo #2A2BDC, while surrounding text is normal indigo
- Handwritten accent (signatures, decorative names): Caveat or Reenie Beanie font, indigo

ILLUSTRATIONS (critical to the aesthetic):
- All icons and illustrations are HAND-DRAWN doodles in 1.5px indigo line, like ballpoint pen sketches in a notebook
- Subjects: plants, sprouts, watering cans, simple flowers, mushrooms, abstract squiggles, suns
- Style: imperfect lines, slight wobble, like a child's drawing but elegant — Sam & Alec / One Year visual language
- NO filled shapes, NO 3D, NO gradients in illustrations — outline only
- A hand-drawn circle around a + icon is the universal "add" button

LAYOUT PRINCIPLES:
- EXTREME WHITESPACE. Most of the screen is empty grey. Content sits in the middle with breathing room of 80-120px on top and bottom.
- Single-column, never grid-heavy
- iOS sheet/modal presentation: a rounded-corner panel (24px radius) lifted from the bottom over a dark background, with the small grabber bar at top
- Cards use soft white fill, no border, very subtle 1px iOS-style shadow
- Pill-shaped tags: small rounded rectangle with faded indigo bg (#D8D9F0 at 40%) and indigo text
- Use a "X days" countdown pattern where the number is bold/highlighted indigo and the unit is muted

INTERACTION TEXT:
- Top-right "Done" link in active iOS blue (#007AFF) — the ONLY non-indigo color allowed, and only for native iOS controls
- "Cancel" / "Save" / "Done" follow iOS conventions in #007AFF

VOICE / COPY: lowercase, sentence-fragmenty, warm, simple. "every day matters." "welcome friend." "plant memory." "watch your year grow, one plant at a time."

Generate the design system page showing:
- Color swatches (background, primary ink, muted ink, white card)
- Type scale samples (headline, body, label, handwritten)
- Doodle icon library: plant, sprout, flower, mushroom, watering can, sun, grass, +button, heart
- Button styles: text link, doodle + button
- Card examples: date card, full sheet, pill tag

Frame: 390x844 iPhone 14 mobile.
```

---

## ② 화면별 prompts (5개)

각 화면 prompt 앞에 다음 한 줄 붙이기:
**"Continue the minimal doodle design system. Frame: 390x844 iPhone 14."**

---

### 1️⃣ Onboarding — Welcome Friend (letter style)

```
Continue the minimal doodle design system. Frame: 390x844 iPhone 14.

Design the onboarding welcome screen — styled like a handwritten letter on warm grey paper.

LAYOUT (vertical, generous whitespace):
- Background: full warm grey #E8E5E0
- Top status bar (system, dark)
- 200px top padding (lots of breathing room)
- Centered hand-drawn doodle of a single flower with a swirl center — 60px tall, indigo 1.5px line, slight wobble
- 80px gap
- Headline: "welcome friend" — monospace 22px, indigo, lowercase, centered
- 40px gap
- Body paragraph 1 (centered, monospace 16px, indigo, line-height 1.6):
   "we created sísí as a daily reminder
    that what is meant for you
    is on its way."
- 30px gap
- Body paragraph 2:
   "whether it's manifesting love, abundance,
    or finally being kinder to yourself,"
- 30px gap
- Highlighted line, slightly indigo-bolder: "every day matters." (the words "every day" and "matters" all in same indigo, no other emphasis — just standing alone)
- 30px gap
- Body paragraph 3:
   "try it for the next 03 days,
    and if you find yourself in it, you
    can make it part of your journey :)"
   (where "03 days" is in highlighted indigo)
- 100px gap
- Centered "love," in monospace 16px indigo
- Below it: handwritten signature "Sísí ♡" in Caveat 32px indigo, slight tilt, with a hand-drawn heart curl

NO buttons. NO bottom nav. NO continue. Just the letter — feels like reading a note in someone's notebook.

Bottom: just the iOS home indicator bar.
```

---

### 2️⃣ Home — Today (single focus)

```
Continue the minimal doodle design system. Frame: 390x844 iPhone 14.

Design the home "today" screen — extreme minimalism, one action only.

LAYOUT:
- Background: warm grey #E8E5E0
- Status bar at top
- Top-left: "◀ app store" tiny faded muted indigo 12px (iOS return reference)

- 60px gap

- Center top: a small pill tag "today" — width 70px, height 28px, faded indigo bg #D8D9F0 (40% opacity), monospace 14px indigo, centered, border-radius 14px

- 30px gap

- A horizontal row of 4 hand-drawn doodle thumbnails representing past days, evenly spaced, indigo line drawings:
   1. grass tuft (faded — 25% opacity, representing "missed day")
   2. mushroom cluster (faded muted indigo)
   3. abstract sprout cluster
   4. row of small flowers (full indigo — today's preview)
   Each ~40px tall, no labels.

- 250px gap of pure empty grey (THIS IS THE POINT — silence)

- DEAD CENTER of the screen:
   - A hand-drawn imperfect circle in indigo 2px line, ~120px diameter
   - Inside: a large "+" symbol in indigo, hand-drawn feel, 40px
   - Just below the circle: "plant memory" in monospace 18px indigo, centered

- 200px gap

- Bottom area, centered:
   - Two square tiles side by side, 60x60px each, border-radius 12px:
     - Left tile: faded indigo bg #D8D9F0, contains 3 tiny doodle plants (a sprout, mushroom, sunflower) — represents library / past
     - Right tile: filled deep indigo bg #2A2BDC, contains a single white-line flower doodle — currently selected mode
   - Below tiles: small text "trial ends in 03 days" monospace 13px muted indigo, where "03" is highlighted full indigo

Bottom: iOS home indicator.

VIBE: a single deep breath. The whole screen is one decision: plant today's memory.
```

---

### 3️⃣ Year Calendar — Watch Your Year Grow (as iOS sheet)

```
Continue the minimal doodle design system. Frame: 390x844 iPhone 14.

Design the year-view calendar screen — presented as an iOS modal sheet over a dark background.

LAYOUT:
- Outer: black/dark background visible at edges
- Top status bar (light icons since over dark bg)
- Top-right: "Done" link in iOS active blue #007AFF, monospace 16px

- iOS modal sheet starts ~140px from top:
   - Sheet: warm grey #E8E5E0 fill, border-radius 24px (top corners), takes most of screen
   - Tiny grabber bar at top center of sheet: 36x4px rounded faded indigo

- 60px sheet inner padding

- HEADLINE (centered, monospace 20px indigo, lowercase):
   "watch your sísí year grow,"
   - In the middle of "your" and "year", embed a small hand-drawn sprout doodle (3 leaves emerging from soil, indigo line, ~32px wide), inline with the text
   - Subline below: "one memory at a time" in muted indigo monospace 16px

- 60px gap

- A grid layout — irregular bento style on a card background:
   - White card #FFFFFF, border-radius 20px, soft iOS shadow, padding 20px, width 330px, centered
   - Left side: large featured tile (180x180px) — white inside white card, just a small "#33" label top-right faded indigo, a hand-drawn watering can doodle large-centered (80px, indigo 1.5px line), bottom-left "monday" monospace 13px indigo, bottom-right "02.02" muted indigo
   - Right side: 2x2 grid of small empty placeholder tiles (60x60px each), warm grey #EEEBE6 fill, border-radius 10px, no content (representing future days)

- 24px gap below that card

- A SECOND larger card showing the year-canvas:
   - White card #FFFFFF, border-radius 20px, padding 20px, width 330px, height 360px
   - Inside: a dense scattered field of tiny hand-drawn doodles — flowers, plants, mushrooms, grass tufts, abstract botanical scribbles, sprouts — about 80-100 tiny indigo doodles arranged organically, getting sparser toward the bottom, transitioning into faded indigo DOTS (representing future days yet to be planted)
   - Bottom-left: "2026" monospace 13px indigo
   - Bottom-right: "187 days to grow" — where "187" is highlighted full indigo and "days to grow" is muted indigo

- Bottom: iOS home indicator on dark area

VIBE: opening your year and seeing it as a garden in progress. Each doodle is a planted memory.
```

---

### 4️⃣ Plant a Memory — Capture Sheet

```
Continue the minimal doodle design system. Frame: 390x844 iPhone 14.

Design the "plant a memory" capture screen — full screen sheet, journal entry style.

LAYOUT:
- Background: warm grey #E8E5E0 (full screen, no modal sheet this time)
- Top status bar
- Top-left: "← back" monospace 14px muted indigo
- Top-right: "save" iOS blue #007AFF monospace 16px

- 30px gap

- Date label centered: "monday · 02.02.26" muted indigo monospace 13px

- 20px gap

- HEADLINE: "what did today plant in you?" — monospace 20px indigo, lowercase, centered

- 40px gap

- A vertical scroll of doodle prompts — each is a hand-drawn icon + label, very minimal, left-aligned in a soft card:
   - White card 330x60px, border-radius 14px, soft shadow, indigo doodle icon (28px) on left + monospace 15px label
   - Row 1: 🪴 (sprout doodle) + "a small win"
   - Row 2: 🌸 (flower doodle) + "a kind moment"
   - Row 3: 🍄 (mushroom doodle) + "a question i'm sitting with"
   - Row 4: ☀️ (sun rays doodle) + "something i'm grateful for"
   - Row 5: 〰️ (squiggle doodle) + "something i'm releasing"

- 30px gap

- Large free-form text input area:
   - White card, 330x180px, border-radius 16px, soft shadow
   - Placeholder text inside: "or just write…" monospace 15px muted indigo, top-left padded
   - A tiny hand-drawn flower doodle in bottom-right corner of the card (decorative, indigo line)

- 40px gap

- Centered hand-drawn circle (~90px) with "✓ plant it" inside, monospace 16px indigo, indigo 2px hand-drawn ring

- Bottom: iOS home indicator

VIBE: writing in a journal but the prompts feel like a friend asking gentle questions. No streak guilt. No counters.
```

---

### 5️⃣ Sísí Chat — Notebook Conversation

```
Continue the minimal doodle design system. Frame: 390x844 iPhone 14.

Design the Sísí chat screen — looks like exchanging written notes with someone, on warm grey notebook paper.

LAYOUT:
- Background: warm grey #E8E5E0 (full screen)
- Faint horizontal grey ruled lines every 36px, only 10% darker than background — barely visible journal lines
- Status bar at top

- TOP NAV:
   - Left: "← back" monospace 14px muted indigo
   - Center: a small hand-drawn flower doodle (28px indigo) + below it "sísí" handwritten Caveat 16px indigo (the only handwritten element)
   - Right: "•••" muted indigo

- 24px gap

- Date pill (centered): "today · 8:42am" muted indigo monospace 11px

- 30px gap

- MESSAGE THREAD (alternating, left = sísí, right = user):

   SÍSÍ (left, white bubble):
   - White card, max-width 260px, border-radius 16px (with top-left corner sharper at 4px), padding 14px
   - Tiny doodle of a sprout (16px indigo) inline at start
   - Then text in monospace 14px indigo: "hi friend. how's your morning?"
   - Tiny timestamp below outside bubble: "8:42am" 10px muted indigo

   USER (right, faded indigo bubble):
   - Bubble bg: faded indigo #D8D9F0 at 50% opacity, border-radius 16px (top-right sharper)
   - Text monospace 14px indigo: "anxious about today's meeting. couldn't sleep."

   SÍSÍ (left, white):
   - "couldn't sleep is a heavy way to start a day."
   - Line break
   - "what's underneath the anxious?"
   - Small hand-drawn moon doodle (12px) at end of message, indigo

- typing indicator: small "sísí is writing…" muted indigo monospace 12px, with three tiny hand-drawn dots animating

- 100px gap

- INPUT BAR at bottom (fixed but inline-flow):
   - Sits on warm grey #E8E5E0
   - White rounded input field, 280x44px, border-radius 22px, monospace 14px placeholder "write to sísí…"
   - Right of input: a small hand-drawn indigo circle (44px) with a paper-plane doodle inside (or a single small sprout doodle for "send")
   - NO keyboard mockup — leave the iOS native keyboard area empty / faded

- Bottom: home indicator

VIBE: a quiet pen-and-paper exchange. Slow, considered, not a chatbot rush.
```

---

## ③ Doodle Library Spec (give Figma AI separately if needed)

```
Generate a doodle icon library in indigo #2A2BDC 1.5px hand-drawn lines on warm grey #E8E5E0 background. Style: ballpoint pen in a journal, slight wobble, imperfect, charming. NOT polished vector — must feel hand-made.

Icons needed (28px each):
- sprout (2-3 leaves from soil)
- flower with swirl center
- mushroom cluster
- watering can (side view, handle, spout)
- sun with rays
- grass tufts
- crescent moon
- heart with curl
- single eye (open, lashes)
- spiral / swirl
- small house with chimney
- bird in flight (simple V)
- + plus inside hand-drawn circle
- check mark inside hand-drawn circle
- arrow (slightly wobbly)

Each icon on its own square frame 60x60px, indigo on warm grey, lowercase label below in monospace 11px.

Style reference: Sam & Alec "One Year" app icons.
```

---

## ④ Iteration prompts

부분 수정용:

```
The illustrations look too polished / vector-perfect. Redo them with more wobble, imperfect lines, like a real human drew them in a notebook with a ballpoint pen. The charm comes from imperfection.
```

```
Reduce all content density by 30%. Add more empty warm grey space above and below. The screen should feel almost too empty — that's the point.
```

```
The text feels too gray. Use full saturation indigo #2A2BDC for all primary text. Only use muted indigo #9B9CD8 for timestamps and hints.
```

```
Make the iOS sheet feel more authentic — proper 24px top-corner radius, the small grabber bar at top, slight shadow at the top edge, and visible dark area peeking above and below.
```

```
The monospace isn't reading right. Use IBM Plex Mono or JetBrains Mono specifically. Weight 400 only. Letter-spacing default.
```

---

## How to Use This Track

1. **Decide which direction first** — vintage warm cream brand book version OR this minimal doodle version. You can do BOTH and A/B test with users.
2. Run Master Visual System prompt to establish system.
3. Run each screen prompt.
4. If illustrations come out too polished/clip-art, use the iteration prompt about wobble.
5. Save doodles as Figma components — reuse across screens.

---

## When this style wins

✓ Lower-effort vibe — feels more like personal notebook  
✓ Reads younger / more indie  
✓ Easier to ship visually (less custom imagery, less art direction)  
✓ Doodles can be reused infinitely — every memory entry is just a doodle  

## When the brand book version wins

✓ More premium / mature  
✓ Differentiation in manifestation category (most apps are pastel or doodle — vintage warm cream is rarer)  
✓ Stronger long-term brand equity  
✓ Better for $9.99/mo positioning  

User test both. Let users tell you.

---

*Last updated: 2026-05-15.*
*Reference: "One Year" by Sam & Alec.*
