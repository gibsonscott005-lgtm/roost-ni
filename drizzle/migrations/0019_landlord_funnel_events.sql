CREATE TABLE public.landlord_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event text NOT NULL CHECK (event IN ('signed_up','landlord_dashboard_viewed','add_property_clicked','listing_started','listing_saved_draft','listing_published','help_requested')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_at timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  UNIQUE (user_id, event)
);
CREATE INDEX landlord_funnel_events_user_idx ON public.landlord_funnel_events (user_id);

GRANT SELECT, INSERT ON public.landlord_funnel_events TO authenticated;
GRANT ALL ON public.landlord_funnel_events TO service_role;

ALTER TABLE public.landlord_funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords insert their own funnel events"
ON public.landlord_funnel_events FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'landlord')
);

CREATE POLICY "Admins read all funnel events"
ON public.landlord_funnel_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.account_type = 'admin'));

-- Logs a step for the calling landlord: first time inserts, later calls only bump last_at.
CREATE OR REPLACE FUNCTION public.log_landlord_funnel_event(
  p_event text, p_utm_source text DEFAULT NULL, p_utm_medium text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL, p_utm_content text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_signed timestamptz;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  SELECT created_at INTO v_signed FROM public.profiles WHERE id = v_uid AND account_type = 'landlord';
  IF v_signed IS NULL THEN RETURN false; END IF;
  IF p_event NOT IN ('landlord_dashboard_viewed','add_property_clicked','listing_started','listing_saved_draft','listing_published','help_requested') THEN
    RAISE EXCEPTION 'Unknown funnel event';
  END IF;
  INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at, utm_source, utm_medium, utm_campaign, utm_content)
  VALUES (v_uid, 'signed_up', v_signed, v_signed, left(p_utm_source,120), left(p_utm_medium,120), left(p_utm_campaign,120), left(p_utm_content,120))
  ON CONFLICT (user_id, event) DO NOTHING;
  INSERT INTO public.landlord_funnel_events (user_id, event, utm_source, utm_medium, utm_campaign, utm_content)
  VALUES (v_uid, p_event, left(p_utm_source,120), left(p_utm_medium,120), left(p_utm_campaign,120), left(p_utm_content,120))
  ON CONFLICT (user_id, event) DO UPDATE SET last_at = now(), occurrences = public.landlord_funnel_events.occurrences + 1;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.log_landlord_funnel_event(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_landlord_funnel_event(text,text,text,text,text) TO authenticated;

-- Backfill existing landlords from what they have already done.
INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
SELECT id, 'signed_up', created_at, created_at FROM public.profiles WHERE account_type = 'landlord'
ON CONFLICT DO NOTHING;
INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
SELECT l.landlord_id, 'listing_saved_draft', min(l.created_at), max(l.updated_at)
FROM public.property_listings l JOIN public.profiles p ON p.id = l.landlord_id AND p.account_type = 'landlord'
GROUP BY l.landlord_id ON CONFLICT DO NOTHING;
INSERT INTO public.landlord_funnel_events (user_id, event, created_at, last_at)
SELECT l.landlord_id, 'listing_published', min(l.created_at), max(l.updated_at)
FROM public.property_listings l JOIN public.profiles p ON p.id = l.landlord_id AND p.account_type = 'landlord'
WHERE l.is_published GROUP BY l.landlord_id ON CONFLICT DO NOTHING;