-- Users may only rename themselves; role changes go through an admin.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Price-free chain for public QR verification pages.
create function public.passport_chain()
returns table (block_index bigint, issued_at text, prev_hash char(64), record_hash char(64), seller_id text, buyer_id text, material text)
language sql
stable
security definer
set search_path = ''
as $$
  select block_index, issued_at, prev_hash, record_hash, seller_id, buyer_id, material
  from public.passports
  order by block_index;
$$;

grant execute on function public.passport_chain() to anon, authenticated;
