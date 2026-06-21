-- Unique daily and monthly storefront visitors.
-- Run this file once in the Supabase SQL Editor before deploying the API.

begin;

create table if not exists public.site_visit_days (
  visitor_hash text not null,
  visited_on date not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  page_views bigint not null default 1 check (page_views > 0),
  primary key (visitor_hash, visited_on)
);

create index if not exists site_visit_days_visited_on_idx
  on public.site_visit_days (visited_on);

alter table public.site_visit_days enable row level security;
revoke all on table public.site_visit_days from public, anon, authenticated;

create or replace function public.get_site_visit_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with dates as (
    select
      (now() at time zone 'Europe/Sofia')::date as today,
      date_trunc('month', now() at time zone 'Europe/Sofia')::date as month_start
  )
  select jsonb_build_object(
    'today', count(*) filter (where visits.visited_on = dates.today),
    'month', count(distinct visits.visitor_hash) filter (
      where visits.visited_on >= dates.month_start
        and visits.visited_on <= dates.today
    )
  )
  from dates
  left join public.site_visit_days visits
    on visits.visited_on >= dates.month_start
   and visits.visited_on <= dates.today;
$$;

create or replace function public.record_site_visit(p_visitor_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_day date := (now() at time zone 'Europe/Sofia')::date;
begin
  if p_visitor_hash is null or p_visitor_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid visitor identifier';
  end if;

  insert into public.site_visit_days (
    visitor_hash,
    visited_on,
    first_seen_at,
    last_seen_at,
    page_views
  )
  values (p_visitor_hash, current_day, now(), now(), 1)
  on conflict (visitor_hash, visited_on) do update
    set last_seen_at = excluded.last_seen_at,
        page_views = public.site_visit_days.page_views + 1;

  return public.get_site_visit_stats();
end;
$$;

revoke all on function public.get_site_visit_stats() from public, anon, authenticated;
revoke all on function public.record_site_visit(text) from public, anon, authenticated;
grant execute on function public.get_site_visit_stats() to service_role;
grant execute on function public.record_site_visit(text) to service_role;

commit;
