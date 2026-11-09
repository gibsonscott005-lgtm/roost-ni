CREATE OR REPLACE FUNCTION public.guard_tenant_settlement_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.passport_shares ps
    JOIN public.property_listings pl ON pl.id = ps.listing_id
    WHERE ps.id = NEW.share_id AND pl.landlord_id = auth.uid()
  ) THEN RETURN NEW; END IF;
  -- Tenants may only record their response and comment.
  IF NEW.share_id IS DISTINCT FROM OLD.share_id
     OR NEW.deposit_total IS DISTINCT FROM OLD.deposit_total
     OR NEW.deductions IS DISTINCT FROM OLD.deductions
     OR NEW.proposed_return IS DISTINCT FROM OLD.proposed_return
     OR NEW.proposed_at IS DISTINCT FROM OLD.proposed_at
     OR NEW.scheme_dispute_ref IS DISTINCT FROM OLD.scheme_dispute_ref
     OR NEW.returned_at IS DISTINCT FROM OLD.returned_at
     OR NEW.return_method IS DISTINCT FROM OLD.return_method
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the landlord can change the deposit settlement details';
  END IF;
  IF NEW.tenant_response IS NOT NULL AND NEW.tenant_response NOT IN ('agreed','disputed') THEN
    RAISE EXCEPTION 'Invalid response';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_tenant_settlement_update ON public.tenancy_deposit_settlements;
CREATE TRIGGER trg_guard_tenant_settlement_update
  BEFORE UPDATE ON public.tenancy_deposit_settlements
  FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_settlement_update();