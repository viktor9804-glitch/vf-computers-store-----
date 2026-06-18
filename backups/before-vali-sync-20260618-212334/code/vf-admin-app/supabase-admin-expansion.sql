-- VF Admin expansion: dashboard, VALI control, homepage sections and physical store.

alter table if exists public.orders
  add column if not exists admin_note text;

alter table if exists public.vali_product_overrides
  add column if not exists custom_main_category text,
  add column if not exists custom_sub_category text,
  add column if not exists is_featured boolean default false,
  add column if not exists builder_disabled boolean default false,
  add column if not exists admin_note text;

create table if not exists public.physical_store_products (
  id bigint generated always as identity primary key,
  title text not null,
  category text not null default 'Аксесоари',
  sub_category text,
  description text,
  price numeric not null default 0,
  stock integer not null default 0,
  condition text not null default 'Ново',
  serial_number text,
  image text,
  show_on_site boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.physical_store_sales (
  id bigint generated always as identity primary key,
  product_id bigint references public.physical_store_products(id) on delete set null,
  product_title text not null,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cash',
  note text,
  created_at timestamptz not null default now()
);

alter table public.physical_store_products enable row level security;
alter table public.physical_store_sales enable row level security;

grant select, insert, update, delete on public.physical_store_products to authenticated;
grant select, insert, update, delete on public.physical_store_sales to authenticated;
grant usage, select on sequence public.physical_store_products_id_seq to authenticated;
grant usage, select on sequence public.physical_store_sales_id_seq to authenticated;

drop policy if exists "Authenticated manage physical store products" on public.physical_store_products;
create policy "Authenticated manage physical store products"
on public.physical_store_products
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated manage physical store sales" on public.physical_store_sales;
create policy "Authenticated manage physical store sales"
on public.physical_store_sales
for all
to authenticated
using (true)
with check (true);

insert into public.store_settings (key, value)
values (
  'homepage_product_sections',
  '{"sections":[{"key":"recommended","title":"Препоръчани","is_active":true,"limit":8,"product_ids":[]},{"key":"gaming","title":"Gaming избор","is_active":true,"limit":8,"product_ids":[]},{"key":"office","title":"Офис компютри","is_active":true,"limit":8,"product_ids":[]}]}'
)
on conflict (key) do nothing;
