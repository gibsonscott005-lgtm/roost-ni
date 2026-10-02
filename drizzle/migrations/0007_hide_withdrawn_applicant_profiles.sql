-- Withdrawn applicants revoke the landlord's read access to their profile.
-- Passport screening access (getApplicantPassports) already excludes withdrawn
-- shares; this brings the profiles policy in line.
DROP POLICY "Landlords view applicant profiles" ON public.profiles;

CREATE POLICY "Landlords view applicant profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.tenant_id = profiles.id
      AND pl.landlord_id = auth.uid()
      AND ps.status <> 'withdrawn'
  )
);