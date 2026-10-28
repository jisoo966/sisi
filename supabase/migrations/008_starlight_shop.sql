-- 008 · Starlight becomes spendable: the Map's shop (NOT applied automatically — run when ready)
--
-- Starlight is still gathered by time together (award_starlight, at most 3 a
-- day) and is now spent on the Map. The ledger stays the one source of truth:
--   earning   positive rows (award_starlight)
--   spending  'purchase' rows: amount = −price, source_id = the item
--   gifts     'grant' rows: amount 0, source_id = the item
-- What a person owns is exactly their purchase and grant rows; the balance is
-- the sum of all rows. A purchase is ONE inserted row, so taking the Starlight
-- and giving the item happen together or not at all; (user, type, item) is
-- unique, so a double tap or a retry can never charge twice.
-- Prices live in shop_items (mirroring lib/shopCatalog.ts). The client sends
-- only the item's id; the server reads the price, the balance and ownership.

-- 1 · the ledger accepts spending and gifts
alter table public.starlight_ledger drop constraint if exists starlight_ledger_source_type_check;
alter table public.starlight_ledger add constraint starlight_ledger_source_type_check check (source_type in (
  'picture_it_completed', 'walk_with_it_completed', 'something_good_saved', 'small_step_saved',
  'world_unlocked', 'admin_adjustment', 'purchase', 'grant'));
alter table public.starlight_ledger drop constraint if exists starlight_ledger_amount_check;
alter table public.starlight_ledger add constraint starlight_ledger_amount_check check (
  (source_type = 'purchase' and amount <= 0) or (source_type <> 'purchase' and amount >= 0));

-- 2 · what can be brought along, and its price
create table if not exists public.shop_items (
  id     text primary key,
  kind   text not null check (kind in ('place', 'trees', 'flowers', 'lives')),
  price  integer not null check (price >= 0),
  active boolean not null default true
);
alter table public.shop_items enable row level security;
create policy "shop_items: read" on public.shop_items for select using (true);

insert into public.shop_items (id, kind, price) values
  ('place:bridge-pond',      'place',   15),
  ('place:butterfly-forest', 'place',   25),
  ('trees:teal',             'trees',    6),
  ('trees:willow',           'trees',    6),
  ('trees:forest-big',       'trees',    6),
  ('flowers:pond-reeds',     'flowers',  6),
  ('flowers:forest',         'flowers',  6),
  ('lives:butterflies',      'lives',    0),
  ('lives:fish',             'lives',    4),
  ('lives:bird',             'lives',    6)
on conflict (id) do update set kind = excluded.kind, price = excluded.price;

-- 3 · buy one item: price, balance and ownership checked here, in one transaction
create or replace function public.purchase_item(p_item_id text, p_local_date date)
returns table (item_id text, spent integer, balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_price   integer;
  v_balance integer;
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if abs(p_local_date - (now() at time zone 'utc')::date) > 1 then
    raise exception 'unexpected local date';
  end if;
  select s.price into v_price from shop_items s where s.id = p_item_id and s.active;
  if v_price is null then
    raise exception 'unknown item';
  end if;

  -- one change to a person's Starlight at a time (the same lock as award_starlight)
  perform pg_advisory_xact_lock(hashtext(v_user::text));

  if exists (select 1 from starlight_ledger l
              where l.user_id = v_user and l.source_type in ('purchase', 'grant') and l.source_id = p_item_id) then
    raise exception 'already owned';
  end if;

  select greatest(0, coalesce(sum(l.amount), 0)) into v_balance from starlight_ledger l where l.user_id = v_user;
  if v_balance < v_price then
    raise exception 'insufficient starlight: % more needed', v_price - v_balance;
  end if;

  insert into starlight_ledger (user_id, source_type, source_id, amount, earned_date_local)
  values (v_user, case when v_price > 0 then 'purchase' else 'grant' end, p_item_id, -v_price, p_local_date);

  return query select p_item_id, v_price, v_balance - v_price;
end;
$$;

revoke all on function public.purchase_item(text, date) from public;
grant execute on function public.purchase_item(text, date) to authenticated;

-- 4 · gifts (the onboarding's butterflies): free items only, once
create or replace function public.grant_free_item(p_item_id text, p_local_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not signed in';
  end if;
  if not exists (select 1 from shop_items s where s.id = p_item_id and s.price = 0 and s.active) then
    raise exception 'not a gift';
  end if;
  insert into starlight_ledger (user_id, source_type, source_id, amount, earned_date_local)
  values (v_user, 'grant', p_item_id, 0, p_local_date)
  on conflict (user_id, source_type, source_id) do nothing;
end;
$$;
revoke all on function public.grant_free_item(text, date) from public;
grant execute on function public.grant_free_item(text, date) to authenticated;

-- 5 · the daily maximum counts only what was gathered (never spending or gifts):
--     award_starlight already excludes everything but its four earnable
--     sources from v_today, except that spending must not count — re-create it
--     with the exclusion list made explicit, and without the old Worlds list
--     (places are bought now, nothing opens by itself).
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
  if abs(p_local_date - (now() at time zone 'utc')::date) > 1 then
    raise exception 'unexpected local date';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_user::text));

  select greatest(0, coalesce(sum(s.amount), 0)) into v_before from starlight_ledger s where s.user_id = v_user;

  if exists (select 1 from starlight_ledger s
             where s.user_id = v_user and s.source_type = p_source_type and s.source_id = p_source_id) then
    return query select 0, true, v_before;
    return;
  end if;

  select coalesce(sum(s.amount), 0) into v_today from starlight_ledger s
   where s.user_id = v_user and s.earned_date_local = p_local_date
     and s.source_type not in ('admin_adjustment', 'world_unlocked', 'purchase', 'grant');

  v_amount := greatest(0, least(p_amount, p_daily_max - v_today));
  if v_amount > 0 then
    insert into starlight_ledger (user_id, source_type, source_id, star_id, amount, earned_date_local)
    values (v_user, p_source_type, p_source_id, p_star_id, v_amount, p_local_date)
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  return query select v_amount, false, v_before + v_amount;
end;
$$;

-- 6 · each place's look (which trees, flowers, little lives), per person
create table if not exists public.world_looks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  world_id   text not null,
  look       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, world_id)
);
alter table public.world_looks enable row level security;
create policy "world_looks: own" on public.world_looks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 7 · existing walkers keep everything: every place opened for them, with the
--     decorations those places showed (places were all open for a while, so
--     none is taken back). Once only.
insert into public.starlight_ledger (user_id, source_type, source_id, amount, earned_date_local)
select e.user_id, 'grant', g.item, 0, (now() at time zone 'utc')::date
  from (select distinct user_id from public.starlight_ledger) e
  cross join (values
    ('trees:teal'), ('lives:butterflies'),
    ('place:bridge-pond'), ('trees:willow'), ('flowers:pond-reeds'), ('lives:fish'),
    ('place:butterfly-forest'), ('trees:forest-big'), ('flowers:forest')
  ) as g(item)
on conflict (user_id, source_type, source_id) do nothing;
