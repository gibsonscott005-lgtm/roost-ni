CREATE OR REPLACE FUNCTION public.record_legal_source_check(p_id uuid, p_expected_hash text, p_text text, p_hash text, p_summary text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_hash text;
BEGIN
 SELECT page_hash INTO old_hash FROM public.legal_sources WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR old_hash IS DISTINCT FROM nullif(p_expected_hash,'') THEN RETURN false; END IF;
 UPDATE public.legal_sources SET page_text=p_text,page_hash=p_hash,last_checked_at=now(),confirmed_at=coalesce(confirmed_at,now()),check_error=NULL,change_summary=CASE WHEN old_hash IS NOT NULL AND old_hash<>p_hash THEN p_summary ELSE change_summary END,updated_at=now() WHERE id=p_id;
 IF old_hash IS NOT NULL AND old_hash<>p_hash THEN
 UPDATE public.legal_facts SET status='needs_review',change_summary=p_summary,revision=revision+1,updated_at=now() WHERE source_url=(SELECT source_url FROM public.legal_sources WHERE id=p_id);
 RETURN true;
 END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.record_legal_source_check(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_legal_source_check(uuid,text,text,text,text) TO service_role;