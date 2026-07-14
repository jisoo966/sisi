# Sísí — Merger Plan

> **Goal:** Consolidate `sisi` (Next.js backend) + `soul-seed-manifest` (Lovable UI prototype) into one production codebase. Deploy to hellosisi.co.
> **Authored:** 2026-05-22 · supersedes ad-hoc decisions.

---

## Source repos

- **`jisoo966/sisi`** (Next.js 14 + Supabase) — backend skeleton, Brand v1.3 landing page, all v2/v4 docs. *This is the base.*
- **`jisoo966/soul-seed-manifest`** (Vite + TanStack + Lovable) — working 6-route UI prototype with v4 voice. *This is the code scaffold.*
- **Claude-designed concept** (SVG sketches + brand book v2 + MVP v4 docs) — this is the **product spec**.

## Product decision — Direction B (Claude-depth-heavy)

After comparing UX trade-offs, committed to *Direction B*: lean into Claude version's cosmic/archive depth, not Lovable's daily-journal simplicity.

This means:
- Onboarding is 5 steps (draw star + emotional Qs + archive type chooser + first future-self letter + arrival confirmation), not 4.
- Collect leads with 6 entry-type cards as default (Sign / Synchronicity / Wish / Dream / Thought / Memory), not free text.
- Constellations is dark navy cosmos + moon (Sísí) + small user figure + named star clusters + Sísí's observation. The killer feature.
- Voice is Claude's anchor-10 ("a message arrived for you" / "something has been trying to find you"), not Lovable's "gentle echoes" filler.
- Soft Reminders surface aggressively as Sísí's quiet memory ("you mentioned this once before").
- Positioning category: *Co-Star × The Pattern × Are.na*, NOT *Day One × Stoic × Reflectly*.

Known trade-offs (accepted):
- Day 1 onboarding drop-off may be higher (5 steps vs 4).
- Build cost is +2-3 weeks (Claude API entity extraction, cluster threshold logic, dark cosmos animations).
- Voice quality is the product itself — Claude prompt engineering becomes critical work.

## Final stack (committed)

- Next.js 14 App Router
- TypeScript + Tailwind v3 (stay on v3, don't migrate to v4 yet)
- shadcn/ui (radix-ui primitives)
- Supabase (auth + Postgres + Storage)
- Anthropic Claude API (Correspondence + Constellations analysis)
- Vercel (hosting, custom domain hellosisi.co)
- Framer Motion (animations)

## Final visual identity

**Brand v2 visual (the Claude-version direction) + cosmic Constellations.**

This is what we locked together over the past several days — parchment cream day screens, dark navy cosmos for Constellations. The original inspiration came from a Korean studio's *Brand Direction 02* moodboard (DILLIART SPACE HANNAM proposal page), but the direction is now Sísí's own.

| Day screens (Home, Collect, Letters, Profile) | Constellations only |
|---|---|
| Parchment Cream `#F2EBD7` | Night Sky `#0B0F1F` |
| Dark Navy ink `#1F2A44` | Cream stars `#F5EFD8` |
| Olive `#6B7549` | Gold threads `#B89146` |
| Antique Gold `#B89146` | Olive forming `#7C8E5C` |
| Oxblood `#7A2E2E` (rare emphasis) | |

Fonts: **Cormorant Garamond** (italic serif, headlines + Sísí voice) + **Inter** (sans, body + user voice) + **Caveat** (rare handwritten accent).

---

## Migration phases

### Phase 1 — Lock decisions (1 day)
- [ ] Commit: sisi is base, soul-seed is reference
- [ ] Commit: brand v2 visual (parchment + cosmos) is the direction — NOT soul-seed's monochrome
- [ ] Take screenshots of every soul-seed route — save as visual reference album
- [ ] Save soul-seed's `src/styles.css` and every route TSX file to `docs/soul-seed-reference/` for offline access

### Phase 2 — Voice + Copy migration (1 day)
- [ ] Extract every line of copy from soul-seed routes
- [ ] Save to `docs/Sisi_Voice_Library_v2.md` (new file)
- [ ] Categorize by feature: Home prompts, Collect prompts, Correspondence responses, Constellations observations
- [ ] This survives even if soul-seed disappears or Lovable changes pricing

### Phase 3 — Foundation setup (2 days)
- [ ] Install shadcn/ui in sisi: `npx shadcn@latest init`
- [ ] Install Framer Motion: `npm i framer-motion`
- [ ] Set up Cormorant Garamond + Inter + Caveat from Google Fonts in `app/layout.tsx`
- [ ] Update Tailwind config with v2 color tokens
- [ ] Port soul-seed's custom CSS utilities into `app/globals.css`:
  - `.paper-card` (parchment with soft shadow)
  - `.ink-divider` (1px hairline)
  - `.small-caps` (uppercase + letter-spacing 0.22em + 10-11px)
  - `.cartouche` (pill border)
  - `.ornament-rule` (centered divider with fleuron)
- [ ] Port keyframe animations: breathe, bloom, starFall, starTwinkle, starBirth, drift, descend
- [ ] Update `tailwind.config.ts` extends with v2 palette tokens

### Phase 4 — Component port (2 days)
From soul-seed → sisi:
- [ ] `PhoneFrame.tsx` — keep for dev preview only (production is real mobile)
- [ ] `DottedGlyph.tsx` — port as-is, adapt to lucide-react where needed
- [ ] Build new components matching brand v2:
  - `Pill.tsx` (Today / Morning / Tonight tag, `#E8DCC9` bg)
  - `MoonGlyph.tsx` (the Sísí avatar, with subtle italic "s")
  - `StarGlyph.tsx` (entry star, varying size/glow by activity)
  - `WaxSealS.tsx` (for Profile bookplate)
  - `MarginNote.tsx` (small italic marginalia)

### Phase 5 — Screen migration (5-7 days)
Map each soul-seed route → Next.js App Router:

| Soul-seed route | Next.js route | Visual change |
|---|---|---|
| `src/routes/index.tsx` | `app/(app)/today/page.tsx` | parchment + Cormorant + olive accents |
| `src/routes/onboarding.tsx` | `app/(app)/onboarding/page.tsx` | 5 steps including draw-star + archive-type chooser |
| `src/routes/collect.tsx` | `app/(app)/collect/page.tsx` | "What would you like to send?" + 6 type cards |
| `src/routes/correspondence.tsx` | `app/(app)/letters/page.tsx` | letter format (no bubbles), italic vs sans for voice |
| `src/routes/constellations.tsx` | `app/(app)/constellations/page.tsx` | **DARK NAVY night sky** + moon (Sísí) + small user figure at horizon + star map (from Claude-version) |
| `src/routes/profile.tsx` | `app/(app)/profile/page.tsx` | Ex Libris bookplate + wax seal S |

Bottom nav: text-only, 4 tabs (Today / Collect / Letters / Constellations) + Profile in top-right.

### Phase 6 — Marketing landing page (1-2 days)
- [ ] **DELETE** current `app/page.tsx` (v1.3 "your inner self friend")
- [ ] Build new `app/page.tsx`:
  - Hero: brand v2 blurb ("A quiet companion for what you've planted in the universe")
  - Single feature preview: animated mini Constellations night sky
  - "Begin →" CTA → `/onboarding`
  - Quiet philosophy line: David Benqué quote
  - Footer: small, minimal
- [ ] All v1.3 vocabulary removed (no "manifest with sísí", no "angel messages", no "your inner self friend")

### Phase 7 — Backend + auth wiring (5-7 days)
- [ ] Supabase schema:
  ```sql
  captures (id, user_id, type, content, tags, created_at, extracted_entities, extracted_theme, extracted_feeling)
  constellations (id, user_id, name, sisi_observation, symbol, threshold_rule, first_appeared_at, last_updated_at, entry_count, archived)
  constellation_captures (constellation_id, capture_id, joined_at)
  constellation_evolutions (constellation_id, observation_text, version, created_at)
  profiles (id, name, archive_type, joined_at, voice_preference, trial_ends_at)
  ```
- [ ] RLS policies (each user reads only their own rows)
- [ ] Magic link auth (Supabase already supports)
- [ ] API routes:
  - `POST /api/captures` → save entry + call Claude for entity extraction
  - `GET /api/constellations` → list user's clusters
  - `POST /api/correspondence` → Claude chat completion
  - `POST /api/cron/cluster-check` (Vercel Cron daily) → check for new constellation thresholds
- [ ] Replace soul-seed's localStorage usage with Supabase calls

### Phase 8 — Deploy to hellosisi.co (1 day)
- [ ] Push to GitHub `jisoo966/sisi`
- [ ] Vercel auto-deploys
- [ ] In Vercel: add custom domain `hellosisi.co`
- [ ] Update DNS at domain registrar: CNAME `@` → `cname.vercel-dns.com`
- [ ] Remove or unlink Lovable hosting for hellosisi.co (Settings → Custom Domains)
- [ ] Wait for SSL propagation (~5 min)
- [ ] Verify: hellosisi.co serves the new Next.js app
- [ ] Update README, X bio

## Total estimate

**~20-25 days of focused work** for a vibe coder using Claude Code. Could be compressed to **~12-15 days** if Phase 4/5 done with strong Claude Code prompting.

## What gets thrown away

- Soul-seed's monochrome white visual (replaced by brand v2 parchment + cosmos)
- Soul-seed's TanStack Router setup (replaced by Next.js App Router)
- Soul-seed's Sentient font (replaced by Cormorant Garamond)
- Current sisi v1.3 landing page (replaced by v2 marketing)
- Lovable's hellosisi.co (replaced by Vercel deployment)
- Old MVP Spec v3 5-feature framing (replaced by v4 4-tab scope)

## What survives

- Soul-seed's voice library (extracted to docs)
- Soul-seed's IA (4 tabs + onboarding flow)
- Soul-seed's component structure (PhoneFrame, DottedGlyph as starting points)
- Soul-seed's animation primitives (8 keyframes)
- Sisi's Next.js + Supabase backbone
- Sisi's docs (Brand Book v2, MVP v4, Voice Library v1, etc.)

## Order of operations (TL;DR)

1. Backup soul-seed screens as PNG screenshots + save styles.css to docs
2. Set up shadcn + fonts + tokens in sisi
3. Port components (PhoneFrame, DottedGlyph)
4. Port screens one by one, updating visuals to brand v2 (parchment + cosmos) as you port
5. Update marketing landing
6. Wire backend
7. Deploy to hellosisi.co
8. Take down Lovable

---

*Single source of truth for the merge. Update as decisions evolve.*
