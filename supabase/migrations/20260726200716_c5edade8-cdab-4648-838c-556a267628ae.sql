CREATE POLICY "Tenants append own verification audit"
  ON public.verification_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id);
