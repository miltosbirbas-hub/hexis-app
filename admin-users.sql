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
