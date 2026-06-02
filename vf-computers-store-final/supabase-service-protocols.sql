-- VF Service public protocol tracking schema
-- Run this in Supabase SQL Editor before using /service-check.

create extension if not exists "pgcrypto";

create table if not exists public.service_protocol_counter (
  id text primary key,
  last_number int not null default 0
);

insert into public.service_protocol_counter (id, last_number)
values ('main', 0)
on conflict (id) do nothing;

create or replace function public.generate_service_public_code()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
  i int;
begin
  loop
    code := 'VF-SVC-' || extract(year from now())::int || '-';
    bytes := gen_random_bytes(8);

    for i in 1..8 loop
      code := code || substr(alphabet, (get_byte(bytes, i - 1) % length(alphabet)) + 1, 1);
    end loop;

    exit when not exists (
      select 1 from public.service_protocols where public_code = code
    );
  end loop;

  return code;
end;
$$;

create or replace function public.next_service_protocol_number()
returns text
language plpgsql
as $$
declare
  next_number int;
begin
  update public.service_protocol_counter
  set last_number = last_number + 1
  where id = 'main'
  returning last_number into next_number;

  if next_number is null then
    insert into public.service_protocol_counter (id, last_number)
    values ('main', 1)
    on conflict (id) do update set last_number = public.service_protocol_counter.last_number + 1
    returning last_number into next_number;
  end if;

  return 'VF-S-' || lpad(next_number::text, 10, '0');
end;
$$;

create table if not exists public.service_protocols (
  id uuid primary key default gen_random_uuid(),
  protocol_number text unique not null default public.next_service_protocol_number(),
  public_code text unique not null default public.generate_service_public_code(),
  customer_name text,
  customer_phone text,
  device_type text,
  brand text,
  model text,
  serial_number text,
  accessories text,
  intake_condition text,
  problem_description text,
  status text not null default 'accepted' check (
    status in ('accepted', 'diagnostics', 'in_progress', 'waiting_part', 'ready', 'delivered', 'cancelled')
  ),
  internal_notes text,
  public_work_summary text,
  public_total_price numeric(12, 2),
  currency text not null default 'EUR',
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists public.service_protocols
  add column if not exists protocol_number text unique default public.next_service_protocol_number(),
  add column if not exists public_code text unique default public.generate_service_public_code(),
  add column if not exists public_work_summary text,
  add column if not exists public_total_price numeric(12, 2),
  add column if not exists currency text not null default 'EUR',
  add column if not exists accepted_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_service_protocols_updated_at on public.service_protocols;
create trigger set_service_protocols_updated_at
before update on public.service_protocols
for each row
execute function public.set_updated_at();

create or replace view public.service_protocol_public as
select
  public_code,
  device_type,
  brand,
  model,
  serial_number,
  status,
  public_work_summary,
  public_total_price,
  currency,
  accepted_at,
  updated_at,
  completed_at
from public.service_protocols;

alter table public.service_protocols enable row level security;
alter table public.service_protocol_counter enable row level security;

revoke all on public.service_protocols from anon;
revoke all on public.service_protocol_counter from anon;

grant select on public.service_protocol_public to anon, authenticated;
grant select, insert, update, delete on public.service_protocols to authenticated;
grant select, insert, update on public.service_protocol_counter to authenticated;

drop policy if exists "authenticated service protocols select" on public.service_protocols;
create policy "authenticated service protocols select"
on public.service_protocols for select
to authenticated
using (true);

drop policy if exists "authenticated service protocols insert" on public.service_protocols;
create policy "authenticated service protocols insert"
on public.service_protocols for insert
to authenticated
with check (true);

drop policy if exists "authenticated service protocols update" on public.service_protocols;
create policy "authenticated service protocols update"
on public.service_protocols for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated service protocols delete" on public.service_protocols;
create policy "authenticated service protocols delete"
on public.service_protocols for delete
to authenticated
using (true);

drop policy if exists "authenticated service counter select" on public.service_protocol_counter;
create policy "authenticated service counter select"
on public.service_protocol_counter for select
to authenticated
using (true);

drop policy if exists "authenticated service counter update" on public.service_protocol_counter;
create policy "authenticated service counter update"
on public.service_protocol_counter for update
to authenticated
using (true)
with check (true);

create or replace function public.upsert_service_protocol(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.service_protocols;
  next_public_code text;
  next_protocol_number text;
begin
  next_protocol_number := nullif(payload->>'protocol_number', '');
  next_public_code := nullif(payload->>'public_code', '');

  if next_public_code is null then
    next_public_code := public.generate_service_public_code();
  end if;

  insert into public.service_protocols (
    protocol_number,
    public_code,
    customer_name,
    customer_phone,
    device_type,
    brand,
    model,
    serial_number,
    accessories,
    intake_condition,
    problem_description,
    status,
    internal_notes,
    public_work_summary,
    public_total_price,
    currency,
    accepted_at,
    completed_at
  )
  values (
    coalesce(next_protocol_number, public.next_service_protocol_number()),
    next_public_code,
    nullif(payload->>'customer_name', ''),
    nullif(payload->>'customer_phone', ''),
    nullif(payload->>'device_type', ''),
    nullif(payload->>'brand', ''),
    nullif(payload->>'model', ''),
    nullif(payload->>'serial_number', ''),
    nullif(payload->>'accessories', ''),
    nullif(payload->>'intake_condition', ''),
    nullif(payload->>'problem_description', ''),
    coalesce(nullif(payload->>'status', ''), 'accepted'),
    nullif(payload->>'internal_notes', ''),
    nullif(payload->>'public_work_summary', ''),
    nullif(payload->>'public_total_price', '')::numeric,
    coalesce(nullif(payload->>'currency', ''), 'EUR'),
    coalesce(nullif(payload->>'accepted_at', '')::timestamptz, now()),
    nullif(payload->>'completed_at', '')::timestamptz
  )
  on conflict (protocol_number) do update set
    public_code = excluded.public_code,
    customer_name = excluded.customer_name,
    customer_phone = excluded.customer_phone,
    device_type = excluded.device_type,
    brand = excluded.brand,
    model = excluded.model,
    serial_number = excluded.serial_number,
    accessories = excluded.accessories,
    intake_condition = excluded.intake_condition,
    problem_description = excluded.problem_description,
    status = excluded.status,
    internal_notes = excluded.internal_notes,
    public_work_summary = excluded.public_work_summary,
    public_total_price = excluded.public_total_price,
    currency = excluded.currency,
    accepted_at = excluded.accepted_at,
    completed_at = excluded.completed_at,
    updated_at = now()
  returning * into saved;

  return jsonb_build_object(
    'id', saved.id,
    'protocol_number', saved.protocol_number,
    'public_code', saved.public_code,
    'status', saved.status
  );
end;
$$;

grant execute on function public.upsert_service_protocol(jsonb) to anon, authenticated;

create or replace function public.delete_service_protocol(next_protocol_number text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.service_protocols
  where protocol_number = next_protocol_number;

  return found;
end;
$$;

grant execute on function public.delete_service_protocol(text) to anon, authenticated;
