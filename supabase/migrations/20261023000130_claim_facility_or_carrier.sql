-- Self-service onboarding: a signed-in seller or buyer links their account to
-- one unclaimed facility of the same role, and a carrier to one unclaimed
-- fleet. Profiles cannot be updated directly (only display_name), so this is
-- the only way facility_id / carrier_id get set outside an admin.
create function public.claim_facility(fid text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  f public.facilities%rowtype;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null then raise exception 'not signed in'; end if;
  if me.role::text not in ('seller', 'buyer') then raise exception 'only sellers and buyers can claim a facility'; end if;
  if me.facility_id is not null then raise exception 'you already manage facility %', me.facility_id; end if;

  select * into f from public.facilities where id = fid for update;
  if f.id is null then raise exception 'no facility %', fid; end if;
  if f.role::text <> me.role::text then raise exception 'facility % is a %, your account is a %', fid, f.role, me.role; end if;
  if f.owner_id is not null then raise exception 'facility % is already claimed', fid; end if;

  update public.facilities set owner_id = me.id where id = fid;
  update public.profiles set facility_id = fid where id = me.id;
end;
$$;

create function public.claim_carrier(cid text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles%rowtype;
  k public.carriers%rowtype;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if me.id is null then raise exception 'not signed in'; end if;
  if me.role::text <> 'carrier' then raise exception 'only carriers can claim a fleet'; end if;
  if me.carrier_id is not null then raise exception 'you already manage fleet %', me.carrier_id; end if;

  select * into k from public.carriers where id = cid for update;
  if k.id is null then raise exception 'no carrier %', cid; end if;
  if k.owner_id is not null then raise exception 'carrier % is already claimed', cid; end if;

  update public.carriers set owner_id = me.id where id = cid;
  update public.profiles set carrier_id = cid where id = me.id;
end;
$$;

revoke execute on function public.claim_facility(text), public.claim_carrier(text) from public, anon;
grant execute on function public.claim_facility(text), public.claim_carrier(text) to authenticated;
