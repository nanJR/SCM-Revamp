-- New sign-ups may pick seller, buyer or carrier. Regulator and admin roles
-- are only granted by an admin, so nobody can sign up as a regulator.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    case when requested in ('seller', 'buyer', 'carrier') then requested::public.app_role else 'buyer' end,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
