REVOKE ALL ON public.property_tenancy_records FROM anon;
REVOKE ALL ON FUNCTION public.sync_legacy_tenancy_fields() FROM anon, authenticated;