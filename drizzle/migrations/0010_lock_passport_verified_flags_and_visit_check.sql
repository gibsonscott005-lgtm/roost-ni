CREATE OR REPLACE FUNCTION public.lock_passport_verified_flags()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE jwt_role text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'));
  IF jwt_role IN ('authenticated','anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.income_verified := false;
      NEW.reference_verified := false;
    ELSE
      NEW.income_verified := OLD.income_verified;
      NEW.reference_verified := OLD.reference_verified;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS tenant_passports_lock_verified ON public.tenant_passports;
CREATE TRIGGER tenant_passports_lock_verified BEFORE INSERT OR UPDATE ON public.tenant_passports
FOR EACH ROW EXECUTE FUNCTION public.lock_passport_verified_flags();

-- Previously self-set ticks were never independently checked.
UPDATE public.tenant_passports SET income_verified = false, reference_verified = false
WHERE income_verified OR reference_verified;

DROP POLICY IF EXISTS "Anyone can log a campaign visit" ON public.marketing_visits;
CREATE POLICY "Anyone can log a campaign visit" ON public.marketing_visits
FOR INSERT TO anon, authenticated
WITH CHECK (
  utm_campaign ~ '^[A-Za-z0-9_\-]{1,120}$'
  AND (utm_source IS NULL OR char_length(utm_source) <= 120)
  AND (landing_path IS NULL OR (char_length(landing_path) <= 300 AND landing_path LIKE '/%'))
  AND created_at >= now() - interval '1 minute' AND created_at <= now() + interval '1 minute'
);