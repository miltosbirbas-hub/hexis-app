select u.email, public.interior_has_access(e.user_id) as has_access from entitlements e join auth.users u on u.id=e.user_id where e.module='interior' order by 1
