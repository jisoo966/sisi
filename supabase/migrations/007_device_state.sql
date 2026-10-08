-- 007 · Device state backup (NOT applied automatically — run when ready)
--
-- No sign-up needed: the app signs in anonymously (Supabase Anonymous
-- Sign-Ins must be enabled: Dashboard → Authentication → Providers →
-- Anonymous). Everything the person keeps on their phone (Stars, Moments,
-- Starlight, name, settings) is backed up here as one document per person,
-- and restored if the phone's storage is ever empty (reinstall, cleared data).
-- Linking Apple / email later keeps the same user id, so the backup follows.
--
-- Additive only: no existing table is touched.

create table if not exists public.device_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.device_state enable row level security;

create policy "device_state: read own" on public.device_state
  for select using (auth.uid() = user_id);

create policy "device_state: insert own" on public.device_state
  for insert with check (auth.uid() = user_id);

create policy "device_state: update own" on public.device_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
