begin;
alter policy "Customers create own store details" on public.vf_customer_details
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
alter policy "Customers update own store details" on public.vf_customer_details
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id and coalesce((select auth.jwt())->>'is_anonymous','false')='false');
-- Explicitly deny client settings access. The server returns only public program rules.
create policy "No direct client access to rewards settings" on public.vf_loyalty_settings
  for all to anon,authenticated using(false) with check(false);
commit;
