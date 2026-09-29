
-- helpers
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Timber Business',
  legal_name text, gstin text, pan text, phone text, email text,
  address text, city text, state text, state_code text, pincode text,
  logo_url text,
  invoice_prefix text NOT NULL DEFAULT 'INV',
  invoice_footer text, bank_name text, bank_account text, bank_ifsc text, bank_branch text, upi_id text,
  gst_rate numeric NOT NULL DEFAULT 18,
  cft_divisor numeric NOT NULL DEFAULT 2304,
  cft_rounding int NOT NULL DEFAULT 3,
  grade1_min numeric NOT NULL DEFAULT 24,
  grade2_min numeric NOT NULL DEFAULT 18,
  grade1_rate numeric NOT NULL DEFAULT 1800,
  grade2_rate numeric NOT NULL DEFAULT 1400,
  grade3_rate numeric NOT NULL DEFAULT 1000,
  default_allowance numeric NOT NULL DEFAULT 0,
  low_stock_cft numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text,
  role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','manager','accountant','staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_member(_business_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_users bu WHERE bu.business_id = _business_id AND bu.user_id = auth.uid());
$$;

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, email text, gstin text, address text, state text, notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, email text, gstin text, address text, state text, state_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchase_number text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','upcoming','received','partially_paid','paid','cancelled')),
  total_logs int NOT NULL DEFAULT 0,
  total_cft numeric NOT NULL DEFAULT 0 CHECK (total_cft >= 0),
  timber_value numeric NOT NULL DEFAULT 0 CHECK (timber_value >= 0),
  loading_charges numeric NOT NULL DEFAULT 0,
  unloading_charges numeric NOT NULL DEFAULT 0,
  transport_charges numeric NOT NULL DEFAULT 0,
  other_charges numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  final_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_method text, notes text,
  stock_applied boolean NOT NULL DEFAULT false,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, purchase_number)
);

CREATE TABLE public.purchase_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  log_no int NOT NULL,
  length_ft numeric NOT NULL CHECK (length_ft > 0),
  girth_in numeric NOT NULL CHECK (girth_in > 0),
  allowance_in numeric NOT NULL DEFAULT 0 CHECK (allowance_in >= 0),
  effective_girth numeric NOT NULL CHECK (effective_girth > 0),
  cft numeric NOT NULL CHECK (cft >= 0),
  grade text NOT NULL,
  rate numeric NOT NULL CHECK (rate >= 0),
  custom_rate boolean NOT NULL DEFAULT false,
  amount numeric NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.purchase_logs (purchase_id);

CREATE TABLE public.stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'timber' CHECK (item_type IN ('timber','furniture')),
  grade text,
  product_name text,
  cft numeric NOT NULL DEFAULT 0 CHECK (cft >= 0),
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  avg_rate numeric NOT NULL DEFAULT 0,
  low_threshold numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX stock_unique_item ON public.stock (business_id, item_type, coalesce(grade,''), coalesce(product_name,''));

CREATE TABLE public.upcoming_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE CASCADE,
  grade text NOT NULL, cft numeric NOT NULL DEFAULT 0, logs int NOT NULL DEFAULT 0,
  expected_date date, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('purchase','sale','adjustment','return','manual')),
  item_type text NOT NULL DEFAULT 'timber',
  grade text, product_name text,
  cft_change numeric NOT NULL DEFAULT 0, qty_change numeric NOT NULL DEFAULT 0,
  reference text, notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_type text NOT NULL DEFAULT 'timber' CHECK (sale_type IN ('timber','furniture')),
  sale_date date NOT NULL DEFAULT current_date,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  gst_rate numeric NOT NULL DEFAULT 18,
  is_interstate boolean NOT NULL DEFAULT false,
  cgst numeric NOT NULL DEFAULT 0, sgst numeric NOT NULL DEFAULT 0, igst numeric NOT NULL DEFAULT 0,
  round_off numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_method text, payment_status text NOT NULL DEFAULT 'pending',
  notes text, created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, sale_number)
);

CREATE TABLE public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'timber',
  grade text, product_name text, size_label text,
  cft numeric NOT NULL DEFAULT 0 CHECK (cft >= 0),
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  rate numeric NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.sale_items (sale_id);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number text NOT NULL,
  prefix text NOT NULL DEFAULT 'INV',
  financial_year text NOT NULL,
  sequence_number int NOT NULL,
  invoice_date date NOT NULL DEFAULT current_date,
  subtotal numeric NOT NULL DEFAULT 0,
  cgst numeric NOT NULL DEFAULT 0, sgst numeric NOT NULL DEFAULT 0, igst numeric NOT NULL DEFAULT 0,
  round_off numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, invoice_number),
  UNIQUE (business_id, financial_year, sequence_number)
);

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category text NOT NULL,
  expense_date date NOT NULL DEFAULT current_date,
  description text, amount numeric NOT NULL CHECK (amount >= 0),
  payment_method text, status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending')),
  notes text, attachment_url text,
  created_by uuid, updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL, phone text, role text, daily_wage numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.worker_wages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.workers(id) ON DELETE CASCADE,
  wage_date date NOT NULL DEFAULT current_date,
  wage_type text NOT NULL DEFAULT 'daily' CHECK (wage_type IN ('daily','half_day','custom')),
  base_wage numeric NOT NULL DEFAULT 0 CHECK (base_wage >= 0),
  overtime numeric NOT NULL DEFAULT 0, bonus numeric NOT NULL DEFAULT 0,
  advance numeric NOT NULL DEFAULT 0, deduction numeric NOT NULL DEFAULT 0,
  final_wage numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid')),
  notes text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wage_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  wage_id uuid NOT NULL REFERENCES public.worker_wages(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  paid_on date NOT NULL DEFAULT current_date,
  method text, created_at timestamptz NOT NULL DEFAULT now()
);

-- grants + rls
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['businesses','business_users','suppliers','customers','purchases','purchase_logs','stock','upcoming_stock','stock_movements','sales','sale_items','invoices','expenses','workers','worker_wages','wage_payments']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['suppliers','customers','purchases','purchase_logs','stock','upcoming_stock','stock_movements','sales','sale_items','invoices','expenses','workers','worker_wages','wage_payments']
  LOOP
    EXECUTE format('CREATE POLICY "members_all" ON public.%I FOR ALL TO authenticated USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())) WITH CHECK (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "members_read_business" ON public.businesses FOR SELECT TO authenticated
  USING (public.is_member(id));
CREATE POLICY "members_update_business" ON public.businesses FOR UPDATE TO authenticated
  USING (public.is_member(id)) WITH CHECK (public.is_member(id));
CREATE POLICY "members_read_memberships" ON public.business_users FOR SELECT TO authenticated
  USING (public.is_member(business_id));
CREATE POLICY "owner_manage_memberships" ON public.business_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.business_users b WHERE b.business_id = business_users.business_id AND b.user_id = auth.uid() AND b.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.business_users b WHERE b.business_id = business_users.business_id AND b.user_id = auth.uid() AND b.role = 'owner'));

CREATE TRIGGER t1 BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t2 BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t3 BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t4 BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t5 BEFORE UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- bootstrap a business for the signed in user
CREATE OR REPLACE FUNCTION public.ensure_business(_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT business_id INTO bid FROM public.business_users WHERE user_id = auth.uid() LIMIT 1;
  IF bid IS NOT NULL THEN RETURN bid; END IF;
  INSERT INTO public.businesses (name) VALUES (coalesce(_name,'My Timber Business')) RETURNING id INTO bid;
  INSERT INTO public.business_users (business_id, user_id, role, email)
    VALUES (bid, auth.uid(), 'owner', (SELECT email FROM auth.users WHERE id = auth.uid()));
  INSERT INTO public.stock (business_id, item_type, grade) VALUES (bid,'timber','Grade 1'),(bid,'timber','Grade 2'),(bid,'timber','Grade 3');
  RETURN bid;
END $$;
GRANT EXECUTE ON FUNCTION public.ensure_business(text) TO authenticated;

-- receive a purchase: move upcoming -> current stock atomically
CREATE OR REPLACE FUNCTION public.receive_purchase(_purchase_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.purchases%ROWTYPE; r record;
BEGIN
  SELECT * INTO p FROM public.purchases WHERE id = _purchase_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;
  IF NOT public.is_member(p.business_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p.stock_applied THEN RETURN; END IF;
  FOR r IN SELECT grade, sum(cft) cft, count(*) n, avg(rate) rate FROM public.purchase_logs WHERE purchase_id = _purchase_id GROUP BY grade LOOP
    INSERT INTO public.stock (business_id, item_type, grade, cft, avg_rate)
      VALUES (p.business_id, 'timber', r.grade, r.cft, r.rate)
    ON CONFLICT (business_id, item_type, coalesce(grade,''), coalesce(product_name,''))
      DO UPDATE SET cft = public.stock.cft + EXCLUDED.cft,
                    avg_rate = CASE WHEN public.stock.cft + EXCLUDED.cft > 0
                      THEN (public.stock.cft * public.stock.avg_rate + EXCLUDED.cft * EXCLUDED.avg_rate) / (public.stock.cft + EXCLUDED.cft)
                      ELSE EXCLUDED.avg_rate END;
    INSERT INTO public.stock_movements (business_id, movement_type, item_type, grade, cft_change, reference, created_by)
      VALUES (p.business_id, 'purchase', 'timber', r.grade, r.cft, p.purchase_number, auth.uid());
  END LOOP;
  DELETE FROM public.upcoming_stock WHERE purchase_id = _purchase_id;
  UPDATE public.purchases SET stock_applied = true, status = CASE WHEN amount_paid >= final_amount AND final_amount > 0 THEN 'paid' WHEN amount_paid > 0 THEN 'partially_paid' ELSE 'received' END, updated_by = auth.uid() WHERE id = _purchase_id;
END $$;
GRANT EXECUTE ON FUNCTION public.receive_purchase(uuid) TO authenticated;

-- atomic sale creation with stock locking + invoice
CREATE OR REPLACE FUNCTION public.create_sale(_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  bid uuid := (_payload->>'business_id')::uuid;
  b public.businesses%ROWTYPE;
  item jsonb; sale_id uuid; inv_id uuid;
  subtotal numeric := 0; gst_rate numeric; interstate boolean;
  cgst numeric := 0; sgst numeric := 0; igst numeric := 0; gross numeric; rounded numeric; roff numeric;
  seq int; fy text; inv_no text; sale_no text; affected int; sale_type text;
  paid numeric := coalesce((_payload->>'amount_paid')::numeric, 0);
BEGIN
  IF NOT public.is_member(bid) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = bid;
  gst_rate := coalesce((_payload->>'gst_rate')::numeric, b.gst_rate);
  interstate := coalesce((_payload->>'is_interstate')::boolean, false);
  sale_type := coalesce(_payload->>'sale_type','timber');

  FOR item IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    subtotal := subtotal + (item->>'amount')::numeric;
  END LOOP;
  IF subtotal <= 0 THEN RAISE EXCEPTION 'Sale must have at least one item'; END IF;

  IF interstate THEN igst := round(subtotal * gst_rate / 100, 2);
  ELSE cgst := round(subtotal * gst_rate / 200, 2); sgst := cgst; END IF;
  gross := subtotal + cgst + sgst + igst;
  rounded := round(gross);
  roff := rounded - gross;

  -- deduct stock atomically (conditional update guarded by row count)
  FOR item IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    IF coalesce(item->>'item_type','timber') = 'timber' THEN
      UPDATE public.stock SET cft = cft - (item->>'cft')::numeric
        WHERE business_id = bid AND item_type = 'timber' AND grade = (item->>'grade')
          AND cft >= (item->>'cft')::numeric;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected = 0 THEN
        RAISE EXCEPTION 'Insufficient stock for %', coalesce(item->>'grade','item');
      END IF;
    ELSE
      UPDATE public.stock SET quantity = quantity - (item->>'quantity')::numeric
        WHERE business_id = bid AND item_type = 'furniture' AND product_name = (item->>'product_name')
          AND quantity >= (item->>'quantity')::numeric;
      GET DIAGNOSTICS affected = ROW_COUNT;
      IF affected = 0 THEN
        RAISE EXCEPTION 'Insufficient stock for %', coalesce(item->>'product_name','item');
      END IF;
    END IF;
  END LOOP;

  sale_no := 'S-' || to_char(now(),'YYMMDD') || '-' || lpad(((SELECT count(*) FROM public.sales WHERE business_id = bid) + 1)::text, 4, '0');

  INSERT INTO public.sales (business_id, sale_number, customer_id, sale_type, sale_date, subtotal, gst_rate, is_interstate, cgst, sgst, igst, round_off, total, amount_paid, payment_method, payment_status, notes, created_by, updated_by)
  VALUES (bid, sale_no, nullif(_payload->>'customer_id','')::uuid, sale_type, coalesce((_payload->>'sale_date')::date, current_date), subtotal, gst_rate, interstate, cgst, sgst, igst, roff, rounded, paid, _payload->>'payment_method',
    CASE WHEN paid >= rounded THEN 'paid' WHEN paid > 0 THEN 'partial' ELSE 'pending' END, _payload->>'notes', auth.uid(), auth.uid())
  RETURNING id INTO sale_id;

  FOR item IN SELECT * FROM jsonb_array_elements(_payload->'items') LOOP
    INSERT INTO public.sale_items (business_id, sale_id, item_type, grade, product_name, size_label, cft, quantity, rate, amount)
    VALUES (bid, sale_id, coalesce(item->>'item_type','timber'), item->>'grade', item->>'product_name', item->>'size_label',
      coalesce((item->>'cft')::numeric,0), coalesce((item->>'quantity')::numeric,0), coalesce((item->>'rate')::numeric,0), (item->>'amount')::numeric);
    INSERT INTO public.stock_movements (business_id, movement_type, item_type, grade, product_name, cft_change, qty_change, reference, created_by)
    VALUES (bid, 'sale', coalesce(item->>'item_type','timber'), item->>'grade', item->>'product_name',
      -coalesce((item->>'cft')::numeric,0), -coalesce((item->>'quantity')::numeric,0), sale_no, auth.uid());
  END LOOP;

  fy := CASE WHEN extract(month from current_date) >= 4
    THEN extract(year from current_date)::int || '-' || right((extract(year from current_date)::int + 1)::text, 2)
    ELSE (extract(year from current_date)::int - 1) || '-' || right(extract(year from current_date)::text, 2) END;
  SELECT coalesce(max(sequence_number),0) + 1 INTO seq FROM public.invoices WHERE business_id = bid AND financial_year = fy;
  inv_no := b.invoice_prefix || '/' || fy || '/' || lpad(seq::text, 4, '0');

  INSERT INTO public.invoices (business_id, sale_id, customer_id, invoice_number, prefix, financial_year, sequence_number, subtotal, cgst, sgst, igst, round_off, total, status)
  VALUES (bid, sale_id, nullif(_payload->>'customer_id','')::uuid, inv_no, b.invoice_prefix, fy, seq, subtotal, cgst, sgst, igst, roff, rounded,
    CASE WHEN paid >= rounded THEN 'paid' WHEN paid > 0 THEN 'partial' ELSE 'unpaid' END)
  RETURNING id INTO inv_id;

  RETURN jsonb_build_object('sale_id', sale_id, 'invoice_id', inv_id, 'invoice_number', inv_no, 'total', rounded);
END $$;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb) TO authenticated;
