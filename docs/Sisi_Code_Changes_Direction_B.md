# Sísí — Code Changes for Direction B

> Concrete, file-by-file changes to apply to `soul-seed-manifest` (the Lovable prototype).
> Hand this entire doc to Claude Code as a single prompt, OR work through phase by phase.
> Once merged to Direction B, this becomes the source of truth for the migration to the Next.js `sisi` repo.

---

## Phase A · Visual System (smallest impact, biggest payoff)

### `src/styles.css`

Replace the monochrome palette with brand v2.

**Find:**
```css
--paper: oklch(1 0 0);
--background: oklch(0.995 0 0);
--ink: oklch(0.18 0 0);
--foreground: oklch(0.18 0 0);
--sepia: oklch(0.55 0 0);
--moss: oklch(0.55 0 0);
--sky: oklch(0.55 0 0);
--mustard: oklch(0.55 0 0);
--burgundy: oklch(0.18 0 0);
--border: oklch(0.92 0 0);
```

**Replace with:**
```css
/* Day palette (Home, Collect, Letters, Profile) */
--paper: #F2EBD7;              /* parchment cream */
--background: #F2EBD7;
--ink: #1F2A44;                /* dark navy aged ink */
--foreground: #1F2A44;
--muted: #6B6F84;
--olive: #6B7549;
--gold: #B89146;               /* antique gold */
--oxblood: #7A2E2E;
--pill: #E8DCC9;
--card: #F7F0DD;
--border: rgba(31, 42, 68, 0.18);

/* Night palette (Constellations only — applied via .night class) */
--night-sky: #0B0F1F;
--night-star: #F5EFD8;
--night-gold: #B89146;
--night-olive: #7C8E5C;
--night-text: #F5EFD8;
--night-muted: rgba(245, 239, 216, 0.55);
```

Replace fonts:

**Find:** `--font-serif: "Sentient", ...`
**Replace:** `--font-serif: "Cormorant Garamond", "Times New Roman", serif;`

Then in the Google Fonts `<link>` block in `src/routes/__root.tsx`, swap:
- Remove Sentient
- Add `https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap`

Keep Inter and Caveat as-is.

### Add Constellations-only night theme

In the same `styles.css`, add a `.night` class that overrides the day vars:
```css
.night {
  --paper: var(--night-sky);
  --background: var(--night-sky);
  --ink: var(--night-text);
  --foreground: var(--night-text);
  --muted: var(--night-muted);
  --olive: var(--night-olive);
  --gold: var(--night-gold);
  --border: rgba(245, 239, 216, 0.18);
}
```

Then in `src/routes/constellations.tsx`, wrap the route root in `<div className="night">...</div>` so only that route uses the night palette.

---

## Phase B · Onboarding (cut to 2 micro-steps)

### `src/routes/onboarding.tsx`

**Current state:** 4 steps with name + emotional questions.

**New behavior:** 2 micro-steps only.

#### Step 1 — Sísí's hello + name input

```tsx
<PhoneFrame>
  <div className="flex flex-col items-center justify-center px-8 py-16 min-h-screen">
    <span className="text-2xl text-gold mb-12">✦</span>

    <p className="text-2xl serif italic text-ink mb-2">hi.</p>
    <p className="serif italic text-ink/80 text-base mb-12 text-center">
      i'm sísí. i keep what stays with you.
    </p>

    <label className="small-caps text-xs text-muted mb-2">
      what should i call you?
    </label>
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
      className="bg-transparent border-b border-ink/30 text-center text-lg serif italic py-2 mb-8 focus:outline-none focus:border-gold"
      autoFocus
    />

    <button
      onClick={() => setStep(2)}
      disabled={!name.trim()}
      className="text-lg serif italic text-oxblood disabled:text-muted"
    >
      → 
    </button>
  </div>
</PhoneFrame>
```

#### Step 2 — First entry + plant ✦

```tsx
<PhoneFrame>
  <div className="flex flex-col px-8 py-16 min-h-screen">
    <p className="text-2xl serif italic text-ink mb-8">hi, {name}.</p>

    <label className="small-caps text-xs text-muted mb-3">
      what's on your mind today?
    </label>
    <textarea
      value={entry}
      onChange={(e) => setEntry(e.target.value)}
      rows={6}
      className="bg-transparent border-b border-ink/30 text-base serif text-ink py-2 mb-8 resize-none focus:outline-none focus:border-gold"
      autoFocus
    />

    <button
      onClick={handlePlantAndGoHome}
      disabled={!entry.trim()}
      className="text-lg serif italic text-oxblood disabled:text-muted self-end"
    >
      plant ✦
    </button>
  </div>
</PhoneFrame>
```

`handlePlantAndGoHome` should save the entry to localStorage (later: Supabase) AND save the name, then `navigate({ to: '/' })`.

#### Remove from this file:
- Any "archive type chooser" UI (5 archive type options)
- Any "draw your star" canvas
- Any "future-self letter" prompt
- The 4 emotional questions about returning/hoping/becoming

These are deferred to Soft Reminders triggered later (Day 5-7, Day 14).

---

## Phase C · Home (hybrid: reflection-first + action bottom)

### `src/routes/index.tsx`

**Restructure top-to-bottom:**

```tsx
<PhoneFrame>
  <div className="px-6 py-8">

    {/* Date pill */}
    <div className="cartouche text-xs serif italic text-ink/70 mb-4 self-start">
      {formatDate(today)}
    </div>

    {/* Greeting */}
    <h1 className="text-3xl serif italic text-ink mb-8">
      {greeting}, {name}.
    </h1>

    {/* THE CARD — something stayed with me */}
    <div className="paper-card relative mb-10 px-6 py-8">
      <p className="small-caps text-[10px] text-olive mb-2 text-center">
        — something stayed with me —
      </p>
      <div className="ornament-rule mb-4" />
      <blockquote className="text-lg serif italic text-ink text-center leading-snug">
        "{yesterdayHighlight}"
      </blockquote>
      <p className="text-xs serif italic text-muted text-center mt-4">
        — from yesterday
      </p>
      <Link
        to="/letters"
        className="block text-xs small-caps text-gold text-right mt-2"
      >
        revisit ›
      </Link>
    </div>

    {/* 3 modules — reflection */}
    <Module
      label="TODAY'S MESSAGE"
      body={`"${todayMessage}"`}
      italic
    />
    <Module
      label="QUIET REMINDER"
      body={quietReminder}
      italic
    />
    <Module
      label="RECENT PATTERN"
      body={recentPattern}
      italic
    />

    {/* Bottom CTA */}
    <div className="ink-divider mt-12 mb-6" />
    <Link
      to="/collect"
      className="block text-center text-lg serif italic text-oxblood py-4"
    >
      ✦  plant something today
    </Link>
  </div>
</PhoneFrame>
```

`Module` is a small component:
```tsx
function Module({ label, body, italic }) {
  return (
    <div className="mb-6">
      <p className="small-caps text-[10px] text-muted mb-2">— {label} —</p>
      <p className={`text-base serif text-ink ${italic ? 'italic' : ''}`}>
        {body}
      </p>
    </div>
  );
}
```

**Remove from current home:**
- The "Today's prompt" inline input with Save button (entry happens in Collect now)
- The "Write today's entry" CTA at top (moved to bottom as "plant something today")

---

## Phase D · Collect (text-first, type-optional)

### `src/routes/collect.tsx`

**New behavior:** big text area first, optional type tags below, "plant ✦" CTA.

```tsx
<PhoneFrame>
  <div className="px-6 py-8 min-h-screen flex flex-col">
    <Link to="/" className="text-xs small-caps text-muted mb-8">
      ‹ home
    </Link>

    <h1 className="text-2xl serif italic text-ink mb-2">
      what's on your mind today?
    </h1>

    <textarea
      value={entry}
      onChange={(e) => setEntry(e.target.value)}
      rows={8}
      className="bg-transparent border-b border-ink/30 text-base serif text-ink py-4 mb-8 resize-none focus:outline-none focus:border-gold"
      placeholder="write a line, or a paragraph. whatever fits."
      autoFocus
    />

    {/* Optional type tags */}
    <p className="small-caps text-[10px] text-muted mb-3">
      optionally, mark this as:
    </p>
    <div className="grid grid-cols-3 gap-2 mb-12">
      {ENTRY_TYPES.map((t) => (
        <button
          key={t.id}
          onClick={() => setType(t.id === type ? null : t.id)}
          className={`text-sm serif italic py-2 px-3 border ${
            type === t.id
              ? 'border-gold text-oxblood'
              : 'border-ink/20 text-ink/60'
          } transition-colors`}
        >
          {t.label}
        </button>
      ))}
    </div>

    <button
      onClick={handlePlant}
      disabled={!entry.trim()}
      className="text-lg serif italic text-oxblood disabled:text-muted self-end mt-auto"
    >
      plant ✦
    </button>
  </div>
</PhoneFrame>
```

`ENTRY_TYPES`:
```ts
const ENTRY_TYPES = [
  { id: 'sign', label: 'a sign' },
  { id: 'synchronicity', label: 'a synchronicity' },
  { id: 'wish', label: 'a wish' },
  { id: 'dream', label: 'a dream' },
  { id: 'thought', label: 'a thought' },
  { id: 'memory', label: 'a memory' },
];
```

**Critical:** `type` defaults to `null`. Entry saves whether type is selected or not.

---

## Phase E · Letters (small refinements)

### `src/routes/correspondence.tsx`

Rename internally to "letters" but route stays `/correspondence` if Lovable's link structure depends on it (or rename to `/letters` if safe).

**Voice differentiation by typography:**

```tsx
function Message({ from, text, time }) {
  const isSisi = from === 'sisi';
  return (
    <div className="mb-8">
      <p className="small-caps text-[10px] text-muted mb-2">
        {isSisi ? 'SÍSÍ' : 'YOU'} · {time}
      </p>
      <p
        className={`text-base text-ink leading-relaxed ${
          isSisi
            ? 'serif italic'   // Cormorant italic for Sísí
            : 'sans'           // Inter sans for user
        }`}
      >
        {text}
      </p>
    </div>
  );
}
```

No bubbles. No avatars. Page-like flow.

---

## Phase F · Constellations (the killer — rewrite)

### `src/routes/constellations.tsx`

**This is the biggest single file change.** Wrap everything in `.night` class and render the cosmos scene.

```tsx
export function Constellations() {
  return (
    <PhoneFrame>
      <div className="night min-h-screen relative overflow-hidden">

        {/* Starlight grain */}
        <StarlightGrain />

        {/* Header */}
        <div className="px-6 pt-12 pb-6">
          <p className="cartouche serif italic text-night-text/80 text-xs mb-3 inline-block">
            tonight
          </p>
          <h1 className="text-xl serif italic text-night-text text-center">
            what you've planted.
          </h1>
          <p className="small-caps text-[10px] text-night-gold text-center mt-2">
            {entryCount} wishes · {clusterCount} growing into shape
          </p>
          <div className="ornament-rule mt-3" />
        </div>

        {/* The Moon (Sísí) */}
        <Moon position={{ top: 100, right: 50 }} />

        {/* Constellation clusters */}
        {clusters.map((c) => (
          <ConstellationCluster
            key={c.id}
            cluster={c}
            isActive={c.id === mostActiveId}
          />
        ))}

        {/* User silhouette at horizon */}
        <UserSilhouette planting={hasUnplantedWish} />

        {/* Sísí's observation */}
        <div className="absolute bottom-32 left-6 right-6 text-center">
          <p className="text-base serif italic text-night-text/85">
            "{mostActiveObservation}"
          </p>
        </div>

        {/* Faded nav */}
        <NavFooter active="constellations" theme="night" />
      </div>
    </PhoneFrame>
  );
}
```

Required new components (create in `src/components/cosmos/`):

- `Moon.tsx` — circle 32px fill `var(--night-star)`, halo glow circles at 46/60px opacity 0.04/0.025, tiny italic "s" inside fill `var(--night-sky)` opacity 0.45
- `StarlightGrain.tsx` — randomly positioned tiny dots, 0.45 opacity, fill cream
- `ConstellationCluster.tsx` — props: positions array of stars + connecting threads (gold if active, olive if forming, cream-faded if resting), italic cream label below cluster
- `UserSilhouette.tsx` — small dark figure at bottom center on a curved horizon hill, holding optional luminous wish + dotted gold trail rising

Refer to the SVG I built earlier as a visual reference (saved to `docs/constellations-reference.svg` for handoff).

**Animations to use from existing keyframes:**
- `starTwinkle` on each star (random delay 0-3s)
- `starBirth` on the newest star
- `breathe` on moon halo
- `drift` on starlight grain

---

## Phase G · Profile (Ex Libris bookplate)

### `src/routes/profile.tsx`

Replace whatever's there with:

```tsx
<PhoneFrame>
  <div className="px-6 py-8">
    <Link to="/" className="text-xs small-caps text-muted mb-8 block">
      ‹ home
    </Link>

    {/* Bookplate */}
    <div className="paper-card relative px-8 py-10 mb-10">
      <p className="small-caps text-[10px] text-ink/70 text-center tracking-[3px] mb-3">
        — EX LIBRIS —
      </p>
      <div className="w-12 h-px bg-gold mx-auto mb-6" />
      <p className="text-3xl serif italic text-ink text-center mb-6">
        {name}
      </p>
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="small-caps text-[9px] text-muted mb-1">MEMBER SINCE</p>
          <p className="serif text-ink">{formatJoinedDate(joinedAt)}</p>
        </div>
        <div>
          <p className="small-caps text-[9px] text-muted mb-1">ARCHIVE TYPE</p>
          <p className="serif italic text-ink">{archiveType ?? 'unset'}</p>
        </div>
      </div>

      {/* Wax seal S */}
      <div className="absolute bottom-4 right-4">
        <div className="w-7 h-7 bg-oxblood rounded-full flex items-center justify-center">
          <span className="serif italic text-paper text-sm">S</span>
        </div>
      </div>
    </div>

    {/* Settings list — text-only rows */}
    <SettingsRow label="archive type" value={archiveType ?? 'unset ›'} />
    <SettingsRow label="soft reminders" value="on ›" />
    <SettingsRow label="sísí's voice" value="soft ›" />
    <SettingsRow label="membership" value="trial · 03 days ›" highlight />
    <SettingsRow label="export your archive" value="PDF ›" />
    <SettingsRow label="draw your sigil" value="optional ›" />
  </div>
</PhoneFrame>
```

---

## Phase H · Soft Reminders trigger logic

### `src/lib/sisi-triggers.ts` (new file)

```ts
export function getSoftReminders({
  entries,
  daysSinceJoin,
  archiveType,
  hasWrittenFutureLetter,
}) {
  const reminders = [];

  // Day 5-7: archive type surface
  if (daysSinceJoin >= 5 && !archiveType && entries.length >= 5) {
    const topType = detectMostMentioned(entries);
    reminders.push({
      id: 'archive-type-offer',
      sisiLine: `you've mentioned ${topType} a few times now. would you like me to watch for them especially?`,
      action: { type: 'pick-archive', suggested: topType },
    });
  }

  // Day 14: future-self letter offer
  if (daysSinceJoin >= 14 && !hasWrittenFutureLetter) {
    reminders.push({
      id: 'future-letter-offer',
      sisiLine:
        "sísí is ready to keep a letter for you. would you like to write to who you'll be in a year?",
      action: { type: 'open-future-letter' },
    });
  }

  // Any time: surface a quiet pattern
  const pattern = detectQuietPattern(entries);
  if (pattern) {
    reminders.push({
      id: `pattern-${pattern.entity}`,
      sisiLine: `you haven't mentioned ${pattern.entity} recently. how is it?`,
      action: { type: 'compose', tag: pattern.entity },
    });
  }

  return reminders;
}
```

This becomes a callable from anywhere — Home `Module` for `quietReminder`, push notifications, etc.

---

## Phase I · README + project naming

### `README.md`

Rewrite the README:

```md
# Sísí

> A quiet companion for what you've planted in the universe.

Sísí is an emotional archive. Plant your wishes, signs, dreams, and small soft moments —
sísí keeps them, remembers, and quietly notices when they return.

Not a journal. Not a productivity app. Not an AI assistant.

## North Star
- **Sentence:** "I feel seen."
- **Image:** Your wishes, planted in the universe.

## Stack
- Vite + TanStack Start + React 19 + Tailwind + shadcn/ui (prototype)
- Will migrate to Next.js 14 + Supabase for production at hellosisi.co

## Routes
- `/` — Today
- `/onboarding` — name + first entry (2 micro-steps)
- `/collect` — write an entry (text-first, optional type tag)
- `/correspondence` — letters with sísí
- `/constellations` — the night sky of your planted wishes
- `/profile` — your ex libris bookplate

## Brand
Refer to companion repo `jisoo966/sisi` for full docs:
- Brand Book v2
- MVP v4 Focused Scope
- Voice Library v2
- Merger Plan
```

Replace `<title>` and meta in `index.html` from "Lovable Generated Project" to "Sísí — a quiet emotional archive".

---

## Order of operations (TL;DR for Claude Code)

1. **A first** — palette + fonts (one CSS file edit; biggest visual shift, lowest risk)
2. **B** — onboarding strip to 2 steps (delete code, simpler)
3. **C** — home hybrid restructure
4. **D** — collect text-first
5. **F** — constellations night sky (biggest single component; do last so you can see the full impact)
6. **E, G, H, I** — finish/refine

After this, the soul-seed-manifest prototype matches Direction B. Then we follow the Merger Plan Phase 5 to port into the Next.js `sisi` repo and deploy to hellosisi.co.

---

*Single source of truth for Direction B code changes. Hand to Claude Code as a complete prompt or work phase-by-phase.*
