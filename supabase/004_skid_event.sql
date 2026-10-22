-- Histori lapangan — plan.md §7.2 / PPT slide 3
-- SQL Editor → New query → Run sekali

create table if not exists public.skid_event (
  id text primary key,
  skid_id text references public.skid (id) on delete cascade,
  at timestamptz not null default now(),
  nik text,
  action text not null
    check (action in (
      'DAFTAR', 'EDIT', 'RESTACK', 'PICKLE_OUT', 'DISPO',
      'PRINT', 'VERIFY', 'PAKAI', 'GAGAL_TRIAL', 'SNAPSHOT'
    )),
  before jsonb,
  after jsonb
);

create index if not exists idx_skid_event_skid on public.skid_event (skid_id, at desc);
create index if not exists idx_skid_event_at on public.skid_event (at desc);

alter table public.skid_event enable row level security;

drop policy if exists tahap0_skid_event_all on public.skid_event;
create policy tahap0_skid_event_all on public.skid_event
  for all to anon, authenticated using (true) with check (true);
