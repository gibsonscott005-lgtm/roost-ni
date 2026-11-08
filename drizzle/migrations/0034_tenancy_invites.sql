CREATE TABLE public.tenancy_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.passport_shares(id) ON DELETE CASCADE,
  landlord_id uuid NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_by uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenancy_invites TO authenticated;
GRANT ALL ON public.tenancy_invites TO service_role;
ALTER TABLE public.tenancy_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlords view their own invites" ON public.tenancy_invites
  FOR SELECT TO authenticated USING (auth.uid() = landlord_id);
CREATE INDEX tenancy_invites_share_idx ON public.tenancy_invites(share_id);