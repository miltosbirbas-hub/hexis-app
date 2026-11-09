-- HEXIS INTERIOR · αισθητήρας λειτουργίας (αυτοβελτίωση). Τρέχει αυτόματα στο deploy (edge-functions.yml) · ασφαλές να ξανατρέξει.
-- Καταγράφει σφάλματα, αποτυχίες AI, μηνύματα αποτυχίας και ποια κουμπιά χρησιμοποιούνται. ΟΧΙ θέση, ΟΧΙ περιεχόμενο έργων.
create table if not exists public.interior_telemetry (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  user_id uuid,
  dev     text,
  ver     text,
  kind    text,
  code    text,
  n       int not null default 1,
  val     real,
  msg     text,
  ctx     jsonb
);
create index if not exists interior_telemetry_at on public.interior_telemetry(at desc);
create index if not exists interior_telemetry_user on public.interior_telemetry(user_id, at desc);
alter table public.interior_telemetry enable row level security;
revoke all on public.interior_telemetry from anon, authenticated;

create or replace function public.interior_tel(p_dev text, p_ver text, p_items jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); c int;
begin
  if u is null or jsonb_typeof(p_items) <> 'array' then return json_build_object('ok', false); end if;
  select count(*) into c from interior_telemetry where user_id = u and at > now() - interval '1 hour';
  if c > 800 then return json_build_object('ok', false, 'msg', 'rate'); end if;
  insert into interior_telemetry(user_id, dev, ver, kind, code, n, val, msg, ctx)
  select u, left(coalesce(p_dev,''), 40), left(coalesce(p_ver,''), 30),
         left(coalesce(x->>'k',''), 12), left(coalesce(x->>'c',''), 160),
         least(greatest(coalesce((x->>'n')::int, 1), 1), 100000),
         case when jsonb_typeof(x->'v') = 'number' then (x->>'v')::real end,
         left(x->>'m', 600),
         case when jsonb_typeof(x->'x') = 'object' and length((x->'x')::text) < 2500 then x->'x' end
  from (select value as x from jsonb_array_elements(p_items) limit 120) s;
  return json_build_object('ok', true);
end $$;
revoke all on function public.interior_tel(text, text, jsonb) from public, anon;
grant execute on function public.interior_tel(text, text, jsonb) to authenticated;
-- παλιά δεδομένα: κρατάμε 120 ημέρες
delete from public.interior_telemetry where at < now() - interval '120 days';
