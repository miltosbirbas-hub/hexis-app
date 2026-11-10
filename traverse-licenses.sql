-- HEXIS TRAVERSE · κλειδιά άδειας
-- Ένα κλειδί δουλεύει σε έως max_devices συσκευές (προεπιλογή 2: υπολογιστής + κινητό/τάμπλετ).
-- Η δοκιμή μετράει από την πρώτη ενεργοποίηση. Ο διαχειριστής μπαίνει με τον λογαριασμό του, χωρίς κλειδί.
-- Ασφαλές να ξανατρέξει. Το τρέχει αυτόματα το GitHub Actions (edge-functions.yml).

create table if not exists public.trv_licenses (
  key          text primary key,                       -- TRV-XXXX-XXXX-XXXX
  kind         text not null default 'demo' check (kind in ('demo','full')),
  days         integer,                                -- demo: ημέρες από την ενεργοποίηση · full: ημέρες ισχύος ή null = χωρίς λήξη
  max_devices  integer not null default 2,
  name         text,
  email        text,
  note         text,
  created_at   timestamptz not null default now(),
  activated_at timestamptz,
  expires_at   timestamptz,
  last_seen    timestamptz,
  revoked      boolean not null default false,
  order_id     uuid
);
alter table public.trv_licenses enable row level security;   -- καμία πρόσβαση εκτός από τις συναρτήσεις

create table if not exists public.trv_devices (
  key        text not null references public.trv_licenses(key) on delete cascade,
  device_id  text not null,
  model      text,
  first_at   timestamptz not null default now(),
  last_at    timestamptz not null default now(),
  primary key (key, device_id)
);
alter table public.trv_devices enable row level security;

do $$ begin
  if to_regclass('public.hx_products') is not null then
    insert into public.hx_products(sku, app, name_el, name_en, gross_cents, grant_kind, grant_value, recurring, descriptor, active, sort)
    values ('TRV-DEMO', 'traverse', 'HEXIS TRAVERSE · δοκιμαστική άδεια', 'HEXIS TRAVERSE · trial licence', 0, 'trv_key', '{}', null, 'TRAVERSE', false, 92),
           ('TRV-FREE', 'traverse', 'HEXIS TRAVERSE · δωρεάν άδεια',      'HEXIS TRAVERSE · free licence',  0, 'trv_key', '{}', null, 'TRAVERSE', false, 93)
    on conflict (sku) do update set name_el = excluded.name_el, name_en = excluded.name_en, active = false;
  end if;
exception when others then null;
end $$;

create or replace function public.trv_new_key() returns text language plpgsql as $$
declare a text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; k text; i int;
begin
  loop
    k := 'TRV';
    for i in 1..12 loop
      if (i - 1) % 4 = 0 then k := k || '-'; end if;
      k := k || substr(a, 1 + floor(random() * length(a))::int, 1);
    end loop;
    exit when not exists (select 1 from public.trv_licenses where key = k);
  end loop;
  return k;
end $$;

-- Εφαρμογή: ενεργοποίηση / έλεγχος (χωρίς λογαριασμό)
create or replace function public.trv_activate(p_key text, p_device text, p_model text default null)
returns json language plpgsql security definer set search_path = public as $$
declare l public.trv_licenses; n int; k text := upper(regexp_replace(coalesce(p_key,''), '\s', '', 'g'));
begin
  if length(coalesce(p_device,'')) < 6 then return json_build_object('ok',false,'code','device','msg','Δεν αναγνωρίστηκε η συσκευή'); end if;
  select * into l from trv_licenses where key = k for update;
  if not found then return json_build_object('ok',false,'code','invalid','msg','Το κλειδί δεν είναι σωστό. Έλεγξε τα γράμματα και τους αριθμούς.'); end if;
  if l.revoked then return json_build_object('ok',false,'code','revoked','msg','Το κλειδί έχει ανακληθεί. Επικοινώνησε με τη HEXIS-APP.'); end if;
  if not exists (select 1 from trv_devices d where d.key = k and d.device_id = p_device) then
    select count(*) into n from trv_devices d where d.key = k;
    if n >= l.max_devices then
      return json_build_object('ok',false,'code','device','msg','Το κλειδί χρησιμοποιείται ήδη σε ' || n || ' συσκευές (όριο ' || l.max_devices || '). Ζήτα αποδέσμευση από τη HEXIS-APP.');
    end if;
    insert into trv_devices(key, device_id, model) values (k, p_device, left(p_model, 80));
  else
    update trv_devices set last_at = now(), model = coalesce(left(p_model,80), model) where key = k and device_id = p_device;
  end if;
  if l.activated_at is null then
    update trv_licenses set activated_at = now(),
      expires_at = case when days is not null then now() + make_interval(days => days) else null end
      where key = k returning * into l;
  end if;
  update trv_licenses set last_seen = now() where key = k;
  if l.expires_at is not null and l.expires_at <= now() then
    return json_build_object('ok',false,'code','expired','msg','Η άδεια έληξε στις ' || to_char(l.expires_at at time zone 'Europe/Athens','DD/MM/YYYY') || '.','expires_at',l.expires_at);
  end if;
  return json_build_object('ok',true,'key',l.key,'kind',l.kind,'name',l.name,'expires_at',l.expires_at,'server_time',now());
end $$;
revoke all on function public.trv_activate(text,text,text) from public;
grant execute on function public.trv_activate(text,text,text) to anon, authenticated;

-- Είσοδος διαχειριστή (λογαριασμός HEXIS-APP με δικαίωμα admin): χωρίς κλειδί
create or replace function public.trv_owner()
returns json language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then return json_build_object('ok',true,'kind','owner','name','Διαχειριστής','expires_at',null,'server_time',now()); end if;
  return json_build_object('ok',false,'code','not_admin','msg','Ο λογαριασμός δεν έχει δικαίωμα διαχειριστή.');
end $$;
revoke all on function public.trv_owner() from public;
grant execute on function public.trv_owner() to authenticated;

-- ── Διαχειριστής ───────────────────────────────────────────────────────────
create or replace function public.admin_trv_issue(p_kind text default 'demo', p_days int default 7, p_name text default null, p_email text default null, p_note text default null, p_max int default 2)
returns json language plpgsql security definer set search_path = public as $$
declare k text := public.trv_new_key(); oid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_kind not in ('demo','full') then raise exception 'kind'; end if;
  if p_kind = 'demo' and (p_days is null or p_days < 1 or p_days > 3650) then return json_build_object('ok',false,'msg','Βάλε διάρκεια σε ημέρες (1–3650)'); end if;
  if p_max is null or p_max < 1 or p_max > 20 then return json_build_object('ok',false,'msg','Συσκευές: 1–20'); end if;
  insert into trv_licenses(key, kind, days, max_devices, name, email, note)
    values (k, p_kind, case when p_kind = 'demo' then p_days else nullif(p_days,0) end, p_max,
            nullif(trim(p_name),''), nullif(lower(trim(p_email)),''), nullif(trim(p_note),''));
  begin
    insert into hx_orders(user_id, sku, amount_cents, net_cents, vat_cents, customer_email, customer_name, doc_type, source, demo_days, status, fulfill_note, ref, fulfilled_at)
      values (null, case when p_kind = 'full' then 'TRV-FREE' else 'TRV-DEMO' end, 0, 0, 0, nullif(lower(trim(p_email)),''), nullif(trim(p_name),''), 'ΑΠΥ',
              case when p_kind = 'full' then 'free' else 'demo' end, case when p_kind = 'demo' then p_days end, 'fulfilled',
              'HEXIS TRAVERSE κλειδί ' || k, k, now())
      returning id into oid;
    update trv_licenses set order_id = oid where key = k;
  exception when others then null;
  end;
  return json_build_object('ok',true,'key',k);
end $$;

create or replace function public.admin_trv_list()
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return coalesce((select json_agg(x order by x.created_at desc) from (
    select l.*, (select count(*) from trv_devices d where d.key = l.key) as devices,
           (select json_agg(json_build_object('device',d.device_id,'model',d.model,'first',d.first_at,'last',d.last_at) order by d.last_at desc) from trv_devices d where d.key = l.key) as device_list
    from trv_licenses l) x), '[]'::json);
end $$;

create or replace function public.admin_trv_revoke(p_key text, p_on boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update trv_licenses set revoked = p_on where key = p_key;
end $$;

create or replace function public.admin_trv_extend(p_key text, p_days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update trv_licenses set
    days = case when activated_at is null then coalesce(days,0) + p_days else days end,
    expires_at = case when activated_at is null then expires_at else greatest(coalesce(expires_at, now()), now()) + make_interval(days => p_days) end
    where key = p_key;
end $$;

create or replace function public.admin_trv_reset_devices(p_key text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from trv_devices where key = p_key;
end $$;

revoke all on function public.admin_trv_issue(text,int,text,text,text,int) from public;
revoke all on function public.admin_trv_list() from public;
revoke all on function public.admin_trv_revoke(text,boolean) from public;
revoke all on function public.admin_trv_extend(text,int) from public;
revoke all on function public.admin_trv_reset_devices(text) from public;
grant execute on function public.admin_trv_issue(text,int,text,text,text,int) to authenticated;
grant execute on function public.admin_trv_list() to authenticated;
grant execute on function public.admin_trv_revoke(text,boolean) to authenticated;
grant execute on function public.admin_trv_extend(text,int) to authenticated;
grant execute on function public.admin_trv_reset_devices(text) to authenticated;
