-- JSON documents read by the Python service.
-- JSON shapes consumed by the Python service (field names match its models).
create view public.facility_docs with (security_invoker = true) as
select
  f.id,
  jsonb_strip_nulls(
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'role', f.role,
      'cluster', f.cluster,
      'lat', extensions.st_y(f.location::extensions.geometry),
      'lon', extensions.st_x(f.location::extensions.geometry),
      'material', f.material,
      'material_category', m.category,
      'hazardous', f.hazardous,
      'certified_hazard_handler', f.certified_hazard_handler,
      'volume_tons_per_month', f.volume_tpm,
      'cost_floor_inr_per_ton', p.cost_floor_inr_per_t,
      'cost_ceiling_inr_per_ton', p.cost_ceiling_inr_per_t,
      'gstin', f.gstin,
      'kspcb_consent_id', f.kspcb_consent_id,
      'quality_requirements', f.quality_requirements,
      'lab_assay', f.lab_assay,
      'sensor_adjustment', f.sensor,
      'xgn_details', case when f.kspcb_consent_id is null then null else jsonb_build_object(
        'consent_id', f.kspcb_consent_id,
        'consent_type', f.consent_type,
        'category', f.consent_category,
        'valid_till', f.consent_valid_till::text,
        'is_active', f.consent_active,
        'authorized_monthly_quota_tons', f.authorized_quota_tpm,
        'current_month_consumed_tons', f.consumed_tpm,
        'cepi_score', f.cepi_score
      ) end
    ) || f.extra
  ) as doc
from public.facilities f
join public.materials m on m.code = f.material
left join public.facility_private p on p.facility_id = f.id;

create view public.carrier_docs with (security_invoker = true) as
select
  c.id,
  jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'cluster', c.cluster,
    'lat', extensions.st_y(c.location::extensions.geometry),
    'lon', extensions.st_x(c.location::extensions.geometry),
    'vehicle_type', c.vehicle_type,
    'capacity_tons', c.capacity_t,
    'rate_floor_inr_per_ton_km', c.rate_floor_inr_per_t_km,
    'hazmat_transport_license', c.hazmat_license
  ) as doc
from public.carriers c;

-- Public, price-free view of the ledger for QR verification pages.
create view public.passport_public with (security_invoker = true) as
select block_index, issued_at, prev_hash, record_hash, seller_id, buyer_id, material
from public.passports;
