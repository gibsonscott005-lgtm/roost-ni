ALTER TABLE public.passport_shares ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS tin_on_file_reported_at timestamptz;
COMMENT ON COLUMN public.passport_shares.tin_on_file_reported_at IS 'When the landlord said a Tenancy Information Notice is on file. A landlord statement only, never treated as compliance.';

CREATE OR REPLACE FUNCTION public.create_existing_tenancy(p_listing uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.property_listings; v_id uuid;
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
  INSERT INTO public.passport_shares (tenant_id, listing_id, status, lease_status, lease_kind, tenancy_status, tenancy_start_date, deposit_scheme, deposit_cert_number)
  VALUES (NULL, p_listing, 'accepted', 'existing', 'existing_agreement', 'active', l.existing_tenancy_start, l.existing_deposit_scheme, l.existing_deposit_reference)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.create_existing_tenancy(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_existing_tenancy(uuid) TO authenticated;