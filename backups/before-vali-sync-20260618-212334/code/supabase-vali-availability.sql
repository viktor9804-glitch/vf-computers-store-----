alter table public.vali_products
add column if not exists availability_text text,
add column if not exists availability_type text,
add column if not exists stock_quantity numeric default 0,
add column if not exists expected_delivery text;

create index if not exists vali_products_availability_type_idx
on public.vali_products (availability_type);
