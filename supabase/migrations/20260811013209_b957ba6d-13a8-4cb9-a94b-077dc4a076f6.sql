CREATE POLICY "Landlords manage certificate files"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'property-certificates'
  AND EXISTS (
    SELECT 1 FROM public.property_listings pl
    WHERE pl.id::text = (storage.foldername(name))[1]
      AND pl.landlord_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'property-certificates'
  AND EXISTS (
    SELECT 1 FROM public.property_listings pl
    WHERE pl.id::text = (storage.foldername(name))[1]
      AND pl.landlord_id = auth.uid()
  )
);

CREATE POLICY "Tenants read certificate files for their tenancy"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'property-certificates'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares s
    WHERE s.listing_id::text = (storage.foldername(name))[1]
      AND s.tenant_id = auth.uid()
      AND s.status = 'accepted'
  )
);