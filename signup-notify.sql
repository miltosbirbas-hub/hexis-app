-- =====================================================================
-- HEXIS — Ειδοποίηση με email σε κάθε νέα εγγραφή χρήστη
--   auth.users (INSERT) → trigger → pg_net → Edge Function «signup-notify»
--   → email σε brb.develop@gmail.com και miltos.birbas@gmail.com
-- Η εγγραφή του χρήστη ΔΕΝ επηρεάζεται ποτέ: η κλήση είναι ασύγχρονη και
-- κάθε σφάλμα εδώ αγνοείται.
-- Idempotent — μπορεί να ξανατρέξει.
-- =====================================================================

create extension if not exists pg_net with schema extensions;

-- Ποιες εγγραφές έχουν ήδη ειδοποιηθεί (μία φορά ανά χρήστη)
create table if not exists public.signup_notified (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  sent_ok   boolean,
  detail    text
);
alter table public.signup_notified enable row level security;
revoke all on public.signup_notified from anon, authenticated;

-- Καλείται ΜΟΝΟ από την Edge Function (service role): «κλειδώνει» τον χρήστη
-- και επιστρέφει τα στοιχεία του + μετρητές. Επιστρέφει κενό αν ο χρήστης
-- δεν είναι καινούργιος (>60 λεπτά), είναι demo ή έχει ήδη ειδοποιηθεί.
create or replace function public.signup_notify_claim(p_uid uuid)
returns table(email text, full_name text, created_at timestamptz, provider text,
              n_today int, n_7d int, n_30d int, n_total int)
language plpgsql security definer set search_path to 'public', 'auth' as $$
declare u auth.users;
begin
  select * into u from auth.users where id = p_uid;
  if u.id is null or u.created_at < now() - interval '60 minutes'
     or public.is_demo_auth(u.email, u.raw_user_meta_data) then return; end if;
  insert into public.signup_notified(user_id) values (p_uid) on conflict do nothing;
  if not found then return; end if;
  return query
  with r as (select a.created_at c from auth.users a where not public.is_demo_auth(a.email, a.raw_user_meta_data))
  select u.email::text,
         coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), nullif(trim(u.raw_user_meta_data->>'name'), ''), '')::text,
         u.created_at,
         coalesce(u.raw_app_meta_data->>'provider', 'email')::text,
         (select count(*) from r where c >= date_trunc('day', now() at time zone 'Europe/Athens') at time zone 'Europe/Athens')::int,
         (select count(*) from r where c >= now() - interval '7 days')::int,
         (select count(*) from r where c >= now() - interval '30 days')::int,
         (select count(*) from r)::int;
end $$;
revoke all on function public.signup_notify_claim(uuid) from public, anon, authenticated;
grant execute on function public.signup_notify_claim(uuid) to service_role;

create or replace function public.signup_notify_done(p_uid uuid, p_ok boolean, p_detail text)
returns void language sql security definer set search_path to 'public' as $$
  update public.signup_notified set sent_ok = p_ok, detail = left(p_detail, 500) where user_id = p_uid;
$$;
revoke all on function public.signup_notify_done(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.signup_notify_done(uuid, boolean, text) to service_role;

-- Trigger: μόλις δημιουργηθεί λογαριασμός, ειδοποίησε (ασύγχρονα)
create or replace function public.on_signup_notify()
returns trigger language plpgsql security definer set search_path to 'public', 'extensions' as $$
begin
  begin
    if not public.is_demo_auth(new.email, new.raw_user_meta_data) then
      perform net.http_post(
        url     := 'https://oucqqudfdimccgowvpqp.supabase.co/functions/v1/signup-notify',
        body    := jsonb_build_object('uid', new.id),
        headers := '{"Content-Type":"application/json"}'::jsonb);
    end if;
  exception when others then
    null; -- ποτέ να μη χαλάσει η εγγραφή
  end;
  return new;
end $$;

drop trigger if exists hexis_signup_notify on auth.users;
create trigger hexis_signup_notify after insert on auth.users
  for each row execute function public.on_signup_notify();
