-- HEXIS Interior · ΔΙΟΡΘΩΣΗ: σωστές (τελευταίες) εκδόσεις των συναρτήσεων κλειδιών + demo 5 και 7 ημερών.
-- Το προηγούμενο interior-demo-days.sql είχε κατά λάθος παλιές εκδόσεις. Τρέξε ΑΥΤΟ μία φορά στο Supabase → SQL Editor.
alter table public.interior_keys drop constraint if exists interior_keys_plan_check;
alter table public.interior_keys add constraint interior_keys_plan_check check (plan in ('d2','d5','d7','acc','m1','m6','y1'));

create or replace function public.interior_redeem(p_key text)
returns json language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); k interior_keys; base timestamptz; until_ts timestamptz; acc_ts timestamptz; fails int;
begin
  if u is null then return json_build_object('ok',false,'msg','login'); end if;
  select count(*) into fails from interior_audit where user_id = u and action = 'redeem' and not ok and at > now() - interval '1 hour';
  if fails >= 8 then return json_build_object('ok',false,'msg','Πολλές λάθος προσπάθειες · δοκίμασε σε μία ώρα'); end if;
  select * into k from interior_keys where key = upper(trim(p_key)) for update;
  if k.key is null or k.revoked or (k.redeemed_by is not null and k.redeemed_by <> u) then
    insert into interior_audit(user_id, action, ok, info) values (u, 'redeem', false, left(upper(trim(p_key)), 20));
    return json_build_object('ok',false,'msg', case when k.key is null then 'Το κλειδί δεν υπάρχει' when k.revoked then 'Το κλειδί έχει ανακληθεί' else 'Το κλειδί χρησιμοποιήθηκε ήδη από άλλο λογαριασμό' end);
  end if;
  if k.redeemed_by = u then return json_build_object('ok',true,'msg','Το κλειδί είναι ήδη ενεργό στον λογαριασμό σου'); end if;
  insert into interior_accounts(user_id) values (u) on conflict (user_id) do nothing;
  if k.plan in ('m1','m6','y1') then
    select greatest(coalesce(pro_until, now()), now()) into base from interior_accounts where user_id = u;
    until_ts := base + make_interval(months => k.months);
    update interior_accounts set pro_until = until_ts, access_until = greatest(coalesce(access_until, now()), until_ts), updated_at = now() where user_id = u;
  else
    acc_ts := case k.plan when 'd2' then now() + interval '48 hours' when 'd5' then now() + interval '5 days' when 'd7' then now() + interval '7 days' else now() + interval '100 years' end;
    update interior_accounts set access_until = greatest(coalesce(access_until, now()), acc_ts), updated_at = now() where user_id = u;
  end if;
  update interior_keys set redeemed_by = u, redeemed_at = now() where key = k.key;
  insert into interior_audit(user_id, action, ok, info) values (u, 'redeem', true, k.key);
  return json_build_object('ok',true,'msg',case k.plan when 'd2' then 'Demo 48 ωρών ενεργό' when 'd5' then 'Demo 5 ημερών ενεργό' when 'd7' then 'Demo 7 ημερών ενεργό' when 'acc' then 'Πρόσβαση ενεργή' else 'PRO ενεργό' end,'pro_until',until_ts);
end $$;

create or replace function public.admin_interior_new_keys(p_plan text, p_count int default 1, p_email text default null, p_name text default null, p_note text default null)
returns setof public.interior_keys language plpgsql security definer set search_path = public as $$
declare i int; k text; mo int := case p_plan when 'm1' then 1 when 'm6' then 6 when 'y1' then 12 when 'd2' then 0 when 'd5' then 0 when 'd7' then 0 when 'acc' then 0 end;
  al text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if mo is null then raise exception 'plan'; end if;
  for i in 1..greatest(1, least(coalesce(p_count,1), 50)) loop
    loop
      -- κρυπτογραφικά τυχαίο (gen_random_uuid), 12 χαρακτήρες από 32 = 60 bit
      k := 'HXI-' || (select string_agg(substr(al, 1 + (get_byte(b, n) % 32), 1), '' order by n) from (select decode(replace(gen_random_uuid()::text,'-',''),'hex') b) x, generate_series(0,11) n);
      k := substr(k,1,8) || '-' || substr(k,9,4) || '-' || substr(k,13,4);
      exit when not exists (select 1 from interior_keys where key = k);
    end loop;
    insert into interior_keys(key, plan, months, email, name, note) values (k, p_plan, mo, nullif(trim(p_email),''), nullif(trim(p_name),''), nullif(trim(p_note),''));
    return query select * from interior_keys where key = k;
  end loop;
end $$;
