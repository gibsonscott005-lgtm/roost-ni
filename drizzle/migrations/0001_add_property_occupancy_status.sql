ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS occupancy_status text NOT NULL DEFAULT 'vacant',
  ADD COLUMN IF NOT EXISTS existing_tenant_name text,
  ADD COLUMN IF NOT EXISTS existing_tenant_email text,
  ADD COLUMN IF NOT EXISTS existing_tenancy_start date,
  ADD COLUMN IF NOT EXISTS existing_deposit_scheme text,
  ADD COLUMN IF NOT EXISTS existing_deposit_reference text,
  ADD COLUMN IF NOT EXISTS tenancy_ended_at timestamptz;

ALTER TABLE public.property_listings
  ADD CONSTRAINT property_listings_occupancy_status_check
  CHECK (occupancy_status IN ('tenanted', 'vacant'));

CREATE OR REPLACE FUNCTION public.enforce_tenanted_not_published()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.occupancy_status = 'tenanted' THEN
    NEW.is_published := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_tenanted_not_published ON public.property_listings;

CREATE TRIGGER trg_enforce_tenanted_not_published
BEFORE INSERT OR UPDATE ON public.property_listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_tenanted_not_published();