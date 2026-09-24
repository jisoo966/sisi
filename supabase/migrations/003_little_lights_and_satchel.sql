-- 003 — Little Lights (the one reward) + satchel (optional customization)
--
-- light_ledger: +1 per meaningful Star practice, negative when a Light is
--   spent in the satchel drawer. Balance = SUM(delta). No XP, levels,
--   streaks, expiry or penalties — just this ledger.
-- satchel_items: what the user owns / has equipped (SiSi · Trail · World).

CREATE TABLE IF NOT EXISTS light_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  delta INTEGER NOT NULL,
  kind TEXT NOT NULL,              -- write | see | walk | talk | step | evening | spend
  star_id UUID REFERENCES stars ON DELETE SET NULL,
  item_id TEXT,                    -- set when kind = 'spend'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS light_ledger_user_idx ON light_ledger(user_id, created_at DESC);

ALTER TABLE light_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own lights" ON light_ledger;
CREATE POLICY "own lights" ON light_ledger
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS satchel_items (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sisi', 'trail', 'world')),
  equipped BOOLEAN NOT NULL DEFAULT FALSE,
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

ALTER TABLE satchel_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own satchel" ON satchel_items;
CREATE POLICY "own satchel" ON satchel_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
