-- ============================================================================
-- HEXIS-APP BoQ · συγχρονισμός έργων & κοινή χρήση με σύνδεσμο (boq-sync.sql)
-- Τα έργα ανήκουν σε ένα κλειδί BoQ (όλες οι συσκευές του κλειδιού βλέπουν τα ίδια έργα) ή στον διαχειριστή.
-- Ο κάτοχος δίνει πρόσβαση σε οποιονδήποτε με σύνδεσμο (προβολή ή επεξεργασία) — χωρίς λογαριασμό ή κλειδί.
-- Όλη η πρόσβαση γίνεται μόνο μέσω των RPC παρακάτω (RLS κλειστό για anon/authenticated).
-- p_auth: {"key":"BOQ-…","device":"…"}  ή  {"share":"<token>"}  ή  {} με JWT διαχειριστή.
-- ============================================================================
create table if not exists public.boq_projects (
  id text primary key,
  owner text not null,
  data jsonb not null,
  rev bigint not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);
create index if not exists boq_projects_owner on public.boq_projects(owner);
create table if not exists public.boq_shares (
  token text primary key,
  project_id text not null references public.boq_projects(id) on delete cascade,
  owner text not null,
  name text,
  role text not null default 'view' check (role in ('view','edit')),
  created_at timestamptz not null default now(),
  last_seen timestamptz
);
create index if not exists boq_shares_project on public.boq_shares(project_id);
create table if not exists public.boq_company (owner text primary key, data jsonb not null, updated_at timestamptz default now());
alter table public.boq_projects enable row level security;
alter table public.boq_shares enable row level security;
alter table public.boq_company enable row level security;
revoke all on public.boq_projects, public.boq_shares, public.boq_company from anon, authenticated;

-- ποιος είναι: επιστρέφει owner (κλειδί ή 'admin') ή share (token, project, role)
create or replace function public.boq_who(p_auth jsonb, out owner text, out share text, out sproj text, out srole text, out sowner text)
language plpgsql security definer set search_path = public as $$
declare k text := upper(regexp_replace(coalesce(p_auth->>'key',''), '\s', '', 'g'));
        s record;
begin
  if coalesce(p_auth->>'share','') <> '' then
    select * into s from boq_shares where token = p_auth->>'share';
    if found then share := s.token; sproj := s.project_id; srole := s.role; sowner := s.owner;
      update boq_shares set last_seen = now() where token = s.token; end if;
    return;
  end if;
  if public.is_admin() then owner := 'admin'; return; end if;
  if k <> '' and public.boq_ai_check(k, coalesce(p_auth->>'device','')) then owner := k; end if;
end $$;
revoke all on function public.boq_who(jsonb) from public, anon, authenticated;

-- λίστα + έγγραφα που άλλαξαν (p_since = {"<id>": rev, …})
create or replace function public.boq_sync(p_auth jsonb, p_since jsonb default '{}'::jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare w record; r json;
begin
  select * into w from public.boq_who(p_auth);
  if w.share is null and w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  select json_build_object('ok',true,
    'role', case when w.share is not null then w.srole else 'owner' end,
    'list', coalesce(json_agg(json_build_object('id',p.id,'rev',p.rev)),'[]'::json),
    'docs', coalesce(json_agg(json_build_object('id',p.id,'rev',p.rev,'data',p.data)) filter (where coalesce((p_since->>p.id)::bigint,0) < p.rev),'[]'::json))
  into r from boq_projects p
  where (w.share is not null and p.id = w.sproj) or (w.share is null and p.owner = w.owner);
  return r;
end $$;

create or replace function public.boq_put(p_auth jsonb, p_id text, p_data jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare w record; cur record; n bigint;
begin
  select * into w from public.boq_who(p_auth);
  if p_id is null or length(p_id) > 80 then return json_build_object('ok',false,'code','id'); end if;
  if octet_length(p_data::text) > 3000000 then return json_build_object('ok',false,'code','size','msg','Το έργο είναι πολύ μεγάλο για συγχρονισμό.'); end if;
  select * into cur from boq_projects where id = p_id;
  if w.share is not null then
    if w.srole <> 'edit' or w.sproj <> p_id or not found then return json_build_object('ok',false,'code','readonly'); end if;
    update boq_projects set data = p_data, rev = rev + 1, updated_at = now(), updated_by = 'share:' || coalesce((select name from boq_shares where token = w.share),'') where id = p_id returning rev into n;
    return json_build_object('ok',true,'rev',n);
  end if;
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  if found and cur.owner <> w.owner then return json_build_object('ok',false,'code','forbidden'); end if;
  if (select count(*) from boq_projects where owner = w.owner) >= 200 and not found then return json_build_object('ok',false,'code','limit'); end if;
  insert into boq_projects(id, owner, data, updated_by) values (p_id, w.owner, p_data, w.owner)
    on conflict (id) do update set data = excluded.data, rev = boq_projects.rev + 1, updated_at = now(), updated_by = w.owner
    returning rev into n;
  return json_build_object('ok',true,'rev',n);
end $$;

create or replace function public.boq_del(p_auth jsonb, p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.boq_who(p_auth);
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  delete from boq_projects where id = p_id and owner = w.owner;
  return json_build_object('ok',true);
end $$;

create or replace function public.boq_share_add(p_auth jsonb, p_id text, p_name text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare w record; t text;
begin
  select * into w from public.boq_who(p_auth);
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  if not exists (select 1 from boq_projects where id = p_id and owner = w.owner) then return json_build_object('ok',false,'code','sync','msg','Το έργο δεν έχει ανέβει ακόμη στον server· περιμένετε λίγα δευτερόλεπτα.'); end if;
  if p_role not in ('view','edit') then p_role := 'view'; end if;
  t := translate(encode(extensions.gen_random_bytes(18),'base64'),'+/=','-_');
  insert into boq_shares(token, project_id, owner, name, role) values (t, p_id, w.owner, nullif(trim(p_name),''), p_role);
  return json_build_object('ok',true,'token',t);
end $$;

create or replace function public.boq_share_list(p_auth jsonb, p_id text)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.boq_who(p_auth);
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  return json_build_object('ok',true,'items',(select coalesce(json_agg(json_build_object('token',token,'name',name,'role',role,'created_at',created_at,'last_seen',last_seen) order by created_at),'[]'::json) from boq_shares where project_id = p_id and owner = w.owner));
end $$;

create or replace function public.boq_share_set(p_auth jsonb, p_token text, p_role text)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.boq_who(p_auth);
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  if p_role is null then delete from boq_shares where token = p_token and owner = w.owner;
  else update boq_shares set role = case when p_role in ('view','edit') then p_role else 'view' end where token = p_token and owner = w.owner; end if;
  return json_build_object('ok',true);
end $$;

create or replace function public.boq_company_get(p_auth jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.boq_who(p_auth);
  return json_build_object('ok',true,'data',(select data from boq_company where owner = coalesce(w.owner, w.sowner)));
end $$;

create or replace function public.boq_company_set(p_auth jsonb, p_data jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare w record;
begin
  select * into w from public.boq_who(p_auth);
  if w.owner is null then return json_build_object('ok',false,'code','auth'); end if;
  if octet_length(p_data::text) > 1500000 then return json_build_object('ok',false,'code','size'); end if;
  insert into boq_company(owner, data) values (w.owner, p_data) on conflict (owner) do update set data = excluded.data, updated_at = now();
  return json_build_object('ok',true);
end $$;

do $$ declare f text; begin
  foreach f in array array['boq_sync(jsonb,jsonb)','boq_put(jsonb,text,jsonb)','boq_del(jsonb,text)','boq_share_add(jsonb,text,text,text)','boq_share_list(jsonb,text)','boq_share_set(jsonb,text,text)','boq_company_get(jsonb)','boq_company_set(jsonb,jsonb)'] loop
    execute 'revoke all on function public.' || f || ' from public';
    execute 'grant execute on function public.' || f || ' to anon, authenticated';
  end loop;
end $$;
