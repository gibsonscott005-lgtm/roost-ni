CREATE OR REPLACE FUNCTION public.approve_legal_fact(p_id uuid,p_revision integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE f public.legal_facts; s public.legal_sources;
BEGIN
 SELECT * INTO f FROM public.legal_facts WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fact not found'; END IF;
 SELECT * INTO s FROM public.legal_sources WHERE source_url=f.source_url FOR UPDATE;
 IF s.confirmed_at IS NULL OR s.page_hash IS NULL OR s.check_error IS NOT NULL OR s.last_checked_at IS NULL OR s.last_checked_at < now()-interval '7 days' THEN RAISE EXCEPTION 'Check this source successfully before approving the fact'; END IF;
 IF f.fact_text ~* 'legacy topic only|write and verify|review.*before stating' THEN RAISE EXCEPTION 'Replace the placeholder with an exact sourced fact before approval'; END IF;
 UPDATE public.legal_facts SET status='approved',last_verified_at=now(),rejected_at=NULL,change_summary=NULL,revision=revision+1,updated_at=now() WHERE id=p_id AND revision=p_revision;
 IF NOT FOUND THEN RAISE EXCEPTION 'Fact changed during review. Refresh and try again'; END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.approve_legal_fact(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_legal_fact(uuid,integer) TO service_role;