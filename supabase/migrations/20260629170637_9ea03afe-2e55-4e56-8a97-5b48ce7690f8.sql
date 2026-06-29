
-- Extend passport_shares with tenancy management fields
ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'awaiting',
  ADD COLUMN IF NOT EXISTS rent_status text NOT NULL DEFAULT 'awaiting',
  ADD COLUMN IF NOT EXISTS deposit_payment_method text,
  ADD COLUMN IF NOT EXISTS rent_payment_method text,
  ADD COLUMN IF NOT EXISTS deposit_scheme text,
  ADD COLUMN IF NOT EXISTS deposit_cert_number text,
  ADD COLUMN IF NOT EXISTS deposit_protected_at timestamptz,
  ADD COLUMN IF NOT EXISTS oil_handover_level text,
  ADD COLUMN IF NOT EXISTS inventory_completed_at timestamptz;

-- Receipts
CREATE TABLE IF NOT EXISTS public.tenancy_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.passport_shares(id) ON DELETE CASCADE,
  kind text NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL,
  statutory_cash boolean NOT NULL DEFAULT false,
  notes text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_receipts TO authenticated;
GRANT ALL ON public.tenancy_receipts TO service_role;
ALTER TABLE public.tenancy_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view receipts" ON public.tenancy_receipts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_receipts.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ));

CREATE POLICY "Landlord can manage receipts" ON public.tenancy_receipts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_receipts.share_id AND pl.landlord_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_receipts.share_id AND pl.landlord_id = auth.uid()
  ));

CREATE TRIGGER trg_tenancy_receipts_updated
  BEFORE UPDATE ON public.tenancy_receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Inventory items
CREATE TABLE IF NOT EXISTS public.tenancy_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.passport_shares(id) ON DELETE CASCADE,
  room text NOT NULL,
  condition text,
  notes text,
  photo_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_inventory_items TO authenticated;
GRANT ALL ON public.tenancy_inventory_items TO service_role;
ALTER TABLE public.tenancy_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view inventory" ON public.tenancy_inventory_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_inventory_items.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ));

CREATE POLICY "Landlord can manage inventory" ON public.tenancy_inventory_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_inventory_items.share_id AND pl.landlord_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_inventory_items.share_id AND pl.landlord_id = auth.uid()
  ));

CREATE TRIGGER trg_tenancy_inventory_updated
  BEFORE UPDATE ON public.tenancy_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
