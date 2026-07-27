ALTER TABLE public.tenant_passports
ADD COLUMN IF NOT EXISTS willing_direct_payment_apa BOOLEAN NOT NULL DEFAULT false;