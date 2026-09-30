-- Sign-up may only ever create tenant or landlord profiles. The admin role
-- is granted server-side only; caller-controlled signup metadata must never
-- be able to mint it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type, hear_about_us)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'account_type' = 'landlord'
        THEN 'landlord'::public.account_type
      ELSE 'tenant'::public.account_type
    END,
    LEFT(COALESCE(NEW.raw_user_meta_data->>'hear_about_us', ''), 120)
  );
  RETURN NEW;
END; $$;