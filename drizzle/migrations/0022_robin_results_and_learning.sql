ALTER TABLE public.marketing_posts ADD COLUMN IF NOT EXISTS skip_reason text;
ALTER TABLE public.marketing_insights ADD COLUMN IF NOT EXISTS verdict text NOT NULL DEFAULT 'too_little_data';

CREATE TABLE public.marketing_post_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.marketing_posts(id),
  group_name text NOT NULL,
  reach integer NOT NULL DEFAULT 0 CHECK (reach >= 0),
  reactions integer NOT NULL DEFAULT 0 CHECK (reactions >= 0),
  comments integer NOT NULL DEFAULT 0 CHECK (comments >= 0),
  shares integer NOT NULL DEFAULT 0 CHECK (shares >= 0),
  link_clicks integer NOT NULL DEFAULT 0 CHECK (link_clicks >= 0),
  entered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.marketing_post_results TO service_role;
ALTER TABLE public.marketing_post_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.marketing_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL UNIQUE,
  worked text[] NOT NULL DEFAULT '{}',
  stop text[] NOT NULL DEFAULT '{}',
  next_plan text[] NOT NULL DEFAULT '{}',
  missing_results uuid[] NOT NULL DEFAULT '{}',
  comparison jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.marketing_weekly_reviews TO service_role;
ALTER TABLE public.marketing_weekly_reviews ENABLE ROW LEVEL SECURITY;

-- Never lose marketing data: block deletes on posts, results, insights, visits and reviews.
CREATE OR REPLACE FUNCTION public.block_marketing_delete() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Robin data is never deleted (%).', TG_TABLE_NAME; END; $$;
CREATE TRIGGER no_delete_marketing_posts BEFORE DELETE ON public.marketing_posts FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();
CREATE TRIGGER no_delete_marketing_post_results BEFORE DELETE ON public.marketing_post_results FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();
CREATE TRIGGER no_delete_marketing_insights BEFORE DELETE ON public.marketing_insights FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();
CREATE TRIGGER no_delete_marketing_visits BEFORE DELETE ON public.marketing_visits FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();
CREATE TRIGGER no_delete_marketing_weekly_reviews BEFORE DELETE ON public.marketing_weekly_reviews FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();
-- Results rows are append-only: corrections add a new row.
CREATE TRIGGER no_update_marketing_post_results BEFORE UPDATE ON public.marketing_post_results FOR EACH ROW EXECUTE FUNCTION public.block_marketing_delete();

-- Skipping needs a reason.
CREATE OR REPLACE FUNCTION public.require_skip_reason() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'skipped' AND (OLD.status IS DISTINCT FROM 'skipped') AND coalesce(btrim(NEW.skip_reason), '') = '' THEN
    RAISE EXCEPTION 'A skipped post needs a reason.';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER marketing_posts_skip_reason BEFORE UPDATE ON public.marketing_posts FOR EACH ROW EXECUTE FUNCTION public.require_skip_reason();
UPDATE public.marketing_posts SET skip_reason = 'Skipped before reasons were recorded' WHERE status = 'skipped' AND skip_reason IS NULL;