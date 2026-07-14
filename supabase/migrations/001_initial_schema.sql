-- ═════════════════════════════════════════════════════════════════
-- Sísí — Initial Database Schema
-- ═════════════════════════════════════════════════════════════════
--
-- 실행 방법:
--   1. Supabase Dashboard → SQL Editor
--   2. 이 파일 전체 복사해서 붙여넣기
--   3. Run
--
-- 이후 각 테이블에 RLS (Row Level Security) 자동 적용됨
-- ═════════════════════════════════════════════════════════════════


-- ─── Profiles ───────────────────────────────────────────
-- auth.users에서 자동 생성되는 사용자 프로필 확장
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  journey_started_at TIMESTAMPTZ DEFAULT NOW(),
  sisi_voice TEXT DEFAULT 'soft' CHECK (sisi_voice IN ('soft', 'whisper', 'grounded')),
  onboarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ─── Stars (Wishes) ─────────────────────────────────────
-- 소원이자 별. 하늘에 pin됨.
CREATE TABLE IF NOT EXISTS stars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  wish TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('this month', 'this season', 'this year', 'someday')),

  -- 별의 하늘 position (0-100 %)
  x NUMERIC(5,2) NOT NULL,
  y NUMERIC(5,2) NOT NULL,
  size TEXT NOT NULL DEFAULT 'md' CHECK (size IN ('sm', 'md', 'lg')),

  -- 상태 (active → arrived → fulfilled)
  fulfilled_at TIMESTAMPTZ,
  arrival_seen BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stars_user_id_idx ON stars(user_id);
CREATE INDEX IF NOT EXISTS stars_created_at_idx ON stars(created_at DESC);


-- ─── Signs (Star reflections) ───────────────────────────
-- 각 별에 대한 발자국 (journey entries)
CREATE TABLE IF NOT EXISTS signs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  star_id UUID REFERENCES stars ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'chat', 'postcard')),
  source_ref UUID, -- chat_message_id or postcard_id if auto-generated
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS signs_star_id_idx ON signs(star_id);
CREATE INDEX IF NOT EXISTS signs_user_id_idx ON signs(user_id);


-- ─── Postcards (Captured moments) ───────────────────────
-- Journey에서 캡쳐한 순간 (screenshot + text)
CREATE TABLE IF NOT EXISTS postcards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,

  -- 이미지 저장: dataURL은 너무 크니까 Supabase Storage 사용
  image_url TEXT NOT NULL, -- signed URL or public path
  image_width INTEGER,
  image_height INTEGER,

  text TEXT,
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS postcards_user_id_idx ON postcards(user_id);
CREATE INDEX IF NOT EXISTS postcards_created_at_idx ON postcards(created_at DESC);


-- ─── Chat sessions ──────────────────────────────────────
-- 대화 세션 (하루에 하나 or 사용자가 새로 시작할 때)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_last_message_idx ON chat_sessions(last_message_at DESC);


-- ─── Chat messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'sisi')),
  content TEXT NOT NULL,

  -- Sísí가 저장 제안했는지 (자연스러운 marker)
  suggested_save BOOLEAN DEFAULT FALSE,
  save_reason TEXT, -- 'gratitude' | 'intention' | 'insight' | 'special'

  -- 저장됐다면 어느 postcard/sign으로 갔는지
  saved_as_postcard_id UUID REFERENCES postcards ON DELETE SET NULL,
  saved_as_sign_id UUID REFERENCES signs ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);


-- ─── Angel messages (Push notifications) ────────────────
-- Sísí가 사용자에게 보낸 push message 기록
CREATE TABLE IF NOT EXISTS angel_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  related_star_id UUID REFERENCES stars ON DELETE SET NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS angel_messages_user_id_idx ON angel_messages(user_id);
CREATE INDEX IF NOT EXISTS angel_messages_sent_at_idx ON angel_messages(sent_at DESC);


-- ═════════════════════════════════════════════════════════════════
-- Row Level Security (RLS) — 사용자가 자기 데이터만 볼 수 있게
-- ═════════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE postcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE angel_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Stars policies
CREATE POLICY "Users can view own stars" ON stars FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stars" ON stars FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stars" ON stars FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own stars" ON stars FOR DELETE USING (auth.uid() = user_id);

-- Signs policies
CREATE POLICY "Users can view own signs" ON signs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own signs" ON signs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own signs" ON signs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own signs" ON signs FOR DELETE USING (auth.uid() = user_id);

-- Postcards policies
CREATE POLICY "Users can view own postcards" ON postcards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own postcards" ON postcards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own postcards" ON postcards FOR DELETE USING (auth.uid() = user_id);

-- Chat sessions policies
CREATE POLICY "Users can view own sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Chat messages policies (via session's user_id)
CREATE POLICY "Users can view own messages" ON chat_messages FOR SELECT USING (
  session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own messages" ON chat_messages FOR INSERT WITH CHECK (
  session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
);

-- Angel messages policies
CREATE POLICY "Users can view own angel messages" ON angel_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own angel messages" ON angel_messages FOR UPDATE USING (auth.uid() = user_id);


-- ═════════════════════════════════════════════════════════════════
-- Updated timestamp trigger
-- ═════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER stars_updated_at BEFORE UPDATE ON stars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ═════════════════════════════════════════════════════════════════
-- Storage bucket for postcards
-- ═════════════════════════════════════════════════════════════════
-- Supabase Dashboard → Storage → New Bucket:
--   Name: postcards
--   Public: NO
--   File size limit: 500 KB
--   Allowed MIME types: image/jpeg, image/png, image/webp
--
-- 그 다음 아래 policy 실행:

-- CREATE POLICY "Users can upload own postcards"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can view own postcards"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own postcards"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'postcards' AND auth.uid()::text = (storage.foldername(name))[1]);
