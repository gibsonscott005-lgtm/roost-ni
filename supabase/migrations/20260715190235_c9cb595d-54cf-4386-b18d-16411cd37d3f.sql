
REVOKE EXECUTE ON FUNCTION public.emit_notification(
  UUID, UUID, public.notification_type, TEXT, UUID, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.emit_notification(
  UUID, UUID, public.notification_type, TEXT, UUID, TEXT, TEXT, TEXT
) TO service_role;
