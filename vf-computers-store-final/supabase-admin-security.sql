-- Run this in Supabase SQL Editor.
-- Primary VF Computers administrator.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

insert into public.admin_users (user_id)
select id
from auth.users
where lower(email) = lower('v.f-computers@abv.bg')
on conflict (user_id) do nothing;

do $$
begin
  if not exists (select 1 from public.admin_users) then
    raise exception 'The configured VF Computers admin user is missing from Supabase Auth.';
  end if;
end
$$;

alter table public.admin_users enable row level security;
grant select on public.admin_users to authenticated;

drop policy if exists "Admin users can read own membership" on public.admin_users;
create policy "Admin users can read own membership"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

drop policy if exists "Allow public order insert" on public.orders;
drop policy if exists "Allow authenticated order read" on public.orders;
drop policy if exists "Allow authenticated order update" on public.orders;
drop policy if exists "Allow authenticated order delete" on public.orders;

create policy "Public can create orders"
on public.orders
for insert
to anon, authenticated
with check (user_id is null or user_id = auth.uid());

create policy "Customers read own orders and admins read all"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins update orders"
on public.orders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins delete orders"
on public.orders
for delete
to authenticated
using (public.is_admin());

do $$
declare
  policy_row record;
  table_name text;
begin
  foreach table_name in array array[
    'products',
    'category_markups',
    'store_settings',
    'physical_store_products',
    'physical_store_sales',
    'vali_product_overrides',
    'service_protocols',
    'service_protocol_counter',
    'service_tickets',
    'customer_profiles'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I enable row level security', table_name);

      for policy_row in
        select policyname
        from pg_policies
        where schemaname = 'public' and tablename = table_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_row.policyname, table_name);
      end loop;
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    grant select on public.products to anon, authenticated;
    grant insert, update, delete on public.products to authenticated;
    create policy "Public read products" on public.products for select to anon, authenticated using (true);
    create policy "Admins manage products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.category_markups') is not null then
    grant select on public.category_markups to anon, authenticated;
    grant insert, update, delete on public.category_markups to authenticated;
    create policy "Public read category markups" on public.category_markups for select to anon, authenticated using (true);
    create policy "Admins manage category markups" on public.category_markups for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.store_settings') is not null then
    grant select on public.store_settings to anon, authenticated;
    grant insert, update, delete on public.store_settings to authenticated;
    create policy "Public read store settings" on public.store_settings for select to anon, authenticated using (true);
    create policy "Admins manage store settings" on public.store_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.physical_store_products') is not null then
    grant select on public.physical_store_products to anon, authenticated;
    grant insert, update, delete on public.physical_store_products to authenticated;
    create policy "Public read visible physical products"
      on public.physical_store_products for select to anon, authenticated
      using (show_on_site = true and stock > 0);
    create policy "Admins manage physical products"
      on public.physical_store_products for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.physical_store_sales') is not null then
    grant select, insert, update, delete on public.physical_store_sales to authenticated;
    create policy "Admins manage physical sales"
      on public.physical_store_sales for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.vali_product_overrides') is not null then
    grant select, insert, update, delete on public.vali_product_overrides to authenticated;
    create policy "Admins manage VALI overrides"
      on public.vali_product_overrides for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.service_protocols') is not null then
    grant select, insert, update, delete on public.service_protocols to authenticated;
    create policy "Admins manage service protocols"
      on public.service_protocols for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.service_protocol_counter') is not null then
    grant select, insert, update, delete on public.service_protocol_counter to authenticated;
    create policy "Admins manage service counter"
      on public.service_protocol_counter for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.service_tickets') is not null then
    grant select, insert on public.service_tickets to authenticated;
    grant update, delete on public.service_tickets to authenticated;
    create policy "Customers read own service tickets"
      on public.service_tickets for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
    create policy "Customers create own service tickets"
      on public.service_tickets for insert to authenticated
      with check (user_id = auth.uid());
    create policy "Admins update service tickets"
      on public.service_tickets for update to authenticated
      using (public.is_admin()) with check (public.is_admin());
    create policy "Admins delete service tickets"
      on public.service_tickets for delete to authenticated
      using (public.is_admin());
  end if;

  if to_regclass('public.customer_profiles') is not null then
    grant select, insert, update on public.customer_profiles to authenticated;
    create policy "Customers read own profile"
      on public.customer_profiles for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
    create policy "Customers create own profile"
      on public.customer_profiles for insert to authenticated
      with check (user_id = auth.uid());
    create policy "Customers update own profile"
      on public.customer_profiles for update to authenticated
      using (user_id = auth.uid() or public.is_admin())
      with check (user_id = auth.uid() or public.is_admin());
  end if;
end
$$;

do $$
begin
  if to_regprocedure('public.upsert_service_protocol(jsonb)') is not null then
    revoke execute on function public.upsert_service_protocol(jsonb) from anon;
    alter function public.upsert_service_protocol(jsonb) security invoker;
    grant execute on function public.upsert_service_protocol(jsonb) to authenticated;
  end if;

  if to_regprocedure('public.delete_service_protocol(text)') is not null then
    revoke execute on function public.delete_service_protocol(text) from anon;
    alter function public.delete_service_protocol(text) security invoker;
    grant execute on function public.delete_service_protocol(text) to authenticated;
  end if;
end
$$;
