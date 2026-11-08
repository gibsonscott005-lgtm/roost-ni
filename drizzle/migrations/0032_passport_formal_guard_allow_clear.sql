CREATE OR REPLACE FUNCTION public.guard_formal_application()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE jwt_role text;
BEGIN
  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'));
  IF jwt_role IN ('authenticated','anon') AND NEW.formal_application_at IS NOT NULL AND NEW.formal_application_at IS DISTINCT FROM OLD.formal_application_at THEN
    RAISE EXCEPTION 'Formal applications are submitted through RoostNI only';
  END IF;
  RETURN NEW;
END $$;