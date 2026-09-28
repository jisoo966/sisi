-- 004 — ONE canonical saved record for everything the user keeps.
-- NOT APPLIED YET (the redesign runs device-only). Review before running.
--
-- Plan: extend the existing `signs` table into the Moment record instead of
-- creating a new table. Every step is additive or relaxes a constraint;
-- nothing is dropped, and `postcards` is left in place as a backup.
--
--   source  journey_capture | star_check_in | sisi_conversation | sisi_note
--           (older values manual/chat/postcard stay valid and are mapped in
--            the app: manual → star_check_in, chat → sisi_conversation)
--   type    general | something_good | small_step | companion_note
--   star_id optional (a Journey Moment need not belong to a Star)
--
-- Affected app code: lib/momentStore.ts (reads/writes), lib/myStars.ts
-- (Star entries = Moments with a star_id), Moments, Star Full Journey,
-- Journey Capture, Sísí conversation, "A thought for your walk".

BEGIN;

-- 1. Moments may exist without a Star, and without words (photo only).
ALTER TABLE signs ALTER COLUMN star_id DROP NOT NULL;
ALTER TABLE signs ALTER COLUMN text DROP NOT NULL;

-- 2. Deleting a Star must NOT delete its Moments — disconnect them instead.
ALTER TABLE signs DROP CONSTRAINT IF EXISTS signs_star_id_fkey;
ALTER TABLE signs
  ADD CONSTRAINT signs_star_id_fkey FOREIGN KEY (star_id) REFERENCES stars(id) ON DELETE SET NULL;

-- 3. New columns.
ALTER TABLE signs ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE signs ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE signs ADD COLUMN IF NOT EXISTS image_width INTEGER;
ALTER TABLE signs ADD COLUMN IF NOT EXISTS image_height INTEGER;
ALTER TABLE signs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE signs DROP CONSTRAINT IF EXISTS signs_source_check;
ALTER TABLE signs ADD CONSTRAINT signs_source_check CHECK (source IN (
  'journey_capture', 'star_check_in', 'sisi_conversation', 'sisi_note',
  'manual', 'chat', 'postcard'));
ALTER TABLE signs DROP CONSTRAINT IF EXISTS signs_type_check;
ALTER TABLE signs ADD CONSTRAINT signs_type_check CHECK (type IN (
  'general', 'something_good', 'small_step', 'companion_note'));

-- 4. Copy existing postcards in as Journey Moments (once; the postcard id is
--    kept in source_ref so running this again copies nothing twice).
INSERT INTO signs (id, user_id, star_id, text, source, type, image_url,
                   image_width, image_height, source_ref, created_at, updated_at)
SELECT gen_random_uuid(), p.user_id, NULL, p.text, 'journey_capture', 'general',
       p.image_url, p.image_width, p.image_height, p.id,
       COALESCE(p.taken_at, p.created_at), COALESCE(p.taken_at, p.created_at)
FROM postcards p
WHERE NOT EXISTS (SELECT 1 FROM signs s WHERE s.source_ref = p.id);

-- 5. Timeline / archive queries.
CREATE INDEX IF NOT EXISTS signs_user_created_idx ON signs(user_id, created_at DESC);

COMMIT;

-- Rollback notes: postcards are untouched; copied rows have
-- source = 'journey_capture' AND source_ref IS NOT NULL.
