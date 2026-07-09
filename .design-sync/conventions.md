## Sísí — building with this design system

These components are pulled directly from the live Sísí app
(`components/sisi/` in the `sisi-app` repo), not a separate published UI
kit. There is no top-level provider or theme wrapper required — every
component here is a plain, self-contained React function. Just import and
render.

### Styling idiom — Tailwind utility classes + CSS custom properties

Everything is styled with Tailwind CSS classes, plus a handful of raw CSS
variables for the brand palette (defined in `styles.css` / `tokens/`).
There is no separate design-token layer to look up — use the Tailwind
color/font families below, or reference the CSS vars directly.

**Brand color families** (Tailwind, e.g. `bg-journey-navy`, `text-gold-mustard`):
- `cream` (`DEFAULT` #F5EFE6, `off` #FAF6F0) — page background
- `plum` (#3D2E25) — primary text
- `brown` (`warm` #6B5648, `dark` #3A302A) — body text / dark accents
- `gold.mustard` (#D4A82A), `rose.dusty` (#C4847C), `rose.coral` (#D89789), `sage` (#8FA38C), `lavender` (#D4C8F0)
- `journey.*` — the newer "Journey" palette used by chat/scene UI: `cream` #F2E5B5, `ice` #B5D5E8, `cobalt` #3B5BB8, `navy` #1F2A44, `oxblood` #7A2E2E, `purple` #B19CD9, `frost` #E8F0F8

Same values are also available as raw CSS vars if you need them outside
Tailwind: `var(--journey-navy)`, `var(--gold-mustard)`, `var(--cream)`, etc.
(see `styles.css`).

**Fonts** (Tailwind font families): `font-fraunces` (headings, vintage
serif), `font-garamond` (body serif), `font-caveat` (handwritten accent,
sparingly), `font-sentient` (brand-v2 headings — always pair with light
weight + `-0.03em` tracking, handled automatically by the `.font-sentient`
class already applied wherever `font-sentient` is used).

Voice/tone for any copy inside these components: lowercase, no
abbreviations, no chatbot language, mature-wise-friend tone — see the
brand guidelines card in this project for the full rule set.

### Where the truth lives

- `styles.css` (root) — the full compiled stylesheet, `@import`s tokens,
  fonts, and component CSS. Read it before hand-writing colors/spacing.
- `guidelines/` — the Sísí brand book (voice, color, type rules).
- Each component's own `.prompt.md` next to its card — usage notes and
  prop shapes pulled from the real `.d.ts`.

### Example — a chat exchange with the wise-friend voice

```jsx
import { ChatBubble, ChoiceButton } from 'sisi-app';

function Example() {
  return (
    <div className="flex flex-col gap-3 bg-cream p-5">
      <ChatBubble from="sisi" text="how are you feeling tonight?" time="9:40 PM" />
      <ChatBubble from="user" text="a little anxious about tomorrow." time="9:41 PM" />
      <div className="flex gap-2">
        <ChoiceButton variant="outline">remind me later</ChoiceButton>
        <ChoiceButton variant="filled">continue</ChoiceButton>
      </div>
    </div>
  );
}
```

### Known gaps

- `BackButton`, `BottomNav`, `FoxLottie` aren't in this bundle — they
  depend on Next.js App Router / a missing dependency. See
  `.design-sync/NOTES.md` in the repo for details.
- `FoxCharacter` only has a real asset for `state="walking"` — other
  states will show a broken image until those assets are added to the app.
