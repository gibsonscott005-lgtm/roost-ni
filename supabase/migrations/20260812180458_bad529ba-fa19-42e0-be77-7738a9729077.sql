DROP POLICY IF EXISTS "Tenants update their own shares" ON public.passport_shares;

CREATE POLICY "Tenants update their own shares"
ON public.passport_shares
FOR UPDATE
TO authenticated
USING (auth.uid() = tenant_id)
WITH CHECK (auth.uid() = tenant_id);

CREATE OR REPLACE FUNCTION public.prevent_tenant_self_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status = 'accepted'::public.share_status
     AND auth.uid() = NEW.tenant_id THEN
    RAISE EXCEPTION 'Applicants cannot accept their own application';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS passport_shares_prevent_self_accept ON public.passport_shares;
CREATE TRIGGER passport_shares_prevent_self_accept
BEFORE UPDATE ON public.passport_shares
FOR EACH ROW EXECUTE FUNCTION public.prevent_tenant_self_accept();