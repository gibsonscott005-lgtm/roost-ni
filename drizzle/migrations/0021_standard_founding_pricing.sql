DELETE FROM public.pricing_items;
DELETE FROM public.pricing_tiers;
ALTER TABLE public.pricing_tiers ADD COLUMN IF NOT EXISTS cap_pence integer NOT NULL DEFAULT 0;
INSERT INTO public.pricing_tiers (key, name, min_properties, max_properties, monthly_pence, per_extra_unit_pence, completion_fee_pence, sort_order, cap_pence) VALUES
 ('standard','Standard',1,NULL,700,400,0,1,5900),
 ('founding','Founding landlord',1,NULL,500,300,0,2,4900);
UPDATE public.billing_config SET payments_enabled = false, notice = 'Billing is not switched on yet. Nothing is charged today.';