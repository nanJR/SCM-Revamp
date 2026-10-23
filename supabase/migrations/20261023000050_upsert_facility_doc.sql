-- Writes a facility document back into the relational tables (service role only).
create function public.upsert_facility_doc(doc jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.facilities as f (
    id, name, role, cluster, location, material, volume_tpm, hazardous, certified_hazard_handler,
    gstin, kspcb_consent_id, consent_type, consent_category, consent_valid_till, consent_active,
    authorized_quota_tpm, consumed_tpm, cepi_score, quality_requirements, lab_assay, sensor, updated_at
  ) values (
    doc ->> 'id', doc ->> 'name', (doc ->> 'role')::public.facility_role, doc ->> 'cluster',
    extensions.st_setsrid(extensions.st_makepoint((doc ->> 'lon')::float8, (doc ->> 'lat')::float8), 4326)::extensions.geography,
    doc ->> 'material', (doc ->> 'volume_tons_per_month')::numeric, coalesce((doc ->> 'hazardous')::boolean, false),
    coalesce((doc ->> 'certified_hazard_handler')::boolean, false), doc ->> 'gstin',
    coalesce(doc #>> '{xgn_details,consent_id}', doc ->> 'kspcb_consent_id'), doc #>> '{xgn_details,consent_type}',
    doc #>> '{xgn_details,category}', (doc #>> '{xgn_details,valid_till}')::date,
    coalesce((doc #>> '{xgn_details,is_active}')::boolean, true),
    (doc #>> '{xgn_details,authorized_monthly_quota_tons}')::numeric,
    (doc #>> '{xgn_details,current_month_consumed_tons}')::numeric,
    (doc #>> '{xgn_details,cepi_score}')::numeric,
    doc -> 'quality_requirements', doc -> 'lab_assay', doc -> 'sensor_adjustment', now()
  )
  on conflict (id) do update set
    name = excluded.name, role = excluded.role, cluster = excluded.cluster, location = excluded.location,
    material = excluded.material, volume_tpm = excluded.volume_tpm, hazardous = excluded.hazardous,
    certified_hazard_handler = excluded.certified_hazard_handler, gstin = excluded.gstin,
    kspcb_consent_id = excluded.kspcb_consent_id, consent_type = excluded.consent_type,
    consent_category = excluded.consent_category, consent_valid_till = excluded.consent_valid_till,
    consent_active = excluded.consent_active, authorized_quota_tpm = excluded.authorized_quota_tpm,
    consumed_tpm = excluded.consumed_tpm, cepi_score = excluded.cepi_score,
    quality_requirements = excluded.quality_requirements, lab_assay = excluded.lab_assay,
    sensor = excluded.sensor, updated_at = now();

  insert into public.facility_private (facility_id, cost_floor_inr_per_t, cost_ceiling_inr_per_t)
  values (doc ->> 'id', (doc ->> 'cost_floor_inr_per_ton')::numeric, (doc ->> 'cost_ceiling_inr_per_ton')::numeric)
  on conflict (facility_id) do update set
    cost_floor_inr_per_t = excluded.cost_floor_inr_per_t,
    cost_ceiling_inr_per_t = excluded.cost_ceiling_inr_per_t;
end;
$$;

revoke execute on function public.upsert_facility_doc(jsonb) from public, anon, authenticated;
