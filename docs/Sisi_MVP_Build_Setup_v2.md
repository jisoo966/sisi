# Sísí — MVP Build Setup v2 (FINAL)

*Updated: 2026년 5월 13일*
*Reflects MVP Spec v3 FINAL (5 features, Sísí Voice, Meditation Library)*

---

## 🎯 What's New in v2

v1 → v2 변경:
- **ElevenLabs API 추가** (Sísí voice, 3개 페르소나)
- **DB schema 확장** (goals, angel_messages, chat, affirmations, meditations)
- **Build sequence 재정렬** (5 core features 기준)
- **Meditation script writing guide 추가**

---

## 🛠️ Part 1 — 계정·도구 셋업 (Day 1, 1-2시간)

### 개발 환경
- [ ] **Cursor Pro** ($20/월) — `cursor.com`
- [ ] **GitHub** (무료) — sisi-app 리포
- [ ] **Node.js 20+** (`nodejs.org`)

### 배포·호스팅
- [ ] **Vercel** (무료 hobby) — Next.js 배포
- [ ] **Namecheap** — hellosisi.co ✓

### 백엔드·데이터베이스
- [ ] **Supabase** (무료 tier) — DB + Auth + Storage

### AI APIs
- [ ] **Anthropic Claude API** — `console.anthropic.com`
- [ ] **fal.ai** — `fal.ai` (Flux Schnell)
- [ ] **ElevenLabs** ← **NEW** — `elevenlabs.io`
  - 무료 tier: 10,000 chars/월 (테스트용)
  - Starter $5/월: 30,000 chars
  - Creator $22/월: 100,000 chars + voice cloning
  - MVP에는 Starter 또는 Creator

### 결제
- [ ] **Stripe** (무료 가입)

### 알림·이메일
- [ ] **OneSignal** (무료 tier) — `onesignal.com`
- [ ] **Resend** (무료 3000/월) — `resend.com`

### 분석
- [ ] **PostHog** (무료 1M 이벤트/월)

### 월 비용 final (MVP)
```
Cursor Pro:     $20
Vercel:         $0
Supabase:       $0
Anthropic:      $5-30 (사용량)
fal.ai:         $5-20
ElevenLabs:     $5-22  ← NEW
OneSignal:      $0
Resend:         $0
PostHog:        $0
─────────────
Total:          $35-92/월

도메인: $15/년 (이미 결제 ✓)
```

---

## 🏗️ Part 2 — 기술 스택 final

### Frontend
- Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui + Framer Motion

### Backend
- Supabase (Postgres + Auth + Storage + Edge Functions)
- Next.js API routes

### AI
- **Anthropic SDK** (`@anthropic-ai/sdk`) — text·chat
- **fal-client** (`@fal-ai/serverless-client`) — image
- **ElevenLabs SDK** (`elevenlabs`) — voice generation

### Push & Email
- OneSignal SDK + Resend SDK

### Payment
- Stripe SDK + Customer Portal

### Hosting
- Vercel auto-deploy

### Analytics
- PostHog SDK

---

## 🗄️ Part 3 — Database Schema (Updated v2)

Supabase 대시보드 → SQL Editor → 그대로 실행:

```sql
-- =============================================
-- Sísí Database Schema v2 (FINAL)
-- =============================================

-- 1. PROFILES
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
  preferred_sisi_voice text default 'sisi_soft',
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. GOALS (manifestation goals + target dates)
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  content text not null,
  category text, -- 'love', 'abundance', 'peace', 'self_worth', 'health', 'career', 'other'
  target_date date,
  intensity text default 'firmly', -- 'gently', 'firmly', 'urgently'
  status text default 'active', -- 'active', 'manifested', 'released'
  created_at timestamptz default now(),
  manifested_at timestamptz
);

-- 3. VISION BOARDS (with time-based overlays)
create table vision_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id),
  prompt text not null,
  image_url text not null,
  storage_path text not null,
  is_active boolean default false,
  affirmation_morning text,
  affirmation_afternoon text,
  affirmation_evening text,
  affirmation_night text,
  created_at timestamptz default now()
);

-- 4. CAPTURES (synchronicity micro-capture)
create table captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id),
  content text not null,
  type text default 'manifested',
  input_method text default 'text',
  created_at timestamptz default now()
);

-- 5. ANGEL MESSAGES (random friend-style noti log)
create table angel_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id),
  message_content text not null,
  source text, -- 'voice_library', 'goddard_research', 'ai_generated'
  sent_at timestamptz default now(),
  opened boolean default false,
  saved boolean default false,
  hearted boolean default false
);

-- 6. CHAT SESSIONS + MESSAGES
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

-- 7. AFFIRMATIONS (AI-generated personalized)
create table affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  goal_id uuid references goals(id),
  text_content text not null,
  audio_url text,
  voice_id text default 'sisi_soft',
  category text,
  play_count integer default 0,
  created_at timestamptz default now(),
  saved boolean default true
);

-- 8. MEDITATIONS (preset library)
create table meditations (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'love', 'abundance', 'peace', 'sleep', 'self_worth'
  title text not null,
  description text,
  duration_seconds integer,
  audio_url text not null,
  voice_id text default 'sisi_soft',
  is_premium boolean default false,
  order_index integer,
  created_at timestamptz default now()
);

-- 9. MEDITATION SESSIONS (user history)
create table meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  meditation_id uuid references meditations(id) not null,
  completed boolean default false,
  duration_listened integer,
  created_at timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security)
-- =============================================
alter table profiles enable row level security;
alter table goals enable row level security;
alter table vision_boards enable row level security;
alter table captures enable row level security;
alter table angel_messages enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table affirmations enable row level security;
alter table meditation_sessions enable row level security;
-- meditations 는 모든 사용자가 read 가능 (RLS 없음)

-- Profiles
create policy "Users view own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- Goals
create policy "Users own goals" on goals for all using (auth.uid() = user_id);

-- Vision boards
create policy "Users own vision_boards" on vision_boards for all using (auth.uid() = user_id);

-- Captures
create policy "Users own captures" on captures for all using (auth.uid() = user_id);

-- Angel messages
create policy "Users own angel_messages" on angel_messages for all using (auth.uid() = user_id);

-- Chat
create policy "Users own chat_sessions" on chat_sessions for all using (auth.uid() = user_id);
create policy "Users own chat_messages" on chat_messages for all 
  using (auth.uid() = (select user_id from chat_sessions where id = session_id));

-- Affirmations
create policy "Users own affirmations" on affirmations for all using (auth.uid() = user_id);

-- Meditations: public read
create policy "Everyone can read meditations" on meditations for select using (true);

-- Meditation sessions
create policy "Users own meditation_sessions" on meditation_sessions for all using (auth.uid() = user_id);

-- =============================================
-- Storage buckets
-- =============================================
insert into storage.buckets (id, name, public) values 
  ('vision-boards', 'vision-boards', true),
  ('audio', 'audio', true); -- affirmations + meditations + voice samples

create policy "Public access to vision-boards" on storage.objects 
  for select using (bucket_id = 'vision-boards');

create policy "Public access to audio" on storage.objects 
  for select using (bucket_id = 'audio');

create policy "Users can upload vision-boards" on storage.objects 
  for insert with check (
    bucket_id = 'vision-boards' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can upload audio" on storage.objects 
  for insert with check (
    bucket_id = 'audio' 
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

---

## 🎤 Part 4 — Sísí Voice Setup (ElevenLabs)

### Sísí 3 voices 생성

ElevenLabs 가입 후:

**1. Sísí Soft (메인)**
- Voice ID: 본인이 ElevenLabs Voice Library에서 선택
- 추천: *Rachel*, *Bella*, *Charlotte* (warm female)
- Settings: stability 0.5, similarity 0.7, style 0.3, speaker boost on
- Voice 이름: *"Sísí Soft"* 으로 본인 라이브러리에 저장

**2. Sísí Whisper**
- 추천: *Domi*, *Glinda* (soft contemplative)
- Settings: stability 0.65, similarity 0.5, style 0.5
- 더 조용·breathy

**3. Sísí Grounded**
- 추천: *Alice*, *Lily* (deeper confident)
- Settings: stability 0.55, similarity 0.7, style 0.2
- 더 deep·confident

### .env.local에 ElevenLabs voice IDs 저장

```env
ELEVENLABS_API_KEY=sk_xxxxx
ELEVENLABS_VOICE_SISI_SOFT=xxxxx
ELEVENLABS_VOICE_SISI_WHISPER=xxxxx
ELEVENLABS_VOICE_SISI_GROUNDED=xxxxx
```

### Cursor prompt for ElevenLabs integration

```
Set up ElevenLabs integration for Sísí voice generation.

1. Install elevenlabs npm package
2. Create /lib/elevenlabs.ts with helper:
   generateVoice(text: string, voiceId: string): Promise<{audioUrl: string}>

The function should:
- Take text and voice ID (sisi_soft, sisi_whisper, sisi_grounded)
- Call ElevenLabs eleven_multilingual_v2 model
- Get audio buffer
- Upload to Supabase Storage at: audio/{user_id}/{uuid}.mp3
- Return signed URL

Add error handling for:
- Rate limits
- API key invalid
- Insufficient character credits

Map voice IDs from env:
- 'sisi_soft' → process.env.ELEVENLABS_VOICE_SISI_SOFT
- 'sisi_whisper' → process.env.ELEVENLABS_VOICE_SISI_WHISPER
- 'sisi_grounded' → process.env.ELEVENLABS_VOICE_SISI_GROUNDED
```

---

## 📜 Part 5 — Meditation Script Writing (Day 45-49)

### Meditation 1개당 구조 (8-15분)

```
[OPENING — 1-2분]
- Settling 메시지
- 호흡 가이드
- Sísí persona 소개 ("It's me, sísí. let's call this in together.")

[CORE — 5-10분]
- Visualization (구체적·감각적·풍부)
- Affirmation reinforcement
- Goddard's "live in the end" 결

[CLOSING — 1-2분]
- Anchor (이 feeling 가지고 일상으로)
- Sísí blessing
- Soft fade
```

### 첫 5개 meditation script (one per category)

본인이 직접 쓰거나, Claude에게 brand voice + research 기반 generate 부탁 가능.

#### Cursor/Claude prompt for meditation script:

```
Write a 10-minute meditation script for Sísí app.

CATEGORY: Love & Connection
TITLE: "Calling in your person"
VOICE: Sísí Soft (warm wise older sister)

REQUIREMENTS:
- Lowercase throughout (except "Sísí")
- Mature warm friend voice (NOT teen)
- Reference Neville Goddard's "live in the end" but accessibly
- 8-10 minutes when read at meditative pace (~120 words/min = 1000-1200 words)
- Structure: opening (settling, ~1 min), core visualization (~7-8 min), 
  closing (anchor, ~1 min)
- Include 3-5 pauses [pause 5s] for breathing
- Reference Sísí brand metaphors: whispers, echoes, field, garden, weather

VOICE STYLE EXAMPLES:
- "soft check-in. how is your inner world today?"
- "the universe is responding."
- "what you call in, you become."
- "feel it as if it has already arrived."

START with: "[soft music fading in] hi love. it's me, sísí."
END with: "[soft music fading out] sleep well, knowing it is on its way. ✨"

Output: the full meditation script.
```

이 prompt로 Claude에게 5개 만들어 달라고 (love·abundance·peace·sleep·self_worth 각 1개).

본인이 검토 + 본인 voice 결로 polish → ElevenLabs에 input.

---

## 🚀 Part 6 — Build Sequence (Day 30-60 Detailed)

### Week 1 (Day 30-37): Core Foundation

**Day 30 (3-4시간):**
- 모든 계정 가입 (Cursor·Supabase·fal.ai·ElevenLabs·etc)
- Cursor에서 Next.js 14 + TypeScript + Tailwind + shadcn/ui 셋업
- Folder structure 설정
- Supabase client 연결

**Day 31 (3시간):**
- DB schema SQL 실행 (위 Part 3 그대로)
- RLS policies + Storage buckets
- Magic link 인증 셋업

**Day 32 (3-4시간):**
- 온보딩 5-step flow:
  1. Welcome
  2. "What are you calling in?" (textarea)
  3. "When do you want this?" (date picker)
  4. Vision board generation (다음 day로)
  5. Reminder times
- Profile 자동 생성

**Day 33 (2-3시간):**
- Goal 생성 page
- target_date, intensity, category 선택
- Goal 활성 상태 관리

**Day 34-35 (5-6시간):**
- fal.ai 연결
- /api/generate-vision-board route
- 4 variations 동시 생성
- 사용자 선택 → is_active=true

**Day 36-37 (4-5시간):**
- Vision board UI (multi-step)
- Image grid + selection
- Download wallpaper
- Time-based affirmation overlay
- Affirmation 4개 (morning·afternoon·evening·night) generation via Claude

### Week 2 (Day 38-44): Communication

**Day 38-39 (5시간):**
- OneSignal SDK 설치
- Push permission flow (온보딩 5번 step과 통합)
- Chat-style notification design (icon + name + message)
- 매일 3회 scheduled push

**Day 40-41 (5-6시간):**
- Angel message system
- Random timing engine (사용자 timezone + waking window 기반)
- Voice Library에서 message 선택 + goal matching logic
- DB log to angel_messages
- Saved·hearted 기능

**Day 42-44 (8-10시간):**
- Sísí Chat UI (iMessage 결)
- Claude Sonnet API integration
- System prompt: Brand Book + Voice Library + Research 통합
- Chat session 저장 + history
- 사용자 context (goals·captures) 참조

### Week 3 (Day 45-51): Voice & Meditation

**Day 45 (3-4시간):**
- ElevenLabs SDK 설치
- 3 Sísí voices 셋업 (위 Part 4)
- /lib/elevenlabs.ts helper

**Day 46-47 (5-6시간):**
- AI Personalized Affirmation API:
  1. User 입력 + goal
  2. Claude로 affirmation script 생성
  3. ElevenLabs로 audio 생성
  4. Supabase Storage upload
  5. DB row insert
- UI: affirmation library + generate button

**Day 48-49 (6-8시간):**
- 5개 meditation script 작성 (Cursor + Claude 도움)
- 본인이 polish + Sísí voice 결로 다듬기
- ElevenLabs로 5개 audio 생성 (각 8-15분 = 약 5000자, ~$3-5)
- Supabase에 upload + meditations table 채우기

**Day 50-51 (4-5시간):**
- Meditation library UI (5 카테고리 + cards)
- Audio playback page (play·pause·seek)
- 사용자 history 트래킹 (meditation_sessions)
- "이번 주 들은 명상" stats

### Week 4 (Day 52-58): Tracking & Polish

**Day 52-53 (5-6시간):**
- Goal Timeline UI
- 달력 grid (today → target_date)
- 매일 user activity heatmap
- Visual intensity (date 가까워질수록 강해짐)
- "this happened!" mark UI

**Day 54-55 (4-5시간):**
- Synchronicity Timeline page
- Captures grouping by week
- AI weekly summary (Claude)
- Empty state + onboarding nudge

**Day 56-57 (5-6시간):**
- Stripe 구독 셋업
- /api/checkout (Stripe checkout session)
- /api/stripe-webhook (subscription 상태 업데이트)
- Premium paywall modal
- Customer Portal 연동

**Day 58 (3-4시간):**
- 모든 페이지 mobile responsive 체크
- Bug fixing
- Performance optimization
- PostHog 이벤트 정리

### Beta Launch (Day 59-60)

**Day 59 (2-3시간):**
- 첫 30-50명 베타 초대 이메일 (Resend)
- Subject: *"sísí is open (just for you, just for now)"*
- 본인 친구·waitlist 첫 30-50명 우선

**Day 60 (4-5시간):**
- PostHog dashboard 설정
- Key metrics 트래킹:
  - 가입 → 첫 vision board (목표: 80%+)
  - 알림 옵트인 (목표: 70%+)
  - Day 1 리텐션 (목표: 60%+)
  - Day 7 리텐션 (목표: 40%+)
  - 첫 캡처까지 평균 시간 (목표: 24시간 이내)
- Feedback 채널 (Telegram·Discord 또는 email)

---

## 🔧 Part 7 — 자주 사용할 Cursor prompts

### 새 기능 추가
```
Add [feature name] to the project.

Requirements: [specific requirements]

Use existing patterns:
- Supabase server client for API routes
- shadcn/ui components for UI
- Sísí brand styling (warm cream #F5EFE6, Fraunces serif, EB Garamond body)
- Mature wise friend voice in all UI copy
- Mobile-first responsive
- Lowercase aesthetic (except "Sísí")
- NO emoji (rare 🌙 only for night context)

Follow existing file structure.
```

### Sísí brand 적용
```
Match this component to Sísí brand:
- Background: warm cream #F5EFE6
- Headings: Fraunces serif (large, deep plum #3D2E25)
- Body: EB Garamond Regular (warm brown #6B5648)
- Accents: mustard gold #D4A82A or dusty rose #C4847C
- Lowercase except "Sísí"
- Generous whitespace
- No cute illustrations, no rainbow
- Vintage book aesthetic
```

### API route 생성
```
Create /app/api/[endpoint]/route.ts as a [METHOD] endpoint.

Authentication: Supabase server client
Rate limiting: [free tier limits, paid tier limits]
Error handling: gentle user-friendly messages in Sísí voice
Return shape: { success: boolean, data?: any, error?: string }
```

### Voice·Audio 생성 (ElevenLabs)
```
Generate Sísí voice audio for this text:
[text content]

Voice: sisi_soft (or sisi_whisper, sisi_grounded)
Save to Supabase Storage: audio/{user_id}/{uuid}.mp3
Insert row to affirmations table.
Return public URL.
```

---

## ⚠️ Part 8 — 자주 막힐 부분

### 1. Supabase RLS 권한 에러
**증상:** *"new row violates row-level security policy"*
**해결:** `auth.uid()` NULL 아닌지. Server client 인증 통과했는지.

### 2. fal.ai 이미지 generation 실패
**해결:** API key·credit·rate limit 확인.

### 3. ElevenLabs character credit 소진
**증상:** *Insufficient credits*
**해결:** Plan upgrade ($5 → $22) 또는 사용량 캐시 (자주 듣는 affirmation은 재생성 X).

### 4. Magic link 안 옴
**해결:** Spam·Supabase Email templates·Resend switch.

### 5. iOS PWA push 제한
**해결:** *Add to Home Screen* 사용자만 push 작동. v2 native에서 해결.

### 6. Audio playback 모바일 issue
**증상:** iOS Safari에서 audio 안 됨
**해결:** User interaction 후 play() 호출. Audio autoplay 정책 우회.

---

## 💡 Part 9 — Cursor + Claude 활용 팁

1. **Cmd+L** = Chat (질문·논의)
2. **Cmd+K** = Inline edit (코드 선택해서 수정)
3. **Composer (Cmd+I)** = Multi-file edit

본인 코드 한 줄도 못 읽어도 OK. Cursor에게 *"이 코드 뭐 하는 거야 한글로 설명해줘"* 라고 매일 묻기.

Git 자주 commit: 매 기능 끝날 때마다.

---

## 📊 Part 10 — Day 1 즉시 시작 체크리스트

### 30분 안에:
- [ ] **Cursor Pro** 구독
- [ ] **Supabase** 가입 + sisi-app 프로젝트 생성
- [ ] **fal.ai** 가입 + API key
- [ ] **ElevenLabs** 가입 + 3 voice 선택·저장
- [ ] **GitHub** 가입 (이미 있으면 skip)
- [ ] **Anthropic API** key

### 1시간 안에:
- [ ] Cursor 열고 sisi-app 폴더 생성
- [ ] Next.js 14 + TS + Tailwind + shadcn 셋업
- [ ] Supabase keys → .env.local
- [ ] DB schema SQL 실행

### 오늘 (3-4시간):
- [ ] Magic link 인증
- [ ] Sísí 브랜드로 기본 landing page
- [ ] `npm run dev` → localhost:3000 → 본인 페이지 작동

**Day 1 끝나면 본인이 *Sísí 빌더 진짜 시작*.**

---

*MVP Build Setup v2 — locked.*
*다음: User Interview Guide v1.1 update*
