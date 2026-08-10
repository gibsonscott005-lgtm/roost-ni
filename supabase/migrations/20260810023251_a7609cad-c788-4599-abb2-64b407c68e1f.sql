-- Fields returned by an identity verification provider.
ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS verified_full_name text,
  ADD COLUMN IF NOT EXISTS verified_date_of_birth date,
  ADD COLUMN IF NOT EXISTS id_document_expiry date,
  ADD COLUMN IF NOT EXISTS id_failure_reason text,
  ADD COLUMN IF NOT EXISTS verification_fee_paid_at timestamp with time zone;

-- Right to Rent is an England-only scheme; it has never applied in Northern Ireland.
ALTER TABLE public.tenant_passports
  DROP COLUMN IF EXISTS right_to_rent_verified;

-- Alert types for identity check outcomes.
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'identity_verified';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'identity_verification_failed';