# Sísí — Figma AI Prompts

> Figma Make / First Draft / AI Design에 paste할 prompts.
> 영어로 줘야 결과 좋음. 순서대로 진행:
> ① Master Brand Prompt (한번만, 시스템 깔기) → ② 화면별 5개 prompts

---

## ① MASTER BRAND PROMPT (run first)

먼저 이걸로 design system 깔아두면, 다음 화면 prompt들이 이 style 따라옴.

```
Design a complete mobile design system for a manifestation app called "Sísí".

POSITIONING: Co-Star aesthetic meets warm wisdom. Editorial, vintage, mystical but never woo-woo or childish. Think "your wise older sister's journal" — sophisticated, soft, intentional.

REFERENCE MOOD: vintage 1970s paperback book covers, Joan Didion essays, mid-century astrology books, linen and cream paper textures, handwritten margins, library card catalogs, old typewriter typography.

COLOR PALETTE (use exactly these hex values):
- Warm Cream #F5EFE6 (primary background)
- Deep Plum #3D2E25 (primary text, headings)
- Warm Brown #6B5648 (secondary text, body)
- Mustard Gold #D4A82A (primary accent — CTAs, highlights, gold stars)
- Dusty Rose #C4847C (soft accent — stickers, decorative)
- Sage Green #8FA38C (subtle accent — meditate icons)
- Lavender Cream #E8E1F0 (special surfaces — punch card)
- Paper White #FFFFFF (cards on cream)
- Soft Border #D8CFC0 (0.5px borders)

TYPOGRAPHY:
- Headlines: Fraunces (vintage book serif), weight 400, NOT bold
- Subheadings & body: EB Garamond, regular and italic
- Decorative handwritten accents: Caveat (use sparingly)
- ALL UI text in lowercase (except proper nouns like "Sísí")
- Labels and section headers use letter-spacing 2px, uppercase: e.g. "— TODAY —"

UI PRINCIPLES:
- Cards use border-radius 12px with 0.5px borders (NEVER heavy shadows)
- Buttons are pill-shaped (border-radius 20px), outlined in warm brown or filled mustard gold
- Backgrounds are flat cream — NO gradients, NO mesh, NO noise textures
- Dividers use small dot ornaments: "• — •" or "— SECTION —" with letter-spacing
- Stickers/decorations are small (10-16px), tilted -8° to +15°, placed in corners, never centered
- Sticker glyphs: ✦ ✿ ❀ ★ ◐ ❁

ICONS: minimal, line-only, hand-drawn feel — like vintage book illustrations. Avoid generic iOS icons.

VOICE & COPY: lowercase, italic for affirmations, mature wise-friend tone. No emoji except rare moon 🌙 for night context.

Generate the design system page with: color swatches, type scale, button styles (primary mustard, secondary outline), card components, sticker library, and bottom nav (5 tabs: home, board, timeline, chat, voice).

Frame size: 390x844 (iPhone 14).
```

---

## ② 화면별 prompts (5개)

각 화면 prompt 전에 **"Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile."** 한 줄 붙이면 일관성 유지됨.

---

### 1️⃣ Onboarding — Draw Your Star

```
Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile.

Design an onboarding screen titled "draw your star."

LAYOUT (top to bottom):
- Three small dots ornament (· · ·) at top center, warm brown #6B5648
- Headline: "draw your star." — Fraunces serif, 32pt, deep plum #3D2E25, lowercase, centered
- Italic subtitle: "your first sign. a promise to yourself." — EB Garamond Italic, 14pt, warm brown #6B5648, centered
- Large drawing canvas: 280x280px, centered, cream #F5EFE6 inner with a 0.5px dashed border in mustard gold #D4A82A, border-radius 8px
- Inside canvas: faint placeholder of a 5-point star outline at 25% opacity, mustard gold — suggesting where to draw
- Caption below canvas: "trace with your finger" — EB Garamond Italic, 11pt, warm brown, centered
- Ornament divider: "• — •" in mustard gold
- Primary button at bottom: "continue →" — pill shape, filled mustard gold #D4A82A, deep plum text, EB Garamond Italic 16pt, 200px wide, centered

VIBE: ceremonial, intimate, hushed. Like the first page of a private notebook. Plenty of breathing room (vertical padding 60px+).

Add a tiny rose-colored sticker ✿ tilted -10° in the top-right corner of the canvas frame.
```

---

### 2️⃣ Home Dashboard

```
Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile.

Design the home dashboard for Sísí — a manifestation app.

LAYOUT (top to bottom):
1. GREETING SECTION (top, generous padding):
   - Tiny italic time-of-day label: "tuesday morning ✦" — EB Garamond Italic 12pt, warm brown
   - Big greeting: "hi, jisoo." — Fraunces 28pt, deep plum, lowercase
   - Italic tagline below: "what is meant for you is on its way." — EB Garamond Italic 14pt, warm brown

2. LIVING VISION BOARD CARD (hero, large):
   - Width: 340px, height ~220px, border-radius 12px
   - Background: warm beige #EDE3D3 with 0.5px mustard gold border
   - Inside: a collaged AI-generated dreamscape image (warm tones — peach, dusty rose, sage, gold botanical shapes — like a vintage Tarot card composition)
   - Small italic label at top: "— your living vision board —" mustard gold, letter-spacing 2px
   - Overlay text near bottom of card: "i am safe. i am chosen. i am already her." — EB Garamond Italic 14pt, deep plum, centered
   - Decorative tiny sticker ✦ in top-right corner of card, tilted 15°

3. SECTION LABEL: "— TODAY —" — EB Garamond, 11pt, warm brown, letter-spacing 2px, left-aligned

4. ANGEL MESSAGE CARD:
   - White background, 0.5px soft border, border-radius 10px, padding 16px
   - Tiny label: "ANGEL MESSAGE · 8:14am" — mustard gold, 10pt, letter-spacing 1.5
   - Message: "it's already on its way. you don't have to chase it. — sísí" — EB Garamond Italic 13pt, deep plum
   - Small rose sticker ✿ in top-right corner

5. SECTION LABEL: "— EXPLORE —"

6. 3-CARD ACTION ROW (capture / sísí chat / meditate):
   - Each card 105x100px, white bg, 0.5px border, border-radius 10px
   - Centered icon at top of each (line-drawn, 28px diameter): pencil ✎ in mustard gold / flower ❀ in dusty rose / crescent ◐ in sage green
   - Label below icon: card title in deep plum 12pt + italic subtitle in warm brown 9pt
   - Cards: "capture / a moment", "sísí chat / talk it out", "meditate / 5 min sats"

7. BOTTOM NAV: 5 tabs evenly spaced — home (active, deep plum) ⌂, board ◇, timeline ⌘, chat ❀, voice ◐. Tiny labels in 9pt below each icon. Top border 0.5px.

VIBE: like opening a beloved journal in the morning. Warm, settled, never frantic.
```

---

### 3️⃣ Living Vision Board (full screen)

```
Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile.

Design the full Living Vision Board screen.

LAYOUT:
1. TOP BAR: back arrow ←, center label "— YOUR VISION BOARD —" letter-spacing 2px warm brown 12pt, right menu ⋯
2. Small dash divider below header

3. VISION BOARD FRAME (hero, vintage gallery-frame feel):
   - Width: 350px, height 480px, double-frame look:
     - Outer frame: warm brown 1px border, beige #EDE3D3 fill, border-radius 6px, padding 8px
     - Inner frame: 0.5px dashed mustard gold border, fill #E5D9C5, border-radius 3px
   - Inside: AI-collaged composition with vintage tarot/mystical feel — warm peach circles, dusty rose rectangle, sage organic shape, brown silhouette, a delicate hand-drawn curve sweeping across, tiny botanical pen sketches in corners
   - AFFIRMATION OVERLAY (centered, lower half of board):
     - 280x90 rectangle with cream #F5EFE6 background at 92% opacity, border-radius 4px
     - Small label "— 9:41 AM · MORNING —" in mustard gold 9pt letter-spacing 2 centered
     - Two italic lines: "today is unfolding / exactly as it should." — EB Garamond Italic 14pt, deep plum, centered
   - Small handwritten sticker bottom-left: "— meant for me —" Caveat 10pt dusty rose, tilted -10°
   - Sage flower sticker ❀ bottom-right tilted 8°
   - Mustard star ✦ top-right tilted 15°

4. Caption under board: "— generated may 13 · evolves with you —" warm brown 11pt italic centered

5. ACTION ROW (3 buttons):
   - "↻ regenerate" — pill outline warm brown
   - "+ sticker" — pill outline warm brown
   - "save to camera" — pill filled mustard gold, italic

6. Bottom hint: "— affirmation shifts: morning · midday · night —" — 10pt warm brown italic centered, letter-spacing 1

7. BOTTOM NAV (board tab active)

VIBE: like opening a museum-glass framed dream collage. Reverent, vintage, alive.
```

---

### 4️⃣ Punch Card (Timeline reward system)

```
Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile.

Design the Punch Card screen — Sísí's anti-streak progress system.

LAYOUT:
1. TOP BAR: back ←, "— YOUR JOURNEY —" center, ⋯ right
2. Headline: "punch card." — Fraunces 24pt deep plum lowercase centered
3. Italic subtitle: "every day you show up, sísí punches a star." — EB Garamond Italic 12pt warm brown centered
4. Tiny divider "• — •" mustard gold centered

5. PUNCH CARD COMPONENT (hero — feels like a real vintage paper punch card):
   - 350x260px, border-radius 6px
   - Background: lavender cream #E8E1F0
   - Outer border: 1px warm brown #6B5648
   - Inner dashed border: 0.5px lavender-grey #A89AB8 with dash pattern
   - Top label: "— SÍSÍ × YOU · MAY 2026 —" 9pt warm brown letter-spacing 2.5 centered
   - 6-column × 5-row grid of star slots (30 total):
     - First 12 stars: filled gold ★ #D4A82A (already punched)
     - Star #13: gold ★ with a dashed circle ring around it labeled "today" (currently punching, slight pulse)
     - Remaining 17: outlined ☆ at 40% opacity (unpunched)
   - Bottom label: "13 / 30 punched · no streaks, just showing up" — italic warm brown 11pt centered
   - Rose ✦ sticker top-right corner, tilted 12°

6. SECTION LABEL: "— UNLOCKED & UPCOMING —"

7. REWARD LIST (3 stacked cards):
   - Card 1 (unlocked): white bg, 0.5px gold border. Check ✓ icon mustard gold, "5 punches · soft meditation library", italic subtitle "unlocked may 9" warm brown 10pt.
   - Card 2 (upcoming, close): white bg, 0.5px soft border. Clock ◷ icon warm brown, "15 punches · sísí whisper voice", italic "2 more days — almost there"
   - Card 3 (upcoming, special): cream bg, 0.5px dashed dusty rose border. Flower ✿ icon dusty rose, "30 punches · vintage print, mailed", italic "a real letter from sísí. addressed to you." Right-aligned counter "17 left" in dusty rose

8. BOTTOM NAV (timeline tab active)

VIBE: like flipping open a vintage library card. Tactile, slow, honest. Never gamified or dopamine-bait.
```

---

### 5️⃣ Sísí Chat (Paper Journal Feel)

```
Continue the Sísí design system. Frame: 390x844, iPhone 14 mobile.

Design the Sísí Chat screen — conversation with the user's inner-self friend, styled like a paper journal.

PAPER JOURNAL BACKGROUND:
- Base: warm cream #F5EFE6
- Faint horizontal ruled lines every 40px in #E8DFCB at 80% opacity (like notebook paper)
- A vertical dusty-rose margin line at x=60 from top to bottom of message area, 0.5px, 40% opacity (like a journal's left margin)

LAYOUT:
1. TOP BAR:
   - Back arrow ← left
   - Small circular avatar (28px) center, cream fill, mustard gold 0.5px border, italic "s" centered inside (deep plum)
   - Menu ⋯ right
   - Below header: small label "sísí · here with you" — 11pt warm brown letter-spacing 2 centered

2. DATE STAMP: "— tuesday · may 15 —" mustard gold 10pt centered letter-spacing 1.5

3. MESSAGE THREAD (alternating bubbles):

   SÍSÍ MESSAGE (left-aligned, indented past margin line):
   - Label above: "SÍSÍ ✦ 8:42am" — 11pt warm brown letter-spacing 1.5
   - White bubble, 0.5px soft border, border-radius 14px, padding 14px
   - Text: "hi." (regular) line break "how's your morning so far?" (italic) — EB Garamond 13pt deep plum

   USER MESSAGE (right-aligned, cream-tinted):
   - Label above (right-aligned): "YOU · 8:43am" warm brown 11pt letter-spacing 1.5
   - Bubble: beige #EDE3D3 fill, 0.5px mustard gold border, border-radius 14px
   - Text: "i'm a little anxious about today's meeting. been thinking about it all night."

   SÍSÍ MESSAGE (response — empathy first):
   - White bubble. Italic first half: "all night is a long time to carry something." then regular: "that meeting must feel like it matters a lot."

4. TYPING INDICATOR: "sísí is writing  ·  ·  ·" — italic warm brown 11pt, left-aligned

5. MARGIN STICKERS (in the dusty rose margin column, very small, tilted):
   - ✿ tilted -12° near top message
   - ✦ tilted 8° near middle

6. CUSTOM TYPEWRITER KEYBOARD (bottom 130px):
   - Wrapper background: beige #EDE3D3
   - Input field (top of keyboard zone): white pill, 280x40, 0.5px mustard gold border, italic placeholder "write to sísí…" in muted warm brown
   - Voice button (right of input): 40x40 circle, warm brown 0.5px border, ◎ icon
   - Hint row: "— typing sounds: soft ✓ · keyboard: vintage —" 9pt warm brown italic centered letter-spacing 2
   - Mini key preview row: 10 small key squares (22x22) showing "q w e r t y u i o p" — white fills, soft border, 0.5px
   - Bottom whisper: "tap tap tap · the page hears you" — 9pt muted italic centered

   NO bottom nav on this screen — typing mode hides it.

VIBE: like writing in a leather notebook by candlelight. Quiet, slow, listened to.
```

---

## Bonus: Iteration Prompts

화면 받고 나서 부분 수정하고 싶을 때 쓸 짧은 prompt들:

```
Make all corners softer — 12px border-radius everywhere instead of sharp edges.
```

```
The mustard gold is too saturated. Mute it slightly toward a vintage paper tone — like aged book ink.
```

```
Add more breathing room — increase vertical padding to feel less compressed. The screen should breathe.
```

```
Remove all heavy shadows. Use 0.5px borders only for elevation — flat editorial style.
```

```
The italic subtitles need more weight. Use EB Garamond Italic at 14pt with slightly increased letter-spacing.
```

```
Add 2-3 more vintage stickers (✦ ✿ ❀ ★) tilted at random subtle angles in unexpected corners. Tiny, never larger than 14px.
```

```
The illustration feels too cute / too childish. Make it more editorial — like a 1970s book cover, more shadow nuance, less primary color.
```

---

## How to Use

1. **First-time setup**: Paste Master Brand Prompt → save the result as your "Sísí Design System" page in Figma.
2. **Each screen**: New Figma file or page → paste the relevant screen prompt → review → iterate with bonus prompts.
3. **After AI generation**: manually swap any fonts that didn't load to Fraunces / EB Garamond / Caveat from Google Fonts. Confirm hex colors are exact.
4. **Save components**: button, card, sticker, bubble → make them Figma components for reuse.

---

## Reference Anchors (paste with prompts if AI gets confused)

If Figma AI generates something off-brand, paste this as a clarifier:

```
For visual reference, think:
- Co-Star app (typography, restraint, dark editorial)
- Old Penguin Classics paperback covers
- Joan Didion's notebooks
- A linen-bound astrology journal from 1972
- The opposite of: pastel meditation apps, generic SaaS dashboards, glossy 3D illustrations, infographic flat style.
```

---

*Last updated: 2026-05-15. Use with Sísí Brand Book v1.3 and MVP Spec v3 FINAL.*
