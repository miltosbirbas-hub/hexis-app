-- HEXIS TRAVERSE · ζωντανή σύνδεση χειριστή οργάνου ↔ στοχοφόρου για χάραξη.
-- Ο χειριστής ανοίγει «συνεδρία» με τα σημεία χάραξης και παίρνει κωδικό 6 χαρακτήρων + μυστικό.
-- Ο στοχοφόρος ανοίγει hexis-app.gr/traverse.html#s=ΚΩΔΙΚΟΣ και βλέπει τρέχον σημείο και μηνύματα.
-- ΔΕΝ αποθηκεύεται θέση του στοχοφόρου (μόνο πότε ήταν τελευταία συνδεδεμένος). Οι συνεδρίες σβήνονται μετά από 3 ημέρες.

create table if not exists public.trv_stake (
  code       text primary key,
  token      text not null,
  title      text,
  pts        jsonb not null default '[]'::jsonb,
  pts_ver    int  not null default 1,
  cur        text,
  msg        text,
  msg_id     int  not null default 0,
  rod_seen   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trv_stake enable row level security;   -- καμία άμεση πρόσβαση· μόνο μέσω των συναρτήσεων

create or replace function public.trv_stake_create(p_title text, p_pts jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare c text; t text; i int; abc text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_pts is null or jsonb_typeof(p_pts) <> 'array' then return json_build_object('ok',false,'msg','Δεν υπάρχουν σημεία'); end if;
  if jsonb_array_length(p_pts) > 3000 or length(p_pts::text) > 400000 then return json_build_object('ok',false,'msg','Πάρα πολλά σημεία για μία συνεδρία'); end if;
  delete from trv_stake where updated_at < now() - interval '3 days';
  loop
    c := ''; for i in 1..6 loop c := c || substr(abc, 1 + floor(random()*length(abc))::int, 1); end loop;
    exit when not exists (select 1 from trv_stake where code = c);
  end loop;
  t := md5(random()::text || clock_timestamp()::text || c);
  insert into trv_stake(code, token, title, pts) values (c, t, left(p_title, 80), p_pts);
  return json_build_object('ok',true,'code',c,'token',t);
end $$;

create or replace function public.trv_stake_get(p_code text, p_ver int default 0, p_rod boolean default false)
returns json language plpgsql security definer set search_path = public as $$
declare s trv_stake;
begin
  select * into s from trv_stake where code = upper(trim(coalesce(p_code,'')));
  if not found then return json_build_object('ok',false,'msg','Η σύνδεση έκλεισε ή ο κωδικός δεν είναι σωστός.'); end if;
  if p_rod then update trv_stake set rod_seen = now() where code = s.code; end if;
  return json_build_object('ok',true,'title',s.title,'cur',s.cur,'msg',s.msg,'msg_id',s.msg_id,'pts_ver',s.pts_ver,
    'pts', case when coalesce(p_ver,0) <> s.pts_ver then s.pts else null end,
    'rod_seen',s.rod_seen,'server_time',now());
end $$;

create or replace function public.trv_stake_set(p_code text, p_token text, p_cur text default null, p_msg text default null, p_pts jsonb default null)
returns json language plpgsql security definer set search_path = public as $$
declare s trv_stake;
begin
  select * into s from trv_stake where code = upper(trim(coalesce(p_code,''))) for update;
  if not found or s.token <> coalesce(p_token,'') then return json_build_object('ok',false,'msg','Η σύνδεση έκλεισε.'); end if;
  if p_pts is not null and (jsonb_typeof(p_pts) <> 'array' or length(p_pts::text) > 400000) then return json_build_object('ok',false,'msg','Πάρα πολλά σημεία'); end if;
  update trv_stake set
    cur = coalesce(p_cur, cur),
    msg = case when p_msg is not null then left(p_msg, 120) else msg end,
    msg_id = case when p_msg is not null then msg_id + 1 else msg_id end,
    pts = coalesce(p_pts, pts),
    pts_ver = case when p_pts is not null then pts_ver + 1 else pts_ver end,
    updated_at = now()
  where code = s.code returning * into s;
  return json_build_object('ok',true,'msg_id',s.msg_id,'pts_ver',s.pts_ver,'rod_seen',s.rod_seen);
end $$;

create or replace function public.trv_stake_close(p_code text, p_token text)
returns json language plpgsql security definer set search_path = public as $$
begin
  delete from trv_stake where code = upper(trim(coalesce(p_code,''))) and token = coalesce(p_token,'');
  return json_build_object('ok',true);
end $$;

revoke all on function public.trv_stake_create(text,jsonb) from public;
revoke all on function public.trv_stake_get(text,int,boolean) from public;
revoke all on function public.trv_stake_set(text,text,text,text,jsonb) from public;
revoke all on function public.trv_stake_close(text,text) from public;
grant execute on function public.trv_stake_create(text,jsonb) to anon, authenticated;
grant execute on function public.trv_stake_get(text,int,boolean) to anon, authenticated;
grant execute on function public.trv_stake_set(text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.trv_stake_close(text,text) to anon, authenticated;
