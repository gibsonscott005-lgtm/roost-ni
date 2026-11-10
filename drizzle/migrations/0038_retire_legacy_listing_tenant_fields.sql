DROP TRIGGER IF EXISTS sync_legacy_tenancy_fields ON public.property_listings;
DROP FUNCTION IF EXISTS public.sync_legacy_tenancy_fields();
COMMENT ON COLUMN public.property_listings.existing_tenant_name IS 'DEPRECATED: replaced by property_tenancy_records.existing_tenant_name';
COMMENT ON COLUMN public.property_listings.existing_tenant_email IS 'DEPRECATED: replaced by property_tenancy_records.existing_tenant_email';
COMMENT ON COLUMN public.property_listings.existing_deposit_reference IS 'DEPRECATED: replaced by property_tenancy_records.existing_deposit_reference';