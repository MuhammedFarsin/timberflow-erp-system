CREATE OR REPLACE FUNCTION public.is_owner(_business_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_users bu
    WHERE bu.business_id = _business_id AND bu.user_id = auth.uid() AND bu.role = 'owner');
$$;

DROP POLICY IF EXISTS owner_manage_memberships ON public.business_users;
CREATE POLICY owner_manage_memberships ON public.business_users
  FOR ALL TO authenticated
  USING (public.is_owner(business_id))
  WITH CHECK (public.is_owner(business_id));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['purchases','purchase_logs','sales','sale_items','stock','stock_movements','upcoming_stock','customers','suppliers','expenses','invoices','workers','worker_wages','wage_payments']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS members_all ON public.%I', t);
    EXECUTE format('CREATE POLICY members_all ON public.%I FOR ALL TO authenticated USING (public.is_member(business_id)) WITH CHECK (public.is_member(business_id))', t);
  END LOOP;
END $$;