ALTER TABLE public.listing_alert_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS last_alert_sent_at timestamptz;
UPDATE public.listing_alert_subscribers SET unsubscribe_token = gen_random_uuid() WHERE unsubscribe_token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS listing_alert_subscribers_token_key ON public.listing_alert_subscribers(unsubscribe_token);

ALTER TABLE public.property_listings
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alerts_sent_at timestamptz;

CREATE TABLE IF NOT EXISTS public.listing_alert_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  live_delivery boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT, UPDATE ON public.listing_alert_settings TO authenticated;
GRANT ALL ON public.listing_alert_settings TO service_role;
ALTER TABLE public.listing_alert_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read alert settings" ON public.listing_alert_settings
  FOR SELECT TO authenticated USING (public.is_admin_profile(auth.uid()));
CREATE POLICY "Admins update alert settings" ON public.listing_alert_settings
  FOR UPDATE TO authenticated USING (public.is_admin_profile(auth.uid())) WITH CHECK (public.is_admin_profile(auth.uid()));
INSERT INTO public.listing_alert_settings (id, live_delivery) VALUES (true, false) ON CONFLICT DO NOTHING;