-- Puts the seed facilities back to their seed state (volumes, quotas, sensor
-- adjustments). It never touches passports or the decision log: the ledger is
-- append-only. Service role only.
create function public.reset_seed_facilities()
returns integer
language sql
set search_path = ''
as $$
  with done as (select public.upsert_facility_doc(doc) from public.seed_facility_docs)
  select count(*)::integer from done;
$$;

revoke execute on function public.reset_seed_facilities() from public, anon, authenticated;
