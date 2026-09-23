-- Give every supplier product a stable VF catalog number and automatically
-- allocate one to products introduced by future VALI synchronizations.

create sequence if not exists public.vali_catalog_number_seq;

select setval(
  'public.vali_catalog_number_seq',
  greatest(
    coalesce((
      select max(substring(catalog_number from '^VF-V-([0-9]+)$')::bigint)
      from public.vali_products
      where catalog_number ~ '^VF-V-[0-9]+$'
    ), 0),
    1
  ),
  exists (
    select 1
    from public.vali_products
    where catalog_number ~ '^VF-V-[0-9]+$'
  )
);

update public.vali_products
set catalog_number = 'VF-V-' || lpad(nextval('public.vali_catalog_number_seq')::text, 6, '0')
where catalog_number is null or btrim(catalog_number) = '';

create unique index if not exists vali_products_catalog_number_unique
on public.vali_products (catalog_number)
where catalog_number is not null;

create or replace function public.assign_vali_catalog_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.catalog_number is null or btrim(new.catalog_number) = '' then
    new.catalog_number := 'VF-V-' || lpad(nextval('public.vali_catalog_number_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

revoke all on function public.assign_vali_catalog_number() from public, anon, authenticated;
revoke all on sequence public.vali_catalog_number_seq from public, anon, authenticated;

drop trigger if exists assign_vali_catalog_number_trigger on public.vali_products;
create trigger assign_vali_catalog_number_trigger
before insert or update of catalog_number on public.vali_products
for each row
execute function public.assign_vali_catalog_number();
