-- TBI financing applications.
-- Apply with the Supabase migration workflow before enabling TBI in production.

create extension if not exists pgcrypto;

-- Keep the production orders schema compatible with the current storefront
-- before creating the TBI relation. Existing values are preserved.
alter table public.orders
  add column if not exists payment_method text not null default 'cod',
  add column if not exists payment_label text,
  add column if not exists is_custom_pc_build boolean not null default false,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.tbi_applications (
  id uuid primary key default gen_random_uuid(),
  -- Production orders.id is bigint in the deployed VF Computers schema.
  order_id bigint references public.orders(id) on delete cascade,
  product_id text,
  tbi_reference text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'error')),
  amount numeric(12, 2) not null check (amount > 0),
  redirect_url text,
  response_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (order_id is not null or product_id is not null)
);

create index if not exists tbi_applications_order_id_idx
  on public.tbi_applications(order_id);

create index if not exists tbi_applications_status_created_at_idx
  on public.tbi_applications(status, created_at desc);

-- Prevent duplicate active applications for the same checkout order. A new
-- attempt is allowed after a rejected, cancelled or error result.
create unique index if not exists tbi_applications_active_order_unique_idx
  on public.tbi_applications(order_id)
  where order_id is not null and status in ('pending', 'approved');

alter table public.tbi_applications enable row level security;

-- No anon/authenticated policies are created intentionally. The registration
-- and callback endpoints use the server-only service role. Admin access should
-- go through a dedicated server endpoint or a separately reviewed admin policy.
revoke all on public.tbi_applications from anon, authenticated;

comment on table public.tbi_applications is
  'Private TBI financing state. Accessible only by trusted server-side code.';

comment on column public.tbi_applications.response_data is
  'Private, redacted TBI responses and callback audit data; never expose in the storefront.';
