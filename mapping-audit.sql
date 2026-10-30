-- HEXIS MAPPING · αρχείο ασφαλείας (αποτυχημένες δοκιμές κλειδιών, μεταφορές υπολογιστή, μη αναγνωρισμένοι υπολογιστές)
-- Ασφαλές να ξανατρέξει.
create table if not exists public.mapping_audit (
  id      bigserial primary key,
  user_id uuid,
  at      timestamptz not null default now(),
  action  text not null,
  ok      boolean not null default true,
  info    text
);
create index if not exists mapping_audit_time on public.mapping_audit(at desc);
create index if not exists mapping_audit_act on public.mapping_audit(action, ok, at desc);
alter table public.mapping_audit enable row level security;
revoke all on public.mapping_audit from anon, authenticated;   -- μόνο η πύλη (service role)
