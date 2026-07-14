CREATE TABLE public.investment_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by text NOT NULL DEFAULT 'Kennedy',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_activity TO authenticated;
GRANT ALL ON public.investment_activity TO service_role;
ALTER TABLE public.investment_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated full access to investment_activity"
  ON public.investment_activity FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE INDEX idx_investment_activity_investment_id ON public.investment_activity(investment_id, created_at DESC);