ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS hear_about_us text;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type, hear_about_us)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'tenant'),
    LEFT(COALESCE(NEW.raw_user_meta_data->>'hear_about_us', ''), 120)
  );
  RETURN NEW;
END; $$;

DO $$
DECLARE
  demo_landlord_id uuid := 'f858d493-ae57-4ccb-ba25-fbb6065bf11c';
  existing_count int;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.property_listings WHERE landlord_id = demo_landlord_id;
  IF existing_count = 0 THEN
    INSERT INTO public.property_listings (
      landlord_id, title, address, location, monthly_rent, deposit,
      ni_landlord_reg_number, heating_type, enforce_empty_in_full_out,
      tenant_preferences, is_published, status, property_type, bedrooms,
      bathrooms, furnished, available_from, min_tenancy_months, description,
      bills_included, parking, garden, features, photo_urls
    ) VALUES
      (demo_landlord_id, '[Beta example] 2-bed terrace in East Belfast', 'Example Street, Belfast', 'Belfast · BT5', 850, 850, 'BETA123456', 'Gas', false, ARRAY['No pets','Non-smokers','Professionals only'], true, 'available', 'Terrace', 2, 1, 'Furnished', '2026-10-01', 12, 'This is a demonstration listing for beta testers — not a real property. It shows how a landlord listing appears on Roost.', ARRAY['Broadband'], 'On-street', 'None', ARRAY['Double glazing'], '{}'),
      (demo_landlord_id, '[Beta example] 1-bed apartment near Queen''s', 'Example Road, Belfast', 'Belfast · BT7', 700, 700, 'BETA123456', 'Electric', false, ARRAY['Non-smokers','Students considered','Long-term tenancy'], true, 'available', 'Apartment / Flat', 1, 1, 'Part-furnished', '2026-09-20', 12, 'This is a demonstration listing for beta testers — not a real property. It shows how a tenant can view and apply to a listing.', ARRAY['Electricity'], 'None', 'None', ARRAY['Washing machine'], '{}');
  END IF;
END $$;