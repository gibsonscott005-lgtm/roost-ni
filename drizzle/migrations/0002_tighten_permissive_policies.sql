-- 1. Pricing catalogue + billing config: read by signed-in users only (read via authenticated server fn).
DROP POLICY IF EXISTS "Pricing tiers are readable by everyone" ON public.pricing_tiers;
CREATE POLICY "Pricing tiers readable by signed-in users"
  ON public.pricing_tiers FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.pricing_tiers FROM anon;

DROP POLICY IF EXISTS "Pricing items are readable by everyone" ON public.pricing_items;
CREATE POLICY "Pricing items readable by signed-in users"
  ON public.pricing_items FOR SELECT TO authenticated USING (is_active);
REVOKE SELECT ON public.pricing_items FROM anon;

DROP POLICY IF EXISTS "Billing config is readable by everyone" ON public.billing_config;
CREATE POLICY "Billing config readable by signed-in users"
  ON public.billing_config FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.billing_config FROM anon;

-- 2. Audit submissions: still open (anonymous self-check) but the row contents are bounded.
DROP POLICY IF EXISTS "Anyone may submit an audit result" ON public.compliance_audits;
CREATE POLICY "Anyone may submit a bounded audit result"
  ON public.compliance_audits FOR INSERT TO anon, authenticated
  WITH CHECK (
    score BETWEEN 0 AND 100
    AND band IN ('strong', 'partial', 'at_risk')
    AND (email IS NULL OR (length(email) <= 254 AND email LIKE '%_@_%._%'))
    AND (contact_name IS NULL OR length(contact_name) <= 120)
    AND (property_count IS NULL OR length(property_count) <= 40)
    AND coalesce(array_length(gaps, 1), 0) <= 40
    AND pg_column_size(answers) <= 8192
    AND pg_column_size(utm) <= 2048
  );

-- 3. Listing photos: readable only when they belong to a published listing, or to the landlord who owns them.
DROP POLICY IF EXISTS "Listing photos are publicly readable" ON storage.objects;
CREATE POLICY "Published listing photos are readable"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      WHERE pl.is_published AND objects.name = ANY (pl.photo_urls)
    )
  );

CREATE POLICY "Landlords read their own listing photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
