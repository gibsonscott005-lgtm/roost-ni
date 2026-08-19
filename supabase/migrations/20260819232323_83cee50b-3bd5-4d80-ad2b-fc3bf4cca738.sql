-- Prevent self-escalation via profiles.account_type.
-- Users may edit their own profile (name, phone) but must never be able to
-- flip their own account_type; only trusted server-side/admin contexts can.

CREATE OR REPLACE FUNCTION public.prevent_account_type_self_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    jwt_role := coalesce(
      current_setting('request.jwt.claim.role', true),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    );

    -- Allow only trusted contexts: service_role, or direct/admin connections
    -- that carry no end-user JWT at all (migrations, server-side jobs).
    IF NOT (jwt_role = 'service_role' OR (auth.uid() IS NULL AND jwt_role IS DISTINCT FROM 'authenticated' AND jwt_role IS DISTINCT FROM 'anon')) THEN
      RAISE EXCEPTION 'account_type cannot be changed'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_lock_account_type ON public.profiles;

CREATE TRIGGER profiles_lock_account_type
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_account_type_self_change();