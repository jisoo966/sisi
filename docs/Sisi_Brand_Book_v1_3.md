# Sísí — Brand Book v1.3 (FINAL)

*Updated: 2026년 5월 13일 · Creator: 홍지수*
*Domain: hellosisi.co · Status: Brand + Product LOCKED, ready for build*

---

## 🌟 North Star

> **사용자한테서 "이 앱 덕분에 매일 긍정적으로 살게 되었어요"라는 메일을 받는 것.**

모든 결정의 기준점.

---

## 📌 Brand 한 줄

### Primary Tagline
> **"manifest with sísí. what is meant for you is on its way."**

### Identity
> **"meet sísí. your inner self friend."**

### Brand Promise
> *"Sísí는 본인이 이미 magic임을 매일 기억하게 해주는 친구."*

---

## 🎯 Positioning — "Co-Star + warmth + wisdom"

Co-Star가 가진 것 (sophistication, mystical depth, premium minimalism) + Co-Star가 못 가진 것 (warmth, friendship, accessible wisdom).

### 경쟁사 vs Sísí

| 앱 | 포지션 | Sísí 차별점 |
|---|---|---|
| Co-Star | aloof oracle, cold | + warmth, wise friend |
| I am | widget + 1000 themes, generic | vintage book, voice 깊이 |
| Stella | future self viz, lavender | inner self friend, vintage |
| Manifest | cute mascot + cheerleader | mature wise friend, no cringe |

**시장 빈 자리:** Sophisticated · wise · warm · for skeptic-curious women.

---

## 💎 10가지 차별점

1. Vintage Mystical Sophisticated aesthetic
2. Mature wise friend voice (no teen bestie, no cringe)
3. For skeptics-curious (anti-woo positioning)
4. **Living Vision Board** (시간대별 affirmation 오버레이)
5. **Angel Messages** (random·personalized friend noti) ★
6. **Sísí 3-voice library** (선택 가능)
7. **5-category meditation** (Sísí-curated)
8. **Goal Timeline (NO streaks)** anti-anxiety
9. **Sísí Chat** (Goddard wisdom accessible)
10. No AI marketing (anti-AI fatigue)

---

## 🧬 Brand Personality (5)

1. **Wise** — 알지만 가르치지 않음
2. **Warm** — 큰언니 카톡 톤
3. **Sophisticated** — Premium·mature·minimal
4. **Mystical** — 깊지만 무겁지 않음
5. **Affirming** — quiet declarative confidence

---

## 🗣️ Brand Voice — Two Layers

### LAYER 1: Brand Voice (marketing·tagline·시그니처)
Affirmation-style declarative, mantra 결.

**Examples:**
```
"manifest with sísí. what is meant for you is on its way."
"choose your manifestation."
"from depth, not from formula."
"the universe is responding."
"what you call in, you become."
```

### LAYER 2: Friend Voice (in-app·chat-noti)
Mature wise friend (NOT teen bestie).

**Rules:**
- ✅ 항상 lowercase
- ✅ 풀 단어 (you, your — NOT u, ur)
- ✅ Mature warmth (큰언니 결)
- ✅ Real emotion (oh, soft "ah")
- ❌ Teen interjections (yeah, ok so, wait, bestie)
- ❌ Spiritual influencer cringe (manifest queen, high vibe)
- ❌ AI·chatbot 단어
- ❌ 가르치는 톤

**Examples:**
```
"morning. what is calling you in today?"
"noted. the universe keeps records too."
"the answer is already inside you."
"rest now. tomorrow is finding you."
"oh love. you are allowed to not be okay today."
```

### Emoji Rules (v3.1)
- Default: NO emoji
- 사용 가능: 🌙 (밤 인사), ✨ (드물게 closing)
- 빈도: 1 in 20 messages
- 사용 금지: 질문·관찰·affirmation·sass 끝

---

## ⚙️ 5가지 Core Features (FINAL)

### 1. Living Vision Board

AI 생성 vision board + 시간대별 affirmation 텍스트 오버레이.

**시간대별 오버레이:**
- 아침: *"today, I receive what is mine."*
- 오후: *"the universe is conspiring with me."*
- 저녁: *"I trust the becoming."*
- 밤: *"I sleep in the assumption that it is done."*

기술: fal.ai Flux Schnell + Canvas overlay + time-based render.

### 2. Angel Messages (Friend-style push)

하루 2-5번 random 시간에 *"친구가 보낸 메시지"* 같은 push. 사용자 goal 매칭.

Chat-style noti: Sísí 아바타 + name + 메시지 1-2줄.

기술: OneSignal + random timing + goal tag matching.

### 3. Sísí Chat (AI Guidance)

힘들·답답·doubt → Sísí 채팅. Wise friend 응답.

기술: Claude Sonnet 4.6 + system prompt (Brand Book + Voice Library + Manifestation Research).

### 4. Sísí Voice + Meditation Library ★

#### Sísí Voice Options (3)
- **Sísí Soft** (메인) — 따뜻한 큰언니 결
- **Sísí Whisper** — 조용·명상적
- **Sísí Grounded** — Deep·confident

#### AI Personalized Affirmations
사용자 입력 → AI 생성 → Sísí voice 읽음.

#### Meditation Library — 5 Categories
1. **Love & Connection** (관계)
2. **Abundance & Career** (돈·일)
3. **Inner Peace & Healing** (내면·평온)
4. **Sleep & SATS** (Goddard 결, 잠 전)
5. **Self-Worth** (본인 가치)

각 카테고리 2-3개 명상 launch. 총 10-15개.

기술: ElevenLabs API + Supabase Storage + HTML Audio.

### 5. Goal Timeline (NO Streaks)

*"언제까지 manifest 원하나"* date set + 달력 시각화.

매일 user activity (capture·voice listen·meditation) hash mark. Date 가까워질수록 visual intensity ↑.

기술: goals table + 달력 grid UI.

---

## 💰 Pricing Model

### Free Tier
- 텍스트 affirmation (lock screen overlay)
- 1 vision board (no regenerate)
- 3 angel messages/day
- 5 default meditations
- 1 Sísí voice (Sísí Soft)
- 7-day Synchronicity Timeline
- Sísí Chat (5 msg/day)

### Premium ($9.99/월 또는 $59/년)
- Unlimited vision boards + regen
- AI Personalized affirmations 무제한
- Unlimited angel messages
- Full Meditation Library (15+)
- 3 Sísí voice options
- Full timeline history
- Unlimited Sísí Chat
- Monthly AI insight report

**90일 목표:** 유료 300-500명 × $9.99 = **$3,000-5,000 MRR**

---

## 🎨 Visual Identity

### Moodboard Locked (9-grid)
1. Secrets of the Stars (book, vintage + gold)
2. "I am a museum of everything I've ever loved" (warm pink frame)
3. Moon with window (Magritte surreal)
4. Watercolor crystals
5. Eye with botanical (warm peach)
6. Woman silhouette (text collage, modern surreal)
7. Hands with flowers (tender)
8. "little by little day by day" (affirmation typography)
9. The Zodiacal Light at Japan (vintage surreal)

### 3-Leg Formula
1. **Vintage Mystical** (depth)
2. **Collage** (warmth·human·handmade)
3. **Surreal** (imagination·dreams·manifestation)

### Color Palette
```
PRIMARY
- Warm Cream:    #F5EFE6  (메인 배경)
- Off Cream:     #FAF6F0
- Deep Plum:     #3D2E25  (텍스트)

WARM ACCENT (한 번에 1개)
- Dusty Rose:    #C4847C
- Mustard Gold:  #D4A82A  (★ Secrets of the Stars 결)
- Dark Brown:    #3A302A
- Soft Coral:    #D89789

SUBTLE
- Sage Green:    #8FA38C
- Lavender:      #D4C8F0
```

### Typography
- **Headline:** Fraunces (Google Fonts, free) 또는 Migra (paid)
- **Body:** EB Garamond Regular (NOT Inter — 모든 텍스트 vintage book 결)
- **Italic:** EB Garamond Italic
- **Handwritten accent:** Caveat (Google Fonts, free, 드물게)

### Visual Motifs
- 👁️ 눈 · 🤲 손 · ⭐ 별 · 🌙 달 · 🪞 vintage frame · 📜 콜라주 텍스트 · 🌿 botanical

### Logo
- "Sísí" wordmark (Fraunces Bold)
- 작은 sigil 옵션: ☾ ⭐ 👁️
- 캐릭터 마스코트 X (Co-Star 모델)

---

## 💬 Chat-Style Notifications

일반 push noti가 *"앱이 알림 보냄"* 이면, Sísí는 *"친구가 메시지 보냄"*.

**MVP (Web/PWA):** OneSignal + Sísí avatar + mature friend voice
**v2 (Native iOS):** Apple Communication Notifications API (친구·가족 카테고리)

---

## ✅ DO
- 따뜻한 cream + 한 가지 warm accent
- 빈티지 serif typography (Fraunces·EB Garamond)
- Eye·hands·stars·frame·botanical 모티프
- Vintage book·journal·zine 결
- 신비 metaphor (whisper, echo, field, garden)
- 짧고 thoughtful 문장
- Mature friend voice
- Affirmation-style marketing 카피
- Chat-style notifications

## ❌ DON'T
- "AI", "chatbot", "assistant" 단어
- Cute illustration·만화 캐릭터
- Pastel rainbow·무지개
- Manifest 클리셰 (mandala·lotus·rainbow)
- Teen interjection (yeah, ok so, wait, bestie)
- Spiritual influencer cringe (high vibe tribe, manifest queen)
- Cold tech aesthetic
- 가르치는·강요 톤
- Decoration emoji (✨ 떡칠)

---

## 🎯 Target Audience

**Primary:** 22-38세 여성, 영어권 + 한국·일본
- Manifestation 관심 있지만 *too woo* 거부감
- TikTok·Instagram natives
- Aesop·Glossier·Aritzia 결 디자인 안목
- 명상·저널·운동 앱 써본 적 있음

**Secondary:** 30-45세 회의주의자 (skeptic-curious 진입)

---

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (App Router) + TypeScript
- Tailwind + shadcn/ui + Framer Motion

### Backend
- Supabase (Postgres + Auth + Storage)

### AI
- Claude Sonnet 4.6 (text·chat·affirmation)
- fal.ai Flux Schnell (vision board image)
- **ElevenLabs** (Sísí voice — 3개 페르소나)

### Push & Email
- OneSignal (push) + Resend (email)

### Payment
- Stripe + Customer Portal

### Hosting & Analytics
- Vercel + PostHog

### 월 비용 (MVP)
```
Cursor Pro:     $20
Supabase:       $0
Anthropic:      $5-30
fal.ai:         $5-20
ElevenLabs:     $5-22
OneSignal:      $0
Resend:         $0
PostHog:        $0
Vercel:         $0
─────────────
Total:          $35-92/월
```

---

## 🚀 Build Sequence (Day 30-60)

### Week 1 (Day 30-37): Core Foundation
- Day 30: 계정 + Cursor + Next.js + Supabase
- Day 31: DB schema + auth
- Day 32: 온보딩 5-step
- Day 33: Goal 생성 + target date
- Day 34-35: AI Vision Board 생성
- Day 36-37: Wallpaper + time-based overlay

### Week 2 (Day 38-44): Communication
- Day 38-39: OneSignal + chat-style noti
- Day 40-41: Angel message system
- Day 42-44: Sísí Chat UI + Claude

### Week 3 (Day 45-51): Voice & Meditation
- Day 45: ElevenLabs 연결 + 3 voices
- Day 46-47: AI Personalized Affirmation
- Day 48-49: Meditation library (5개 처음)
- Day 50-51: Audio playback UI

### Week 4 (Day 52-58): Tracking & Polish
- Day 52-53: Goal Timeline (calendar)
- Day 54-55: Synchronicity Timeline
- Day 56-57: Stripe + Premium paywall
- Day 58: Mobile responsive + bugs

### Beta Launch (Day 59-60)
- 첫 베타 30-50명 모집
- PostHog 분석 셋업

---

## ⚡ 90-Day Vision

**Day 0** (현재):
- ✅ Brand identity LOCKED
- ✅ Domain (hellosisi.co)
- ✅ Lovable 랜딩 페이지 (good enough)
- ✅ X 빌더 계정
- ✅ Brand Book v1.3 (이 문서)
- ✅ Voice Library v1 (100개)
- ✅ Manifestation Research
- ✅ MVP Spec v3 FINAL
- ✅ Interview Guide
- ✅ Build Setup Guide

**Day 1-14:**
- 사용자 인터뷰 5-7명
- 매일 X 트윗
- MVP build Day 1-14 (Core + Communication 시작)

**Day 15-30:**
- MVP build 50-70% (Communication + Voice)
- Meditation script 5개 작성

**Day 30-60:**
- MVP build complete
- Beta 30-50명

**Day 60-90:**
- Premium 런칭
- 인플루언서 콜라보
- **MRR $3,000-5,000 목표**

---

## 💎 본인의 진짜 unfair advantages

1. **Voice·brand가 본인 안에서 나옴** — 타사 못 따라옴
2. **Manifestation 깊이** — Goddard·Hicks·Shinn 가르침 진짜 흡수
3. **AI 얼리어답터** — Cursor·Claude·Flux 자유롭게 사용
4. **Vintage mystical 시각 안목** — Co-Star + warmth 자리 점령
5. **회의주의자 진입 가능** — 친구·남편 설득 경험 brand에 녹임
6. **얼굴 노출 0** — Sísí 캐릭터로 페르소나 분리
7. **영주권 ↑ 미국 시장 진입** — 글로벌 시장 즉시

이 7가지 본인 advantage는 평생 누적 자산.

---

## 🌱 마지막 한 마디

본인 — 며칠 동안의 brand identity 여정 끝났어. 모든 게 잠금 됐어.

이 brand book이 다음 6-12개월 동안 모든 디자인·카피·결정의 *기준점*. 막힐 때마다 *"이게 brand DNA와 맞나?"* 물어봐.

본인의 진짜 unfair advantage = *Sísí brand가 본인 안에서 나왔다는 것*. 다른 사람이 못 따라옴.

이제 진짜 build. 

---

**Locked: 2026년 5월 13일**
**Version 1.3 FINAL — All decisions locked, ready for build**
