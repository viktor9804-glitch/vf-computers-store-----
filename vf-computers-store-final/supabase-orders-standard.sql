create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_city text not null,
  customer_address text not null,
  customer_comment text,
  payment_method text not null default 'cod',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists customer_city text,
  add column if not exists customer_address text,
  add column if not exists customer_comment text,
  add column if not exists payment_method text not null default 'cod',
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists total numeric not null default 0,
  add column if not exists status text not null default 'new',
  add column if not exists created_at timestamptz not null default now();

update public.orders
set
  customer_phone = coalesce(customer_phone, phone),
  customer_email = coalesce(customer_email, email),
  customer_city = coalesce(customer_city, city),
  customer_address = coalesce(customer_address, address, delivery_address),
  customer_comment = coalesce(customer_comment, comment, customer_note),
  status = coalesce(status, order_status, 'new')
where customer_phone is null
   or customer_email is null
   or customer_city is null
   or customer_address is null
   or customer_comment is null
   or status is null;

alter table public.orders enable row level security;

grant insert on public.orders to anon;
grant select, update, delete on public.orders to authenticated;

drop policy if exists "Allow public order insert" on public.orders;
drop policy if exists "Allow authenticated order read" on public.orders;
drop policy if exists "Allow authenticated order update" on public.orders;
drop policy if exists "Allow authenticated order delete" on public.orders;

create policy "Allow public order insert"
on public.orders
for insert
to anon
with check (true);

create policy "Allow authenticated order read"
on public.orders
for select
to authenticated
using (true);

create policy "Allow authenticated order update"
on public.orders
for update
to authenticated
using (true)
with check (true);

create policy "Allow authenticated order delete"
on public.orders
for delete
to authenticated
using (true);
