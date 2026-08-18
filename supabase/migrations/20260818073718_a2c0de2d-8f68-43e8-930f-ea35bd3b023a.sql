ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_muted_types public.notification_type[] NOT NULL DEFAULT '{}'::public.notification_type[];