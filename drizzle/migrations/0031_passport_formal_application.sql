ALTER TABLE public.passport_shares ADD COLUMN IF NOT EXISTS formal_application_at timestamptz;
COMMENT ON COLUMN public.passport_shares.formal_application_at IS 'Set when the tenant submits a formal application; only then can the landlord open passport document files.';

CREATE OR REPLACE FUNCTION public.clear_formal_application_on_end()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IN ('withdrawn','declined') AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.formal_application_at := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS passport_shares_clear_formal ON public.passport_shares;
CREATE TRIGGER passport_shares_clear_formal BEFORE UPDATE ON public.passport_shares
FOR EACH ROW EXECUTE FUNCTION public.clear_formal_application_on_end();

CREATE OR REPLACE FUNCTION public.guard_formal_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE jwt_role text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'));
  IF jwt_role IN ('authenticated','anon') AND NEW.formal_application_at IS DISTINCT FROM OLD.formal_application_at THEN
    RAISE EXCEPTION 'Formal applications are submitted through RoostNI only';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS passport_shares_guard_formal ON public.passport_shares;
CREATE TRIGGER passport_shares_guard_formal BEFORE UPDATE ON public.passport_shares
FOR EACH ROW EXECUTE FUNCTION public.guard_formal_application();