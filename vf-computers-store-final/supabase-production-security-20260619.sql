-- Canonical storefront security migration.
-- Apply after the existing schema migrations and before deploying the matching frontend/API code.

begin;

-- Canonical administrator membership used by all admin-only RLS policies.
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
    raise exception 'No administrator exists in public.admin_users. Create the Supabase Auth admin user first.';
  end if;
end
$$;

alter table public.admin_users enable row level security;
grant select on table public.admin_users to authenticated;

drop policy if exists "Admin users can read own membership" on public.admin_users;
create policy "Admin users can read own membership"
on public.admin_users for select to authenticated
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

-- The server-side order endpoint uses this key to make retries safe.
alter table if exists public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists idempotency_key text;

create unique index if not exists orders_idempotency_key_unique
  on public.orders (idempotency_key)
  where idempotency_key is not null;

-- Remove all existing policies from the sensitive tables. They are recreated
-- below from one canonical definition so migration order cannot restore a
-- legacy permissive policy.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'warranties',
    'warranty_items',
    'service_protocols',
    'service_protocol_counter',
    'service_tickets',
    'orders',
    'vali_products'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', existing_policy.policyname, target_table);
    end loop;
  end loop;
end
$$;

-- Warranty data is never directly available to the storefront. Public checks
-- go through /api/warranty-check, which uses the service role and returns a
-- strict projection only after validating a high-entropy code.
do $$
begin
  if to_regclass('public.warranties') is not null then
    revoke all on table public.warranties from anon;
    revoke all on table public.warranties from authenticated;
    grant select, insert, update, delete on table public.warranties to authenticated;
    create policy "Admins manage warranties"
      on public.warranties for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;

  if to_regclass('public.warranty_items') is not null then
    revoke all on table public.warranty_items from anon;
    revoke all on table public.warranty_items from authenticated;
    grant select, insert, update, delete on table public.warranty_items to authenticated;
    create policy "Admins manage warranty items"
      on public.warranty_items for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

-- The old public view exposed serial numbers, work details and prices and was
-- directly enumerable. Keep a minimal compatibility view but grant it to no
-- public client; the API reads the base table through the service role.
do $$
begin
  if to_regclass('public.service_protocol_public') is not null then
    revoke all on table public.service_protocol_public from anon, authenticated;
    drop view public.service_protocol_public;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.service_protocols') is not null then
    execute $view$
      create view public.service_protocol_public
      with (security_barrier = true)
      as
      select public_code, device_type, brand, model, status, updated_at, completed_at
      from public.service_protocols
    $view$;
    revoke all on table public.service_protocol_public from public, anon, authenticated;

    revoke all on table public.service_protocols from anon;
    revoke all on table public.service_protocols from authenticated;
    grant select, insert, update, delete on table public.service_protocols to authenticated;
    create policy "Admins manage service protocols"
      on public.service_protocols for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

-- Remove the legacy security-definer write surface from anonymous users.
do $$
begin
  if to_regprocedure('public.upsert_service_protocol(jsonb)') is not null then
    revoke all on function public.upsert_service_protocol(jsonb) from public, anon;
    grant execute on function public.upsert_service_protocol(jsonb) to authenticated;
    alter function public.upsert_service_protocol(jsonb) security invoker;
  end if;
  if to_regprocedure('public.delete_service_protocol(text)') is not null then
    revoke all on function public.delete_service_protocol(text) from public, anon;
    grant execute on function public.delete_service_protocol(text) to authenticated;
    alter function public.delete_service_protocol(text) security invoker;
  end if;
end
$$;

-- The protocol number counter must not remain a public side channel or a
-- writable primitive after the legacy helper functions are locked down.
do $$
begin
  if to_regclass('public.service_protocol_counter') is not null then
    revoke all on table public.service_protocol_counter from public, anon, authenticated;
    grant select, insert, update, delete on table public.service_protocol_counter to authenticated;
    create policy "Admins manage service protocol counter"
      on public.service_protocol_counter for all to authenticated
      using (public.is_admin()) with check (public.is_admin());
  end if;
end
$$;

-- Customer service tickets remain private to their owner. Only admins may
-- update or delete them.
do $$
begin
  if to_regclass('public.service_tickets') is not null then
    revoke all on table public.service_tickets from anon;
    revoke all on table public.service_tickets from authenticated;
    grant select, insert, update, delete on table public.service_tickets to authenticated;

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
end
$$;

-- Orders are created only by /api/orders with the service-role key. Anonymous
-- clients cannot insert or select. Authenticated customers can only see orders
-- explicitly linked to their auth.uid().
do $$
begin
  if to_regclass('public.orders') is not null then
    revoke all on table public.orders from anon;
    revoke all on table public.orders from authenticated;
    grant select, update, delete on table public.orders to authenticated;

    create policy "Customers read own orders and admins read all"
      on public.orders for select to authenticated
      using (user_id = auth.uid() or public.is_admin());
    create policy "Admins update orders"
      on public.orders for update to authenticated
      using (public.is_admin()) with check (public.is_admin());
    create policy "Admins delete orders"
      on public.orders for delete to authenticated
      using (public.is_admin());
  end if;
end
$$;

-- Safe storefront projection. Supplier prices and raw pricing fields never
-- leave the database. The view exposes only the final public NET price and the
-- pre-discount public NET price calculated from server-owned pricing rules.
drop view if exists public.storefront_vali_products;

create view public.storefront_vali_products
with (security_barrier = true)
as
select
  vp.id,
  vp.reference_number,
  vp.catalog_number,
  vp.manufacturer,
  vp.status,
  vp.show,
  vp.model,
  vp.barcode,
  vp.warranty,
  vp.name,
  vp.description,
  vp.images,
  vp.filters,
  vp.site_main_category,
  vp.site_sub_category,
  round(
    coalesce(nullif(vp.price_partner, 0), vp.price_client, 0)::numeric
    * (1 + coalesce(markup.markup_percent, 0)::numeric / 100)
    * (1 - coalesce(promotion.discount_percent, 0)::numeric / 100),
    2
  ) as public_price,
  round(
    coalesce(nullif(vp.price_partner, 0), vp.price_client, 0)::numeric
    * (1 + coalesce(markup.markup_percent, 0)::numeric / 100),
    2
  ) as public_old_price,
  coalesce(promotion.discount_percent, 0)::numeric as discount_percent
from public.vali_products vp
left join lateral (
  select cm.markup_percent
  from public.category_markups cm
  where lower(btrim(coalesce(cm.main_category, ''))) = lower(btrim(coalesce(vp.site_main_category, '')))
    and lower(btrim(coalesce(cm.sub_category, ''))) = lower(btrim(coalesce(vp.site_sub_category, '')))
  limit 1
) markup on true
left join lateral (
  select p.discount_percent
  from public.promotions p
  where p.is_active = true
    and (p.starts_at is null or p.starts_at <= now())
    and (p.ends_at is null or p.ends_at >= now())
    and (
      p.product_id::text in (vp.id::text, 'vali-' || vp.id::text)
      or (
        p.main_category is not null and p.sub_category is not null
        and lower(btrim(p.main_category)) = lower(btrim(coalesce(vp.site_main_category, '')))
        and lower(btrim(p.sub_category)) = lower(btrim(coalesce(vp.site_sub_category, '')))
      )
      or (
        p.main_category is not null and p.sub_category is null
        and lower(btrim(p.main_category)) = lower(btrim(coalesce(vp.site_main_category, '')))
      )
    )
  order by
    case
      when p.product_id::text in (vp.id::text, 'vali-' || vp.id::text) then 3
      when p.sub_category is not null then 2
      else 1
    end desc,
    p.discount_percent desc
  limit 1
) promotion on true;

revoke all on table public.vali_products from anon;
revoke all on table public.vali_products from authenticated;
grant select, insert, update, delete on table public.vali_products to authenticated;
create policy "Admins manage VALI products"
  on public.vali_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

revoke all on table public.storefront_vali_products from public;
grant select on table public.storefront_vali_products to anon, authenticated;

commit;
