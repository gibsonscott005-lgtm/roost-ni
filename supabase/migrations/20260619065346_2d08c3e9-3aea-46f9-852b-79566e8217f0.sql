CREATE TYPE public.share_status AS ENUM ('pending', 'reviewed', 'accepted');

CREATE TABLE public.passport_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  status public.share_status NOT NULL DEFAULT 'pending',
  shared_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, listing_id)
);

GRANT SELECT, INSERT, UPDATE ON public.passport_shares TO authenticated;
GRANT ALL ON public.passport_shares TO service_role;

ALTER TABLE public.passport_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants insert their own shares"
  ON public.passport_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Tenants view their own shares"
  ON public.passport_shares FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Landlords view shares to their listings"
  ON public.passport_shares FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = passport_shares.listing_id AND p.landlord_id = auth.uid()
  ));

CREATE POLICY "Landlords update shares to their listings"
  ON public.passport_shares FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = passport_shares.listing_id AND p.landlord_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.property_listings p
    WHERE p.id = passport_shares.listing_id AND p.landlord_id = auth.uid()
  ));

CREATE INDEX passport_shares_listing_idx ON public.passport_shares(listing_id);
CREATE INDEX passport_shares_tenant_idx ON public.passport_shares(tenant_id);