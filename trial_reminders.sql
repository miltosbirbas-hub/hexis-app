-- =====================================================================
-- HEXIS — Υπενθύμιση λήξης δωρεάν δοκιμής (3 ημέρες πριν)
-- Το email το στέλνει καθημερινά Google Apps Script (brb.develop@gmail.com),
-- που καλεί τις δύο συναρτήσεις παρακάτω με μυστικό κλειδί.
-- Idempotent — μπορεί να ξανατρέξει.
-- =====================================================================

-- Ιδιωτικός πίνακας μυστικών (κανείς client δεν τον βλέπει)
create table if not exists public.app_secrets (
  name  text primary key,
  value text not null
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets(name, value)
values ('trial_reminder', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

-- Σε ποιους έχει σταλεί ήδη η υπενθύμιση
create table if not exists public.trial_reminders (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  trial_ends_at timestamptz,
  sent_at       timestamptz not null default now()
);
alter table public.trial_reminders enable row level security;
revoke all on public.trial_reminders from anon, authenticated;

-- Ποιοι χρειάζονται υπενθύμιση τώρα:
-- δωρεάν δοκιμή (tier free, ενεργή), λήγει μέσα στις επόμενες 3 ημέρες,
-- δεν έχει σταλεί ήδη για αυτή τη λήξη, λογαριασμός όχι μπλοκαρισμένος.
create or replace function public.trial_reminders_due(key text)
returns table (user_id uuid, email text, full_name text, trial_ends_at timestamptz, days_left int)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if key is null or key <> (select value from public.app_secrets where name = 'trial_reminder') then
    raise exception 'not authorized';
  end if;
  return query
    select s.user_id,
           u.email::text,
           coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), '')::text,
           s.trial_ends_at,
           greatest(1, ceil(extract(epoch from (s.trial_ends_at - now())) / 86400.0))::int
      from public.subscriptions s
      join auth.users u on u.id = s.user_id
      left join public.trial_reminders r on r.user_id = s.user_id
     where s.tier = 'free'
       and s.active
       and s.trial_ends_at > now()
       and s.trial_ends_at <= now() + interval '3 days'
       and (r.user_id is null or r.trial_ends_at is distinct from s.trial_ends_at)
       and (u.banned_until is null or u.banned_until < now())
       and u.email is not null;
end;
$$;

-- Σημείωση ότι στάλθηκε (ώστε να μη σταλεί δεύτερη φορά)
create or replace function public.trial_reminder_mark(key text, target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if key is null or key <> (select value from public.app_secrets where name = 'trial_reminder') then
    raise exception 'not authorized';
  end if;
  insert into public.trial_reminders(user_id, trial_ends_at, sent_at)
  select target, s.trial_ends_at, now() from public.subscriptions s where s.user_id = target
  on conflict (user_id) do update set trial_ends_at = excluded.trial_ends_at, sent_at = now();
end;
$$;

revoke all on function public.trial_reminders_due(text)       from public;
revoke all on function public.trial_reminder_mark(text, uuid) from public;
grant execute on function public.trial_reminders_due(text)       to anon, authenticated;
grant execute on function public.trial_reminder_mark(text, uuid) to anon, authenticated;
