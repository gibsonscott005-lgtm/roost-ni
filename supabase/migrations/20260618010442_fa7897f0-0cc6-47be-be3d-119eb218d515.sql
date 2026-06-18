
-- 1. Account type enum
CREATE TYPE public.account_type AS ENUM ('tenant', 'landlord', 'admin');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  account_type public.account_type NOT NULL DEFAULT 'tenant',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 3. Tenant passports
CREATE TABLE public.tenant_passports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_verified BOOLEAN NOT NULL DEFAULT false,
  income_verified BOOLEAN NOT NULL DEFAULT false,
  reference_verified BOOLEAN NOT NULL DEFAULT false,
  right_to_rent_verified BOOLEAN NOT NULL DEFAULT false,
  monthly_income_net NUMERIC(10,2),
  affordability_max NUMERIC(10,2),
  preferred_heating TEXT,
  accept_empty_in_full_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_passports TO authenticated;
GRANT ALL ON public.tenant_passports TO service_role;
ALTER TABLE public.tenant_passports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants manage their own passport"
  ON public.tenant_passports FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Passports readable by authenticated users"
  ON public.tenant_passports FOR SELECT TO authenticated USING (true);

-- 4. Property listings
CREATE TABLE public.property_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  location TEXT,
  monthly_rent NUMERIC(10,2) NOT NULL,
  deposit NUMERIC(10,2) NOT NULL,
  ni_landlord_reg_number TEXT NOT NULL,
  heating_type TEXT NOT NULL,
  enforce_empty_in_full_out BOOLEAN NOT NULL DEFAULT true,
  tenant_preferences TEXT[] NOT NULL DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_listings TO authenticated;
GRANT SELECT ON public.property_listings TO anon;
GRANT ALL ON public.property_listings TO service_role;
ALTER TABLE public.property_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published listings are public"
  ON public.property_listings FOR SELECT USING (is_published = true);
CREATE POLICY "Landlords view their own listings"
  ON public.property_listings FOR SELECT TO authenticated USING (auth.uid() = landlord_id);
CREATE POLICY "Landlords create their own listings"
  ON public.property_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords update their own listings"
  ON public.property_listings FOR UPDATE TO authenticated USING (auth.uid() = landlord_id) WITH CHECK (auth.uid() = landlord_id);
CREATE POLICY "Landlords delete their own listings"
  ON public.property_listings FOR DELETE TO authenticated USING (auth.uid() = landlord_id);

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tenant_passports_set_updated_at BEFORE UPDATE ON public.tenant_passports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER property_listings_set_updated_at BEFORE UPDATE ON public.property_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Auto-create profile on signup, reading account_type & full_name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, account_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'account_type')::public.account_type, 'tenant')
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
