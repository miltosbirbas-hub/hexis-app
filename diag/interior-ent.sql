select u.email, e.* from entitlements e join auth.users u on u.id=e.user_id where e.module='interior' order by 1
