ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS tenancy_duration text,
  ADD COLUMN IF NOT EXISTS reference_document_path text;