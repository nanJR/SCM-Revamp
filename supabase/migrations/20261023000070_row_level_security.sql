-- Row-level security on every table.
alter table public.clusters enable row level security;
alter table public.materials enable row level security;
alter table public.disposal_sites enable row level security;
alter table public.facilities enable row level security;
alter table public.facility_private enable row level security;
alter table public.carriers enable row level security;
alter table public.profiles enable row level security;
alter table public.sensor_readings enable row level security;
alter table public.pipeline_runs enable row level security;
alter table public.decision_log enable row level security;
alter table public.passports enable row level security;
alter table public.seed_facility_docs enable row level security;

-- Reference data is public.
create policy "reference data is public" on public.clusters for select to anon, authenticated using (true);
create policy "reference data is public" on public.materials for select to anon, authenticated using (true);
create policy "reference data is public" on public.disposal_sites for select to anon, authenticated using (true);

-- The facility and carrier directories are visible to signed-in users.
create policy "directory is visible to members" on public.facilities for select to authenticated using (true);
create policy "owners edit their facility" on public.facilities for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "members register their facility" on public.facilities for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "directory is visible to members" on public.carriers for select to authenticated using (true);
create policy "owners edit their carrier" on public.carriers for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

-- Reservation prices: owner and admins only. Regulators see deals, not limits.
create policy "owner sees own limits" on public.facility_private for select to authenticated
  using (public.owns_facility(facility_id) or public.current_app_role() = 'admin');
create policy "owner sets own limits" on public.facility_private for insert to authenticated
  with check (public.owns_facility(facility_id));
create policy "owner updates own limits" on public.facility_private for update to authenticated
  using (public.owns_facility(facility_id)) with check (public.owns_facility(facility_id));

create policy "users read own profile, staff read all" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
create policy "users rename themselves" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "owner and staff read sensor data" on public.sensor_readings for select to authenticated
  using (public.owns_facility(facility_id) or public.is_staff());
create policy "owner records sensor data" on public.sensor_readings for insert to authenticated
  with check (public.owns_facility(facility_id));

-- Runs and the decision log are for regulators and admins.
create policy "staff read runs" on public.pipeline_runs for select to authenticated using (public.is_staff());
create policy "staff read decisions" on public.decision_log for select to authenticated using (public.is_staff());

-- Full passports (with prices) go to the two parties and staff.
create policy "parties and staff read passports" on public.passports for select to authenticated
  using (public.owns_facility(seller_id) or public.owns_facility(buyer_id) or public.is_staff());
