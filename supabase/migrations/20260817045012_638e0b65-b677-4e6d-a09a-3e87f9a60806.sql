CREATE TABLE public.purchase_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_payments TO authenticated;
GRANT ALL ON public.purchase_payments TO service_role;
ALTER TABLE public.purchase_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_all ON public.purchase_payments FOR ALL TO authenticated
  USING (public.is_member(business_id)) WITH CHECK (public.is_member(business_id));
CREATE INDEX purchase_payments_purchase_idx ON public.purchase_payments(purchase_id);

CREATE TABLE public.sale_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sale_payments TO authenticated;
GRANT ALL ON public.sale_payments TO service_role;
ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_all ON public.sale_payments FOR ALL TO authenticated
  USING (public.is_member(business_id)) WITH CHECK (public.is_member(business_id));
CREATE INDEX sale_payments_sale_idx ON public.sale_payments(sale_id);