# Sísí — MVP v4 Focused Scope

> **STATUS: FINAL.** Supersedes MVP Spec v3.
> 2026-05-22 · committed direction.
> Cuts scope from 8 features to 4. Optimized for "I feel seen."

---

## North Star

**"I feel seen."**

The product is not the features. The product is the sentence the user thinks after opening Sísí. Everything below serves this.

The real innovation of Sísí is not affirmation generation. Not meditation. Not vision boards. The real innovation is **"AI that remembers and connects the meaning of your life"** — an under-served emotional category.

---

## The Four Tabs (and nothing else)

### 1. HOME (revised — game-like, single focus)

Not a dashboard. Not modules of text. Not a feed.

What opens (top to bottom):
1. Date pill + *"hi, [name]."* + music toggle
2. Subtle landscape silhouette (rolling hills, parchment-toned)
3. **The pet** — fox (locked) — sitting peacefully in landscape, eyes blink, tail occasionally flicks
4. **One card, face-down** + label *"draw today's card ✦"*
5. Quiet hint: *"or tap the fox to speak"*
6. *— your journey —* divider
7. Horizon path with user + pet figures walking, arches passed/ahead, distant star

**One action only on this screen: draw today's card.** Everything else is presence — pet sitting, music optional, journey path silently advancing.

#### Card draw mechanic

A daily ritual. Card flips face-down → face-up with brief animation.

Three card type weights (algorithmic mix):
- **Universal affirmation** (60%) — from voice anchor 10. "*what is meant for you cannot pass you by.*"
- **Memory mirror** (30%) — surfaces a past entry. "*you said this on May 12. it still applies.*"
- **Pattern surface** (10%) — Sísí's noticed pattern as card. "*the word 'soft' has appeared 4 times now.*"

After drawing:
- **Keep ✦** → saves to Profile's *kept cards* collection
- **Let go** → card fades, no record
- **Reflect** → opens brief conversation with pet (= Sísí's voice)

This card draw replaces the old 3-text-module Home. The same content surfaces, but only when the user pulls. Push of patterns is moved to Constellations.

#### Pet conversation

Tap fox → opens Letters tab (same conversation system). Pet's "voice" IS Sísí. Visual representation only — backend is the same Correspondence flow.

#### Where the old Home modules went

- *"Something stayed with me"* → now surfaces inside Memory Mirror cards
- *"Today's Message"* → IS the card itself
- *"Quiet Reminder"* → pet speaks it when tapped (or push notification)
- *"Recent Pattern"* → lives in Constellations tab

This is **strictly more on-brand** because "I feel seen" is delivered through *presence + a single surprising card*, not through *three labeled text rows*.

### 2. COLLECT
The most important tab. Without user data, Sísí cannot make meaning.

Top of screen:

```
What happened today?
```

Six big buttons (entered as easily as posting an Instagram story):
- A Sign
- A Synchronicity
- A Manifestation
- A Dream
- A Thought
- A Memory

Tapping any opens a quick capture sheet. Free text. Optional tag. One tap to save.

### 3. CORRESPONDENCE
Formerly "AI Chat." Renamed because chat suggests transactional. Correspondence suggests ongoing.

No bubbles. No avatars. Letter format only:

```
You
I feel stuck lately.

Sísí
Maybe not stuck.
Maybe waiting.
You mentioned this same feeling three weeks ago.
Back then, you called it uncertainty.
```

Voice rules locked: voice anchor 10 phrases. Italic serif for Sísí, sans for user. No emoji.

### 4. CONSTELLATIONS
The killer feature. The thing no other app does well.

Sísí automatically links across entries: Dream → Thought → Manifestation → Repeated Sign.

```
⭐ Relationship
7 Entries
You mentioned this 4 times.
First appeared: March 3
Most recent: June 10
```

User feels: *"My life is connected. My life has shape. Someone is watching for it with me."*

---

## Soft Reminders (cross-cutting, not a tab)

The soul of Sísí. Lives outside the four tabs. Surfaces inside Home and via gentle push.

Example, 4:23pm:

```
Not a notification.
Just a thought.
You haven't mentioned your painting recently.
How is it?
```

Killer differentiation. No other app does this in a way that doesn't feel like surveillance. The trick: Sísí only surfaces what the user *has already shared*. Sísí remembers; Sísí does not infer.

---

## Removed from MVP

- **Timeline** ❌ — too productivity-coded. Killed entirely.
- **Manifest Tracker** ❌ — same reason.
- **Meditation** → deferred to post-MVP. Beautiful, but not the core innovation.
- **Wallpaper / Affirmation generation** → deferred as a separate tab. May surface occasionally inside Correspondence as a surprise interaction ("A phrase found you. [save as wallpaper?]"). Hidden features feel premium.
- **Angel Messages** → renamed *Messages* / *Arrivals* / *Notes* / *Found Today* and folded into Soft Reminders + Correspondence.

---

## Onboarding (revised — 2 micro-steps, no decisions beyond name + first entry)

Reject every "What's your goal?" framing. Reject every "what kind of user are you?" framing.

Cut to absolute minimum. Each step has exactly ONE decision. Total time target: 30-45 seconds. Zero choice paralysis.

### Step 1 — Sísí's hello + name

```
✦

hi.

i'm sísí. i keep what stays with you.

what should i call you?

[ ___________________ ]

[ → ]
```

User decides: their name. That's all.

### Step 2 — First entry

```
hi, jisoo.

what's on your mind today?

[ ___________________________ ]

[ plant ✦ ]
```

User decides: what to write. Free text, no categorization.

On submit → land on Home with the entry already present as "most recent fragment."

### Deferred to in-app, surfaced by Sísí when she has signal

- **Archive type identity** → Around Day 5-7, after 5+ entries, Sísí surfaces a Soft Reminder: *"you've mentioned signs a few times now. would you like me to watch for them especially?"* — user confirms or defers. Identity is earned by behavior, not declared upfront. This itself is the "I feel seen" moment, executed as product.
- **Future-self letter** → Day 14 Soft Reminder: *"sísí is ready to keep a letter for you. would you like to write to who you'll be in a year?"*
- **Draw your star** → optional Profile action ("draw your sigil") or cut entirely.

### Why this is better than 2-step with archive chooser

- User who has never used Sísí cannot meaningfully pick between *"phrases that found you"* and *"small soft moments"* — they look at the screen and freeze.
- Behavior-revealed archive type is BRAND-DEFINING: it proves Sísí actually pays attention.
- Lower onboarding friction → higher Day 1 → higher chance Sísí has 5+ entries to surface from.
- The "I feel seen" North Star is delivered as a *product mechanic*, not as a tagline.

### Risk acknowledgments

- Sísí needs real entry data to surface archive type intelligently. Cold-start risk: if entries are too varied or too sparse, archive type prompt never fires. Mitigation: at Day 7, fall back to a gentle "what do you find yourself collecting most?" with the 5 options inline.
- Name is the only "decision" on day 1. Some users may skip even that — handle gracefully (Sísí just says "hi, friend" instead).

---

## Visual Direction (Dilliart 02 confirmed, slight color shift)

- Background: Parchment Cream `#F2EBD7`
- Text: Dark Navy `#1F2A44` (aged ink, not warm brown)
- Emphasis: Olive `#6B7549`
- Point accent: Antique Gold `#B89146`
- Card surface: every card feels like a page from an old book
- Typography: Cormorant Garamond italic (Sísí voice) + Inter sans (user voice / body)

---

## The UX Rule That Decides Everything

When designing any screen, ask:

> Does this make the user feel **"AI is analyzing me"** or **"someone remembers me"**?

If analyzing → cut. If remembers → ship.

This is the single test. It supersedes all other heuristics.

---

*v4 committed 2026-05-22. Supersedes v3.*
*Authored from the user's product clarification moment — preserving exact reasoning.*
