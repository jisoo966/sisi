# Sísí — Project Context for Claude Code

이 파일은 Claude Code가 이 프로젝트에서 시작할 때 자동으로 읽음.

## 🌟 What is Sísí?

**Sísí = your inner self friend.**

A manifestation app for people who love manifestation but find most apps too "woo".
Position: Co-Star aesthetic + warmth + wisdom.

Domain: **hellosisi.co** (live, landing page in Lovable)

Tagline: *"manifest with sísí. what is meant for you is on its way."*

## 📚 Read These First

Before writing any code, read these docs in order:

1. **`docs/Sisi_Brand_Book_v1_3.md`** — Brand DNA, voice rules, visual identity (FINAL)
2. **`docs/Sisi_MVP_Spec_v3_FINAL.md`** — 5 core features + product decisions (FINAL)
3. **`docs/Sisi_MVP_Build_Setup_v2.md`** — Tech stack, DB schema, build sequence
4. **`docs/Sisi_Voice_Library_v1.md`** — 50 copy assets (use throughout app)
5. **`docs/Manifestation_Language_Research.md`** — Neville Goddard depth + 50 more affirmations
6. **`docs/Sisi_User_Interview_Guide.md`** + **`docs/Sisi_Interview_Guide_v1_1_Additions.md`** — User interview reference

## 🎯 5 Core Features (MVP — Day 30-60)

1. **Living Vision Board** — AI-generated image + time-based affirmation overlay
2. **Angel Messages** — Random friend-style push notifications, goal-matched
3. **Sísí Chat** — AI guidance in mature wise friend voice
4. **Sísí Voice + Meditation Library** — 3 voices (ElevenLabs), 5 categories
5. **Goal Timeline** — Calendar tracking, NO streaks

## 🛠️ Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion
- **Backend:** Supabase (Postgres + Auth + Storage)
- **AI:**
  - Anthropic Claude Sonnet 4.6 (text·chat·affirmation)
  - fal.ai Flux Schnell (vision board image)
  - ElevenLabs (3 Sísí voices)
- **Push & Email:** OneSignal + Resend
- **Payment:** Stripe + Customer Portal
- **Hosting:** Vercel
- **Analytics:** PostHog

## 🎨 Brand Quick Reference

### Colors
- Warm Cream `#F5EFE6` (base)
- Deep Plum `#3D2E25` (text)
- Warm Brown `#6B5648` (body)
- Mustard Gold `#D4A82A` (accent)
- Dusty Rose `#C4847C` (accent)
- Dark Brown `#3A302A` (accent)
- Sage Green `#8FA38C` (subtle)

### Typography
- Headline: **Fraunces** (Google Fonts) — vintage book serif
- Body: **EB Garamond** (Google Fonts) — vintage book sans/serif
- Italic: **EB Garamond Italic**
- Handwritten accent: **Caveat** (sparingly)

### Voice Rules
- Always lowercase (except "Sísí")
- NO abbreviations (use "you", not "u")
- NO teen interjections ("yeah", "ok so", "wait", "bestie")
- NO AI/chatbot/assistant words
- NO spiritual influencer cringe ("manifest queen", "high vibe tribe")
- Mature wise friend tone
- Emoji rare (🌙 only for night context)

## 🚀 Day 1 Build Goals (today)

1. Next.js 14 + TS + Tailwind + shadcn/ui setup
2. Supabase connection + DB schema v2 (9 tables, see Build Setup doc Part 3)
3. Magic link authentication
4. Sísí brand landing page at `/`

After Day 1 → Days 2-60 follow build sequence in `docs/Sisi_MVP_Build_Setup_v2.md` Part 6.

## 📁 Folder Structure (target)

```
/app
  /(marketing) — public routes
    page.tsx
    login/
  /(app) — protected routes
    onboarding/
    vision-board/
    capture/
    timeline/
    chat/
    meditations/
    goals/
  /api
    generate-vision-board/
    generate-affirmation/
    chat/
/lib
  /supabase (client.ts, server.ts, middleware.ts)
  anthropic.ts
  falai.ts
  elevenlabs.ts
/components
  /ui (shadcn)
  /sisi (custom)
/docs (Sísí brand + spec docs — DO NOT MODIFY)
```

## 🌱 Working Together

When the user (Jisoo) asks for code:
- Reference Brand Book for any visual/voice decisions
- Use voice library copy for UI text
- Keep code clean and readable (she's a vibe coder)
- Explain in Korean (코드는 영어)
- Ask before making big architectural changes
- Commit often with descriptive messages

When in doubt:
- Brand voice = mature wise friend
- Visual = vintage warm mystical
- Feature priority = MVP Spec v3

---

*Last updated: 2026년 5월 13일*
*Status: Day 0 complete (brand locked, landing live). Day 1 build starting.*
