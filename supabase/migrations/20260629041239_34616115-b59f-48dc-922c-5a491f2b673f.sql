ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS lease_status text,
  ADD COLUMN IF NOT EXISTS lease_oil_clause boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS lease_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_signed_name text;

ALTER TABLE public.passport_shares
  DROP CONSTRAINT IF EXISTS passport_shares_lease_status_check;
ALTER TABLE public.passport_shares
  ADD CONSTRAINT passport_shares_lease_status_check
  CHECK (lease_status IS NULL OR lease_status IN ('sent_to_tenant','signed_pending_landlord','counter_signed'));

-- Allow tenant to update lease signature fields on their own shares (existing UPDATE policy may restrict, add explicit one)
DROP POLICY IF EXISTS "Tenant can sign their lease" ON public.passport_shares;
CREATE POLICY "Tenant can sign their lease"
  ON public.passport_shares
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);