CREATE TABLE public.reminder_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  kind text NOT NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT reminder_log_unique_per_day UNIQUE (entity_type, entity_id, kind, recipient_id, run_date)
);

GRANT ALL ON public.reminder_log TO service_role;

ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

-- No policies: this is an internal bookkeeping table written only by the
-- scheduled reminder job running with the service role.

CREATE INDEX reminder_log_run_date_idx ON public.reminder_log (run_date);