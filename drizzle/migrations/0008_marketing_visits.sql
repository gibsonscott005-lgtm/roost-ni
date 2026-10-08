CREATE TABLE public.marketing_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utm_campaign text NOT NULL CHECK (char_length(utm_campaign) BETWEEN 1 AND 120),
  utm_source text CHECK (char_length(utm_source) <= 120),
  landing_path text CHECK (char_length(landing_path) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.marketing_visits TO anon, authenticated;
GRANT ALL ON public.marketing_visits TO service_role;
ALTER TABLE public.marketing_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log a campaign visit" ON public.marketing_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX marketing_visits_campaign_idx ON public.marketing_visits (utm_campaign);