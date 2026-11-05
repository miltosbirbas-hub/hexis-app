-- ============================================================
-- HEXIS GEOmetry — δύο βαθμίδες (Basic / Pro) και κλειδιά Pro
--
-- Basic (module «syntetagmenes»)     : 35€ / έτος + ΦΠΑ  — συντεταγμένες, εξαγωγές, ΚΑΕΚ, χάρτης
-- Pro   (module «syntetagmenes_pro») : 190€ / έτος + ΦΠΑ — + Τοπογραφικό διάγραμμα και ΔΓΜ
--
-- Ο κώδικας του Pro ΔΕΝ βρίσκεται στη σελίδα: τον δίνει η Edge Function «geo-pro»
-- μόνο σε λογαριασμό με ενεργό «syntetagmenes_pro».
-- Κλειδιά Pro: GEO-XXXX-XXXX-XXXX · εξαργυρώνονται μία φορά από λογαριασμό HEXIS.
-- Τρέχει ΜΕΤΑ το hexis-payments.sql. Ξανατρέχει με ασφάλεια.
-- ============================================================

-- ---------- Κατάλογος (τιμές με ΦΠΑ 24% σε λεπτά) ----------
insert into public.hx_products(sku, app, name_el, name_en, gross_cents, grant_kind, grant_value, recurring, descriptor, sort) values
 ('HX-GEOM-1Y',     'syntetagmenes', 'HEXIS GEOmetry Basic · άδεια 1 έτους', 'HEXIS GEOmetry Basic · 1-year licence', 4340,  'module_year', '{"module":"syntetagmenes","months":12}',     null, 'GEOMETRY', 140),
 ('HX-GEOM-PRO-1Y', 'syntetagmenes', 'HEXIS GEOmetry Pro · άδεια 1 έτους',   'HEXIS GEOmetry Pro · 1-year licence',   23560, 'module_year', '{"module":"syntetagmenes_pro","months":12}', null, 'GEOMPRO',  141)
on conflict (sku) do update set name_el = excluded.name_el, name_en = excluded.name_en, gross_cents = excluded.gross_cents,
  grant_kind = excluded.grant_kind, grant_value = excluded.grant_value, recurring = excluded.recurring, descriptor = excluded.descriptor, sort = excluded.sort;

-- ---------- Κλειδιά Pro ----------
create table if not exists public.geo_keys (
  key          text primary key,                 -- GEO-XXXX-XXXX-XXXX
  months       integer not null default 12 check (months between 1 and 60),
  email        text,                             -- αν δοθεί, εξαργυρώνεται μόνο από αυτό το email
  note         text,
  created_at   timestamptz not null default now(),
  created_by   uuid,
  redeemed_by  uuid references auth.users(id) on delete set null,
  redeemed_at  timestamptz,
  revoked      boolean not null default false
);
alter table public.geo_keys enable row level security;   -- καμία πολιτική: πρόσβαση μόνο μέσα από τις συναρτήσεις

create table if not exists public.geo_key_tries (
  user_id uuid not null,
  at      timestamptz not null default now(),
  ok      boolean not null default false
);
create index if not exists geo_key_tries_u on public.geo_key_tries(user_id, at desc);
alter table public.geo_key_tries enable row level security;

-- 12 χαρακτήρες χωρίς μπερδέματα (όχι 0/O, 1/I/L)
create or replace function public.geo_new_key() returns text language plpgsql as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; s text; i int;
begin
  loop
    s := 'GEO-';
    for i in 1..12 loop
      s := s || substr(a, 1 + floor(random() * length(a))::int, 1);
      if i in (4, 8) then s := s || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.geo_keys where key = s);
  end loop;
  return s;
end $$;
revoke execute on function public.geo_new_key() from public, anon, authenticated;

-- Εξαργύρωση από τον συνδεδεμένο χρήστη (σελίδα GEOmetry)
create or replace function public.geo_redeem(p_key text)
returns json language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid(); k geo_keys; em text; tries int; span interval; exp timestamptz; n int;
begin
  if uid is null then return json_build_object('ok', false, 'msg', 'Χρειάζεται σύνδεση στο HEXIS'); end if;
  select count(*) into tries from geo_key_tries where user_id = uid and not ok and at > now() - interval '1 hour';
  if tries >= 8 then return json_build_object('ok', false, 'msg', 'Πολλές λάθος προσπάθειες. Δοκίμασε ξανά σε μία ώρα.'); end if;

  p_key := upper(regexp_replace(coalesce(p_key, ''), '[^A-Za-z0-9]', '', 'g'));
  if p_key like 'GEO%' then p_key := substr(p_key, 4); end if;
  if length(p_key) <> 12 then
    insert into geo_key_tries(user_id) values (uid);
    return json_build_object('ok', false, 'msg', 'Το κλειδί έχει τη μορφή GEO-XXXX-XXXX-XXXX');
  end if;
  p_key := 'GEO-' || substr(p_key, 1, 4) || '-' || substr(p_key, 5, 4) || '-' || substr(p_key, 9, 4);

  select * into k from geo_keys where key = p_key for update;
  if k.key is null or k.revoked then
    insert into geo_key_tries(user_id) values (uid);
    return json_build_object('ok', false, 'msg', 'Το κλειδί δεν είναι έγκυρο');
  end if;
  if k.redeemed_by is not null then
    if k.redeemed_by = uid then
      return json_build_object('ok', true, 'msg', 'Το κλειδί είναι ήδη ενεργό στον λογαριασμό σου',
        'expires_at', (select expires_at from entitlements where user_id = uid and module = 'syntetagmenes_pro'));
    end if;
    insert into geo_key_tries(user_id) values (uid);
    return json_build_object('ok', false, 'msg', 'Το κλειδί έχει ήδη χρησιμοποιηθεί από άλλον λογαριασμό');
  end if;
  select email into em from auth.users where id = uid;
  if k.email is not null and lower(trim(k.email)) <> lower(coalesce(em, '')) then
    insert into geo_key_tries(user_id) values (uid);
    return json_build_object('ok', false, 'msg', 'Το κλειδί έχει εκδοθεί για άλλο email');
  end if;

  span := make_interval(months => k.months);
  update entitlements set active = true, expires_at = greatest(coalesce(expires_at, now()), now()) + span
    where user_id = uid and module = 'syntetagmenes_pro';
  get diagnostics n = row_count;
  if n = 0 then insert into entitlements(user_id, module, active, expires_at) values (uid, 'syntetagmenes_pro', true, now() + span); end if;
  update geo_keys set redeemed_by = uid, redeemed_at = now() where key = k.key;
  insert into geo_key_tries(user_id, ok) values (uid, true);
  select expires_at into exp from entitlements where user_id = uid and module = 'syntetagmenes_pro';
  return json_build_object('ok', true, 'msg', 'Το HEXIS GEOmetry Pro ενεργοποιήθηκε', 'expires_at', exp);
end $$;
revoke execute on function public.geo_redeem(text) from public, anon;
grant execute on function public.geo_redeem(text) to authenticated;

-- ---------- Διαχείριση (admin.html) ----------
create or replace function public.admin_geo_issue(p_count int default 1, p_months int default 12, p_email text default null, p_note text default null)
returns setof text language plpgsql security definer set search_path = public as $$
declare i int; k text;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if p_count < 1 or p_count > 50 then raise exception 'Από 1 έως 50 κλειδιά τη φορά'; end if;
  if p_months < 1 or p_months > 60 then raise exception 'Διάρκεια 1–60 μήνες'; end if;
  for i in 1..p_count loop
    k := public.geo_new_key();
    insert into geo_keys(key, months, email, note, created_by) values (k, p_months, nullif(trim(p_email), ''), nullif(trim(p_note), ''), auth.uid());
    return next k;
  end loop;
end $$;

drop function if exists public.admin_geo_list();
create or replace function public.admin_geo_list()
returns table(key text, months int, email text, note text, created_at timestamptz, redeemed_email text, redeemed_at timestamptz, revoked boolean, pro_until timestamptz)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query select g.key, g.months, g.email, g.note, g.created_at, u.email::text, g.redeemed_at, g.revoked,
      (select e.expires_at from entitlements e where e.user_id = g.redeemed_by and e.module = 'syntetagmenes_pro')
    from geo_keys g left join auth.users u on u.id = g.redeemed_by
    order by g.created_at desc limit 300;
end $$;

-- Ανάκληση: το κλειδί σταματά να εξαργυρώνεται· αν είχε ήδη χρησιμοποιηθεί, κλείνει και το Pro του λογαριασμού
create or replace function public.admin_geo_revoke(p_key text, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare k geo_keys;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select * into k from geo_keys where key = p_key;
  if k.key is null then raise exception 'Δεν βρέθηκε το κλειδί'; end if;
  update geo_keys set revoked = p_on where key = p_key;
  if k.redeemed_by is not null then
    update entitlements set active = not p_on where user_id = k.redeemed_by and module = 'syntetagmenes_pro';
  end if;
end $$;

-- ---------- Το Pro περιλαμβάνει το Basic ----------
-- Όταν ενεργοποιείται/ανανεώνεται το «syntetagmenes_pro» (αγορά, κλειδί, admin), ανοίγει και το «syntetagmenes»
-- τουλάχιστον μέχρι την ίδια ημερομηνία — ώστε το εργαλείο να φαίνεται ενεργό στο Hub και να ανοίγει κανονικά.
create or replace function public.geo_pro_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.active then
    insert into entitlements(user_id, module, active, expires_at) values (new.user_id, 'syntetagmenes', true, new.expires_at)
    on conflict (user_id, module) do update set active = true,
      expires_at = case
        when excluded.expires_at is null then null
        when entitlements.active and entitlements.expires_at is null then null
        when entitlements.active then greatest(entitlements.expires_at, excluded.expires_at)
        else excluded.expires_at end;
  end if;
  return new;
end $$;
drop trigger if exists geo_pro_sync on public.entitlements;
create trigger geo_pro_sync after insert or update of active, expires_at on public.entitlements
  for each row when (new.module = 'syntetagmenes_pro') execute function public.geo_pro_sync();
