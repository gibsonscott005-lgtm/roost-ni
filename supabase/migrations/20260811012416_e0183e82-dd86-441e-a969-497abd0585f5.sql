ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS bedrooms smallint,
  ADD COLUMN IF NOT EXISTS bathrooms smallint,
  ADD COLUMN IF NOT EXISTS furnished text,
  ADD COLUMN IF NOT EXISTS available_from date,
  ADD COLUMN IF NOT EXISTS min_tenancy_months smallint,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS bills_included text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS parking text,
  ADD COLUMN IF NOT EXISTS garden text,
  ADD COLUMN IF NOT EXISTS features text[] NOT NULL DEFAULT '{}';