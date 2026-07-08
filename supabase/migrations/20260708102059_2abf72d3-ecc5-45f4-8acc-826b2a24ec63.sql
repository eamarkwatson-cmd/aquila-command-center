
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth users read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NEW.email = 'mew@aquilavc.com' THEN 'Mark'
      WHEN NEW.email = 'kennedy.katua@athena.com' THEN 'Kennedy'
      ELSE split_part(NEW.email, '@', 1)
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Delegations
CREATE TABLE public.delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL CHECK (owner IN ('Mark','Kennedy','Other')),
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started','In Progress','Waiting','Overdue','Done')),
  due_date DATE,
  priority TEXT CHECK (priority IN ('High','Medium','Low')),
  source TEXT CHECK (source IN ('Call','Email','WhatsApp','Slack')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delegations TO authenticated;
GRANT ALL ON public.delegations TO service_role;
ALTER TABLE public.delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage delegations" ON public.delegations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Investments
CREATE TABLE public.investments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  entity TEXT,
  custodian TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Pending Docs','Action Needed','Closed')),
  amount NUMERIC,
  next_action TEXT,
  next_action_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investments TO authenticated;
GRANT ALL ON public.investments TO service_role;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage investments" ON public.investments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Inbox items
CREATE TABLE public.inbox_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  sender TEXT,
  category TEXT NOT NULL DEFAULT 'FYI' CHECK (category IN ('Urgent','Notable','FYI')),
  summary TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  actioned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_items TO authenticated;
GRANT ALL ON public.inbox_items TO service_role;
ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage inbox" ON public.inbox_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Events (calendar)
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  platform TEXT,
  join_url TEXT,
  meeting_id TEXT,
  passcode TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- LinkedIn connection (single row for Mark)
CREATE TABLE public.linkedin_connection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token TEXT NOT NULL,
  person_urn TEXT NOT NULL,
  display_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.linkedin_connection TO authenticated;
GRANT ALL ON public.linkedin_connection TO service_role;
ALTER TABLE public.linkedin_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read linkedin conn" ON public.linkedin_connection FOR SELECT TO authenticated USING (true);

-- App settings (single-row style)
CREATE TABLE public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_delegations_upd BEFORE UPDATE ON public.delegations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_investments_upd BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed delegations
INSERT INTO public.delegations (title, owner, status, priority, source) VALUES
  ('Delaware Certificate of Good Standing — FedEx to Newport', 'Kennedy', 'In Progress', 'Medium', 'Email'),
  ('Kraken + SPX management fees — wire via UpMarket', 'Mark', 'Overdue', 'High', 'Email'),
  ('SafeSend Form 2848 POA — e-sign', 'Mark', 'Overdue', 'High', 'Email'),
  ('Charles Hotel Cambridge — book via Centurion Amex FHR', 'Kennedy', 'In Progress', 'Medium', 'Call'),
  ('1Password setup', 'Mark', 'Not Started', 'Low', 'Slack');

-- Seed investments
INSERT INTO public.investments (name, entity, custodian, platform, status, next_action) VALUES
  ('Anduril Pre-IPO Fund III', 'MEW Family Office', 'UpMarket', 'UpMarket', 'Pending Docs', 'Delaware certificate to Nora Wang'),
  ('Project Prometheus', 'MEW Family Office', 'UpMarket', 'UpMarket', 'Pending Docs', '$50,000 indication submitted'),
  ('Kraken Co-Investment Fund I', 'MEW Family Office', 'UpMarket', 'UpMarket', 'Action Needed', 'Management fee overdue');

INSERT INTO public.app_settings (key, value) VALUES ('emails_cleared', '0'::jsonb);
