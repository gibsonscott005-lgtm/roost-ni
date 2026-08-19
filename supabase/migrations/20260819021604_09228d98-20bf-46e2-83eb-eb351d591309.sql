CREATE POLICY "Recipients read their own reminder log"
ON public.reminder_log
FOR SELECT
TO authenticated
USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Landlords read applicant verification audit" ON public.verification_audit_logs;
CREATE POLICY "Landlords read applicant verification audit"
ON public.verification_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.tenant_id = verification_audit_logs.tenant_id
      AND pl.landlord_id = auth.uid()
      AND ps.status = 'accepted'
  )
);