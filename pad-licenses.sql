-- HEXIS PAD · κλειδιά άδειας (δοκιμή με διάρκεια που ορίζει ο διαχειριστής, ή μόνιμη)
-- Το κλειδί «κλειδώνει» στην πρώτη συσκευή που το ενεργοποιεί. Η δοκιμή μετράει από την ενεργοποίηση.
-- Ασφαλές να ξανατρέξει. Το τρέχει αυτόματα το GitHub Actions (edge-functions.yml).

create table if not exists public.pad_licenses (
  key           text primary key,                      -- PAD-XXXX-XXXX-XXXX
  kind          text not null default 'demo' check (kind in ('demo','full')),
  days          integer,                               -- demo: διάρκεια από την ενεργοποίηση
  name          text,
  email         text,
  note          text,
  device_id     text,                                  -- δένεται στην πρώτη ενεργοποίηση
  device_model  text,
  created_at    timestamptz not null default now(),
  activated_at  timestamptz,
  expires_at    timestamptz,                           -- null = χωρίς λήξη
  last_seen     timestamptz,
  revoked       boolean not null default false,
  order_id      uuid
);
alter table public.pad_licenses enable row level security;   -- καμία πρόσβαση εκτός από τις συναρτήσεις
-- ώρες χρήσης: λήγει όταν εξαντληθούν οι ώρες (και, αν οριστεί, το αργότερο σε days ημέρες)
alter table public.pad_licenses add column if not exists hours numeric(7,2);
alter table public.pad_licenses drop constraint if exists pad_licenses_kind_check;
alter table public.pad_licenses add constraint pad_licenses_kind_check check (kind in ('demo','hours','full'));

-- είδος για το παραστατικό μηδενικής αξίας (δεν εμφανίζεται σε καταλόγους)
do $$ begin
  if to_regclass('public.hx_products') is not null then
    insert into public.hx_products(sku, app, name_el, name_en, gross_cents, grant_kind, grant_value, recurring, descriptor, active, sort)
    values ('PAD-DEMO', 'pad', 'HEXIS PAD · δοκιμαστική άδεια', 'HEXIS PAD · trial licence', 0, 'pad_key', '{}', null, 'PAD', false, 90),
           ('PAD-FREE', 'pad', 'HEXIS PAD · δωρεάν άδεια',      'HEXIS PAD · free licence',  0, 'pad_key', '{}', null, 'PAD', false, 91)
    on conflict (sku) do update set name_el = excluded.name_el, name_en = excluded.name_en, active = false;
  end if;
end $$;

create or replace function public.pad_new_key() returns text language plpgsql as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; k text; i int;
begin
  loop
    k := 'PAD';
    for i in 1..12 loop
      if (i - 1) % 4 = 0 then k := k || '-'; end if;
      k := k || substr(a, 1 + floor(random() * length(a))::int, 1);
    end loop;
    exit when not exists (select 1 from public.pad_licenses where key = k);
  end loop;
  return k;
end $$;

-- Εφαρμογή: ενεργοποίηση / έλεγχος (καλείται χωρίς λογαριασμό)
create or replace function public.pad_activate(p_key text, p_device text, p_model text default null)
returns json language plpgsql security definer set search_path = public as $$
declare l public.pad_licenses; used numeric; k text := upper(regexp_replace(coalesce(p_key,''), '\s', '', 'g'));
begin
  if length(coalesce(p_device,'')) < 6 then return json_build_object('ok',false,'code','device','msg','Δεν αναγνωρίστηκε η συσκευή'); end if;
  select * into l from pad_licenses where key = k for update;
  if not found then return json_build_object('ok',false,'code','invalid','msg','Ο κωδικός δεν είναι έγκυρος'); end if;
  if l.revoked then return json_build_object('ok',false,'code','revoked','msg','Ο κωδικός ανακλήθηκε'); end if;
  if l.device_id is null then
    update pad_licenses set device_id = p_device, device_model = left(p_model, 80),
      activated_at = coalesce(activated_at, now()),
      expires_at = case when activated_at is not null then expires_at
                        when kind = 'demo' then now() + make_interval(days => coalesce(days, 7))
                        when kind = 'hours' and days is not null then now() + make_interval(days => days)
                        else expires_at end
      where key = k returning * into l;
  elsif l.device_id <> p_device then
    return json_build_object('ok',false,'code','device','msg','Ο κωδικός είναι κλειδωμένος σε άλλη συσκευή');
  end if;
  update pad_licenses set last_seen = now() where key = k;
  select coalesce(sum(minutes),0) into used from pad_sessions where key = k;
  if l.expires_at is not null and l.expires_at <= now() then
    return json_build_object('ok',false,'code','expired','msg','Η άδεια έληξε','expires_at',l.expires_at,'kind',l.kind,'hours',l.hours,'used_min',used);
  end if;
  if l.kind = 'hours' and used >= l.hours * 60 then
    return json_build_object('ok',false,'code','hours_used','msg','Οι ώρες χρήσης τελείωσαν','expires_at',l.expires_at,'kind',l.kind,'hours',l.hours,'used_min',used);
  end if;
  return json_build_object('ok',true,'key',l.key,'kind',l.kind,'name',l.name,'expires_at',l.expires_at,'hours',l.hours,'used_min',used,'server_time',now());
end $$;
revoke all on function public.pad_activate(text,text,text) from public;
grant execute on function public.pad_activate(text,text,text) to anon, authenticated;

-- ── Διαχειριστής ───────────────────────────────────────────────────────────
drop function if exists public.admin_pad_issue(int,text,text,text,text);
create or replace function public.admin_pad_issue(p_days int, p_name text default null, p_email text default null, p_note text default null, p_kind text default 'demo', p_hours numeric default null)
returns json language plpgsql security definer set search_path = public as $$
declare k text := public.pad_new_key(); oid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind not in ('demo','hours','full') then raise exception 'kind'; end if;
  if p_kind = 'demo' and (p_days is null or p_days < 1 or p_days > 3650) then return json_build_object('ok',false,'msg','Βάλε διάρκεια σε ημέρες (1–3650)'); end if;
  if p_kind = 'hours' and (p_hours is null or p_hours <= 0 or p_hours > 10000) then return json_build_object('ok',false,'msg','Βάλε ώρες χρήσης'); end if;
  if p_kind = 'hours' and p_days is not null and (p_days < 1 or p_days > 3650) then return json_build_object('ok',false,'msg','Λάθος ημέρες ισχύος'); end if;
  insert into pad_licenses(key, kind, days, hours, name, email, note)
    values (k, p_kind, case when p_kind <> 'full' then p_days end, case when p_kind = 'hours' then p_hours end,
            nullif(trim(p_name),''), nullif(lower(trim(p_email)),''), nullif(trim(p_note),''));
  -- παραστατικό μηδενικής αξίας (Πληρωμές)
  begin
    insert into hx_orders(user_id, sku, amount_cents, net_cents, vat_cents, customer_email, customer_name, doc_type, source, demo_days, status, fulfill_note, ref, fulfilled_at)
      values (null, case when p_kind = 'full' then 'PAD-FREE' else 'PAD-DEMO' end, 0, 0, 0, nullif(lower(trim(p_email)),''), nullif(trim(p_name),''), 'ΑΠΥ',
              case when p_kind = 'full' then 'free' else 'demo' end, case when p_kind <> 'full' then p_days end, 'fulfilled',
              'HEXIS PAD κλειδί ' || k || case when p_kind = 'hours' then ' · ' || trim(to_char(p_hours, 'FM9990.##')) || ' ώρες χρήσης' else '' end, k, now())
      returning id into oid;
    update pad_licenses set order_id = oid where key = k;
  exception when others then null;
  end;
  return json_build_object('ok',true,'key',k);
end $$;

create or replace function public.admin_pad_list()
returns setof public.pad_licenses language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select * from pad_licenses order by created_at desc;
end $$;

create or replace function public.admin_pad_revoke(p_key text, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update pad_licenses set revoked = p_on where key = p_key;
end $$;

-- +ημέρες: αν έχει ενεργοποιηθεί, παράταση της λήξης (από σήμερα αν έχει ήδη λήξει)· αλλιώς μεγαλύτερη διάρκεια
create or replace function public.admin_pad_extend(p_key text, p_days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update pad_licenses set
    days = case when activated_at is null then coalesce(days,0) + p_days else days end,
    expires_at = case when activated_at is not null and (kind = 'demo' or (kind = 'hours' and expires_at is not null)) then greatest(coalesce(expires_at, now()), now()) + make_interval(days => p_days) else expires_at end
  where key = p_key;
end $$;

-- +ώρες χρήσης
create or replace function public.admin_pad_add_hours(p_key text, p_hours numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update pad_licenses set hours = coalesce(hours,0) + p_hours where key = p_key and kind = 'hours';
end $$;
revoke all on function public.admin_pad_add_hours(text,numeric) from public, anon;
grant execute on function public.admin_pad_add_hours(text,numeric) to authenticated;

-- αποδέσμευση συσκευής (π.χ. άλλαξε κινητό)· η λήξη μένει ίδια
create or replace function public.admin_pad_reset_device(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update pad_licenses set device_id = null, device_model = null,
    activated_at = activated_at
  where key = p_key;
end $$;

revoke all on function public.admin_pad_issue(int,text,text,text,text,numeric), public.admin_pad_list(), public.admin_pad_revoke(text,boolean),
  public.admin_pad_extend(text,int), public.admin_pad_reset_device(text), public.pad_new_key() from public, anon;
grant execute on function public.admin_pad_issue(int,text,text,text,text,numeric), public.admin_pad_list(), public.admin_pad_revoke(text,boolean),
  public.admin_pad_extend(text,int), public.admin_pad_reset_device(text) to authenticated;

-- ── Χρόνος χρήσης: ποιος δουλεύει τώρα και πόση ώρα ─────────────────────────
-- Η εφαρμογή μετρά τη χρήση σε συνεδρίες (όσο είναι ανοιχτή μπροστά) και τις στέλνει
-- κάθε 2 λεπτά όταν υπάρχει ίντερνετ· όσες έγιναν χωρίς ίντερνετ στέλνονται μόλις βρει σύνδεση.
create table if not exists public.pad_sessions (
  id           uuid primary key,
  key          text not null references public.pad_licenses(key) on delete cascade,
  device_id    text,
  started_at   timestamptz not null,
  last_at      timestamptz not null,
  minutes      numeric(9,1) not null default 0,     -- ενεργός χρόνος (εφαρμογή μπροστά)
  receiver     text,
  fix          text,
  points       integer,
  app_ver      text,
  synced_at    timestamptz not null default now()
);
create index if not exists pad_sessions_key on public.pad_sessions(key, last_at desc);
alter table public.pad_sessions enable row level security;

create or replace function public.pad_beat(p_key text, p_device text, p_sessions jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare l public.pad_licenses; s jsonb; n int := 0; used numeric; k text := upper(regexp_replace(coalesce(p_key,''), '\s', '', 'g'));
begin
  select * into l from pad_licenses where key = k;
  if not found or l.revoked or l.device_id is distinct from p_device then
    return json_build_object('ok',false,'code', case when not found then 'invalid' when l.revoked then 'revoked' else 'device' end);
  end if;
  for s in select * from jsonb_array_elements(coalesce(p_sessions,'[]'::jsonb)) loop
    exit when n >= 200;
    insert into pad_sessions(id, key, device_id, started_at, last_at, minutes, receiver, fix, points, app_ver)
    values ((s->>'id')::uuid, k, p_device,
            least((s->>'start')::timestamptz, now()), least(greatest((s->>'end')::timestamptz, (s->>'start')::timestamptz), now()),
            least(greatest(coalesce((s->>'min')::numeric,0),0), 1440), left(s->>'rx',60), left(s->>'fix',12), (s->>'pts')::int, left(s->>'ver',20))
    on conflict (id) do update set last_at = greatest(pad_sessions.last_at, excluded.last_at), minutes = greatest(pad_sessions.minutes, excluded.minutes),
      receiver = coalesce(excluded.receiver, pad_sessions.receiver), fix = excluded.fix, points = coalesce(excluded.points, pad_sessions.points),
      app_ver = excluded.app_ver, synced_at = now()
    where pad_sessions.key = k;
    n := n + 1;
  end loop;
  update pad_licenses set last_seen = now() where key = k;
  select coalesce(sum(minutes),0) into used from pad_sessions where key = k;
  if l.kind = 'hours' and used >= l.hours * 60 then
    return json_build_object('ok',false,'code','hours_used','n',n,'hours',l.hours,'used_min',used,'expires_at',l.expires_at);
  end if;
  return json_build_object('ok',true,'n',n,'kind',l.kind,'expires_at',l.expires_at,'hours',l.hours,'used_min',used,'server_time',now());
end $$;
revoke all on function public.pad_beat(text,text,jsonb) from public;
grant execute on function public.pad_beat(text,text,jsonb) to anon, authenticated;

-- Admin: εικόνα ανά κλειδί
drop function if exists public.admin_pad_overview();
create or replace function public.admin_pad_overview()
returns table(key text, kind text, days int, hours numeric, name text, email text, note text, device_model text, created_at timestamptz,
  activated_at timestamptz, expires_at timestamptz, last_seen timestamptz, revoked boolean,
  online boolean, last_at timestamptz, receiver text, fix text, total_min numeric, today_min numeric, week_min numeric, n_sessions int)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select l.key, l.kind, l.days, l.hours, l.name, l.email, l.note, l.device_model, l.created_at, l.activated_at, l.expires_at, l.last_seen, l.revoked,
    coalesce(x.last_at > now() - interval '5 minutes' and x.synced_at > now() - interval '5 minutes', false),
    x.last_at, x.receiver, x.fix,
    coalesce(a.tot,0), coalesce(a.today,0), coalesce(a.week,0), coalesce(a.n,0)::int
  from pad_licenses l
  left join lateral (select s.last_at, s.synced_at, s.receiver, s.fix from pad_sessions s where s.key = l.key order by s.last_at desc limit 1) x on true
  left join lateral (select sum(s.minutes) tot,
      sum(s.minutes) filter (where s.started_at >= date_trunc('day', now() at time zone 'Europe/Athens') at time zone 'Europe/Athens') today,
      sum(s.minutes) filter (where s.started_at >= now() - interval '7 days') week, count(*) n
    from pad_sessions s where s.key = l.key) a on true
  order by (x.last_at is null), x.last_at desc nulls last, l.created_at desc;
end $$;

create or replace function public.admin_pad_sessions(p_key text, p_limit int default 100)
returns setof public.pad_sessions language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select * from pad_sessions where key = p_key order by started_at desc limit greatest(1, least(p_limit, 500));
end $$;
revoke all on function public.admin_pad_overview(), public.admin_pad_sessions(text,int) from public, anon;
grant execute on function public.admin_pad_overview(), public.admin_pad_sessions(text,int) to authenticated;
