# Sísí

> manifest with sísí. what is meant for you is on its way.

**Sísí** is your inner self friend — a manifestation app for people who love manifestation but find most apps too "woo".

🌐 [hellosisi.co](https://hellosisi.co)

## Status

🟢 **Day 0 complete:**
- Brand identity locked
- Landing page live (Lovable)
- Anonymous X builder account
- All planning docs ready (see `/docs`)

🟡 **Day 1 in progress:** MVP build setup

## What we're building

5 core features:
1. **Living Vision Board** — AI-generated + time-based affirmation overlay
2. **Angel Messages** — random friend-style push, goal-matched
3. **Sísí Chat** — AI guidance, mature wise friend voice
4. **Sísí Voice + Meditation Library** — 3 ElevenLabs voices, 5 categories
5. **Goal Timeline** — calendar tracking, no streaks

## Tech stack

- Next.js 14 + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage)
- Anthropic Claude Sonnet 4.6 (text·chat)
- fal.ai Flux Schnell (vision board image)
- ElevenLabs (Sísí voice)
- OneSignal (push) + Resend (email)
- Stripe (subscription)
- Vercel (hosting) + PostHog (analytics)

## Getting started

```bash
# Install dependencies
npm install

# Set up environment variables (see .env.example)
cp .env.example .env.local
# Then fill in your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

All brand + product docs are in `/docs`:
- `Sisi_Brand_Book_v1_3.md` — Brand DNA (locked)
- `Sisi_MVP_Spec_v3_FINAL.md` — Product spec (final)
- `Sisi_MVP_Build_Setup_v2.md` — Tech setup guide
- `Sisi_Voice_Library_v1.md` — Copy assets
- `Manifestation_Language_Research.md` — Goddard wisdom + 50 more affirmations
- `Sisi_User_Interview_Guide.md` — User research

## Pricing model

- **Free**: 1 vision board, 3 angel messages/day, 5 meditations, Sísí Soft voice, 7-day timeline
- **Pro $9.99/month**: Unlimited everything + 3 voices + AI personalized affirmations + full meditation library

## License

Private. © 2026 Sísí.
