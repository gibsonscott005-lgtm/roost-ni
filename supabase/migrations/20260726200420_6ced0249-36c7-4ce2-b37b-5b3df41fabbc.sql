-- Enum for ID verification status
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend existing tenant_passports with verification columns
ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS id_status public.verification_status NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_provider TEXT DEFAULT 'self_certified',
  ADD COLUMN IF NOT EXISTS id_session_id TEXT,
  ADD COLUMN IF NOT EXISTS issuing_country TEXT;

-- Immutable audit log
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_audit_logs_tenant_idx
  ON public.verification_audit_logs (tenant_id, created_at DESC);

GRANT SELECT ON public.verification_audit_logs TO authenticated;
GRANT ALL ON public.verification_audit_logs TO service_role;

ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Tenants read their own audit entries
CREATE POLICY "Tenants read own verification audit"
  ON public.verification_audit_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

-- Landlords read audit entries for tenants who applied to their listings
CREATE POLICY "Landlords read applicant verification audit"
  ON public.verification_audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.tenant_id = verification_audit_logs.tenant_id
      AND pl.landlord_id = auth.uid()
  ));

-- No INSERT/UPDATE/DELETE policies => only service_role can write (immutable to users)
