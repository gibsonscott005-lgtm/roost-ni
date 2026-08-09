-- tenant_passports: remove blanket authenticated read
DROP POLICY IF EXISTS "Passports readable by authenticated users" ON public.tenant_passports;

CREATE POLICY "Landlords read passports shared with them"
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
  )
);

-- profiles: remove public read
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

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
  )
);

CREATE POLICY "Tenants view landlord profiles they applied to"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE pl.landlord_id = profiles.id
      AND ps.tenant_id = auth.uid()
  )
);

REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.tenant_passports FROM anon;