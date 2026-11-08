ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'tenancy_records_reminder';
ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS rent_frequency text,
  ADD COLUMN IF NOT EXISTS tin_given_at date,
  ADD COLUMN IF NOT EXISTS tenant_phone text,
  ADD COLUMN IF NOT EXISTS additional_tenants jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.passport_shares DROP CONSTRAINT IF EXISTS passport_shares_rent_frequency_check;
ALTER TABLE public.passport_shares ADD CONSTRAINT passport_shares_rent_frequency_check
  CHECK (rent_frequency IS NULL OR rent_frequency IN ('weekly','fortnightly','monthly'));
COMMENT ON COLUMN public.passport_shares.rent_frequency IS 'Display only; rent ledger stays monthly.';
COMMENT ON COLUMN public.passport_shares.tin_given_at IS 'Date the landlord says the tenancy information notice was given. A landlord statement, not a compliance mark.';