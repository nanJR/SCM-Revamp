-- Relational core: reference data, actors, activity, passport ledger.
create table public.clusters (
  name text primary key,
  location extensions.geography(point, 4326) not null
);

create table public.materials (
  code text primary key,
  category text not null,
  hazardous boolean not null,
  hsn_code text not null,
  gst_rate_pct numeric(5, 2) not null,
  standard_note text,
  co2_virgin_kg_per_t numeric,
  pm10_avoided_kg_per_t numeric,
  so2_avoided_kg_per_t numeric
);

-- KSPCB-authorised destinations for hazardous and other waste
-- (source: KSPCB Annual Report 2023-24, chapter 6).
create table public.disposal_sites (
  id text primary key,
  name text not null,
  kind public.disposal_kind not null,
  district text not null,
  location extensions.geography(point, 4326),
  design_capacity_t numeric,
  annual_capacity_tpa numeric,
  status public.site_status not null default 'operating',
  notes text,
  source text not null
);

-- ---------------------------------------------------------------- actors
create table public.facilities (
  id text primary key,
  name text not null,
  role public.facility_role not null,
  cluster text not null references public.clusters (name),
  location extensions.geography(point, 4326) not null,
  material text not null references public.materials (code),
  volume_tpm numeric(12, 2) not null check (volume_tpm >= 0),
  hazardous boolean not null default false,
  certified_hazard_handler boolean not null default false,
  gstin text,
  kspcb_consent_id text,
  consent_type text,
  consent_category text,
  consent_valid_till date,
  consent_active boolean not null default true,
  authorized_quota_tpm numeric(12, 2),
  consumed_tpm numeric(12, 2),
  cepi_score numeric(6, 2),
  quality_requirements jsonb,
  lab_assay jsonb,
  sensor jsonb,
  extra jsonb not null default '{}'::jsonb,
  owner_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index facilities_location_idx on public.facilities using gist (location);
create index facilities_material_role_idx on public.facilities (material, role);
create index facilities_owner_idx on public.facilities (owner_id);

-- Reservation prices are private: only the owner (and admins) may see them.
create table public.facility_private (
  facility_id text primary key references public.facilities (id) on delete cascade,
  cost_floor_inr_per_t numeric(12, 2),
  cost_ceiling_inr_per_t numeric(12, 2)
);

create table public.carriers (
  id text primary key,
  name text not null,
  cluster text not null references public.clusters (name),
  location extensions.geography(point, 4326) not null,
  vehicle_type text not null,
  capacity_t numeric(10, 2) not null check (capacity_t > 0),
  rate_floor_inr_per_t_km numeric(10, 2) not null,
  hazmat_license boolean not null default false,
  owner_id uuid references auth.users (id) on delete set null
);
create index carriers_owner_idx on public.carriers (owner_id);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'buyer',
  display_name text,
  facility_id text references public.facilities (id) on delete set null,
  carrier_id text references public.carriers (id) on delete set null,
  created_at timestamptz not null default now()
);
create index profiles_facility_idx on public.profiles (facility_id);
create index profiles_carrier_idx on public.profiles (carrier_id);

-- ---------------------------------------------------------------- activity
create table public.sensor_readings (
  id bigint generated always as identity primary key,
  facility_id text not null references public.facilities (id) on delete cascade,
  moisture_pct numeric(5, 2) not null check (moisture_pct between 0 and 100),
  contamination boolean not null default false,
  recorded_at timestamptz not null default now(),
  recorded_by uuid default auth.uid()
);
create index sensor_readings_facility_idx on public.sensor_readings (facility_id, recorded_at desc);

create table public.pipeline_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid,
  items jsonb not null default '[]'::jsonb
);

create table public.decision_log (
  id bigint generated always as identity primary key,
  run_id uuid references public.pipeline_runs (id) on delete cascade,
  agent text not null,
  action text not null,
  subject jsonb not null default '{}'::jsonb,
  inputs jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  rule text,
  reason text,
  model text,
  created_at timestamptz not null default now()
);
create index decision_log_run_idx on public.decision_log (run_id);

-- ---------------------------------------------------------------- passport ledger
-- issued_at is stored as text so the exact string that was hashed is kept.
create table public.passports (
  block_index bigint primary key check (block_index > 0),
  deal jsonb not null,
  issued_at text not null,
  prev_hash char(64) not null unique,
  record_hash char(64) not null unique,
  seller_id text generated always as (deal ->> 'seller_id') stored,
  buyer_id text generated always as (deal ->> 'buyer_id') stored,
  material text generated always as (deal ->> 'material') stored,
  created_at timestamptz not null default now()
);
create index passports_seller_idx on public.passports (seller_id);
create index passports_buyer_idx on public.passports (buyer_id);

-- Original seed documents, used to restore the demo directory.
create table public.seed_facility_docs (doc jsonb not null);
