# Sísí — MVP Feature Spec v3 (FINAL)

*Locked: 2026년 5월 13일*
*Status: All product decisions final. Ready for build.*

---

## 🎯 Product One-liner

**Sísí는 본인의 inner self friend가 본인의 manifestation journey를 동행하는 앱.**

5가지 core mechanism:
1. **Living vision board** — 비전 + 시간대별 affirmation 오버레이
2. **Angel messages** — random·personalized 친구 메시지
3. **Sísí chat** — wise friend로서 상담
4. **Sísí Voice + Meditation Library** — Sísí 목소리·AI 맞춤 affirmation·5 카테고리 명상
5. **Goal Timeline** — 달력 트래킹 (no streaks)

---

## ⚙️ 5가지 Core Features (Final)

### 1. Living Vision Board

**컨셉:** AI 생성 vision board + 시간대별 affirmation 텍스트 오버레이가 자동 변경.

**유저 플로우:**
1. 온보딩: 사용자가 *"내가 manifest 하고 싶은 것"* 묘사 + target date
2. AI가 4개 vision board 이미지 생성 (Sísí 결: vintage warm mystical)
3. 사용자 선택 → 그 이미지 wallpaper로 다운로드
4. 그 이미지 위에 affirmation 텍스트 오버레이 (사용자 goal 기반)
5. **시간대별 변경:**
   - 아침 (6am-12pm): *"today, I receive what is mine."*
   - 오후 (12pm-6pm): *"the universe is conspiring with me."*
   - 저녁 (6pm-10pm): *"I trust the becoming."*
   - 밤 (10pm-6am): *"I sleep in the assumption that it is done."*

**기술:**
- Image gen: fal.ai (Flux Schnell)
- Text overlay: Canvas/SVG 합성 server-side
- Time-based: client-side time check + cached overlays
- Wallpaper download: PNG 9:16 vertical

---

### 2. Angel Messages (Friend-style push)

**컨셉:** 하루 종일 *random* 하게 뜨는 친구 메시지. 사용자 goal과 정확히 매칭. *"이거 신호?"* magic.

**유저 플로우:**
1. 사용자 goal·생활 패턴 학습
2. 매일 2-5번 random 시간에 push (정해진 9am 아님)
3. Chat-style noti 결: Sísí 아바타 + "Sísí" 이름 + 메시지 1-2줄
4. Tap → 메시지 확장, save·heart·chat 가능

**예시:**
- *"the universe is responding to your name today."*
- *"that 'random' thought you had earlier? it was for you."*
- *"a small invitation is on its way."*

**기술:**
- 알림: OneSignal (Web Push) → Apple Communication Notification (v2 native)
- 시간 randomization: 사용자 timezone + waking window (8am-10pm)
- 메시지 source: Voice Library + Manifestation Research + AI (Claude)
- Goal matching: 사용자 active goals와 message tag 매칭

---

### 3. Sísí Chat (AI Guidance)

**컨셉:** 사용자가 힘들거나 답답하거나 doubt 있을 때 → Sísí와 chat.

**유저 플로우:**
1. Angel message tap 또는 dashboard *"chat with Sísí"*
2. Chat UI (iMessage·KakaoTalk 결, Sísí 아바타)
3. 사용자 메시지 입력
4. Sísí 응답:
   - 공감·acknowledgment 첫
   - Goddard·Hicks·Shinn 가르침 기반 reframe (accessible)
   - Actionable small suggestion (affirmation, breath, meditation 추천)
5. Thread 기억 — Sísí가 *"3주 전 비슷한 일"* 참조 가능

**기술:**
- LLM: Claude Sonnet 4.6
- System prompt: Brand Book + Voice Library + Manifestation Research 통합
- Context: 사용자 profile, goals, captures, chat history
- Storage: Supabase, 사용자별 thread

---

### 4. Sísí Voice + Meditation Library ★

**컨셉:** Sísí voice가 affirmation·meditation 읽어줌. 사용자 본인 voice 녹음 X.

#### 4a. Sísí Voice Options (3개)

ElevenLabs로 생성된 3가지 Sísí 페르소나:

- **Sísí Soft** (메인) — 따뜻하고 wise, 큰언니 결
- **Sísí Whisper** — 조용하고 명상적, 잠 전·SATS용
- **Sísí Grounded** — Deep·confident, assertive affirmation용

사용자가 *Settings*에서 본인 결 voice 선택. 무료는 *Sísí Soft* 만, Premium은 3개 다.

#### 4b. AI Personalized Affirmations

사용자 입력 → AI 생성 → Sísí voice 읽기.

**예시:**
- 사용자: *"I want to manifest a creative job that pays well and feels aligned"*
- AI 생성: *"I am a magnet for creative work that nourishes my soul and rewards me generously. The right opportunities are arranging themselves around me. I receive them with ease."*
- Sísí voice (선택된 거)가 읽음
- 저장·재생 옵션 (락스크린 위젯 v2)

#### 4c. Meditation Library — 5 카테고리

각 카테고리에 처음 2-3개 명상 (총 10-15개 launch).

**카테고리:**
1. **Love & Connection**
   - *"Calling in your person"* (10 min)
   - *"Healing past relationships"* (15 min)
   - *"Opening to receive love"* (8 min)

2. **Abundance & Career**
   - *"Receiving financial peace"* (12 min)
   - *"Stepping into your highest work"* (10 min)
   - *"Money flows to me"* (8 min)

3. **Inner Peace & Healing**
   - *"Inner child reunion"* (15 min)
   - *"Soft letting go"* (8 min)
   - *"The stuck moment is the universe waiting"* (10 min)

4. **Sleep & SATS** (Goddard 핵심)
   - *"Sleep in the assumption"* (20 min) ★
   - *"Dream into being"* (10 min)
   - *"Pre-sleep visualization"* (8 min)

5. **Self-Worth**
   - *"Remembering your value"* (10 min)
   - *"You are the source"* (12 min)
   - *"Inner permission"* (8 min)

**기술:**
- Voice generation: ElevenLabs API
- Meditation script: 본인이 작성 → ElevenLabs로 audio
- Storage: Supabase Storage
- Playback: HTML Audio API
- Background music (Phase 2): high-frequency curated tracks

**비용 (월):** ElevenLabs ~$5-22 사용량 따라

---

### 5. Goal Timeline (No Streaks)

**컨셉:** *"언제까지 manifest 원하나"* date set → 달력 시각화.

**유저 플로우:**
1. 새 manifestation 설정 시:
   - 무엇 (text)
   - 언제까지 (date picker)
   - 강도 (1-5 stars 또는 *"gently / firmly / urgently"*)
2. Timeline view:
   - 달력 (today → target date)
   - 매일 user activity (capture·voice listen·meditation 등) hash mark
   - Date 가까워질수록 visual intensity ↑
3. **Manifestation 도착 시:**
   - 사용자가 *"this happened!"* mark
   - Synchronicity Timeline 자동 추가
   - Sísí 축하: *"see? what you called in arrived."*

**왜 streak이 아닌 timeline:**
- Streak = 매일 X 안 하면 깨짐 (압박)
- Timeline = 이 manifestation 향한 journey 시각화 (calming)
- 본인 brand의 *"no streaks"* 포지셔닝 유지

**기술:**
- DB: goals table (id, user_id, content, target_date, intensity, status)
- UI: 달력 grid (Tailwind + date-fns)
- Activity heatmap: 매일 user activity 자동 ping

---

## 💰 Pricing Model (Final)

### Free Tier
- 텍스트 affirmation (lock screen overlay)
- 1 vision board (4 generations, no regenerate)
- 3 angel messages/day
- 5 default meditations
- 1 Sísí voice (Sísí Soft)
- 7-day Synchronicity Timeline history
- Sísí Chat (limit: 5 messages/day)

### Premium Tier ($9.99/월 또는 $59/년)
- Unlimited vision boards + regenerations
- AI Personalized affirmations 무제한
- Unlimited angel messages
- Full Meditation Library (15+, 5 categories)
- 3 Sísí voice options
- Full timeline history
- Unlimited Sísí Chat
- Monthly AI insight report
- (Phase 2) High-frequency 명상 음악

**90일 매출 목표:** 유료 300-500명 × $9.99 = **$3,000-5,000 MRR**

---

## 🛠️ Tech Stack (Final + Updated)

### Frontend
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion

### Backend
- Supabase (Postgres + Auth + Storage)
- Next.js API routes

### AI
- **Anthropic Claude Sonnet 4.6** (text·chat·affirmation generation)
- **fal.ai Flux Schnell** (vision board 이미지)
- **ElevenLabs** (Sísí voice, 3개 페르소나) ← NEW

### Push & Email
- OneSignal (push) + Resend (email)

### Payment
- Stripe + Customer Portal

### Hosting & Analytics
- Vercel + PostHog

### 월 비용 (MVP)
```
Cursor Pro:        $20
Supabase:          $0
Anthropic:         ~$5-30
fal.ai:            ~$5-20
ElevenLabs:        ~$5-22  ← NEW
OneSignal:         $0
Resend:            $0
PostHog:           $0
Vercel:            $0
─────────────────
Total:             ~$35-92/월
```

---

## 🗄️ Database Schema (Updated)

```sql
-- Profiles (기존)
create table profiles (
  id uuid references auth.users primary key,
  email text unique,
  display_name text,
  timezone text default 'America/Los_Angeles',
  reminder_times text[] default array['08:00', '14:00', '21:00'],
  notification_token text,
  subscription_status text default 'free',
  subscription_id text,
  inner_self_description text,
  preferred_sisi_voice text default 'sisi_soft', -- NEW: 'sisi_soft', 'sisi_whisper', 'sisi_grounded'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals (사용자 manifestation goals)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  content text not null,
  target_date date,
  intensity text default 'firmly', -- 'gently', 'firmly', 'urgently'
  status text default 'active', -- 'active', 'manifested', 'released'
  created_at timestamptz default now(),
  manifested_at timestamptz
);

-- Vision boards (기존 + 업데이트)
create table vision_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id), -- NEW: 연결된 goal
  prompt text not null,
  image_url text not null,
  storage_path text not null,
  is_active boolean default false,
  -- 시간대별 affirmation 오버레이
  affirmation_morning text,
  affirmation_afternoon text,
  affirmation_evening text,
  affirmation_night text,
  created_at timestamptz default now()
);

-- Captures (synchronicity micro-capture)
create table captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id), -- 연결된 goal (옵션)
  content text not null,
  type text default 'manifested',
  input_method text default 'text',
  created_at timestamptz default now()
);

-- Angel messages log
create table angel_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id), -- which goal it's tied to
  message_content text not null,
  source text, -- 'voice_library', 'goddard_research', 'ai_generated'
  sent_at timestamptz default now(),
  opened boolean default false,
  saved boolean default false,
  hearted boolean default false
);

-- Chat sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  title text,
  created_at timestamptz default now(),
  last_message_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) not null,
  role text not null, -- 'user', 'sisi'
  content text not null,
  created_at timestamptz default now()
);

-- AI-generated personalized affirmations
create table affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id),
  text_content text not null,
  audio_url text, -- ElevenLabs generated audio
  voice_id text, -- which Sísí voice (sisi_soft, sisi_whisper, sisi_grounded)
  category text, -- 'love', 'abundance', 'peace', 'sleep', 'self_worth'
  created_at timestamptz default now(),
  saved boolean default true
);

-- Meditation library (preset)
create table meditations (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'love', 'abundance', 'peace', 'sleep', 'self_worth'
  title text not null,
  description text,
  duration_seconds integer,
  audio_url text not null, -- ElevenLabs generated
  voice_id text default 'sisi_soft',
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- User meditation history
create table meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  meditation_id uuid references meditations(id) not null,
  completed boolean default false,
  duration_listened integer, -- seconds
  created_at timestamptz default now()
);
```

RLS policies + Storage buckets (vision-boards, audio) — 이전 doc 참조.

---

## 🚀 Build Sequence (Day 30-60 MVP)

### Week 1 (Day 30-37): Core Foundation
- Day 30: 계정 셋업 + Cursor + Next.js + Supabase
- Day 31: DB schema 실행 + auth
- Day 32: 온보딩 flow (5 steps)
- Day 33: Goal 생성 + target date
- Day 34-35: AI Vision Board 생성 (Flux + 4 variations)
- Day 36-37: Vision board download + time-based affirmation overlay logic

### Week 2 (Day 38-44): Communication
- Day 38-39: OneSignal 셋업 + chat-style noti
- Day 40-41: Angel message system (random timing + goal matching)
- Day 42-44: Sísí Chat UI + Claude API integration

### Week 3 (Day 45-51): Voice & Meditation
- Day 45: ElevenLabs 연결 + 3 Sísí voices 생성
- Day 46-47: AI Personalized Affirmation generation + voice
- Day 48-49: Meditation library — 처음 5개 작성·녹음 (각 카테고리 1개씩)
- Day 50-51: Audio playback UI + library navigation

### Week 4 (Day 52-58): Tracking & Polish
- Day 52-53: Goal Timeline (calendar UI)
- Day 54-55: Synchronicity Timeline (capture grouping)
- Day 56-57: Stripe + Premium 구독 paywall
- Day 58: Mobile responsiveness + bug fixes

### Beta Launch (Day 59-60)
- Day 59: 첫 베타 사용자 30-50명 모집
- Day 60: PostHog 분석 셋업 + feedback loop

---

## 🎁 향후 추가 가능 (Phase 2 & 3)

### Phase 2 (Day 60-75)
- High-frequency 명상 음악 library (본인 큐레이션)
- Personalized challenges (Manifest 결, 본인 brand로 modify)
- Breathwork 보조 (4-7-8 breath)
- Community synchronicity stats (옵션)
- Mood tracking

### Phase 3 (Day 75-90+)
- Native iOS 앱 (React Native)
- 진짜 락스크린 위젯
- Self-record 기능 (요청 있으면)
- Voice cloning (future self speaking)
- Activity heatmap calendar

---

## 🎯 Final unfair advantages (Sísí MVP v3)

1. **Vintage mystical aesthetic** (시각적 차별)
2. **Mature wise friend voice** (cringy 0)
3. **Living vision board with time overlay** (unique)
4. **Angel message system** (random·personalized magic) ★
5. **Sísí 3-voice options** (사용자 결 선택)
6. **AI personalized affirmations + voice** (Stella·I am의 진화)
7. **5-category meditation library** (Sísí 결로 curated)
8. **Goal timeline (no streaks)** (anti-anxiety)
9. **Sísí chat (Goddard wisdom + accessible)** 
10. **No AI marketing** (anti-AI fatigue)

---

## 📋 본인이 final로 답해야 할 결정 (0개 — 끝!)

이 spec에 빠진 거 있어? 또는 추가하고 싶은 거?

없으면 **이게 진짜 final.** 

다음 단계:
1. Brand Book v1.3 update (이 spec 통합)
2. MVP_Build_Setup.md update (새 DB schema·priorities)
3. User Interview Guide update (voice·meditation·angel msg 검증 추가)
4. **MVP Day 1 빌드 시작** — Cursor 열기

---

*MVP Spec v3 FINAL — locked.*
*Build start: 본인 다음 메시지로 결정.*
