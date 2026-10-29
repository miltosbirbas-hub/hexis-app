-- ============================================================================
-- HEXIS · πραγματικό κόστος AI (Anthropic / Google) και υπόλοιπο προπληρωμένων μονάδων
-- Οι Edge Functions γράφουν το πραγματικό κόστος κάθε κλήσης (tokens × τιμοκατάλογος) στο interior_usage.
-- Ο admin καταχωρεί τις φορτώσεις (π.χ. 20 €) και βλέπει πόσα ξοδεύτηκαν και τι μένει.
-- ============================================================================
alter table public.interior_usage add column if not exists model text;
alter table public.interior_usage add column if not exists in_tokens integer;
alter table public.interior_usage add column if not exists out_tokens integer;
alter table public.interior_usage add column if not exists real_cost boolean not null default false;

create table if not exists public.hx_ai_topups (
  id         bigserial primary key,
  provider   text not null check (provider in ('anthropic','google')),
  amount     numeric(10,2) not null check (amount > 0),
  currency   text not null default 'EUR' check (currency in ('EUR','USD')),
  note       text,
  created_at timestamptz not null default now()
);
create table if not exists public.hx_settings (k text primary key, v text not null, updated_at timestamptz not null default now());
insert into public.hx_settings(k,v) values ('fx_eur_per_usd','0.90') on conflict (k) do nothing;
alter table public.hx_ai_topups enable row level security;
alter table public.hx_settings  enable row level security;

create or replace function public.hx_ai_provider(k text) returns text language sql immutable as $$
  select case when k = 'layout' then 'anthropic' else 'google' end $$;

create or replace function public.admin_ai_budget()
returns json language plpgsql security definer set search_path to 'public' as $$
declare fx numeric; res json;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select v::numeric into fx from hx_settings where k = 'fx_eur_per_usd'; fx := coalesce(fx, 0.90);
  with p(provider) as (values ('anthropic'),('google')),
  t as (select provider, sum(case when currency='USD' then amount*fx else amount end) eur, min(created_at) since, count(*) n, max(created_at) last_at
        from hx_ai_topups group by provider),
  u as (select hx_ai_provider(x.kind) provider, x.created_at, x.cost_usd, x.real_cost from interior_usage x where not x.refunded),
  s as (select p.provider,
          coalesce((select sum(u.cost_usd) from u where u.provider=p.provider and (t.since is null or u.created_at >= t.since)),0) usd,
          coalesce((select count(*) from u where u.provider=p.provider and (t.since is null or u.created_at >= t.since)),0) cnt,
          coalesce((select count(*) from u where u.provider=p.provider and u.real_cost and (t.since is null or u.created_at >= t.since)),0) cnt_real,
          coalesce((select sum(u.cost_usd) from u where u.provider=p.provider and u.created_at >= now() - interval '30 days'),0) usd30,
          t.eur, t.since, t.last_at
        from p left join t on t.provider = p.provider)
  select json_build_object('fx', fx, 'providers', json_agg(json_build_object(
      'provider', provider, 'topped_eur', round(coalesce(eur,0),2), 'since', since, 'last_topup', last_at,
      'spent_eur', round(usd*fx,2), 'spent_usd', round(usd,4), 'uses', cnt, 'uses_real', cnt_real,
      'remaining_eur', case when eur is null then null else round(eur - usd*fx,2) end,
      'avg_eur', case when cnt>0 then round(usd*fx/cnt,4) else null end, 'last30_eur', round(usd30*fx,2)) order by provider),
    'topups', (select coalesce(json_agg(json_build_object('id',id,'provider',provider,'amount',amount,'currency',currency,'note',note,'at',created_at) order by created_at desc),'[]') from hx_ai_topups))
  into res from s;
  return res;
end $$;

create or replace function public.admin_ai_topup(p_provider text, p_amount numeric, p_currency text default 'EUR', p_note text default null)
returns json language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  insert into hx_ai_topups(provider, amount, currency, note) values (p_provider, p_amount, upper(coalesce(p_currency,'EUR')), p_note);
  return public.admin_ai_budget();
end $$;

create or replace function public.admin_ai_topup_delete(p_id bigint)
returns json language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  delete from hx_ai_topups where id = p_id;
  return public.admin_ai_budget();
end $$;

create or replace function public.admin_ai_set_fx(p_fx numeric)
returns json language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  if p_fx is null or p_fx <= 0.3 or p_fx > 3 then raise exception 'bad fx'; end if;
  insert into hx_settings(k,v,updated_at) values ('fx_eur_per_usd', p_fx::text, now()) on conflict (k) do update set v = excluded.v, updated_at = now();
  return public.admin_ai_budget();
end $$;

revoke all on function public.admin_ai_budget() from public, anon;
revoke all on function public.admin_ai_topup(text,numeric,text,text) from public, anon;
revoke all on function public.admin_ai_topup_delete(bigint) from public, anon;
revoke all on function public.admin_ai_set_fx(numeric) from public, anon;
grant execute on function public.admin_ai_budget() to authenticated;
grant execute on function public.admin_ai_topup(text,numeric,text,text) to authenticated;
grant execute on function public.admin_ai_topup_delete(bigint) to authenticated;
grant execute on function public.admin_ai_set_fx(numeric) to authenticated;
