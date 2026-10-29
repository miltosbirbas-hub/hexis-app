-- ============================================================
-- HEXIS — Κοινό σύστημα πληρωμών για όλο το hub (Stripe → ενεργοποίηση → παραστατικό)
--
-- hx_products : κατάλογος προϊόντων όλων των εφαρμογών (κωδικός είδους = κωδικός Emblem)
-- hx_orders   : κάθε πληρωμή, με στοιχεία παραστατικού (ΑΠΥ / ΤΠΥ) και κατάσταση έκδοσης
-- hx_fulfill  : ενεργοποιεί αυτό που αγοράστηκε (καλείται ΜΟΝΟ από την Edge Function του webhook)
--
-- Νέα εφαρμογή = νέες γραμμές στο hx_products + ένα «grant» στο hx_fulfill.
-- Τρέξε ΜΕΤΑ το interior-billing.sql. Ξανατρέχει με ασφάλεια.
-- ============================================================

create table if not exists public.hx_products (
  sku          text primary key,            -- = κωδικός είδους στο Emblem
  app          text not null,               -- interior | kenak | mapping | stegh | ...
  name_el      text not null,
  name_en      text not null,
  gross_cents  integer not null,            -- τελικό ποσό χρέωσης (με ΦΠΑ)
  vat_rate     numeric(5,2) not null default 24,
  grant_kind   text not null,               -- τι ενεργοποιείται (βλ. hx_fulfill)
  grant_value  jsonb not null default '{}',
  recurring    text check (recurring in ('month','year')),  -- null = εφάπαξ
  descriptor   text,                        -- επίθημα στην κίνηση κάρτας (HEXIS* ...)
  active       boolean not null default true,
  sort         integer not null default 0
);

create table if not exists public.hx_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,
  sku             text not null references public.hx_products(sku),
  stripe_session  text unique,
  stripe_invoice  text unique,              -- ανανεώσεις συνδρομής
  stripe_customer text,
  stripe_sub      text,
  amount_cents    integer not null,
  net_cents       integer not null,
  vat_cents       integer not null,
  currency        text not null default 'eur',
  customer_email  text,
  customer_name   text,
  tax_id          text,                     -- ΑΦΜ (με ή χωρίς EL)
  doc_type        text not null default 'ΑΠΥ',   -- ΑΠΥ (ιδιώτης) | ΤΠΥ (με ΑΦΜ)
  status          text not null default 'paid',  -- paid | fulfilled | failed | refunded
  fulfill_note    text,
  invoice_status  text not null default 'pending', -- pending | issued | failed
  invoice_ref     text,
  created_at      timestamptz not null default now(),
  fulfilled_at    timestamptz,
  invoiced_at     timestamptz
);
alter table public.hx_orders add column if not exists demo_days integer;
alter table public.hx_orders add column if not exists source text not null default 'stripe';  -- stripe | free | demo
create index if not exists hx_orders_user on public.hx_orders(user_id, created_at desc);
create index if not exists hx_orders_inv on public.hx_orders(invoice_status, created_at);

alter table public.hx_products enable row level security;
alter table public.hx_orders   enable row level security;
drop policy if exists hx_products_read on public.hx_products;
create policy hx_products_read on public.hx_products for select using (active);
drop policy if exists hx_orders_own on public.hx_orders;
create policy hx_orders_own on public.hx_orders for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Κατάλογος · HEXIS Interior (τιμές με ΦΠΑ σε λεπτά)
-- ------------------------------------------------------------
insert into public.hx_products(sku, app, name_el, name_en, gross_cents, grant_kind, grant_value, recurring, descriptor, sort) values
 ('HXI-P5',      'interior', 'HEXIS Interior · πακέτο 5 εικόνων',          'HEXIS Interior · 5-image pack',           490,   'interior_credits', '{"credits":5,"kind":"pack5"}',   null,    'INTERIOR', 10),
 ('HXI-P15',     'interior', 'HEXIS Interior · πακέτο 15 εικόνων',         'HEXIS Interior · 15-image pack',          990,   'interior_credits', '{"credits":15,"kind":"pack15"}', null,    'INTERIOR', 11),
 ('HXI-P40',     'interior', 'HEXIS Interior · πακέτο 40 εικόνων',         'HEXIS Interior · 40-image pack',          1990,  'interior_credits', '{"credits":40,"kind":"pack40"}', null,    'INTERIOR', 12),
 ('HXI-SUB',     'interior', 'HEXIS Interior · μηνιαία συνδρομή',          'HEXIS Interior · monthly subscription',   990,   'interior_sub',     '{"months":1}',                   'month', 'INTERIOR', 13),
 ('HXI-PRO-1M',  'interior', 'HEXIS Interior PRO · άδεια 1 μήνα',          'HEXIS Interior PRO · 1-month licence',    4340,  'interior_pro',     '{"months":1}',                   null,    'INTERIOR', 20),
 ('HXI-PRO-6M',  'interior', 'HEXIS Interior PRO · άδεια 6 μηνών',         'HEXIS Interior PRO · 6-month licence',    22320, 'interior_pro',     '{"months":6}',                   null,    'INTERIOR', 21),
 ('HXI-PRO-12M', 'interior', 'HEXIS Interior PRO · άδεια 12 μηνών',        'HEXIS Interior PRO · 12-month licence',   40920, 'interior_pro',     '{"months":12}',                  null,    'INTERIOR', 22),
 ('HXI-PRO-50',  'interior', 'HEXIS Interior PRO · 50 επιπλέον εικόνες',   'HEXIS Interior PRO · 50 extra images',    1488,  'interior_credits', '{"credits":50,"kind":"pro50"}',  null,    'INTERIOR', 23)
on conflict (sku) do update set name_el = excluded.name_el, name_en = excluded.name_en, gross_cents = excluded.gross_cents,
  grant_kind = excluded.grant_kind, grant_value = excluded.grant_value, recurring = excluded.recurring, descriptor = excluded.descriptor, sort = excluded.sort;

-- ------------------------------------------------------------
-- Κατάλογος · υπόλοιπες εφαρμογές του hub (άδεια 1 έτους = module στο entitlements)
-- ------------------------------------------------------------
insert into public.hx_products(sku, app, name_el, name_en, gross_cents, grant_kind, grant_value, recurring, descriptor, sort) values
 ('HX-KENAK-10',  'kenak',         'HEXIS ΚΕΝΑΚ · πακέτο 10 ΠΕΑ',               'HEXIS KENAK · 10 EPC pack',               6200, 'kenak_tokens', '{"packs":1}',                       null, 'KENAK',    100),
 ('HX-STEGH-1Y',  'stegh',         'HEXIS Στέγη & Προμέτρηση · άδεια 1 έτους',  'HEXIS Roof & Take-off · 1-year licence',  1240, 'module_year',  '{"module":"stegh","months":12}',     null, 'STEGH',    110),
 ('HX-PDFDIM-1Y', 'pdfdim',        'HEXIS PDF Dim · άδεια 1 έτους',             'HEXIS PDF Dim · 1-year licence',          1240, 'module_year',  '{"module":"pdfdim","months":12}',    null, 'PDFDIM',   120),
 ('HX-P2DXF-1Y',  'paper2dxf',     'HEXIS Paper → DXF · άδεια 1 έτους',         'HEXIS Paper → DXF · 1-year licence',      1240, 'module_year',  '{"module":"paper2dxf","months":12}', null, 'PAPERDXF', 130),
 ('HX-GEOM-1Y',   'syntetagmenes', 'HEXIS GEOmetry · άδεια 1 έτους',            'HEXIS GEOmetry · 1-year licence',         4340, 'module_year',  '{"module":"syntetagmenes","months":12}', null, 'GEOMETRY', 140),
 ('HX-3D-1Y',     'plan3d',        'HEXIS 3D Κτίριο · άδεια 1 έτους',           'HEXIS 3D Building · 1-year licence',      2480, 'module_year',  '{"module":"plan3d","months":12}',    null, '3DKTIRIO', 150),
 ('HX-TOIXOS-1Y', 'toixos',        'HEXIS Τοίχος Αντιστήριξης · άδεια 1 έτους', 'HEXIS Retaining Wall · 1-year licence',   2480, 'module_year',  '{"module":"toixos","months":12}',    null, 'TOIXOS',   160)
on conflict (sku) do update set name_el = excluded.name_el, name_en = excluded.name_en, gross_cents = excluded.gross_cents,
  grant_kind = excluded.grant_kind, grant_value = excluded.grant_value, recurring = excluded.recurring, descriptor = excluded.descriptor, sort = excluded.sort;

-- ------------------------------------------------------------
-- Ενεργοποίηση (μόνο service_role · από hx-stripe-webhook)
-- ------------------------------------------------------------
create or replace function public.hx_fulfill(p_order uuid)
returns json language plpgsql security definer set search_path = public, auth as $$
declare o hx_orders; p hx_products; u uuid; c int; mo int; note text; span interval; md text; n int;
begin
  select * into o from hx_orders where id = p_order for update;
  if o.id is null then return json_build_object('ok',false,'msg','order'); end if;
  if o.status = 'fulfilled' then return json_build_object('ok',true,'msg','already'); end if;
  select * into p from hx_products where sku = o.sku;
  u := o.user_id;
  if u is null and o.customer_email is not null then select id into u from auth.users where lower(email) = lower(o.customer_email); end if;
  if u is null then update hx_orders set status = 'failed', fulfill_note = 'Δεν βρέθηκε λογαριασμός' where id = o.id; return json_build_object('ok',false,'msg','user'); end if;

  -- demo: χρονική ισχύς σε ημέρες αντί για μήνες
  span := case when o.demo_days is not null then make_interval(days => o.demo_days) else make_interval(months => coalesce((p.grant_value->>'months')::int,1)) end;
  if p.grant_kind = 'interior_credits' then
    c := (p.grant_value->>'credits')::int;
    insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
    update interior_accounts set credits = (case when credits_until is not null and credits_until < now() then 0 else credits end) + c,
      purchased = purchased + c, credits_until = now() + interval '12 months', updated_at = now() where user_id = u;
    insert into interior_grants(user_id, kind, credits, amount_eur, note) values (u, p.grant_value->>'kind', c, o.amount_cents/100.0, 'stripe '||o.sku);
    note := '+'||c||' μονάδες';
  elsif p.grant_kind = 'interior_sub' then
    mo := coalesce((p.grant_value->>'months')::int,1);
    insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
    update interior_accounts set sub_until = greatest(coalesce(sub_until, now()), now()) + span + (case when o.demo_days is null then interval '2 days' else interval '0' end), updated_at = now() where user_id = u;
    insert into interior_grants(user_id, kind, credits, amount_eur, note) values (u, 'sub1', 0, o.amount_cents/100.0, 'stripe '||o.sku);
    note := 'συνδρομή +'||coalesce(o.demo_days::text||' ημέρες', mo||' μήνας');
  elsif p.grant_kind = 'interior_pro' then
    mo := (p.grant_value->>'months')::int;
    insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
    update interior_accounts set pro_until = greatest(coalesce(pro_until, now()), now()) + span, updated_at = now() where user_id = u;
    insert into interior_grants(user_id, kind, credits, amount_eur, note) values (u, 'pro'||mo||'m', 0, o.amount_cents/100.0, 'stripe '||o.sku);
    note := 'PRO +'||coalesce(o.demo_days::text||' ημέρες', mo||' μήνες');
  elsif p.grant_kind = 'module_year' then
    md := p.grant_value->>'module';
    update entitlements set active = true, expires_at = greatest(coalesce(expires_at, now()), now()) + span where user_id = u and module = md;
    get diagnostics n = row_count;
    if n = 0 then insert into entitlements(user_id, module, active, expires_at) values (u, md, true, now() + span); end if;
    note := md||' έως '||to_char((select max(expires_at) from entitlements where user_id = u and module = md),'DD/MM/YYYY');
  elsif p.grant_kind = 'kenak_tokens' then
    begin
      perform public.kenak_grant(u, coalesce((p.grant_value->>'packs')::int,1));
      note := 'ΚΕΝΑΚ +'||(10*coalesce((p.grant_value->>'packs')::int,1))||' ΠΕΑ';
    exception when others then
      update hx_orders set status = 'failed', fulfill_note = 'kenak_grant: '||sqlerrm where id = o.id; return json_build_object('ok',false,'msg','kenak');
    end;
  else
    update hx_orders set status = 'failed', fulfill_note = 'Άγνωστο grant: '||p.grant_kind where id = o.id;
    return json_build_object('ok',false,'msg','grant');
  end if;

  update hx_orders set status = 'fulfilled', fulfilled_at = now(), fulfill_note = note, user_id = u where id = o.id;
  return json_build_object('ok',true,'msg',note);
end $$;
revoke execute on function public.hx_fulfill(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------
-- Διαχείριση: ουρά παραστατικών για το Emblem
-- ------------------------------------------------------------
drop function if exists public.admin_hx_orders(boolean);
create or replace function public.admin_hx_orders(p_all boolean default false)
returns table(id uuid, created_at timestamptz, sku text, item text, email text, customer_name text, tax_id text, doc_type text,
  net numeric, vat numeric, gross numeric, status text, fulfill_note text, invoice_status text, invoice_ref text, renewal boolean, source text, demo_days int)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select o.id, o.created_at, o.sku, p.name_el, coalesce(o.customer_email, u.email::text), o.customer_name, o.tax_id, o.doc_type,
      round(o.net_cents/100.0,2), round(o.vat_cents/100.0,2), round(o.amount_cents/100.0,2), o.status, o.fulfill_note, o.invoice_status, o.invoice_ref, o.stripe_invoice is not null, o.source, o.demo_days
    from hx_orders o join hx_products p on p.sku = o.sku left join auth.users u on u.id = o.user_id
    where p_all or o.invoice_status <> 'issued' or o.created_at > now() - interval '30 days'
    order by o.created_at desc limit 500;
end $$;

create or replace function public.admin_hx_invoiced(p_id uuid, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update hx_orders set invoice_status = 'issued', invoice_ref = nullif(trim(p_ref),''), invoiced_at = now() where id = p_id;
end $$;

create or replace function public.admin_hx_refulfill(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return public.hx_fulfill(p_id);
end $$;

-- Δωρεάν / demo από τον διαχειριστή: καταγράφεται ως παραγγελία 0,00 € (για μηδενικό παραστατικό)
create or replace function public.admin_hx_grant(p_email text, p_sku text, p_days int default null, p_note text default null)
returns json language plpgsql security definer set search_path = public, auth as $$
declare u uuid; em text; oid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id, email into u, em from auth.users where lower(email) = lower(trim(p_email));
  if u is null then return json_build_object('ok',false,'msg','Δεν υπάρχει λογαριασμός με αυτό το email'); end if;
  if not exists (select 1 from hx_products where sku = p_sku) then return json_build_object('ok',false,'msg','Άγνωστος κωδικός'); end if;
  insert into hx_orders(user_id, sku, amount_cents, net_cents, vat_cents, customer_email, doc_type, source, demo_days, fulfill_note)
    values (u, p_sku, 0, 0, 0, em, 'ΑΠΥ', case when p_days is null then 'free' else 'demo' end, nullif(p_days,0), p_note)
    returning id into oid;
  return public.hx_fulfill(oid);
end $$;
revoke execute on function public.admin_hx_grant(text,text,int,text) from public, anon;
grant execute on function public.admin_hx_grant(text,text,int,text) to authenticated;

revoke execute on function public.admin_hx_orders(boolean) from public, anon;
revoke execute on function public.admin_hx_invoiced(uuid,text) from public, anon;
revoke execute on function public.admin_hx_refulfill(uuid) from public, anon;
grant execute on function public.admin_hx_orders(boolean), public.admin_hx_invoiced(uuid,text), public.admin_hx_refulfill(uuid) to authenticated;
