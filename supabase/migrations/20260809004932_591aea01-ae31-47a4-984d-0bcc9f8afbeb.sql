ALTER TABLE public.property_listings ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS lease_document_path text;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS lease_kind text NOT NULL DEFAULT 'standard';
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS deposit_cert_path text;
ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS tenancy_start_date date;

ALTER TABLE public.tenancy_receipts ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.tenancy_receipts ADD COLUMN IF NOT EXISTS period_label text;

ALTER TABLE public.tenancy_inventory_items ADD COLUMN IF NOT EXISTS tenant_disputed boolean NOT NULL DEFAULT false;
ALTER TABLE public.tenancy_inventory_items ADD COLUMN IF NOT EXISTS tenant_comment text;

DROP POLICY IF EXISTS "Tenant can flag inventory dispute" ON public.tenancy_inventory_items;
CREATE POLICY "Tenant can flag inventory dispute"
ON public.tenancy_inventory_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.passport_shares ps WHERE ps.id = tenancy_inventory_items.share_id AND ps.tenant_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.passport_shares ps WHERE ps.id = tenancy_inventory_items.share_id AND ps.tenant_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;