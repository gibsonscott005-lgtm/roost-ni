DROP POLICY IF EXISTS "Landlords read passports of accepted tenants" ON public.tenant_passports;
DROP POLICY IF EXISTS "Landlords read passports shared with them" ON public.tenant_passports;

CREATE TABLE public.property_tenancy_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL UNIQUE REFERENCES public.property_listings(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL,
  existing_tenant_name text,
  existing_tenant_email text,
  existing_deposit_reference text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_tenancy_records TO authenticated;
GRANT ALL ON public.property_tenancy_records TO service_role;
ALTER TABLE public.property_tenancy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords manage their own tenancy records" ON public.property_tenancy_records
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid() AND EXISTS (SELECT 1 FROM public.property_listings pl WHERE pl.id = listing_id AND pl.landlord_id = auth.uid()));
CREATE TRIGGER property_tenancy_records_updated_at BEFORE UPDATE ON public.property_tenancy_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.property_tenancy_records (listing_id, landlord_id, existing_tenant_name, existing_tenant_email, existing_deposit_reference)
SELECT id, landlord_id, existing_tenant_name, existing_tenant_email, existing_deposit_reference
FROM public.property_listings
WHERE existing_tenant_name IS NOT NULL OR existing_tenant_email IS NOT NULL OR existing_deposit_reference IS NOT NULL;

-- Until the old columns are removed, copy any value the currently published code writes into the new table.
CREATE OR REPLACE FUNCTION public.sync_legacy_tenancy_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.existing_tenant_name IS NOT NULL OR NEW.existing_tenant_email IS NOT NULL OR NEW.existing_deposit_reference IS NOT NULL THEN
    INSERT INTO public.property_tenancy_records (listing_id, landlord_id, existing_tenant_name, existing_tenant_email, existing_deposit_reference)
    VALUES (NEW.id, NEW.landlord_id, NEW.existing_tenant_name, NEW.existing_tenant_email, NEW.existing_deposit_reference)
    ON CONFLICT (listing_id) DO UPDATE SET
      existing_tenant_name = EXCLUDED.existing_tenant_name,
      existing_tenant_email = EXCLUDED.existing_tenant_email,
      existing_deposit_reference = EXCLUDED.existing_deposit_reference;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_legacy_tenancy_fields() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER sync_legacy_tenancy_fields AFTER INSERT OR UPDATE OF existing_tenant_name, existing_tenant_email, existing_deposit_reference ON public.property_listings
  FOR EACH ROW EXECUTE FUNCTION public.sync_legacy_tenancy_fields();

CREATE OR REPLACE FUNCTION public.create_existing_tenancy(p_listing uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE l public.property_listings; v_id uuid; v_ref text;
BEGIN
  SELECT * INTO l FROM public.property_listings WHERE id = p_listing;
  IF l.id IS NULL OR l.landlord_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Property not found';
  END IF;
  IF l.occupancy_status <> 'tenanted' THEN
    RAISE EXCEPTION 'Only a tenanted property can have an existing tenancy record';
  END IF;
  SELECT id INTO v_id FROM public.passport_shares
   WHERE listing_id = p_listing AND lease_kind = 'existing_agreement' AND tenancy_status <> 'completed'
   LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  SELECT existing_deposit_reference INTO v_ref FROM public.property_tenancy_records WHERE listing_id = p_listing;
  INSERT INTO public.passport_shares (tenant_id, listing_id, status, lease_status, lease_kind, tenancy_status, tenancy_start_date, deposit_scheme, deposit_cert_number)
  VALUES (NULL, p_listing, 'accepted', 'existing', 'existing_agreement', 'active', l.existing_tenancy_start, l.existing_deposit_scheme, v_ref)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $function$;

COMMENT ON COLUMN public.property_listings.existing_tenant_name IS 'DEPRECATED: replaced by property_tenancy_records';
COMMENT ON COLUMN public.property_listings.existing_tenant_email IS 'DEPRECATED: replaced by property_tenancy_records';
COMMENT ON COLUMN public.property_listings.existing_deposit_reference IS 'DEPRECATED: replaced by property_tenancy_records';