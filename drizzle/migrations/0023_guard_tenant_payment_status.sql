CREATE OR REPLACE FUNCTION public.guard_tenant_payment_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.tenant_id THEN
    IF NEW.deposit_status IS DISTINCT FROM OLD.deposit_status
       AND NEW.deposit_status <> 'pending_verification' THEN
      RAISE EXCEPTION 'Only the landlord can confirm a deposit payment';
    END IF;
    IF NEW.rent_status IS DISTINCT FROM OLD.rent_status
       AND NEW.rent_status <> 'pending_verification' THEN
      RAISE EXCEPTION 'Only the landlord can confirm a rent payment';
    END IF;
    IF NEW.deposit_payment_method IS DISTINCT FROM OLD.deposit_payment_method
       OR NEW.rent_payment_method IS DISTINCT FROM OLD.rent_payment_method THEN
      RAISE EXCEPTION 'Only the landlord can record a payment method';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS passport_shares_guard_payment_status ON public.passport_shares;
CREATE TRIGGER passport_shares_guard_payment_status
BEFORE UPDATE ON public.passport_shares
FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_payment_status();