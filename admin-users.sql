-- HEXIS Admin · πραγματική λήξη ανά χρήστη (από τις ενεργές άδειες εφαρμογών)
create or replace function public.admin_user_expiry()
returns table(uid uuid, next_exp timestamptz, last_exp timestamptz, perm_mods int, live_mods int)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
  select e.user_id,
         min(e.expires_at) filter (where e.active and e.expires_at > now()),
         max(e.expires_at) filter (where e.active),
         (count(*) filter (where e.active and e.expires_at is null))::int,
         (count(*) filter (where e.active and (e.expires_at is null or e.expires_at > now())))::int
  from public.entitlements e group by e.user_id;
end $$;
revoke all on function public.admin_user_expiry() from public, anon;
grant execute on function public.admin_user_expiry() to authenticated;

-- ── Λογαριασμοί demo (HEXIS MAPPING) ─────────────────────────────────────────
-- Ο λογαριασμός που φτιάχνει η πύλη για κωδικό demo είναι ΜΟΝΟ για το MAPPING:
-- δεν παίρνει δοκιμή 14 ημερών ούτε τις δωρεάν εφαρμογές του hub.
create or replace function public.is_demo_auth(email text, meta jsonb)
returns boolean language sql immutable as $$
  select coalesce(meta->>'demo','') = 'true' or lower(coalesce(email,'')) like '%@demo.hexis-app.gr'
$$;

create or replace function public.grant_trial_modules()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if public.is_demo_auth(new.email, new.raw_user_meta_data) then return new; end if;
  insert into public.entitlements (user_id, module, active, expires_at)
  select new.id, m, true, now() + interval '14 days'
  from unnest(array['mpeton','rtk','ktima','dxf','domisi','nomothesia','kostos','terrain']) as m
  on conflict do nothing;
  return new;
end $$;

create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if public.is_demo_auth(new.email, new.raw_user_meta_data) then return new; end if;
  insert into public.subscriptions (user_id, tier, active, trial_ends_at)
  values (new.id, 'free', true, now() + interval '14 days')
  on conflict (user_id) do nothing;
  return new;
end $$;

-- καθαρισμός όσων φτιάχτηκαν πριν: μόνο MAPPING
delete from public.entitlements e using auth.users u
 where e.user_id = u.id and public.is_demo_auth(u.email, u.raw_user_meta_data) and e.module <> 'mapping';
delete from public.subscriptions s using auth.users u
 where s.user_id = u.id and public.is_demo_auth(u.email, u.raw_user_meta_data);

-- Admin: ποιος δοκιμαστής είναι πίσω από κάθε λογαριασμό demo
create or replace function public.admin_demo_accounts()
returns table(uid uuid, lic_key text, tester_email text, tester_name text, expires_at timestamptz)
language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  return query
  select u.id, l.key::text, l.email::text, l.name::text, l.expires_at
  from auth.users u
  left join public.mapping_licenses l on l.user_id = u.id and l.kind = 'demo'
  where public.is_demo_auth(u.email, u.raw_user_meta_data);
end $$;
revoke all on function public.admin_demo_accounts() from public, anon;
grant execute on function public.admin_demo_accounts() to authenticated;

-- ── Admin: εφαρμογή σε χρήστη (διακόπτης «Modules») ──────────────────────────
-- Χρήστης σε δοκιμή (free με ημερομηνία δοκιμής): η εφαρμογή λήγει ΑΚΡΙΒΩΣ μαζί
-- με τη δοκιμή του — ούτε μέρα παραπάνω (παλιά έδινε 1 έτος).
-- Χρήστης χωρίς δοκιμή (π.χ. συνδρομητής Site Manager): demo 14 ημερών.
-- Δωρεάν / πλήρη πρόσβαση δίνεις από «Πληρωμές → Δωρεάν ή demo».
-- Δεν κονταίνει ποτέ ισχύουσα μεγαλύτερη (π.χ. αγορασμένη) άδεια.
drop function if exists public.admin_set_module(text, text, boolean);
create function public.admin_set_module(u_email text, m text, on_off boolean)
returns timestamptz language plpgsql security definer set search_path to 'public' as $$
declare uid uuid; s public.subscriptions; exp timestamptz;
begin
  if not public.is_admin() then raise exception 'not admin'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(u_email));
  if uid is null then raise exception 'Δεν βρέθηκε χρήστης'; end if;
  if not on_off then
    update public.entitlements set active = false where user_id = uid and module = m;
    return null;
  end if;
  select * into s from public.subscriptions where user_id = uid;
  if coalesce(s.tier, 'free') = 'free' and s.trial_ends_at is not null then
    exp := s.trial_ends_at;
  else
    exp := now() + interval '14 days';
  end if;
  insert into public.entitlements (user_id, module, active, expires_at)
  values (uid, m, true, exp)
  on conflict (user_id, module) do update
    set active = true,
        expires_at = case when entitlements.active
                           and (entitlements.expires_at is null or entitlements.expires_at > exp)
                          then entitlements.expires_at else exp end;
  return (select expires_at from public.entitlements where user_id = uid and module = m);
end $$;
revoke all on function public.admin_set_module(text, text, boolean) from public, anon;
grant execute on function public.admin_set_module(text, text, boolean) to authenticated;
