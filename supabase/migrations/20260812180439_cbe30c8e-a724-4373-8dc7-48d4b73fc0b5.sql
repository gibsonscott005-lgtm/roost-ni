ALTER TYPE public.share_status ADD VALUE IF NOT EXISTS 'withdrawn';

ALTER TABLE public.passport_shares
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_reason text,
  ADD COLUMN IF NOT EXISTS withdraw_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Tenant can sign their lease" ON public.passport_shares;

CREATE POLICY "Tenants update their own shares"
ON public.passport_shares
FOR UPDATE
TO authenticated
USING (auth.uid() = tenant_id)
WITH CHECK (auth.uid() = tenant_id AND status <> 'accepted'::public.share_status);