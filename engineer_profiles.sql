-- ============================================================
-- HEXIS Hub — Προφίλ μηχανικού + Βιβλιοθήκη συνεργατών
-- Εκτέλεση: Supabase (oucqqudfdimccgowvpqp) → SQL Editor → Run
-- ============================================================

-- 1. Προφίλ μηχανικού (1 ανά χρήστη)
create table if not exists public.engineer_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  specialty  text not null default 'Πολιτικός Μηχανικός',
  am_tee     text not null default '',
  afm        text not null default '',
  doy        text not null default '',
  address    text not null default '',   -- διεύθυνση έδρας
  city       text not null default '',
  phone      text not null default '',
  email      text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.engineer_profiles enable row level security;

drop policy if exists "profile own select" on public.engineer_profiles;
create policy "profile own select" on public.engineer_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profile own upsert" on public.engineer_profiles;
create policy "profile own upsert" on public.engineer_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profile own update" on public.engineer_profiles;
create policy "profile own update" on public.engineer_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Συνεργάτες (πολλοί ανά χρήστη)
create table if not exists public.collaborators (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null default '',
  specialty  text not null default 'Πολιτικός Μηχανικός',
  am_tee     text not null default '',
  afm        text not null default '',
  doy        text not null default '',
  address    text not null default '',
  phone      text not null default '',
  email      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists collaborators_user_idx on public.collaborators(user_id);

alter table public.collaborators enable row level security;

drop policy if exists "collab own all" on public.collaborators;
create policy "collab own all" on public.collaborators
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
