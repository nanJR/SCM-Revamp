-- Enums shared across the schema.
create type public.app_role as enum ('seller', 'buyer', 'carrier', 'regulator', 'admin');
create type public.facility_role as enum ('seller', 'buyer');
create type public.disposal_kind as enum ('tsdf', 'incinerator', 'co_processing', 'recycler', 'cetp');
create type public.site_status as enum ('operating', 'full', 'not_operating');
