CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL DEFAULT '',
  content_markdown text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Landlord guides',
  tags text[] NOT NULL DEFAULT '{}',
  author_name text NOT NULL DEFAULT 'Scott, RoostNI',
  legal_checked_at date,
  meta_title text,
  meta_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX articles_published_idx ON public.articles (published_at DESC);

GRANT SELECT ON public.articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin_profile(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND account_type = 'admin')
$$;
REVOKE ALL ON FUNCTION public.is_admin_profile(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_profile(uuid) TO authenticated;

CREATE POLICY "Public reads published articles" ON public.articles FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL AND published_at <= now());
CREATE POLICY "Admins read all articles" ON public.articles FOR SELECT TO authenticated
  USING (public.is_admin_profile(auth.uid()));
CREATE POLICY "Admins insert articles" ON public.articles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_profile(auth.uid()));
CREATE POLICY "Admins update articles" ON public.articles FOR UPDATE TO authenticated
  USING (public.is_admin_profile(auth.uid())) WITH CHECK (public.is_admin_profile(auth.uid()));
CREATE POLICY "Admins delete articles" ON public.articles FOR DELETE TO authenticated
  USING (public.is_admin_profile(auth.uid()));

CREATE TRIGGER articles_set_updated_at BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();