
CREATE TYPE public.notification_type AS ENUM (
  'application_received',
  'application_accepted',
  'application_declined',
  'lease_issued',
  'lease_signed_by_tenant',
  'lease_counter_signed',
  'property_let_agreed',
  'receipt_logged',
  'receipt_confirmed',
  'deposit_protected',
  'deposit_deadline_approaching',
  'inventory_submitted',
  'inventory_approved'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type public.notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  link_path TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX notifications_recipient_created_idx
  ON public.notifications (recipient_id, created_at DESC);

CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  muted_types public.notification_type[] NOT NULL DEFAULT '{}'::public.notification_type[],
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc', now())
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can mark their own notifications as read"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

CREATE OR REPLACE FUNCTION public.emit_notification(
  p_recipient_id UUID,
  p_actor_id UUID,
  p_type public.notification_type,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_link_path TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_in_app BOOLEAN;
  v_muted public.notification_type[];
  v_id UUID;
BEGIN
  IF p_recipient_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT in_app_enabled, muted_types
    INTO v_in_app, v_muted
    FROM public.notification_preferences
   WHERE user_id = p_recipient_id;

  IF v_in_app IS NULL THEN
    v_in_app := true;
    v_muted := '{}'::public.notification_type[];
  END IF;

  IF v_in_app = false OR p_type = ANY(v_muted) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (
    recipient_id, actor_id, type, entity_type, entity_id, title, body, link_path
  ) VALUES (
    p_recipient_id, p_actor_id, p_type, p_entity_type, p_entity_id, p_title, p_body, p_link_path
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_notification(
  UUID, UUID, public.notification_type, TEXT, UUID, TEXT, TEXT, TEXT
) TO authenticated, service_role;
