DROP POLICY IF EXISTS "Anyone may submit a bounded audit result" ON public.compliance_audits;
CREATE POLICY "Anyone may submit a bounded audit result"
  ON public.compliance_audits FOR INSERT TO anon, authenticated
  WITH CHECK (
    score BETWEEN 0 AND 100
    AND band IN ('Well organised', 'Mostly there', 'Some gaps', 'Significant gaps')
    AND (email IS NULL OR (length(email) <= 254 AND email LIKE '%_@_%._%'))
    AND (contact_name IS NULL OR length(contact_name) <= 120)
    AND (property_count IS NULL OR length(property_count) <= 40)
    AND coalesce(array_length(gaps, 1), 0) <= 40
    AND pg_column_size(answers) <= 8192
    AND pg_column_size(utm) <= 2048
  );
