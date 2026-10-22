-- Compound Slow Moving — Tahap 0
-- Project: Slowmoving  https://hjhvchqbnocadlzaltaw.supabase.co
--
-- Cara pakai:
-- 1. Dashboard Supabase → SQL Editor → New query
-- 2. Paste seluruh file ini → Run
-- 3. Lanjut jalankan 002_tahap0_seed_master.sql

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Users (NIK). Bukan auth.users Google.
-- ---------------------------------------------------------------------------
create table if not exists public.app_user (
  nik text primary key,
  name text not null,
  role text not null
    check (role in (
      'MIXING', 'QC', 'PC', 'EXT', 'CALCUT', 'SUPERVISOR', 'ADMIN'
    )),
  pin text not null default '1234',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column public.app_user.pin is
  'PIN sementara Tahap 0. Ganti hashing sebelum go-live.';

-- ---------------------------------------------------------------------------
-- Master lokasi
-- ---------------------------------------------------------------------------
create table if not exists public.location (
  id text primary key,
  code text unique not null,
  name text not null,
  zone text not null
);

-- ---------------------------------------------------------------------------
-- Skid = 1 unit fisik. Unik: compound + run + skid
-- ---------------------------------------------------------------------------
create table if not exists public.skid (
  id text primary key,
  compound_code text not null,
  run_no text not null,
  skid_no text not null,
  mixer text,
  mix_at timestamptz,
  exp_at timestamptz,
  sps integer,
  emp_id text,
  crew_code text,
  ticket_type text not null default 'PRODUCTIVE'
    check (ticket_type in ('PRODUCTIVE', 'NON_PRODUCTIVE')),
  bruto numeric,
  berat_skid numeric,
  netto numeric not null default 0,
  qty_sisa numeric not null default 0,
  kg_locked boolean not null default false,
  batch_count integer not null default 1,
  status text not null default 'UNDER_REVIEW'
    check (status in (
      'UNDER_REVIEW', 'RESTACKING', 'PICKLE_OUT', 'DISPOSED',
      'IN_EXECUTION', 'GAGAL_TRIAL', 'CONSUMED', 'CLEANER', 'SCRAP'
    )),
  location_id text references public.location (id),
  area_asal text,
  kondisi text,
  note_qc text,
  ticket_photo_path text,
  document_type text,
  raw_barcode text,
  raw_ocr text,
  field_confidence jsonb,
  operator_confirmed boolean not null default false,
  created_by text references public.app_user (nik),
  legacy_no integer,
  rack text,
  remarks text,
  executor_area text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (compound_code, run_no, skid_no)
);

create index if not exists idx_skid_status on public.skid (status);
create index if not exists idx_skid_compound on public.skid (compound_code);
create index if not exists idx_skid_exp on public.skid (exp_at);

-- ---------------------------------------------------------------------------
-- Disposisi digital (print hanya dari sini — Tahap 5)
-- ---------------------------------------------------------------------------
create table if not exists public.disposition (
  id text primary key,
  tag_no text unique not null,
  skid_id text not null references public.skid (id),
  action_type text not null,
  action_rule text,
  target_area text,
  target_compound text,
  date_disp date not null default current_date,
  date_exp date,
  originator text,
  qc_nik text references public.app_user (nik),
  pc_nik text references public.app_user (nik),
  approver_nik text references public.app_user (nik),
  tag_color text not null default 'WHITE',
  status text not null default 'OPEN'
    check (status in (
      'OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'FAILED', 'SUPERSEDED'
    )),
  printed_at timestamptz,
  verified_at timestamptz,
  label_payload text,
  verify_scan_raw text,
  remarks text,
  created_at timestamptz not null default now()
);

create index if not exists idx_disp_status on public.disposition (status);
create index if not exists idx_disp_skid on public.disposition (skid_id);

-- ---------------------------------------------------------------------------
-- Eksekusi kg (Tahap 6)
-- ---------------------------------------------------------------------------
create table if not exists public.execution (
  id text primary key,
  disposition_id text references public.disposition (id),
  skid_id text not null references public.skid (id),
  exec_at timestamptz not null default now(),
  shift text,
  machine_area text not null,
  kg_used numeric not null,
  batch_count integer not null default 1,
  result text not null
    check (result in ('OK', 'PARTIAL', 'FAIL_TRIAL')),
  operator_nik text not null references public.app_user (nik),
  note text
);

create index if not exists idx_exec_skid on public.execution (skid_id);

-- ---------------------------------------------------------------------------
-- updated_at otomatis
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_skid_updated_at on public.skid;
create trigger trg_skid_updated_at
before update on public.skid
for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage foto Mixer Ticket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ticket-photos', 'ticket-photos', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS Tahap 0: anon boleh akses (HP + laptop pakai anon key).
-- Kunci per-role di tahap berikutnya, setelah login NIK jalan.
-- ---------------------------------------------------------------------------
alter table public.app_user enable row level security;
alter table public.location enable row level security;
alter table public.skid enable row level security;
alter table public.disposition enable row level security;
alter table public.execution enable row level security;

drop policy if exists tahap0_app_user_all on public.app_user;
drop policy if exists tahap0_location_all on public.location;
drop policy if exists tahap0_skid_all on public.skid;
drop policy if exists tahap0_disposition_all on public.disposition;
drop policy if exists tahap0_execution_all on public.execution;

create policy tahap0_app_user_all on public.app_user
  for all to anon, authenticated using (true) with check (true);
create policy tahap0_location_all on public.location
  for all to anon, authenticated using (true) with check (true);
create policy tahap0_skid_all on public.skid
  for all to anon, authenticated using (true) with check (true);
create policy tahap0_disposition_all on public.disposition
  for all to anon, authenticated using (true) with check (true);
create policy tahap0_execution_all on public.execution
  for all to anon, authenticated using (true) with check (true);

drop policy if exists tahap0_ticket_photos_select on storage.objects;
drop policy if exists tahap0_ticket_photos_insert on storage.objects;
drop policy if exists tahap0_ticket_photos_update on storage.objects;

create policy tahap0_ticket_photos_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'ticket-photos');
create policy tahap0_ticket_photos_insert on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'ticket-photos');
create policy tahap0_ticket_photos_update on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'ticket-photos')
  with check (bucket_id = 'ticket-photos');
