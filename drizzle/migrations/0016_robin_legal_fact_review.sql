CREATE TABLE public.legal_sources (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_url text NOT NULL UNIQUE, title text NOT NULL, notice_to_quit boolean NOT NULL DEFAULT false,
 confirmed_at timestamptz, last_checked_at timestamptz, page_text text, page_hash text, change_summary text, check_error text, updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.legal_sources TO service_role;
ALTER TABLE public.legal_sources ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.legal_facts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), topic text NOT NULL, fact_text text NOT NULL, source_url text NOT NULL REFERENCES public.legal_sources(source_url), last_verified_at timestamptz,
 status text NOT NULL DEFAULT 'needs_review' CHECK (status IN ('approved','needs_review')), rejected_at timestamptz, change_summary text, revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.legal_facts TO service_role;
ALTER TABLE public.legal_facts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.legal_monitor_settings (id boolean PRIMARY KEY DEFAULT true CHECK(id), email_enabled boolean NOT NULL DEFAULT true);
GRANT ALL ON public.legal_monitor_settings TO service_role;
ALTER TABLE public.legal_monitor_settings ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.record_legal_source_check(p_id uuid, p_expected_hash text, p_text text, p_hash text, p_summary text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_hash text;
BEGIN
 SELECT page_hash INTO old_hash FROM public.legal_sources WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR old_hash IS DISTINCT FROM p_expected_hash THEN RETURN false; END IF;
 UPDATE public.legal_sources SET page_text=p_text,page_hash=p_hash,last_checked_at=now(),confirmed_at=coalesce(confirmed_at,now()),check_error=NULL,change_summary=CASE WHEN old_hash IS NOT NULL AND old_hash<>p_hash THEN p_summary ELSE change_summary END,updated_at=now() WHERE id=p_id;
 IF old_hash IS NOT NULL AND old_hash<>p_hash THEN
 UPDATE public.legal_facts SET status='needs_review',change_summary=p_summary,revision=revision+1,updated_at=now() WHERE source_url=(SELECT source_url FROM public.legal_sources WHERE id=p_id);
 RETURN true;
 END IF;
 RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.record_legal_source_check(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_legal_source_check(uuid,text,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.configure_legal_monitor(p_url text,p_secret text) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing_id bigint; new_id bigint;
BEGIN
 SELECT jobid INTO existing_id FROM cron.job WHERE jobname='robin-legal-sources-weekly';
 IF existing_id IS NOT NULL THEN PERFORM cron.unschedule(existing_id); END IF;
 SELECT cron.schedule('robin-legal-sources-weekly','17 8 * * 1',format('SELECT net.http_post(url := %L, headers := jsonb_build_object(''Content-Type'',''application/json'',''Authorization'',%L), body := jsonb_build_object(''sourceId'',id), timeout_milliseconds := 120000) FROM public.legal_sources;',p_url,'Bearer '||p_secret)) INTO new_id;
 RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.configure_legal_monitor(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.configure_legal_monitor(text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.legal_monitor_active() RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname='robin-legal-sources-weekly' AND active); $$;
REVOKE ALL ON FUNCTION public.legal_monitor_active() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.legal_monitor_active() TO service_role;