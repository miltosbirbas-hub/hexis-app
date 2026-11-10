-- HEXIS TRAVERSE · συγχρονισμός έργων ανάμεσα στις συσκευές του ίδιου κλειδιού (κινητό ↔ υπολογιστής).
-- Προαιρετικός: ο χρήστης τον ανοίγει στα «Έργα». Πρόσβαση μόνο με κλειδί + καταχωρημένη συσκευή (ή διαχειριστή).
-- Τα έργα κάθε κλειδιού είναι χωριστά. Διαγραφή = σημάδι (ώστε να σβήνει και στις άλλες συσκευές).

create table if not exists public.trv_projects (
  ns         text not null,              -- κλειδί άδειας ή 'admin:<uid>'
  pid        text not null,
  name       text,
  t          bigint not null default 0,  -- χρόνος τελευταίας αλλαγής (ms, από τη συσκευή)
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (ns, pid)
);
alter table public.trv_projects enable row level security;   -- καμία άμεση πρόσβαση

create or replace function public.trv_sync_ns(p_key text, p_device text)
returns text language plpgsql security definer set search_path = public as $$
declare k text := upper(regexp_replace(coalesce(p_key,''), '\s', '', 'g')); l trv_licenses;
begin
  if k <> '' then
    select * into l from trv_licenses where key = k;
    if not found or l.revoked then return null; end if;
    if l.expires_at is not null and l.expires_at <= now() then return null; end if;
    if not exists (select 1 from trv_devices d where d.key = k and d.device_id = coalesce(p_device,'')) then return null; end if;
    return k;
  end if;
  if public.is_admin() then return 'admin:' || auth.uid()::text; end if;
  return null;
end $$;
revoke all on function public.trv_sync_ns(text,text) from public;

create or replace function public.trv_sync_list(p_key text, p_device text)
returns json language plpgsql security definer set search_path = public as $$
declare v_ns text := trv_sync_ns(p_key, p_device);
begin
  if v_ns is null then return json_build_object('ok',false,'msg','Ο συγχρονισμός θέλει ενεργό κλειδί σε αυτή τη συσκευή.'); end if;
  return json_build_object('ok',true,'items',coalesce((select json_agg(json_build_object('pid',pid,'name',name,'t',t,'deleted',deleted)) from trv_projects where trv_projects.ns = v_ns),'[]'::json));
end $$;

create or replace function public.trv_sync_get(p_key text, p_device text, p_pids text[])
returns json language plpgsql security definer set search_path = public as $$
declare v_ns text := trv_sync_ns(p_key, p_device);
begin
  if v_ns is null then return json_build_object('ok',false,'msg','Ο συγχρονισμός θέλει ενεργό κλειδί σε αυτή τη συσκευή.'); end if;
  return json_build_object('ok',true,'items',coalesce((select json_agg(json_build_object('pid',pid,'name',name,'t',t,'data',data))
    from trv_projects p where p.ns = v_ns and p.pid = any(p_pids) and not p.deleted),'[]'::json));
end $$;

create or replace function public.trv_sync_put(p_key text, p_device text, p_pid text, p_name text, p_t bigint, p_data jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare v_ns text := trv_sync_ns(p_key, p_device); n int;
begin
  if v_ns is null then return json_build_object('ok',false,'msg','Ο συγχρονισμός θέλει ενεργό κλειδί σε αυτή τη συσκευή.'); end if;
  if coalesce(p_pid,'') = '' or length(p_pid) > 60 then return json_build_object('ok',false,'msg','Μη έγκυρο έργο'); end if;
  if length(coalesce(p_data::text,'')) > 3000000 then return json_build_object('ok',false,'msg','Το έργο είναι πολύ μεγάλο για συγχρονισμό'); end if;
  select count(*) into n from trv_projects where trv_projects.ns = v_ns and not deleted;
  if n >= 1000 and not exists (select 1 from trv_projects where trv_projects.ns = v_ns and pid = p_pid) then return json_build_object('ok',false,'msg','Έφτασες τα 1000 έργα στον συγχρονισμό'); end if;
  insert into trv_projects(ns, pid, name, t, data, deleted, updated_at) values (v_ns, p_pid, left(p_name,120), p_t, p_data, false, now())
  on conflict (ns, pid) do update set name = excluded.name, t = excluded.t, data = excluded.data, deleted = false, updated_at = now()
    where trv_projects.t < excluded.t;
  return json_build_object('ok',true);
end $$;

create or replace function public.trv_sync_del(p_key text, p_device text, p_pid text, p_t bigint)
returns json language plpgsql security definer set search_path = public as $$
declare v_ns text := trv_sync_ns(p_key, p_device);
begin
  if v_ns is null then return json_build_object('ok',false); end if;
  insert into trv_projects(ns, pid, t, data, deleted) values (v_ns, p_pid, p_t, null, true)
  on conflict (ns, pid) do update set deleted = true, data = null, t = greatest(trv_projects.t, excluded.t), updated_at = now();
  return json_build_object('ok',true);
end $$;

revoke all on function public.trv_sync_list(text,text) from public;
revoke all on function public.trv_sync_get(text,text,text[]) from public;
revoke all on function public.trv_sync_put(text,text,text,text,bigint,jsonb) from public;
revoke all on function public.trv_sync_del(text,text,text,bigint) from public;
grant execute on function public.trv_sync_list(text,text) to anon, authenticated;
grant execute on function public.trv_sync_get(text,text,text[]) to anon, authenticated;
grant execute on function public.trv_sync_put(text,text,text,text,bigint,jsonb) to anon, authenticated;
grant execute on function public.trv_sync_del(text,text,text,bigint) to anon, authenticated;
