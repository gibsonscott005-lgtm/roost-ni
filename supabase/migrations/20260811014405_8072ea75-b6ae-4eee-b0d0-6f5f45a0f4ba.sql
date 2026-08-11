ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'notice_served';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'notice_acknowledged';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'final_inspection_submitted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'final_inspection_agreed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'final_inspection_disputed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deposit_settlement_proposed';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'deposit_returned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'tenancy_completed';

ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS tenancy_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS final_meter_readings text,
  ADD COLUMN IF NOT EXISTS final_oil_level text,
  ADD COLUMN IF NOT EXISTS final_inspection_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_inspection_response text,
  ADD COLUMN IF NOT EXISTS final_inspection_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS tenancy_completed_at timestamptz;

ALTER TABLE public.tenancy_inventory_items
  ADD COLUMN IF NOT EXISTS final_condition text,
  ADD COLUMN IF NOT EXISTS final_notes text,
  ADD COLUMN IF NOT EXISTS final_photo_path text;

CREATE TABLE IF NOT EXISTS public.tenancy_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.passport_shares(id) ON DELETE CASCADE,
  served_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  served_by_role text NOT NULL,
  served_on date NOT NULL,
  notice_weeks smallint NOT NULL,
  end_date date NOT NULL,
  reason text,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_notices TO authenticated;
GRANT ALL ON public.tenancy_notices TO service_role;
ALTER TABLE public.tenancy_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view notices" ON public.tenancy_notices
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_notices.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ));

CREATE POLICY "Parties can serve a notice" ON public.tenancy_notices
  FOR INSERT TO authenticated
  WITH CHECK (
    served_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.passport_shares ps
      LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
      WHERE ps.id = tenancy_notices.share_id
        AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
    )
  );

CREATE POLICY "Parties can update notices" ON public.tenancy_notices
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_notices.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_notices.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ));

CREATE TRIGGER trg_tenancy_notices_updated
  BEFORE UPDATE ON public.tenancy_notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tenancy_deposit_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL UNIQUE REFERENCES public.passport_shares(id) ON DELETE CASCADE,
  deposit_total numeric NOT NULL DEFAULT 0,
  deductions jsonb NOT NULL DEFAULT '[]'::jsonb,
  proposed_return numeric NOT NULL DEFAULT 0,
  proposed_at timestamptz,
  tenant_response text,
  tenant_responded_at timestamptz,
  tenant_comment text,
  scheme_dispute_ref text,
  returned_at timestamptz,
  return_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenancy_deposit_settlements TO authenticated;
GRANT ALL ON public.tenancy_deposit_settlements TO service_role;
ALTER TABLE public.tenancy_deposit_settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties can view settlements" ON public.tenancy_deposit_settlements
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    LEFT JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_deposit_settlements.share_id
      AND (ps.tenant_id = auth.uid() OR pl.landlord_id = auth.uid())
  ));

CREATE POLICY "Landlord can manage settlements" ON public.tenancy_deposit_settlements
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_deposit_settlements.share_id AND pl.landlord_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = tenancy_deposit_settlements.share_id AND pl.landlord_id = auth.uid()
  ));

CREATE POLICY "Tenant can respond to settlement" ON public.tenancy_deposit_settlements
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    WHERE ps.id = tenancy_deposit_settlements.share_id AND ps.tenant_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.passport_shares ps
    WHERE ps.id = tenancy_deposit_settlements.share_id AND ps.tenant_id = auth.uid()
  ));

CREATE TRIGGER trg_tenancy_settlements_updated
  BEFORE UPDATE ON public.tenancy_deposit_settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();