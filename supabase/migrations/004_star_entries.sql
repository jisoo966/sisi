-- Star check-in entries (NOT applied yet — the redesign runs local-only).
-- "Something good" / "A step I took" are rows in `signs` with a type.
-- The same row is shown on the Star's journey and in Moments (no copies).
alter table public.signs
  add column if not exists kind text
  check (kind in ('something_good', 'step_taken'));
