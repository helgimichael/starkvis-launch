create or replace function public.list_public_sagorna_items()
returns setof public.cms_items
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.cms_items
  where status = 'published'
  order by created_at asc
$$;

revoke all on function public.list_public_sagorna_items() from public;
grant execute on function public.list_public_sagorna_items() to anon, authenticated;
