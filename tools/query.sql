select json_build_object(
 'all_users', pg_get_functiondef('public.admin_all_users'::regproc),
 'list_subs', pg_get_functiondef('public.admin_list_subs'::regproc),
 'sample', (select json_agg(t) from (select left(u.email,3) who, s.tier, s.active, s.trial_ends_at, (select json_agg(json_build_object('m',e.module,'a',e.active,'x',e.expires_at)) from entitlements e where e.user_id=u.id) ents from auth.users u left join subscriptions s on s.user_id=u.id where u.email in ('alafazanis@gmail.com','florihaskja2016@gmail.com','angelosmokas@gmail.com','birbasg@gmail.com')) t)
) as r;
-- run 1793279265
