-- Landlord read access, scoped strictly to maintenance photos on their own listings.
DROP POLICY IF EXISTS "Landlords view maintenance photos on their listings" ON storage.objects;

CREATE POLICY "Landlords view maintenance photos on their listings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND (storage.foldername(name))[2] = 'maintenance'
  AND EXISTS (
    SELECT 1
    FROM public.maintenance_tickets t
    JOIN public.property_listings p ON p.id = t.property_id
    WHERE p.landlord_id = auth.uid()
      AND storage.objects.name = ANY (t.photo_urls)
  )
);