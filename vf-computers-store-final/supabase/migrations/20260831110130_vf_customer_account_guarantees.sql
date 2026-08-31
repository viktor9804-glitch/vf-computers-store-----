-- Prepared against the live schema (orders/warranties IDs are BIGINT).
-- Apply in staging first. No email-based reassignment of historical orders.
begin;

-- Only the server reads this projection. Existing warranty tables stay admin-only.
-- No internal notes, telephone, address, billing data or another owner's records.
create view public.vf_customer_warranties with (security_invoker=true) as
select w.id::text as id, o.user_id, o.id::text as order_id, o.order_number,
  coalesce(nullif(w.warranty_number,''),nullif(w.warranty_code,''),w.public_code) as warranty_number,
  w.product_name, coalesce(nullif(w.serial_number,''),w.product_serial) as serial_number,
  w.warranty_months, coalesce(w.warranty_start,w.warranty_start_date,w.starts_at,w.sale_date) as starts_at,
  coalesce(w.warranty_end,w.warranty_end_date,w.ends_at,w.warranty_until) as ends_at,
  w.status, w.created_at,
  coalesce((select jsonb_agg(jsonb_build_object(
    'id',i.id,'product_name',i.product_name,'product_model',i.product_model,
    'manufacturer',i.manufacturer,'serial_number',i.serial_number,
    'warranty_months',i.warranty_months,'warranty_end',i.warranty_end) order by i.created_at,i.id)
    from public.warranty_items i where i.warranty_id=w.id),'[]'::jsonb) as items
from public.warranties w join public.orders o on o.id=w.order_id
where o.user_id is not null;
revoke all on public.vf_customer_warranties from public,anon,authenticated;
grant select on public.vf_customer_warranties to service_role;

-- A customer cannot widen SELECT access by adding another permissive policy.
create policy "VF customer order isolation guard" on public.orders as restrictive
  for select to authenticated using (user_id=(select auth.uid()) or public.is_admin());

-- Keep registered customers' history. Admins cancel orders instead of deleting them.
create function vf_loyalty_private.preserve_customer_order() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.user_id is not null then raise exception 'CUSTOMER_ORDER_HISTORY_PROTECTED'; end if;
  return old;
end $$;
revoke all on function vf_loyalty_private.preserve_customer_order() from public,anon,authenticated;
create trigger vf_preserve_customer_order before delete on public.orders
  for each row execute function vf_loyalty_private.preserve_customer_order();

create index if not exists vf_warranties_order_idx on public.warranties(order_id);
create index if not exists vf_warranty_items_parent_idx on public.warranty_items(warranty_id);
create index if not exists vf_orders_customer_history_idx on public.orders(user_id,created_at desc,id desc);
commit;
