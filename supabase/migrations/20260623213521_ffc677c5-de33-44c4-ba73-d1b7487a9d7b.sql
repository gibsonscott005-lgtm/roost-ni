
ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS is_first_time_renter boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guarantor_name text,
  ADD COLUMN IF NOT EXISTS guarantor_address text,
  ADD COLUMN IF NOT EXISTS guarantor_email text,
  ADD COLUMN IF NOT EXISTS guarantor_phone text,
  ADD COLUMN IF NOT EXISTS guarantor_employment_status text,
  ADD COLUMN IF NOT EXISTS tenancy_start_date date,
  ADD COLUMN IF NOT EXISTS tenancy_end_date date,
  ADD COLUMN IF NOT EXISTS previous_landlord_name_2 text,
  ADD COLUMN IF NOT EXISTS previous_landlord_email_2 text,
  ADD COLUMN IF NOT EXISTS previous_landlord_phone_2 text,
  ADD COLUMN IF NOT EXISTS tenancy_start_date_2 date,
  ADD COLUMN IF NOT EXISTS tenancy_end_date_2 date;
