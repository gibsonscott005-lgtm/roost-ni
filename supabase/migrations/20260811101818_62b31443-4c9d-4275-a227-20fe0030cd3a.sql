CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  min_properties integer NOT NULL DEFAULT 0,
  max_properties integer,
  monthly_pence integer NOT NULL DEFAULT 0,
  per_extra_unit_pence integer NOT NULL DEFAULT 0,
  completion_fee_pence integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_tiers TO anon;
GRANT SELECT ON public.pricing_tiers TO authenticated;
GRANT ALL ON public.pricing_tiers TO service_role;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pricing tiers are readable by everyone" ON public.pricing_tiers FOR SELECT USING (true);

CREATE TABLE public.pricing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  price_pence integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pricing_items TO anon;
GRANT SELECT ON public.pricing_items TO authenticated;
GRANT ALL ON public.pricing_items TO service_role;
ALTER TABLE public.pricing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pricing items are readable by everyone" ON public.pricing_items FOR SELECT USING (true);

CREATE TABLE public.billing_config (
  id boolean PRIMARY KEY DEFAULT true,
  payments_enabled boolean NOT NULL DEFAULT false,
  currency text NOT NULL DEFAULT 'GBP',
  notice text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_config_single_row CHECK (id)
);

GRANT SELECT ON public.billing_config TO anon;
GRANT SELECT ON public.billing_config TO authenticated;
GRANT ALL ON public.billing_config TO service_role;
ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Billing config is readable by everyone" ON public.billing_config FOR SELECT USING (true);

CREATE TRIGGER set_pricing_tiers_updated_at BEFORE UPDATE ON public.pricing_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_pricing_items_updated_at BEFORE UPDATE ON public.pricing_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_billing_config_updated_at BEFORE UPDATE ON public.billing_config FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.pricing_tiers (key, name, min_properties, max_properties, monthly_pence, per_extra_unit_pence, completion_fee_pence, sort_order) VALUES
  ('starter', 'Starter', 0, 1, 0, 0, 3900, 1),
  ('pro', 'Pro Portfolio', 2, 5, 999, 0, 1900, 2),
  ('growth', 'Growth Portfolio', 6, 10, 1499, 0, 900, 3),
  ('enterprise', 'Enterprise Portfolio', 11, NULL, 1999, 150, 1500, 4);

INSERT INTO public.pricing_items (key, name, category, description, price_pence, sort_order) VALUES
  ('doc_tenancy_agreement_tin', 'NI Statutory Tenancy Agreement & TIN', 'document', 'Northern Ireland tenancy agreement with the statutory Tenancy Information Notice.', 1499, 1),
  ('doc_notice_to_quit', 'Statutory Notice to Quit Generator', 'document', 'Notice to Quit with the correct statutory notice period applied.', 1299, 2),
  ('doc_rent_increase_notice', 'Statutory Rent Increase Notice', 'document', 'Rent increase notice in the statutory form.', 999, 3),
  ('doc_checkout_inspection', 'Check-Out Inspection & Fair Fuel Baseline Log', 'document', 'Move-out inspection record with the Fair Fuel handover comparison.', 999, 4),
  ('biometric_identity_pass', 'Biometric Identity Pass', 'identity', 'Optional document authenticity and face-match check. The free self-certified route always remains available.', 500, 5);

INSERT INTO public.billing_config (id, payments_enabled, currency, notice) VALUES
  (true, false, 'GBP', 'Simulated billing — no payments are taken and no feature is restricted.');