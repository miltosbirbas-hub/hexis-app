-- HEXIS Interior · demo 5 και 7 ημερών (εκτός από το demo 48 ωρών).
-- Τρέξε το μία φορά στο Supabase → SQL Editor. Δεν πειράζει κλειδιά που έχουν ήδη δοθεί.
alter table public.interior_keys drop constraint if exists interior_keys_plan_check;
alter table public.interior_keys add constraint interior_keys_plan_check check (plan in ('d2','d5','d7','acc','m1','m6','y1'));

create or replace function public.interior_redeem(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); k interior_keys; base timestamptz; until_ts timestamptz;
begin
  if u is null then return json_build_object('ok',false,'msg','login'); end if;
  select * into k from interior_keys where key = upper(trim(p_key)) for update;
  if k.key is null then return json_build_object('ok',false,'msg','Το κλειδί δεν υπάρχει'); end if;
  if k.revoked then return json_build_object('ok',false,'msg','Το κλειδί έχει ανακληθεί'); end if;
  if k.redeemed_by is not null and k.redeemed_by <> u then return json_build_object('ok',false,'msg','Το κλειδί χρησιμοποιήθηκε ήδη από άλλο λογαριασμό'); end if;
  if k.redeemed_by = u then return json_build_object('ok',true,'msg','Το κλειδί είναι ήδη ενεργό στον λογαριασμό σου','pro_until',(select pro_until from interior_accounts where user_id=u)); end if;
  insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
  select greatest(coalesce(pro_until, now()), now()) into base from interior_accounts where user_id = u;
  until_ts := base + make_interval(months => k.months);
  update interior_accounts set pro_until = until_ts, updated_at = now() where user_id = u;
  update interior_keys set redeemed_by = u, redeemed_at = now() where key = k.key;
  return json_build_object('ok',true,'msg','PRO ενεργό','pro_until',until_ts);
end $$;

create or replace function public.admin_interior_new_keys(p_plan text, p_count int default 1, p_email text default null, p_name text default null, p_note text default null)
returns setof public.interior_keys language plpgsql security definer set search_path = public as $$
declare i int; k text; mo int := case p_plan when 'm1' then 1 when 'm6' then 6 when 'y1' then 12 end;
  al text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if mo is null then raise exception 'plan'; end if;
  for i in 1..greatest(1, least(coalesce(p_count,1), 50)) loop
    loop
      k := 'HXI-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4))
        || '-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4))
        || '-' || (select string_agg(substr(al, 1 + floor(random()*length(al))::int, 1), '') from generate_series(1,4));
      exit when not exists (select 1 from interior_keys where key = k);
    end loop;
    insert into interior_keys(key, plan, months, email, name, note) values (k, p_plan, mo, nullif(trim(p_email),''), nullif(trim(p_name),''), nullif(trim(p_note),''));
    return query select * from interior_keys where key = k;
  end loop;
end $$;
