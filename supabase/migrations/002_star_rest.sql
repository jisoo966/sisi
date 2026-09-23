-- 002 — "Let this Star rest"
-- A resting star leaves the Star path (Journey → Star World) but stays in
-- Moments, and can return to the sky at any time (rested_at → NULL).
-- Additive and backward compatible: older app code ignores the column.

ALTER TABLE stars ADD COLUMN IF NOT EXISTS rested_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS stars_rested_at_idx ON stars(user_id, rested_at);
