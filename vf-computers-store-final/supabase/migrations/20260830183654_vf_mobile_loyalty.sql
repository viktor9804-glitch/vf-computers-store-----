-- OPTIONAL. Prepared in an isolated project; NOT applied to the store database.
-- Requires the existing secure orders schema (user_id, idempotency_key, is_admin()).
-- Run in staging first. All settings start DISABLED. No retrospective points.
begin;

-- Fail closed if the older, permissive orders security setup is still installed.
do $$ begin
  if to_regclass('public.orders') is null or to_regprocedure('public.is_admin()') is null then
    raise exception 'Install the secure store orders schema before VF Rewards';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.orders'::regclass)
     or has_table_privilege('anon','public.orders','INSERT') then
    raise exception 'Unsafe orders RLS: public inserts must be revoked before VF Rewards';
  end if;
  if exists (
    select 1 from pg_policies where schemaname='public' and tablename='orders'
      and cmd in ('ALL','UPDATE','INSERT')
      and (roles && array['public','anon','authenticated']::name[])
      and coalesce(qual,with_check,'') not like '%is_admin()%'
  ) then raise exception 'Unsafe order write policy: only server or verified admins may mutate orders'; end if;
end $$;

create schema if not exists vf_loyalty_private;
revoke all on schema vf_loyalty_private from public, anon, authenticated;

create table public.vf_loyalty_settings (
  id boolean primary key default true check (id),
  active boolean not null default false,
  checkout_active boolean not null default false,
  earn_points_per_euro integer not null default 1 check (earn_points_per_euro between 1 and 100),
  point_value_cents integer not null default 1 check (point_value_cents between 1 and 100),
  max_discount_percent integer not null default 20 check (max_discount_percent between 1 and 50)
);
insert into public.vf_loyalty_settings(id) values(true);
alter table public.vf_loyalty_settings enable row level security;
revoke all on public.vf_loyalty_settings from public, anon, authenticated;
grant all on public.vf_loyalty_settings to service_role;

create table public.vf_loyalty_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now()
);
-- Negative balances are intentional: already-spent earnings must be clawed back
-- after a return. A negative account cannot spend until subsequent earnings cover it.
alter table public.vf_loyalty_accounts enable row level security;
revoke all on public.vf_loyalty_accounts from public, anon, authenticated;
grant select on public.vf_loyalty_accounts to authenticated;
grant all on public.vf_loyalty_accounts to service_role;
create policy "VF customers read own points" on public.vf_loyalty_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

create table public.vf_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.vf_loyalty_accounts(user_id) on delete cascade,
  order_id bigint not null references public.orders(id) on delete restrict,
  kind text not null check (kind in ('earn', 'spend')),
  points bigint not null check (points <> 0),
  description text not null,
  created_at timestamptz not null default now()
);
create index vf_loyalty_ledger_user_time on public.vf_loyalty_ledger(user_id, created_at desc);
create index vf_loyalty_ledger_order_kind on public.vf_loyalty_ledger(order_id, kind);
alter table public.vf_loyalty_ledger enable row level security;
revoke all on public.vf_loyalty_ledger from public, anon, authenticated;
grant select on public.vf_loyalty_ledger to authenticated;
grant all on public.vf_loyalty_ledger to service_role;
create policy "VF customers read own ledger" on public.vf_loyalty_ledger
  for select to authenticated using ((select auth.uid()) = user_id);

alter table public.orders
  add column order_source text not null default 'website' check (order_source in ('website','mobile')),
  add column loyalty_enrolled boolean not null default false,
  add column loyalty_earn_rate integer not null default 0,
  add column loyalty_spent_points integer not null default 0 check (loyalty_spent_points >= 0),
  add column loyalty_discount numeric(14,2) not null default 0 check (loyalty_discount >= 0),
  add column loyalty_refunded_gross numeric(14,2) not null default 0 check (loyalty_refunded_gross >= 0);

-- Private trigger is privileged solely to write the ledger when a verified admin
-- updates a store order. It is not an RPC and has no client EXECUTE grant.
create function vf_loyalty_private.prepare_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cfg public.vf_loyalty_settings;
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null and not exists(select 1 from auth.users u where u.id=new.user_id and not coalesce(u.is_anonymous,false)) then
      raise exception 'REGISTERED_ACCOUNT_REQUIRED';
    end if;
    select * into cfg from public.vf_loyalty_settings where id;
    new.loyalty_enrolled := cfg.active and exists(select 1 from auth.users u where u.id=new.user_id and not coalesce(u.is_anonymous,false));
    new.loyalty_earn_rate := case when new.loyalty_enrolled then cfg.earn_points_per_euro else 0 end;
    if not new.loyalty_enrolled and new.loyalty_spent_points > 0 then
      raise exception 'LOYALTY_UNAVAILABLE';
    end if;
  else
    if old.loyalty_enrolled and (
      new.user_id is distinct from old.user_id or new.total is distinct from old.total
      or new.shipping is distinct from old.shipping or new.subtotal is distinct from old.subtotal
      or new.vat is distinct from old.vat or new.items is distinct from old.items
      or new.loyalty_spent_points is distinct from old.loyalty_spent_points
      or new.loyalty_discount is distinct from old.loyalty_discount
    ) then raise exception 'LOYALTY_ORDER_IMMUTABLE'; end if;
    new.loyalty_enrolled := old.loyalty_enrolled;
    new.loyalty_earn_rate := old.loyalty_earn_rate;
    if new.loyalty_refunded_gross < old.loyalty_refunded_gross then
      raise exception 'REFUND_CANNOT_DECREASE';
    end if;
  end if;
  if new.loyalty_refunded_gross > greatest(0, new.total - new.shipping) then
    raise exception 'INVALID_REFUND';
  end if;
  return new;
end $$;
revoke all on function vf_loyalty_private.prepare_order() from public, anon, authenticated;

create function vf_loyalty_private.sync_order() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  caller_role text := current_setting('role', true);
  target_earned bigint := 0;
  target_spent bigint := 0;
  old_earned bigint := 0;
  old_spent bigint := 0;
  account_balance bigint;
  cash_products numeric;
  remaining_cash numeric;
  cancelled boolean;
begin
  if not new.loyalty_enrolled then return new; end if;
  -- An ordinary customer may never turn order-status edits into a points grant.
  if caller_role not in ('service_role', 'postgres') then
    if (select auth.uid()) is null or not public.is_admin() then
      raise exception 'LOYALTY_ADMIN_REQUIRED';
    end if;
  end if;
  insert into public.vf_loyalty_accounts(user_id) values(new.user_id) on conflict do nothing;
  select balance into account_balance from public.vf_loyalty_accounts
    where user_id = new.user_id for update;
  cash_products := greatest(0, new.total - new.shipping);
  remaining_cash := greatest(0, cash_products - new.loyalty_refunded_gross);
  cancelled := new.status in ('Отказана', 'Върната', 'cancelled', 'returned')
    or new.payment_status = 'refunded';
  if not cancelled then
    if new.payment_status = 'paid' and new.status in ('Доставена', 'Завършена', 'delivered', 'completed') then
      target_earned := floor(remaining_cash * new.loyalty_earn_rate);
    end if;
    target_spent := -new.loyalty_spent_points;
    -- Partial cash refunds restore the proportionate spent points, rounded down.
    if cash_products > 0 then
      target_spent := target_spent + floor(new.loyalty_spent_points * new.loyalty_refunded_gross / cash_products);
    end if;
  end if;
  select coalesce(sum(points) filter(where kind='earn'),0), coalesce(sum(points) filter(where kind='spend'),0)
    into old_earned, old_spent from public.vf_loyalty_ledger where order_id=new.id;
  if target_spent < old_spent and account_balance < old_spent - target_spent then
    raise exception 'INSUFFICIENT_POINTS';
  end if;
  if target_earned <> old_earned then
    insert into public.vf_loyalty_ledger(user_id,order_id,kind,points,description)
    values(new.user_id,new.id,'earn',target_earned-old_earned,
      case when target_earned > old_earned then 'Точки от платена и получена поръчка' else 'Корекция на точки при връщане или промяна на поръчка' end);
  end if;
  if target_spent <> old_spent then
    insert into public.vf_loyalty_ledger(user_id,order_id,kind,points,description)
    values(new.user_id,new.id,'spend',target_spent-old_spent,
      case when target_spent < old_spent then 'Използвани точки за отстъпка' else 'Възстановени използвани точки' end);
  end if;
  update public.vf_loyalty_accounts set balance=balance+target_earned-old_earned+target_spent-old_spent,updated_at=now()
    where user_id=new.user_id;
  return new;
end $$;
revoke all on function vf_loyalty_private.sync_order() from public, anon, authenticated;

create trigger vf_loyalty_prepare before insert or update on public.orders
  for each row execute function vf_loyalty_private.prepare_order();
create trigger vf_loyalty_sync after insert or update on public.orders
  for each row execute function vf_loyalty_private.sync_order();

-- Only the separate authenticated mobile backend can execute this RPC.
-- SECURITY INVOKER: caller must already possess service-role privileges.
create function public.vf_mobile_create_order(
  p_order jsonb, p_user uuid, p_points integer, p_expected_total_cents bigint
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  cfg public.vf_loyalty_settings;
  existing public.orders;
  created public.orders;
  account_balance bigint;
  gross numeric;
  discount numeric;
  discounted_net numeric;
  final_total numeric;
begin
  if p_user is null or p_points is null or p_points < 0 or p_expected_total_cents is null then
    raise exception 'INVALID_ORDER';
  end if;
  insert into public.vf_loyalty_accounts(user_id) values(p_user) on conflict do nothing;
  select balance into account_balance from public.vf_loyalty_accounts where user_id=p_user for update;
  select * into existing from public.orders where idempotency_key=p_order->>'idempotency_key';
  if found then
    if existing.user_id is distinct from p_user then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return to_jsonb(existing);
  end if;
  select * into cfg from public.vf_loyalty_settings where id for share;
  if not cfg.active and not cfg.checkout_active then raise exception 'CHECKOUT_UNAVAILABLE'; end if;
  if not cfg.active and p_points>0 then raise exception 'LOYALTY_UNAVAILABLE'; end if;
  gross := round((p_order->>'subtotal')::numeric + (p_order->>'vat')::numeric,2);
  discount := round(p_points * cfg.point_value_cents::numeric / 100,2);
  if p_points > greatest(0,account_balance) then raise exception 'INSUFFICIENT_POINTS'; end if;
  if discount > floor(gross * cfg.max_discount_percent) / 100 then raise exception 'DISCOUNT_LIMIT'; end if;
  final_total := round(gross + (p_order->>'shipping')::numeric - discount,2);
  if round(final_total*100)::bigint <> p_expected_total_cents then raise exception 'PRICE_CHANGED'; end if;
  discounted_net := round((gross-discount)/1.2,2);
  insert into public.orders(
    customer_name,customer_phone,customer_email,customer_city,customer_address,items,
    subtotal,vat,shipping,total,payment_method,payment_label,status,payment_status,
    user_id,idempotency_key,loyalty_spent_points,loyalty_discount,order_source
  ) values (
    p_order->>'customer_name',p_order->>'customer_phone',p_order->>'customer_email',
    p_order->>'customer_city',p_order->>'customer_address',p_order->'items',
    discounted_net,gross-discount-discounted_net,(p_order->>'shipping')::numeric,final_total,
    p_order->>'payment_method',p_order->>'payment_label','Приета','pending',p_user,
    p_order->>'idempotency_key',p_points,discount,coalesce(p_order->>'order_source','mobile')
  ) returning * into created;
  return to_jsonb(created);
end $$;
revoke all on function public.vf_mobile_create_order(jsonb,uuid,integer,bigint) from public, anon, authenticated;
grant execute on function public.vf_mobile_create_order(jsonb,uuid,integer,bigint) to service_role;

commit;
