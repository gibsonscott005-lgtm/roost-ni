-- listing photos: path = <landlord_id>/<listing_id>/<file>
DROP POLICY IF EXISTS "Listing photos are publicly readable" ON storage.objects;
CREATE POLICY "Listing photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "Landlords upload their listing photos" ON storage.objects;
CREATE POLICY "Landlords upload their listing photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Landlords update their listing photos" ON storage.objects;
CREATE POLICY "Landlords update their listing photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Landlords delete their listing photos" ON storage.objects;
CREATE POLICY "Landlords delete their listing photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- tenancy documents: path = <share_id>/<file>
DROP POLICY IF EXISTS "Tenancy parties read tenancy documents" ON storage.objects;
CREATE POLICY "Tenancy parties read tenancy documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id::text = (storage.foldername(name))[1]
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Landlords write tenancy documents" ON storage.objects;
CREATE POLICY "Landlords write tenancy documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenancy-documents'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id::text = (storage.foldername(name))[1] AND pl.landlord_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Landlords update tenancy documents" ON storage.objects;
CREATE POLICY "Landlords update tenancy documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id::text = (storage.foldername(name))[1] AND pl.landlord_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'tenancy-documents'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id::text = (storage.foldername(name))[1] AND pl.landlord_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Landlords delete tenancy documents" ON storage.objects;
CREATE POLICY "Landlords delete tenancy documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tenancy-documents'
  AND EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id::text = (storage.foldername(name))[1] AND pl.landlord_id = auth.uid()
  )
);