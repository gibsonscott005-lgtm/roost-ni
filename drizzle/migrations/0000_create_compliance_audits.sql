CREATE TABLE public.compliance_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  contact_name text,
  score smallint NOT NULL,
  band text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  gaps text[] NOT NULL DEFAULT ARRAY[]::text[],
  property_count text,
  utm jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.compliance_audits TO anon;
GRANT INSERT, SELECT ON public.compliance_audits TO authenticated;
GRANT ALL ON public.compliance_audits TO service_role;

ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone may submit an audit result"
  ON public.compliance_audits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins may read audit results"
  ON public.compliance_audits FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.account_type = 'admin'
  ));
