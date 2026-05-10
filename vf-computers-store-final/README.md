# ВФ Компютри - V13 Customer Profile + Orders + Warranty + Service

Добавено:
- клиентски профил
- попълване на данни
- поръчки
- гаранции
- сервизни заявки

## SQL за Supabase

Пусни това в Supabase SQL Editor:

```sql
create table if not exists customer_profiles (
  id bigint generated always as identity primary key,
  user_id uuid unique not null,
  email text,
  full_name text,
  phone text,
  city text,
  address text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists service_tickets (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  customer_name text,
  phone text,
  device text,
  problem text,
  status text default 'Нова заявка',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table orders add column if not exists user_id uuid;

alter table customer_profiles enable row level security;
alter table service_tickets enable row level security;

drop policy if exists "users can read own profile" on customer_profiles;
drop policy if exists "users can insert own profile" on customer_profiles;
drop policy if exists "users can update own profile" on customer_profiles;

create policy "users can read own profile"
on customer_profiles for select to authenticated
using (auth.uid() = user_id);

create policy "users can insert own profile"
on customer_profiles for insert to authenticated
with check (auth.uid() = user_id);

create policy "users can update own profile"
on customer_profiles for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can read own service tickets" on service_tickets;
drop policy if exists "users can insert own service tickets" on service_tickets;

create policy "users can read own service tickets"
on service_tickets for select to authenticated
using (auth.uid() = user_id);

create policy "users can insert own service tickets"
on service_tickets for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "users can read own orders" on orders;

create policy "users can read own orders"
on orders for select to authenticated
using (auth.uid() = user_id);
```
