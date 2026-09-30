CREATE TABLE public.marketing_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  persona text NOT NULL,
  angle text NOT NULL,
  topic text NOT NULL,
  body text NOT NULL,
  link_url text,
  utm_campaign text NOT NULL UNIQUE,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  posted_at timestamptz,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_posts TO authenticated;
GRANT ALL ON public.marketing_posts TO service_role;

ALTER TABLE public.marketing_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing posts"
ON public.marketing_posts
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'admin'));

CREATE TRIGGER marketing_posts_set_updated_at
BEFORE UPDATE ON public.marketing_posts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE public.marketing_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  insight text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_insights TO authenticated;
GRANT ALL ON public.marketing_insights TO service_role;

ALTER TABLE public.marketing_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage marketing insights"
ON public.marketing_insights
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_type = 'admin'));