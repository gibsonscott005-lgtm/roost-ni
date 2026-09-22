-- Pricing catalogue and billing config are read server-side only from now on.
DROP POLICY IF EXISTS "Billing config readable by signed-in users" ON public.billing_config;
DROP POLICY IF EXISTS "Pricing tiers readable by signed-in users" ON public.pricing_tiers;
DROP POLICY IF EXISTS "Pricing items readable by signed-in users" ON public.pricing_items;

REVOKE SELECT ON public.billing_config FROM authenticated;
REVOKE SELECT ON public.pricing_tiers FROM authenticated;
REVOKE SELECT ON public.pricing_items FROM authenticated;
REVOKE SELECT ON public.billing_config FROM anon;
REVOKE SELECT ON public.pricing_tiers FROM anon;
REVOKE SELECT ON public.pricing_items FROM anon;

GRANT ALL ON public.billing_config TO service_role;
GRANT ALL ON public.pricing_tiers TO service_role;
GRANT ALL ON public.pricing_items TO service_role;

-- Listing photos: no broad anonymous read rule. Public visitors receive signed
-- URLs from a server function that verifies the photo belongs to a published
-- listing. Landlords keep direct access to their own folder.
DROP POLICY IF EXISTS "Published listing photos are readable" ON storage.objects;
