CREATE TABLE public.marketing_group_settings (id text PRIMARY KEY, groups jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.marketing_group_settings TO service_role;
ALTER TABLE public.marketing_group_settings ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.marketing_group_settings IS 'Server-only Robin group configuration; authenticated admin handlers authorise before privileged access.';