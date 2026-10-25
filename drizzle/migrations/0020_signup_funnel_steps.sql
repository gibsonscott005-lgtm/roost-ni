ALTER TABLE public.landlord_funnel_events DROP CONSTRAINT IF EXISTS landlord_funnel_events_event_check;
ALTER TABLE public.landlord_funnel_events ADD CONSTRAINT landlord_funnel_events_event_check CHECK (event IN ('signed_up','confirmation_email_sent','email_confirmed','first_sign_in','landlord_dashboard_viewed','add_property_clicked','listing_started','listing_saved_draft','listing_published','help_requested'));

CREATE OR REPLACE FUNCTION public.funnel_record_auth_step(p_user uuid, p_event text, p_at timestamptz DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
  VALUES (p_user, p_event, p_at, p_at)
  ON CONFLICT (user_id, event) DO UPDATE SET last_at = EXCLUDED.last_at, occurrences = public.landlord_funnel_events.occurrences + 1;
END $$;
REVOKE ALL ON FUNCTION public.funnel_record_auth_step(uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.funnel_auth_user_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF coalesce(NEW.raw_user_meta_data->>'account_type','') <> 'landlord' THEN RETURN NEW; END IF;
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
      VALUES (NEW.id, 'signed_up', NEW.created_at, NEW.created_at) ON CONFLICT (user_id, event) DO NOTHING;
    END IF;
    IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
      INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
      VALUES (NEW.id, 'email_confirmed', NEW.email_confirmed_at, NEW.email_confirmed_at) ON CONFLICT (user_id, event) DO NOTHING;
    END IF;
    IF NEW.last_sign_in_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.last_sign_in_at IS NULL) THEN
      INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
      VALUES (NEW.id, 'first_sign_in', NEW.last_sign_in_at, NEW.last_sign_in_at) ON CONFLICT (user_id, event) DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'funnel tracking skipped: %', SQLERRM;
  END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.funnel_auth_user_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS funnel_auth_user_changes ON auth.users;
CREATE TRIGGER funnel_auth_user_changes AFTER INSERT OR UPDATE OF email_confirmed_at, last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.funnel_auth_user_changes();

CREATE OR REPLACE FUNCTION public.log_confirmation_email_sent(p_email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid;
BEGIN
  SELECT u.id INTO v_uid FROM auth.users u
  WHERE lower(u.email) = lower(p_email) AND u.raw_user_meta_data->>'account_type' = 'landlord' LIMIT 1;
  IF v_uid IS NULL THEN RETURN; END IF;
  PERFORM public.funnel_record_auth_step(v_uid, 'confirmation_email_sent', now());
END $$;
REVOKE ALL ON FUNCTION public.log_confirmation_email_sent(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_confirmation_email_sent(text) TO service_role;

INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
SELECT u.id, 'email_confirmed', u.email_confirmed_at, u.email_confirmed_at FROM auth.users u
JOIN public.profiles p ON p.id = u.id AND p.account_type = 'landlord'
WHERE u.email_confirmed_at IS NOT NULL ON CONFLICT (user_id, event) DO NOTHING;
INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
SELECT u.id, 'first_sign_in', u.last_sign_in_at, u.last_sign_in_at FROM auth.users u
JOIN public.profiles p ON p.id = u.id AND p.account_type = 'landlord'
WHERE u.last_sign_in_at IS NOT NULL ON CONFLICT (user_id, event) DO NOTHING;