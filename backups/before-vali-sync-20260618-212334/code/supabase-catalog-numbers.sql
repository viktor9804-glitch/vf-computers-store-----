-- Catalog numbers for site products.
-- Safe to run multiple times. Does not overwrite existing catalog_number values.

do $$
begin
  if to_regclass('public.products') is not null then
    alter table public.products add column if not exists catalog_number text;

    with max_existing as (
      select coalesce(max(substring(catalog_number from '^VF-P-([0-9]+)$')::int), 0) as value
      from public.products
      where catalog_number ~ '^VF-P-[0-9]+$'
    ),
    numbered as (
      select id, row_number() over (order by created_at nulls last, id) as rn
      from public.products
      where catalog_number is null
    )
    update public.products p
    set catalog_number = 'VF-P-' || lpad((numbered.rn + max_existing.value)::text, 6, '0')
    from numbered, max_existing
    where p.id = numbered.id;

    create unique index if not exists products_catalog_number_unique
    on public.products (catalog_number)
    where catalog_number is not null;
  end if;
end $$;

do $$
begin
  if to_regclass('public.vali_products') is not null then
    alter table public.vali_products add column if not exists catalog_number text;

    with max_existing as (
      select coalesce(max(substring(catalog_number from '^VF-V-([0-9]+)$')::int), 0) as value
      from public.vali_products
      where catalog_number ~ '^VF-V-[0-9]+$'
    ),
    numbered as (
      select id, row_number() over (order by updated_at nulls last, id) as rn
      from public.vali_products
      where catalog_number is null
    )
    update public.vali_products p
    set catalog_number = 'VF-V-' || lpad((numbered.rn + max_existing.value)::text, 6, '0')
    from numbered, max_existing
    where p.id = numbered.id;

    create unique index if not exists vali_products_catalog_number_unique
    on public.vali_products (catalog_number)
    where catalog_number is not null;
  end if;
end $$;
