alter table public.cms_items enable row level security;

drop policy if exists "dev_allow_anon_select_cms_items" on public.cms_items;
drop policy if exists "dev_allow_anon_insert_cms_items" on public.cms_items;
drop policy if exists "dev_allow_anon_update_cms_items" on public.cms_items;
drop policy if exists "dev_allow_anon_delete_cms_items" on public.cms_items;

create policy "cms_items_authenticated_select"
on public.cms_items
for select
to authenticated
using (true);

create policy "cms_items_authenticated_insert"
on public.cms_items
for insert
to authenticated
with check (true);

create policy "cms_items_authenticated_update"
on public.cms_items
for update
to authenticated
using (true)
with check (true);

create policy "cms_items_authenticated_delete"
on public.cms_items
for delete
to authenticated
using (true);
