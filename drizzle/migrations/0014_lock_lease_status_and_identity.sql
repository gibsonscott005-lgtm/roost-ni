CREATE OR REPLACE FUNCTION public.guard_tenant_lease_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = NEW.tenant_id AND NEW.lease_status IS DISTINCT FROM OLD.lease_status THEN
    IF NOT (OLD.lease_status = 'sent_to_tenant' AND NEW.lease_status = 'signed_pending_landlord') THEN
      RAISE EXCEPTION 'Tenants can only sign a lease that has been sent to them';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_tenant_lease_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS passport_shares_guard_lease_status ON public.passport_shares;
CREATE TRIGGER passport_shares_guard_lease_status BEFORE UPDATE ON public.passport_shares
FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_lease_status();

CREATE OR REPLACE FUNCTION public.guard_identity_verified_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('authenticated','anon') AND NEW.id_status = 'verified'
     AND (TG_OP = 'INSERT' OR OLD.id_status IS DISTINCT FROM 'verified') THEN
    RAISE EXCEPTION 'Verified identity status can only be set by the identity check';
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.guard_identity_verified_status() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS tenant_passports_guard_id_status ON public.tenant_passports;
CREATE TRIGGER tenant_passports_guard_id_status BEFORE INSERT OR UPDATE ON public.tenant_passports
FOR EACH ROW EXECUTE FUNCTION public.guard_identity_verified_status();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS welcome_email_sent_at timestamptz;