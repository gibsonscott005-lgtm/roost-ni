CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_type text := NEW.raw_user_meta_data->>'account_type';
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type, hear_about_us)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN requested_type IN ('tenant', 'landlord') THEN requested_type::public.account_type
      ELSE 'tenant'::public.account_type
    END,
    LEFT(COALESCE(NEW.raw_user_meta_data->>'hear_about_us', ''), 120)
  );
  RETURN NEW;
END; $$;