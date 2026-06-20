
ALTER TABLE public.tenant_passports
  ADD COLUMN IF NOT EXISTS id_document_type text,
  ADD COLUMN IF NOT EXISTS id_document_number text,
  ADD COLUMN IF NOT EXISTS id_document_path text,
  ADD COLUMN IF NOT EXISTS employment_status text,
  ADD COLUMN IF NOT EXISTS annual_income numeric,
  ADD COLUMN IF NOT EXISTS income_document_path text,
  ADD COLUMN IF NOT EXISTS previous_landlord_name text,
  ADD COLUMN IF NOT EXISTS previous_landlord_email text,
  ADD COLUMN IF NOT EXISTS previous_landlord_phone text;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_passports_id_doc_type_check'
  ) THEN
    ALTER TABLE public.tenant_passports
      ADD CONSTRAINT tenant_passports_id_doc_type_check
      CHECK (id_document_type IS NULL OR id_document_type IN ('passport','driving_licence'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Tenants can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Tenants can delete their own documents" ON storage.objects;

CREATE POLICY "Tenants can upload their own documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Tenants can view their own documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Tenants can delete their own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tenant-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
