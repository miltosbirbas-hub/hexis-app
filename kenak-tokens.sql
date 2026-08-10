-- ============================================================
-- HEXIS ΚΕΝΑΚ — Token σύστημα ΠΕΑ
-- 5€ + ΦΠΑ / ΠΕΑ · ελάχιστη αγορά 50€ (10 ΠΕΑ) · ανανέωση ανά 50€
-- ΔΩΡΟ 1 ΠΕΑ σε κάθε ΑΝΑΝΕΩΣΗ (11 αντί 10 από τη 2η αγορά και μετά)
-- Τρέξε στο SQL editor του Supabase (project hexis-app).
-- ============================================================

create table if not exists public.kenak_tokens (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  balance     integer not null default 0 check (balance >= 0),
  purchased   integer not null default 0,      -- σύνολο αγορασμένων (χωρίς δώρα)
  bonus       integer not null default 0,      -- σύνολο δώρων
  spent       integer not null default 0,
  renewals    integer not null default 0,      -- πλήθος αγορών (η 1η = αρχική, 2+ = ανανεώσεις)
  updated_at  timestamptz not null default now()
);

alter table public.kenak_tokens enable row level security;

-- Ο χρήστης βλέπει ΜΟΝΟ το δικό του υπόλοιπο. Εγγραφές/αλλαγές ΜΟΝΟ από RPC (security definer).
drop policy if exists "kenak_tokens_select_own" on public.kenak_tokens;
create policy "kenak_tokens_select_own" on public.kenak_tokens
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- ΑΓΟΡΑ/ΑΝΑΝΕΩΣΗ: καλείται από τον ΔΙΑΧΕΙΡΙΣΤΗ (service role ή admin)
-- μετά την είσπραξη. p_packs = πόσα πακέτα των 50€ (10 ΠΕΑ το καθένα).
-- Δώρο: +1 ΠΕΑ ανά πακέτο ΟΤΑΝ ΔΕΝ είναι η πρώτη αγορά του χρήστη.
-- ------------------------------------------------------------
create or replace function public.kenak_grant(p_user uuid, p_packs integer default 1)
returns table(new_balance integer, granted integer, bonus_given integer)
language plpgsql security definer set search_path = public as $$
declare
  v_first boolean;
  v_base  integer := p_packs * 10;
  v_bonus integer := 0;
begin
  if p_packs < 1 then raise exception 'Ελάχιστη αγορά: 1 πακέτο (50€ + ΦΠΑ = 10 ΠΕΑ)'; end if;

  insert into kenak_tokens(user_id) values (p_user)
    on conflict (user_id) do nothing;

  select renewals = 0 into v_first from kenak_tokens where user_id = p_user;
  if not v_first then v_bonus := p_packs; end if;   -- δώρο 1 ΠΕΑ/πακέτο στις ανανεώσεις

  update kenak_tokens set
    balance   = balance + v_base + v_bonus,
    purchased = purchased + v_base,
    bonus     = bonus + v_bonus,
    renewals  = renewals + 1,
    updated_at = now()
  where user_id = p_user;

  return query select t.balance, v_base, v_bonus from kenak_tokens t where t.user_id = p_user;
end $$;

revoke execute on function public.kenak_grant from public, anon, authenticated;
-- εκτελείται μόνο με service_role (Edge Function πληρωμής ή admin panel)

-- ------------------------------------------------------------
-- ΞΟΔΕΜΑ: 1 token ανά εξαγωγή XML ΠΕΑ. Καλείται από τον ΧΡΗΣΤΗ (JWT).
-- Ατομική αφαίρεση: αποτυγχάνει καθαρά αν δεν επαρκεί το υπόλοιπο.
-- ------------------------------------------------------------
create or replace function public.kenak_spend()
returns table(ok boolean, new_balance integer, message text)
language plpgsql security definer set search_path = public as $$
declare v_bal integer;
begin
  update kenak_tokens
     set balance = balance - 1, spent = spent + 1, updated_at = now()
   where user_id = auth.uid() and balance >= 1
   returning balance into v_bal;
  if v_bal is null then
    return query select false, coalesce((select balance from kenak_tokens where user_id=auth.uid()),0),
      'Ανεπαρκές υπόλοιπο ΠΕΑ — χρειάζεται ανανέωση (50€ + ΦΠΑ = 10 ΠΕΑ + 1 δώρο).';
  else
    return query select true, v_bal, 'OK';
  end if;
end $$;

grant execute on function public.kenak_spend to authenticated;

-- ------------------------------------------------------------
-- ΥΠΟΛΟΙΠΟ: για εμφάνιση στο εργαλείο.
-- ------------------------------------------------------------
create or replace function public.kenak_balance()
returns integer language sql security definer set search_path = public as $$
  select coalesce((select balance from kenak_tokens where user_id = auth.uid()), 0);
$$;
grant execute on function public.kenak_balance to authenticated;
