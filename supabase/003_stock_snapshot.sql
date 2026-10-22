-- Papan v0 — snapshot harian vs kemarin (Asia/Jakarta)
-- SQL Editor → New query → Run sekali

create table if not exists public.stock_snapshot (
  snap_date date primary key,
  kg_live numeric not null default 0,
  skid_live integer not null default 0,
  gagal_trial integer not null default 0,
  tag_open integer not null default 0,
  by_status jsonb,
  taken_at timestamptz not null default now()
);

alter table public.stock_snapshot enable row level security;

drop policy if exists tahap0_snapshot_all on public.stock_snapshot;
create policy tahap0_snapshot_all on public.stock_snapshot
  for all to anon, authenticated using (true) with check (true);
