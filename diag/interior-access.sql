select u.email,
  (select count(*) from interior_audit x where x.user_id=a.user_id and x.action='boot' and x.ok and x.at>now()-interval '10 days') as boots_ok,
  (select max(at) from interior_audit x where x.user_id=a.user_id and x.action='boot' and x.ok) as last_boot,
  a.access_until, a.pro_until,
  (select string_agg(k.plan||':'||k.key,' ') from interior_keys k where k.redeemed_by=a.user_id) as keys,
  (select count(*) from entitlements e where e.user_id=a.user_id and e.module='interior' and e.active) as ent,
  public.interior_is_owner(a.user_id) as owner,
  (select role from profiles p where p.id=a.user_id) as role
from interior_accounts a join auth.users u on u.id=a.user_id
order by last_boot desc nulls last limit 60;
