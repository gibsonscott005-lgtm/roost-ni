ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS landlord_checks_confirmed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.passport_shares.landlord_checks_confirmed_at IS
  'Set when the landlord confirms they have carried out their own tenant checks and understand Roost has not vetted the tenant. Roost never vets or recommends tenants.';