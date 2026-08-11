DROP POLICY IF EXISTS "Landlords read passports shared with them" ON public.tenant_passports;

CREATE POLICY "Landlords read passports of accepted tenants"
ON public.tenant_passports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.tenant_id = tenant_passports.user_id
      AND pl.landlord_id = auth.uid()
      AND ps.status = 'accepted'
  )
);