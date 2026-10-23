-- The RLS helper functions are security definer, so keep them out of the
-- schema PostgREST exposes. Policies reference functions by oid, so moving
-- them does not change any policy. passport_chain() stays public on purpose:
-- it is the read-only verification endpoint.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.current_app_role() set schema private;
alter function public.is_staff() set schema private;
alter function public.owns_facility(text) set schema private;

-- Covering indexes for the cluster foreign keys.
create index if not exists carriers_cluster_idx on public.carriers (cluster);
create index if not exists facilities_cluster_idx on public.facilities (cluster);
