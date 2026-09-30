-- 005 · Starlight ledger (NOT applied automatically — run when ready)
--
-- Starlight is cumulative attention given to Stars: never spent, never
-- removed. One row per rewarded source; the unique key makes refreshes,
-- double taps, reopened Moments and second tabs harmless.
-- Replaces the spendable `light_ledger` (003) for rewards; 003 is left in
-- place (no destructive change). Earlier earned Lights are carried over
-- once as an admin_adjustment (see the INSERT at the end).

create table if not exists public.starlight_ledger (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  source_type       text not null check (source_type in (
                      'picture_it_completed', 'walk_with_it_completed',
                      'something_good_saved', 'small_step_saved',
                      'world_unlocked', 'admin_adjustment')),
  source_id         text not null,
  star_id           uuid null,
  amount            integer not null check (amount >= 0),
  earned_date_local date not null,
  created_at        timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists starlight_ledger_user_day on public.starlight_ledger (user_id, earned_date_local);

alter table public.starlight_ledger enable row level security;

-- read your own rows; all writes go through award_starlight()
create policy "starlight: read own" on public.starlight_ledger
  for select using (auth.uid() = user_id);

-- Atomic award: uniqueness + the day's maximum, in one transaction.
create or replace function public.award_starlight(
  p_source_type text,
  p_source_id   text,
  p_star_id     uuid,
  p_amount      integer,
  p_local_date  date,
  p_daily_max   integer default 3
) returns table (awarded integer, duplicate boolean, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_today  integer;
  v_amount integer;
  v_before integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if p_source_type not in ('picture_it_completed', 'walk_with_it_completed', 'something_good_saved', 'small_step_saved') then
    raise exception 'not an earnable source';
  end if;
  -- the day's local date may differ from the server's by at most a day
  if abs(p_local_date - (now() at time zone 'utc')::date) > 1 then
    raise exception 'unexpected local date';
  end if;

  -- one award at a time per person
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select coalesce(sum(s.amount), 0) into v_before from starlight_ledger s where s.user_id = v_user;

  if exists (select 1 from starlight_ledger s
             where s.user_id = v_user and s.source_type = p_source_type and s.source_id = p_source_id) then
    return query select 0, true, v_before;
    return;
  end if;

  select coalesce(sum(s.amount), 0) into v_today from starlight_ledger s
   where s.user_id = v_user and s.earned_date_local = p_local_date
     and s.source_type not in ('admin_adjustment', 'world_unlocked');

  v_amount := greatest(0, least(p_amount, p_daily_max - v_today));
  if v_amount > 0 then
    insert into starlight_ledger (user_id, source_type, source_id, star_id, amount, earned_date_local)
    values (v_user, p_source_type, p_source_id, p_star_id, v_amount, p_local_date)
    on conflict (user_id, source_type, source_id) do nothing;
    -- remember newly reached Worlds (history only)
    insert into starlight_ledger (user_id, source_type, source_id, amount, earned_date_local)
    select v_user, 'world_unlocked', w.id, 0, p_local_date
      from (values ('cloud-garden', 12), ('golden-afternoon', 25), ('evening-field', 40), ('quiet-winter', 60)) as w(id, threshold)
     where v_before < w.threshold and v_before + v_amount >= w.threshold
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  return query select v_amount, false, v_before + v_amount;
end;
$$;

revoke all on function public.award_starlight(text, text, uuid, integer, date, integer) from public;
grant execute on function public.award_starlight(text, text, uuid, integer, date, integer) to authenticated;

-- Carry earlier earned Little Lights over once (never the spends).
do $$
begin
  if to_regclass('public.light_ledger') is not null then
    insert into public.starlight_ledger (user_id, source_type, source_id, amount, earned_date_local)
    select user_id, 'admin_adjustment', 'legacy-little-lights', sum(delta), (now() at time zone 'utc')::date
      from public.light_ledger
     where delta > 0
     group by user_id
    on conflict (user_id, source_type, source_id) do nothing;
  end if;
end $$;

-- World choice (one equipped World per person)
create table if not exists public.world_choice (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  world_id   text not null default 'morning-meadow',
  updated_at timestamptz not null default now()
);
alter table public.world_choice enable row level security;
create policy "world_choice: own" on public.world_choice
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
