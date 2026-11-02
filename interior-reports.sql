-- HEXIS INTERIOR · αναφορές προβλημάτων από την εφαρμογή (κουμπί «⚠ Πρόβλημα»)
-- Τρέξε το μία φορά στο Supabase → SQL Editor. Δεν πειράζει τίποτα άλλο.
create table if not exists public.interior_reports (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  text       text,
  ctx        jsonb,
  shot       text,
  status     text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists interior_reports_time on public.interior_reports(created_at desc);
alter table public.interior_reports enable row level security;
revoke all on public.interior_reports from anon, authenticated;

-- αποστολή από την εφαρμογή (συνδεδεμένος χρήστης) · έως 15 ανά ώρα · στιγμιότυπο έως ~600 KB
create or replace function public.interior_report(p_text text, p_ctx jsonb, p_shot text)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); n int; em text;
begin
  if u is null then raise exception 'login'; end if;
  select count(*) into n from interior_reports where user_id = u and created_at > now() - interval '1 hour';
  if n >= 15 then return json_build_object('ok', false, 'msg', 'Πολλές αναφορές · δοκίμασε σε λίγο.'); end if;
  select email into em from auth.users where id = u;
  insert into interior_reports(user_id, email, text, ctx, shot)
  values (u, em, left(coalesce(p_text,''), 3000), p_ctx,
          case when p_shot like 'data:image/%' and length(p_shot) < 800000 then p_shot else null end);
  return json_build_object('ok', true);
end $$;
revoke all on function public.interior_report(text,jsonb,text) from public, anon;
grant execute on function public.interior_report(text,jsonb,text) to authenticated;

-- διαχειριστής: λίστα και κατάσταση
create or replace function public.admin_interior_reports()
returns setof public.interior_reports language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select * from interior_reports order by (status = 'new') desc, created_at desc limit 200;
end $$;
create or replace function public.admin_interior_report_set(p_id bigint, p_status text)
returns json language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update interior_reports set status = case when p_status in ('new','seen','fixed') then p_status else 'seen' end where id = p_id;
  return json_build_object('ok', true);
end $$;
revoke all on function public.admin_interior_reports(), public.admin_interior_report_set(bigint,text) from public, anon;
grant execute on function public.admin_interior_reports(), public.admin_interior_report_set(bigint,text) to authenticated;
