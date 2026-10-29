-- ============================================================
-- HEXIS INTERIOR — Άδειες PRO (κλειδιά) & μονάδες φωτορεαλιστικών
--
-- PRO (μηχανικός): κλειδί 1 / 6 / 12 μηνών. Ανά ημερολογιακό μήνα:
--   50 τελικές εικόνες · 200 πρόχειρες · 100 AI διαρρυθμίσεις.
--   Πάνω από το όριο τελικών: μονάδες από πακέτο (12 € + ΦΠΑ / 50).
-- Ιδιώτης (μόνο email): δωρεάν 1 τελική, 10 πρόχειρες, 3 διαρρυθμίσεις.
--   Πακέτα 5 / 15 / 40 εικόνων (4,90 / 9,90 / 19,90 € με ΦΠΑ), ισχύς 12 μήνες.
--   Κάθε αγορασμένη εικόνα δίνει επιπλέον 5 πρόχειρες και 2 διαρρυθμίσεις.
--   Μηνιαία συνδρομή ιδιώτη: 25 εικόνες / μήνα (9,90 € με ΦΠΑ).
-- Τελική 4K = 2 μονάδες.
-- Ιδιοκτήτες / διαχειριστές: χωρίς όρια (καταγράφεται μόνο το κόστος).
-- Τρέξε ολόκληρο στο SQL editor του Supabase (project hexis-app). Ξανατρέχει με ασφάλεια.
-- ============================================================

create table if not exists public.interior_accounts (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  pro_until    timestamptz,              -- άδεια μηχανικού
  sub_until    timestamptz,              -- μηνιαία συνδρομή ιδιώτη
  credits      integer not null default 0 check (credits >= 0),   -- μονάδες τελικών από πακέτα
  credits_until timestamptz,             -- λήξη μονάδων (12 μήνες από την τελευταία αγορά)
  purchased    integer not null default 0,                         -- σύνολο αγορασμένων μονάδων
  updated_at   timestamptz not null default now()
);

create table if not exists public.interior_keys (
  key          text primary key,
  plan         text not null check (plan in ('m1','m6','y1')),
  months       integer not null,
  email        text, name text, note text,
  created_at   timestamptz not null default now(),
  redeemed_by  uuid references auth.users(id) on delete set null,
  redeemed_at  timestamptz,
  revoked      boolean not null default false
);

create table if not exists public.interior_usage (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('final','final4k','draft','layout')),
  units      integer not null default 1,
  source     text not null,             -- owner | pro | sub | free | credits
  cost_usd   numeric(8,4) not null default 0,
  refunded   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists interior_usage_user_time on public.interior_usage(user_id, created_at);

create table if not exists public.interior_grants (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,             -- pack5 | pack15 | pack40 | pro50 | sub1 | manual
  credits    integer not null default 0,
  amount_eur numeric(8,2),
  note       text,
  created_at timestamptz not null default now()
);

alter table public.interior_accounts enable row level security;
alter table public.interior_keys     enable row level security;
alter table public.interior_usage    enable row level security;
alter table public.interior_grants   enable row level security;
drop policy if exists interior_accounts_own on public.interior_accounts;
create policy interior_accounts_own on public.interior_accounts for select using (auth.uid() = user_id);
drop policy if exists interior_usage_own on public.interior_usage;
create policy interior_usage_own on public.interior_usage for select using (auth.uid() = user_id);
-- interior_keys / interior_grants: καμία πολιτική → μόνο μέσω των RPC παρακάτω

-- ------------------------------------------------------------
-- Βοηθητικά
-- ------------------------------------------------------------
create or replace function public.interior_is_owner(u uuid)
returns boolean language sql stable security definer set search_path = public, auth as $$
  select coalesce((select lower(email) in ('miltos.birbas@gmail.com','brb.develop@gmail.com') from auth.users where id = u), false)
$$;

create or replace function public.interior_is_pro(u uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare ok boolean := false;
begin
  select coalesce(pro_until > now(), false) into ok from interior_accounts where user_id = u;
  if coalesce(ok,false) then return true; end if;
  -- συμβατότητα: ενεργό module «interior» από το admin του hub = PRO
  begin
    execute 'select exists(select 1 from public.entitlements where user_id = $1 and module = ''interior'' and active and (expires_at is null or expires_at > now()))' into ok using u;
  exception when others then ok := false;
  end;
  return coalesce(ok,false);
end $$;

create or replace function public.interior_cost(k text)
returns numeric language sql immutable as $$
  select case k when 'final' then 0.134 when 'final4k' then 0.24 when 'draft' then 0.067 when 'layout' then 0.08 else 0 end
$$;

-- ------------------------------------------------------------
-- Κατάσταση χρήστη (για τη σελίδα)
-- ------------------------------------------------------------
create or replace function public.interior_status()
returns json language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid(); a interior_accounts; m0 timestamptz := date_trunc('month', now());
  f_m int; d_m int; l_m int; f_all int; d_all int; l_all int; tier text; cr int;
begin
  if u is null then return json_build_object('tier','anon'); end if;
  select * into a from interior_accounts where user_id = u;
  select coalesce(sum(units) filter (where kind in ('final','final4k') and created_at >= m0),0),
         coalesce(sum(units) filter (where kind = 'draft'  and created_at >= m0),0),
         coalesce(sum(units) filter (where kind = 'layout' and created_at >= m0),0),
         coalesce(sum(units) filter (where kind in ('final','final4k') and source = 'free'),0),
         coalesce(sum(units) filter (where kind = 'draft'),0),
         coalesce(sum(units) filter (where kind = 'layout'),0)
    into f_m, d_m, l_m, f_all, d_all, l_all
    from interior_usage where user_id = u and not refunded;
  cr := case when a.credits_until is null or a.credits_until > now() then coalesce(a.credits,0) else 0 end;
  tier := case when interior_is_owner(u) then 'owner' when interior_is_pro(u) then 'pro'
               when a.sub_until > now() then 'sub' else 'free' end;
  return json_build_object(
    'tier', tier, 'pro_until', a.pro_until, 'sub_until', a.sub_until,
    'credits', cr, 'credits_until', a.credits_until,
    'month', json_build_object('final', f_m, 'draft', d_m, 'layout', l_m),
    'limits', case tier
       when 'pro' then json_build_object('final',50,'draft',200,'layout',100)
       when 'sub' then json_build_object('final',25,'draft',125,'layout',50)
       when 'free' then json_build_object('final',1,'draft',10 + 5*coalesce(a.purchased,0),'layout',3 + 2*coalesce(a.purchased,0))
       else null end,
    'free_used', json_build_object('final', f_all, 'draft', d_all, 'layout', l_all));
end $$;

-- ------------------------------------------------------------
-- Ξόδεμα: καλείται από τις Edge Functions με το JWT του χρήστη, ΠΡΙΝ από την κλήση AI.
-- Επιστρέφει {ok, id, source, msg}. Αν η κλήση AI αποτύχει → interior_refund(id).
-- ------------------------------------------------------------
create or replace function public.interior_consume(p_kind text)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); a interior_accounts; m0 timestamptz := date_trunc('month', now());
  v_units int := case when p_kind = 'final4k' then 2 else 1 end; used int; lim int; src text; cr int; new_id bigint;
  fam text[] := case when p_kind in ('final','final4k') then array['final','final4k'] else array[p_kind] end;
begin
  if u is null then return json_build_object('ok',false,'msg','login'); end if;
  if p_kind not in ('final','final4k','draft','layout') then return json_build_object('ok',false,'msg','bad kind'); end if;
  insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
  select * into a from interior_accounts where user_id = u for update;
  cr := case when a.credits_until is null or a.credits_until > now() then a.credits else 0 end;

  if interior_is_owner(u) then src := 'owner';
  elsif interior_is_pro(u) or a.sub_until > now() then
    lim := case when interior_is_pro(u) then (case when p_kind like 'final%' then 50 when p_kind = 'draft' then 200 else 100 end)
                else (case when p_kind like 'final%' then 25 when p_kind = 'draft' then 125 else 50 end) end;
    select coalesce(sum(units),0) into used from interior_usage
      where user_id = u and not refunded and kind = any(fam) and created_at >= m0 and source in ('pro','sub');
    if used + v_units <= lim then src := case when interior_is_pro(u) then 'pro' else 'sub' end;
    elsif p_kind like 'final%' and cr >= v_units then src := 'credits';
    else return json_build_object('ok',false,'msg','limit','used',used,'limit',lim); end if;
  else
    if p_kind like 'final%' then
      select coalesce(sum(units),0) into used from interior_usage where user_id = u and not refunded and kind = any(fam) and source = 'free';
      if used = 0 and v_units = 1 then src := 'free';
      elsif cr >= v_units then src := 'credits';
      else return json_build_object('ok',false,'msg','no_credits'); end if;
    else
      lim := case when p_kind = 'draft' then 10 + 5*a.purchased else 3 + 2*a.purchased end;
      select coalesce(sum(units),0) into used from interior_usage where user_id = u and not refunded and kind = p_kind;
      if used + v_units > lim then return json_build_object('ok',false,'msg','limit','used',used,'limit',lim); end if;
      src := 'free';
    end if;
  end if;

  if src = 'credits' then update interior_accounts set credits = credits - v_units, updated_at = now() where user_id = u; end if;
  insert into interior_usage(user_id, kind, units, source, cost_usd) values (u, p_kind, v_units, src, interior_cost(p_kind)) returning id into new_id;
  return json_build_object('ok',true,'id',new_id,'source',src);
end $$;

create or replace function public.interior_refund(p_id bigint)
returns boolean language plpgsql security definer set search_path = public as $$
declare r interior_usage;
begin
  select * into r from interior_usage where id = p_id and user_id = auth.uid() and not refunded and created_at > now() - interval '15 minutes' for update;
  if r.id is null then return false; end if;
  update interior_usage set refunded = true, cost_usd = 0 where id = p_id;
  if r.source = 'credits' then update interior_accounts set credits = credits + r.units, updated_at = now() where user_id = r.user_id; end if;
  return true;
end $$;

-- ------------------------------------------------------------
-- Ενεργοποίηση κλειδιού PRO (από τον χρήστη)
-- ------------------------------------------------------------
create or replace function public.interior_redeem(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); k interior_keys; base timestamptz; until_ts timestamptz;
begin
  if u is null then return json_build_object('ok',false,'msg','login'); end if;
  select * into k from interior_keys where key = upper(trim(p_key)) for update;
  if k.key is null then return json_build_object('ok',false,'msg','Το κλειδί δεν υπάρχει'); end if;
  if k.revoked then return json_build_object('ok',false,'msg','Το κλειδί έχει ανακληθεί'); end if;
  if k.redeemed_by is not null and k.redeemed_by <> u then return json_build_object('ok',false,'msg','Το κλειδί χρησιμοποιήθηκε ήδη από άλλο λογαριασμό'); end if;
  if k.redeemed_by = u then return json_build_object('ok',true,'msg','Το κλειδί είναι ήδη ενεργό στον λογαριασμό σου','pro_until',(select pro_until from interior_accounts where user_id=u)); end if;
  insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
  select greatest(coalesce(pro_until, now()), now()) into base from interior_accounts where user_id = u;
  until_ts := base + make_interval(months => k.months);
  update interior_accounts set pro_until = until_ts, updated_at = now() where user_id = u;
  update interior_keys set redeemed_by = u, redeemed_at = now() where key = k.key;
  return json_build_object('ok',true,'msg','PRO ενεργό','pro_until',until_ts);
end $$;

-- ------------------------------------------------------------
-- ΔΙΑΧΕΙΡΙΣΗ (μόνο is_admin())
-- ------------------------------------------------------------
create or replace function public.admin_interior_new_keys(p_plan text, p_count int default 1, p_email text default null, p_name text default null, p_note text default null)
returns setof public.interior_keys language plpgsql security definer set search_path = public as $$
declare i int; k text; mo int := case p_plan when 'm1' then 1 when 'm6' then 6 when 'y1' then 12 end;
  al text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if mo is null then raise exception 'plan'; end if;
  for i in 1..greatest(1, least(coalesce(p_count,1), 50)) loop
    loop
      k := 'HXI-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4))
        || '-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4))
        || '-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4));
      exit when not exists (select 1 from interior_keys where key = k);
    end loop;
    insert into interior_keys(key, plan, months, email, name, note) values (k, p_plan, mo, nullif(trim(p_email),''), nullif(trim(p_name),''), nullif(trim(p_note),''));
    return query select * from interior_keys where key = k;
  end loop;
end $$;

create or replace function public.admin_interior_keys()
returns table(key text, plan text, months int, email text, name text, note text, created_at timestamptz, redeemed_at timestamptz, redeemed_email text, pro_until timestamptz, revoked boolean)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select k.key, k.plan, k.months, k.email, k.name, k.note, k.created_at, k.redeemed_at, u.email::text, a.pro_until, k.revoked
    from interior_keys k left join auth.users u on u.id = k.redeemed_by left join interior_accounts a on a.user_id = k.redeemed_by
    order by k.created_at desc;
end $$;

create or replace function public.admin_interior_revoke(p_key text)
returns void language plpgsql security definer set search_path = public as $$
declare r uuid; mo int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update interior_keys set revoked = true where key = p_key returning redeemed_by, months into r, mo;
  if r is not null then update interior_accounts set pro_until = greatest(now(), pro_until - make_interval(months => mo)) where user_id = r; end if;
end $$;

-- Πώληση πακέτου / συνδρομής χειροκίνητα (μέχρι να μπουν πληρωμές με κάρτα)
-- p_kind: pack5 | pack15 | pack40 | pro50 | sub1 | manual (με p_credits)
create or replace function public.admin_interior_grant(p_email text, p_kind text, p_credits int default 0, p_note text default null)
returns json language plpgsql security definer set search_path = public, auth as $$
declare u uuid; c int; eur numeric; a interior_accounts;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id into u from auth.users where lower(email) = lower(trim(p_email));
  if u is null then return json_build_object('ok',false,'msg','Δεν υπάρχει λογαριασμός με αυτό το email'); end if;
  c   := case p_kind when 'pack5' then 5 when 'pack15' then 15 when 'pack40' then 40 when 'pro50' then 50 when 'sub1' then 0 else coalesce(p_credits,0) end;
  eur := case p_kind when 'pack5' then 4.90 when 'pack15' then 9.90 when 'pack40' then 19.90 when 'pro50' then 14.88 when 'sub1' then 9.90 else null end;
  insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
  if p_kind = 'sub1' then
    update interior_accounts set sub_until = greatest(coalesce(sub_until, now()), now()) + interval '1 month', updated_at = now() where user_id = u;
  else
    update interior_accounts set
      credits = (case when credits_until is not null and credits_until < now() then 0 else credits end) + c,
      purchased = purchased + c, credits_until = now() + interval '12 months', updated_at = now()
    where user_id = u;
  end if;
  insert into interior_grants(user_id, kind, credits, amount_eur, note) values (u, p_kind, c, eur, p_note);
  select * into a from interior_accounts where user_id = u;
  return json_build_object('ok',true,'credits',a.credits,'sub_until',a.sub_until);
end $$;

-- Επισκόπηση: ανά χρήστη, με το ΠΡΑΓΜΑΤΙΚΟ κόστος (ορατό μόνο στον διαχειριστή)
create or replace function public.admin_interior_overview()
returns table(email text, tier text, pro_until timestamptz, sub_until timestamptz, credits int,
  m_final int, m_draft int, m_layout int, m_cost_usd numeric, all_cost_usd numeric, last_use timestamptz, sales_eur numeric)
language plpgsql stable security definer set search_path = public, auth as $$
declare m0 timestamptz := date_trunc('month', now());
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  with ids as (select user_id from interior_accounts union select user_id from interior_usage)
  select u.email::text,
    case when interior_is_owner(i.user_id) then 'owner' when interior_is_pro(i.user_id) then 'pro' when a.sub_until > now() then 'sub' else 'free' end,
    a.pro_until, a.sub_until, coalesce(a.credits,0),
    coalesce((select sum(x.units) from interior_usage x where x.user_id=i.user_id and not x.refunded and x.kind like 'final%' and x.created_at>=m0),0)::int,
    coalesce((select sum(x.units) from interior_usage x where x.user_id=i.user_id and not x.refunded and x.kind='draft' and x.created_at>=m0),0)::int,
    coalesce((select sum(x.units) from interior_usage x where x.user_id=i.user_id and not x.refunded and x.kind='layout' and x.created_at>=m0),0)::int,
    coalesce((select sum(x.cost_usd) from interior_usage x where x.user_id=i.user_id and x.created_at>=m0),0),
    coalesce((select sum(x.cost_usd) from interior_usage x where x.user_id=i.user_id),0),
    (select max(x.created_at) from interior_usage x where x.user_id=i.user_id),
    coalesce((select sum(g.amount_eur) from interior_grants g where g.user_id=i.user_id),0)
  from ids i join auth.users u on u.id = i.user_id left join interior_accounts a on a.user_id = i.user_id
  order by 11 desc nulls last;
end $$;

revoke execute on function public.interior_is_owner(uuid) from public, anon;
revoke execute on function public.interior_is_pro(uuid) from public, anon;
revoke execute on function public.admin_interior_new_keys(text,int,text,text,text) from public, anon;
revoke execute on function public.admin_interior_keys() from public, anon;
revoke execute on function public.admin_interior_revoke(text) from public, anon;
revoke execute on function public.admin_interior_grant(text,text,int,text) from public, anon;
revoke execute on function public.admin_interior_overview() from public, anon;
revoke execute on function public.interior_consume(text) from public, anon;
revoke execute on function public.interior_refund(bigint) from public, anon;
revoke execute on function public.interior_redeem(text) from public, anon;
revoke execute on function public.interior_status() from public, anon;
grant execute on function public.interior_consume(text), public.interior_refund(bigint), public.interior_redeem(text), public.interior_status(),
  public.admin_interior_new_keys(text,int,text,text,text), public.admin_interior_keys(), public.admin_interior_revoke(text),
  public.admin_interior_grant(text,text,int,text), public.admin_interior_overview() to authenticated;

-- ---------------------------------------------------------------------------
-- Πορτοφόλι χρήστη: υπόλοιπο μονάδων, αξία σε €, ιστορικό χρήσης (v4.87)
-- Αξία μονάδας = τιμή καταλόγου του πακέτου (και για δωρεάν/demo πακέτα), μέσος όρος βάσει μονάδων.
create or replace function public.interior_wallet(p_limit int default 40)
returns json language plpgsql security definer set search_path to 'public' as $$
declare u uuid := auth.uid(); a interior_accounts; cr int; epu numeric; hist json; tot_units int; tot_eur numeric;
begin
  if u is null then return json_build_object('ok',false); end if;
  select * into a from interior_accounts where user_id = u;
  cr := case when a.user_id is null then 0 when a.credits_until is null or a.credits_until > now() then coalesce(a.credits,0) else 0 end;
  select coalesce(sum(g.credits),0),
         coalesce(sum(g.credits * case g.kind when 'pack5' then 0.98 when 'pack15' then 0.66 when 'pack40' then 0.4975 when 'pro50' then 0.2976 else 0.98 end),0)
    into tot_units, tot_eur from interior_grants g where g.user_id = u and g.credits > 0;
  epu := case when tot_units > 0 then round(tot_eur / tot_units, 4) else 0.98 end;
  select coalesce(json_agg(x order by x.created_at desc),'[]'::json) into hist from (
    select id, created_at, kind, units, source, refunded,
           case when source = 'credits' and not refunded then round(units * epu, 2) else 0 end as eur
    from interior_usage where user_id = u order by created_at desc limit greatest(1, least(p_limit, 200))) x;
  return json_build_object('ok',true,'credits',cr,'credits_until',a.credits_until,'eur_per_unit',epu,'value_eur',round(cr*epu,2),
    'bought_units',tot_units,'bought_value_eur',round(tot_eur,2),
    'spent_units',(select coalesce(sum(units),0) from interior_usage where user_id=u and source='credits' and not refunded),
    'history',hist);
end $$;
revoke all on function public.interior_wallet(int) from public, anon;
grant execute on function public.interior_wallet(int) to authenticated;
