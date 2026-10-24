-- =====================================================================
-- HEXIS Admin — διαχείριση λογαριασμών (admin.html v1.8+)
--   • admin_auth_status()              → κατάσταση λογαριασμών (μπλοκ/επιβεβαίωση)
--   • admin_set_banned(target, ban)    → μπλοκάρισμα / ξεμπλοκάρισμα email
--   • admin_set_password(target, pw)   → ορισμός νέου κωδικού από admin
--   • admin_delete_user(target)        → οριστική διαγραφή χρήστη
-- Τρέξ' το μία φορά στο Supabase → SQL Editor. Είναι idempotent.
-- Όλες οι συναρτήσεις ελέγχουν public.is_admin() και αρνούνται
-- ενέργειες πάνω στον δικό σου λογαριασμό.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Κατάσταση λογαριασμών για τη λίστα χρηστών
-- ---------------------------------------------------------------------
create or replace function public.admin_auth_status()
returns table (uid uuid, banned boolean, banned_until timestamptz, email_confirmed boolean)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  return query
    select u.id,
           (u.banned_until is not null and u.banned_until > now()),
           u.banned_until,
           (u.email_confirmed_at is not null)
    from auth.users u;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Μπλοκάρισμα / ξεμπλοκάρισμα (το email δεν μπορεί να συνδεθεί)
--    Στο μπλοκάρισμα σβήνονται και όλες οι ενεργές συνεδρίες, άρα
--    ο χρήστης αποσυνδέεται σε όλες τις συσκευές (το πολύ σε ~1 ώρα,
--    όταν λήξει το τρέχον access token).
-- ---------------------------------------------------------------------
create or replace function public.admin_set_banned(target uuid, ban boolean)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if target = auth.uid() then
    raise exception 'Δεν μπορείς να μπλοκάρεις τον δικό σου λογαριασμό';
  end if;

  update auth.users
     set banned_until = case when ban then 'infinity'::timestamptz else null end,
         updated_at   = now()
   where id = target;
  if not found then
    raise exception 'Ο χρήστης δεν βρέθηκε';
  end if;

  if ban then
    delete from auth.sessions where user_id = target;  -- refresh tokens φεύγουν με cascade
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Ορισμός νέου κωδικού από τον admin
-- ---------------------------------------------------------------------
create or replace function public.admin_set_password(target uuid, new_password text)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if target = auth.uid() then
    raise exception 'Για τον δικό σου κωδικό χρησιμοποίησε την «Αλλαγή κωδικού»';
  end if;
  if new_password is null or length(new_password) < 8 then
    raise exception 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at         = now()
   where id = target;
  if not found then
    raise exception 'Ο χρήστης δεν βρέθηκε';
  end if;

  -- αποσύνδεση από όλες τις συσκευές με τον παλιό κωδικό
  delete from auth.sessions where user_id = target;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Οριστική διαγραφή χρήστη
--    Σβήνει πρώτα τις γραμμές σε ΚΑΘΕ πίνακα του schema public που έχει
--    foreign key προς auth.users (ώστε να μη μπλοκάρει όσους πίνακες
--    δεν έχουν "on delete cascade"), μετά τις γραμμές που κρατάνε το
--    email (π.χ. entitlements/requests), και τέλος τον χρήστη.
--    ΔΕΝ σβήνει αρχεία από Storage (hexis-photos / hexis-files).
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(target uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  r      record;
  v_mail text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;
  if target = auth.uid() then
    raise exception 'Δεν μπορείς να διαγράψεις τον δικό σου λογαριασμό';
  end if;

  select email into v_mail from auth.users where id = target;
  if not found then
    raise exception 'Ο χρήστης δεν βρέθηκε';
  end if;

  -- (α) πίνακες με FK προς auth.users(id) χωρίς δικό τους cascade/set null:
  --     στήλες «ιδιοκτήτη» (user_id, owner…) → σβήνεται η γραμμή,
  --     άλλες nullable στήλες (π.χ. approved_by) → γίνονται null,
  --     ώστε να μη χαθούν δεδομένα άλλων χρηστών.
  for r in
    select c.conrelid::regclass as tbl, a.attname as col, a.attnotnull as notnull
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
       and c.confdeltype not in ('c', 'n', 'd')
       and c.conrelid::regclass::text not like 'auth.%'
       and c.conrelid::regclass::text not like 'storage.%'
       and array_length(c.conkey, 1) = 1
  loop
    if r.notnull or r.col in ('user_id', 'uid', 'owner', 'owner_id', 'user') then
      execute format('delete from %s where %I = $1', r.tbl, r.col) using target;
    else
      execute format('update %s set %I = null where %I = $1', r.tbl, r.col, r.col) using target;
    end if;
  end loop;

  -- (β) πίνακες του public που κρατάνε τον χρήστη μόνο με email
  for r in
    select format('%I.%I', table_schema, table_name) as tbl, column_name as col
      from information_schema.columns
     where table_schema = 'public'
       and column_name in ('email', 'user_email', 'u_email')
       and table_name in (select table_name from information_schema.tables
                           where table_schema = 'public' and table_type = 'BASE TABLE')
  loop
    execute format('delete from %s where lower(%I) = lower($1)', r.tbl, r.col) using v_mail;
  end loop;

  -- (γ) ο ίδιος ο λογαριασμός (sessions, identities κ.λπ. φεύγουν με cascade)
  delete from auth.users where id = target;
end;
$$;

-- Δικαιώματα: μόνο συνδεδεμένοι χρήστες μπορούν να τις καλέσουν
-- (και μέσα τους ελέγχεται is_admin()).
revoke all on function public.admin_auth_status()                  from public, anon;
revoke all on function public.admin_set_banned(uuid, boolean)      from public, anon;
revoke all on function public.admin_set_password(uuid, text)       from public, anon;
revoke all on function public.admin_delete_user(uuid)              from public, anon;
grant execute on function public.admin_auth_status()               to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean)   to authenticated;
grant execute on function public.admin_set_password(uuid, text)    to authenticated;
grant execute on function public.admin_delete_user(uuid)           to authenticated;
