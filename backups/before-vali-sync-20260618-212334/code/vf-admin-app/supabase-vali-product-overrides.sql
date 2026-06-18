create table if not exists public.vali_product_overrides (
  id bigint generated always as identity primary key,
  vali_id bigint unique,
  custom_title text,
  custom_description text,
  custom_price numeric,
  custom_image text,
  custom_main_category text,
  custom_sub_category text,
  hidden boolean default false,
  is_featured boolean default false,
  builder_disabled boolean default false,
  admin_note text,
  updated_at timestamptz default now()
);

grant select, insert, update, delete on public.vali_product_overrides to authenticated;
grant usage, select on sequence public.vali_product_overrides_id_seq to authenticated;
