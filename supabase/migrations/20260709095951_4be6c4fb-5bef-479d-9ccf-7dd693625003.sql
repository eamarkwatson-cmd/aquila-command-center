
-- activity_log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  performed_by text,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved users read activity" ON public.activity_log;
CREATE POLICY "approved users read activity" ON public.activity_log
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'email' IN ('mew@aquilavc.com','kennedy.katua@athena.com'));

DROP POLICY IF EXISTS "approved users insert activity" ON public.activity_log;
CREATE POLICY "approved users insert activity" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'email' IN ('mew@aquilavc.com','kennedy.katua@athena.com'));

CREATE INDEX IF NOT EXISTS activity_log_created_at_idx ON public.activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON public.activity_log (entity_type, entity_id);

-- linkedin_post_metadata
CREATE TABLE IF NOT EXISTS public.linkedin_post_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notion_page_id text UNIQUE NOT NULL,
  approved_by text,
  approved_at timestamp with time zone,
  posted_at timestamp with time zone,
  linkedin_post_url text,
  last_synced_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_post_metadata TO authenticated;
GRANT ALL ON public.linkedin_post_metadata TO service_role;
ALTER TABLE public.linkedin_post_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approved users manage lp metadata" ON public.linkedin_post_metadata;
CREATE POLICY "approved users manage lp metadata" ON public.linkedin_post_metadata
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' IN ('mew@aquilavc.com','kennedy.katua@athena.com'))
  WITH CHECK (auth.jwt() ->> 'email' IN ('mew@aquilavc.com','kennedy.katua@athena.com'));

CREATE TRIGGER lp_metadata_touch
  BEFORE UPDATE ON public.linkedin_post_metadata
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
