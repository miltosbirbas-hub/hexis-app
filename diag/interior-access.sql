select u.email, count(*) filter (where x.ok) as boots_ok, count(*) filter (where not x.ok) as boots_denied, max(x.at) filter (where x.ok) as last_ok,
  a.access_until, a.pro_until,
  (select string_agg(k.plan||':'||left(k.key,8),' ') from interior_keys k where k.redeemed_by=x.user_id) as keys,
  (select count(*) from entitlements e where e.user_id=x.user_id and e.module='interior' and e.active) as ent,
  public.interior_is_owner(x.user_id) as owner
from interior_audit x join auth.users u on u.id=x.user_id left join interior_accounts a on a.user_id=x.user_id
where x.action='boot' and x.at>now()-interval '12 days'
group by u.email, x.user_id, a.access_until, a.pro_until order by last_ok desc nulls last limit 80
