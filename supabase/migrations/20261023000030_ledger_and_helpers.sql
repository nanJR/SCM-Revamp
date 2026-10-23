-- Append-only passport chain, RLS helper functions, corridor search.
-- Blocks must extend the tip of the chain, in order.
create function public.passports_enforce_chain()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  tip record;
begin
  perform pg_advisory_xact_lock(hashtext('public.passports'));
  select block_index, record_hash into tip from public.passports order by block_index desc limit 1;
  if tip is null then
    if new.block_index <> 1 or new.prev_hash <> repeat('0', 64) then
      raise exception 'first passport must be block 1 with the genesis prev_hash';
    end if;
  elsif new.block_index <> tip.block_index + 1 or new.prev_hash <> tip.record_hash then
    raise exception 'passport % does not extend chain tip % (%)', new.block_index, tip.block_index, tip.record_hash;
  end if;
  return new;
end;
$$;

create trigger passports_chain before insert on public.passports
  for each row execute function public.passports_enforce_chain();

create function public.passports_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'passports are append-only';
end;
$$;

create trigger passports_no_update before update or delete on public.passports
  for each row execute function public.passports_append_only();

-- ---------------------------------------------------------------- helpers
create function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role from public.profiles where id = (select auth.uid())) in ('regulator', 'admin'), false);
$$;

create function public.owns_facility(fid text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.facilities where id = fid and owner_id = (select auth.uid()));
$$;

-- Facilities within a road-corridor radius of another facility.
create function public.facilities_within(p_facility_id text, p_km numeric default 60)
returns setof public.facilities
language sql
stable
set search_path = ''
as $$
  select f.*
  from public.facilities f
  join public.facilities origin on origin.id = p_facility_id
  where f.id <> origin.id
    and extensions.st_dwithin(f.location, origin.location, p_km * 1000);
$$;
