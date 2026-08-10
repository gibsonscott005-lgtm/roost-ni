ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS income_doc_signal text;

COMMENT ON COLUMN public.tenant_passports.income_doc_signal IS
  'Metadata signal for the uploaded income document: trusted | editor | unknown | none. Informational only, never a verdict.';