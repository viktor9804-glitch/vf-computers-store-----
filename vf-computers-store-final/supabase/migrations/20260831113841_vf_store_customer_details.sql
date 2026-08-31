begin;
-- Store billing/contact preferences are independent of the existing license portal profiles.
create table public.vf_customer_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '' check (length(email)<=320),
  account_type text not null default 'personal' check (account_type in ('personal','company')),
  full_name text not null default '' check (length(full_name)<=200),
  phone text not null default '' check (length(phone)<=50),
  city text not null default '' check (length(city)<=200),
  address text not null default '' check (length(address)<=1000),
  company_name text not null default '' check (length(company_name)<=300),
  company_eik text not null default '' check (length(company_eik)<=50),
  company_vat text not null default '' check (length(company_vat)<=50),
  company_mol text not null default '' check (length(company_mol)<=200),
  billing_address text not null default '' check (length(billing_address)<=1000),
  updated_at timestamptz not null default now()
);
alter table public.vf_customer_details enable row level security;
revoke all on public.vf_customer_details from public,anon,authenticated;
grant select,insert,update on public.vf_customer_details to authenticated;
grant all on public.vf_customer_details to service_role;
create policy "Customers read own store details" on public.vf_customer_details for select to authenticated
  using ((select auth.uid())=user_id);
create policy "Customers create own store details" on public.vf_customer_details for insert to authenticated
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
create policy "Customers update own store details" on public.vf_customer_details for update to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt()->>'is_anonymous'),'false')='false');
commit;
