create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_city text not null,
  customer_address text not null,
  customer_comment text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  vat numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null default 'cod',
  payment_label text,
  is_custom_pc_build boolean not null default false,
  payment_status text not null default 'pending',
  status text not null default 'Приета',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists order_number text unique,
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists customer_city text,
  add column if not exists customer_address text,
  add column if not exists customer_comment text,
  add column if not exists items jsonb not null default '[]'::jsonb,
  add column if not exists subtotal numeric not null default 0,
  add column if not exists vat numeric not null default 0,
  add column if not exists shipping numeric not null default 0,
  add column if not exists total numeric not null default 0,
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_label text,
  add column if not exists is_custom_pc_build boolean not null default false,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists status text not null default 'Приета',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'phone'
  ) then
    update public.orders set customer_phone = coalesce(customer_phone, phone);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'email'
  ) then
    update public.orders set customer_email = coalesce(customer_email, email);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'city'
  ) then
    update public.orders set customer_city = coalesce(customer_city, city);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'address'
  ) then
    update public.orders set customer_address = coalesce(customer_address, address);
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'comment'
  ) then
    update public.orders set customer_comment = coalesce(customer_comment, comment);
  end if;
end $$;

create sequence if not exists public.order_number_seq start with 1 increment by 1;
create unique index if not exists orders_order_number_unique
on public.orders(order_number)
where order_number is not null;

create or replace function public.set_order_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or btrim(new.order_number) = '' then
    new.order_number := 'VF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;

  if new.status is null or btrim(new.status) = '' then
    new.status := 'Приета';
  end if;

  if new.payment_status is null or btrim(new.payment_status) = '' then
    new.payment_status := 'pending';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_order_defaults_trigger on public.orders;
create trigger set_order_defaults_trigger
before insert or update on public.orders
for each row
execute function public.set_order_defaults();

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
