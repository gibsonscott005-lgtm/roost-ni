CREATE TABLE public.property_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.property_listings(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  reference TEXT,
  issued_on DATE,
  expires_on DATE,
  document_path TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_certificates TO authenticated;
GRANT ALL ON public.property_certificates TO service_role;

ALTER TABLE public.property_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage their own certificates"
ON public.property_certificates FOR ALL TO authenticated
USING (auth.uid() = landlord_id)
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Tenants view certificates for their tenancy"
ON public.property_certificates FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.passport_shares s
  WHERE s.listing_id = property_certificates.property_id
    AND s.tenant_id = auth.uid()
    AND s.status = 'accepted'
));

CREATE INDEX idx_property_certificates_property ON public.property_certificates(property_id);

CREATE TRIGGER property_certificates_set_updated_at
BEFORE UPDATE ON public.property_certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'certificate_expiring';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'certificate_expired';