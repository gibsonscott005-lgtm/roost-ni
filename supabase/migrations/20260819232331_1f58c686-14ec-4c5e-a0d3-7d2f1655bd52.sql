REVOKE ALL ON FUNCTION public.prevent_account_type_self_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_account_type_self_change() FROM anon;
REVOKE ALL ON FUNCTION public.prevent_account_type_self_change() FROM authenticated;