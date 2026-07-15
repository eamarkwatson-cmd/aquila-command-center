-- ================================================================
-- Full schema seed for Kennedy's Supabase (oxfkrthjpovhgwgxqvog)
-- Creates all missing tables with IF NOT EXISTS safety
-- ================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='auth users read all profiles') THEN
    CREATE POLICY "auth users read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='users update own profile') THEN
    CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id, NEW.email,
    CASE
      WHEN NEW.email = 'mew@aquilavc.com' THEN 'Mark'
      WHEN NEW.email = 'kennedy.katua@athena.com' THEN 'Kennedy'
      ELSE split_part(NEW.email, '@', 1)
    END
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Delegations
CREATE TABLE IF NOT EXISTS public.delegations (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='delegations' AND policyname='auth manage delegations') THEN
    CREATE POLICY "auth manage delegations" ON public.delegations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Investments
CREATE TABLE IF NOT EXISTS public.investments (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='investments' AND policyname='auth manage investments') THEN
    CREATE POLICY "auth manage investments" ON public.investments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Investment activity
CREATE TABLE IF NOT EXISTS public.investment_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID NOT NULL REFERENCES public.investments(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by TEXT NOT NULL DEFAULT 'Kennedy',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_activity TO authenticated;
GRANT ALL ON public.investment_activity TO service_role;
ALTER TABLE public.investment_activity ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='investment_activity' AND policyname='auth manage investment_activity') THEN
    CREATE POLICY "auth manage investment_activity" ON public.investment_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Inbox items
CREATE TABLE IF NOT EXISTS public.inbox_items (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inbox_items' AND policyname='auth manage inbox') THEN
    CREATE POLICY "auth manage inbox" ON public.inbox_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Events (calendar)
CREATE TABLE IF NOT EXISTS public.events (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='events' AND policyname='auth manage events') THEN
    CREATE POLICY "auth manage events" ON public.events FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- App settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='app_settings' AND policyname='auth manage settings') THEN
    CREATE POLICY "auth manage settings" ON public.app_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- LinkedIn connection
CREATE TABLE IF NOT EXISTS public.linkedin_connection (
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
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='linkedin_connection' AND policyname='auth read linkedin conn') THEN
    CREATE POLICY "auth read linkedin conn" ON public.linkedin_connection FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- LinkedIn post metadata
CREATE TABLE IF NOT EXISTS public.linkedin_post_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notion_page_id TEXT NOT NULL UNIQUE,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,
  posted_at TIMESTAMPTZ,
  linkedin_post_url TEXT,
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.linkedin_post_metadata TO authenticated;
GRANT ALL ON public.linkedin_post_metadata TO service_role;
ALTER TABLE public.linkedin_post_metadata ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='linkedin_post_metadata' AND policyname='auth manage lp metadata') THEN
    CREATE POLICY "auth manage lp metadata" ON public.linkedin_post_metadata FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Activity log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_log' AND policyname='auth read activity') THEN
    CREATE POLICY "auth read activity" ON public.activity_log FOR SELECT TO authenticated USING (true);
    CREATE POLICY "auth insert activity" ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- Planned items
CREATE TABLE IF NOT EXISTS public.planned_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  city TEXT,
  detail TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.planned_items TO authenticated;
GRANT ALL ON public.planned_items TO service_role;
ALTER TABLE public.planned_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='planned_items' AND policyname='auth manage planned') THEN
    CREATE POLICY "auth manage planned" ON public.planned_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_delegations_upd ON public.delegations;
CREATE TRIGGER trg_delegations_upd BEFORE UPDATE ON public.delegations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_investments_upd ON public.investments;
CREATE TRIGGER trg_investments_upd BEFORE UPDATE ON public.investments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- App settings seed
INSERT INTO public.app_settings (key, value) VALUES
  ('emails_cleared', '15399'::jsonb),
  ('mark_location', '"Newport"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Seed current delegations (July 15, 2026)
INSERT INTO public.delegations (title, description, owner, status, priority, source, notes, due_date) VALUES
('SafeSend 2023 & 2024 — e-sign tax returns', '3rd automated reminder July 15. Both years unsigned. Mark waiting on Sarah Powell.', 'Mark', 'Overdue', 'High', 'Email', 'Call Sarah Powell (sarahp@mysacpa.com) today per all-day reminder.', '2026-07-15'),
('UpMarket portal login — send to Kennedy', 'Kennedy needs login to upload formation docs and complete account activation before July 31 liquidation deadline.', 'Mark', 'Waiting', 'High', 'Call', 'Mark said he would call back with credentials. Still outstanding.', '2026-07-15'),
('Kraken + SPX management fees — wire via UpMarket', 'UpMarket liquidation warning received July 13. July 31 deadline. Blocked on account activation.', 'Mark', 'Overdue', 'High', 'Email', 'July 31 = hard deadline. Account activation needs formation cert + proof of address + portal login.', '2026-07-31'),
('Immunis direct SAFE ($500K) — confirm allocation status', 'June 15 close passed. SimplyAgree docs never arrived. Cabato responded July 9 re: Imagine SPV 2 but did not address direct SAFE.', 'Mark', 'Waiting', 'High', 'Email', 'Mark to confirm with Cabato (Mark@immunisbiomedical.com) whether $500K direct allocation still open.', '2026-07-18'),
('Imagine SPV 2 dataroom — review and decide', 'Darshana Revankar (Imagine Global) sent dataroom July 9. Separate from direct SAFE. Independent decision.', 'Mark', 'Waiting', 'Medium', 'Email', 'Link: https://imagine-global.docsend.com/view/s/kc5m2egn4u76iitf Mark said he would review July 13 evening.', '2026-07-25'),
('Setter Capital — engage or decline', 'Shourya Wardhan (shourya@settercap.com) — LP liquidity + primary capital. 2nd follow-up July 10. No response.', 'Mark', 'Waiting', 'Medium', 'Email', 'Mark to decide: engage or decline. Kennedy can draft reply once confirmed.', '2026-07-18'),
('Princeton dinner pick', 'Options sent via WhatsApp July 14: Agricola, Teresa Caffe, Blue Point Grill. Mark to text preference.', 'Mark', 'Waiting', 'Medium', 'WhatsApp', 'Casual, excellent food, no fine dining, no chains. Son Marco joining.', '2026-07-15'),
('Shelburne Springs — confirm and book', 'Suite 3 (Rooftop Queen $375) + Suite 2 (Panoramic King $350) = $725 total. Breakfast included. Free cancellation until July 18.', 'Mark', 'Waiting', 'High', 'WhatsApp', 'Options sent to Mark July 15 via WhatsApp. July 18 = cancellation deadline.', '2026-07-18'),
('Storm Trysail Club — initiation fee + 2026 dues', 'Whitney Simon (execdirector@stormtrysail.org) emailed July 14. Not technically a member until paid. Statement in inbox.', 'Mark', 'Waiting', 'Medium', 'Email', 'Phone: 917-450-7547', NULL),
('Upload formation docs to UpMarket portal', 'Formation cert + Estella utility bill ready. Blocked on Mark portal login. Upload path: upmarket.co → My Investments → Pending Investment → Edit Application Document.', 'Kennedy', 'Waiting', 'High', 'Email', 'Do NOT email docs — portal upload only per Nora Wang instructions.', '2026-07-15'),
('Book Princeton dinner', 'Awaiting Mark preference: Agricola, Teresa Caffe, or Blue Point Grill. For 2 (Mark + son Marco), Friday July 18.', 'Kennedy', 'Waiting', 'Medium', 'WhatsApp', NULL, '2026-07-15'),
('RSVP to Eaglebrook + book Shelburne Springs', 'RSVP to Sharon Calvo (sharon.calvo@eaglebrook.org). Book Shelburne Springs once Mark confirms room options.', 'Kennedy', 'Not Started', 'Medium', 'Email', 'Sharon: 413-774-9132. Shelburne Springs: shelburnesprings@gmail.com', '2026-07-16'),
('Section AI demo prep', 'Section AI demo confirmed Monday July 21.', 'Kennedy', 'Not Started', 'Medium', 'Email', NULL, '2026-07-21')
ON CONFLICT DO NOTHING;

-- Seed current investments
INSERT INTO public.investments (name, entity, custodian, platform, status, amount, next_action, notes) VALUES
('Kraken Co-Investment Fund I', 'Aquila Capital Partners LLC', 'UpMarket', 'UpMarket', 'Action Needed', NULL, 'Pay 2025 annual expense call before July 31', 'Liquidation warning received July 13. Account activation blocking payment. Formation docs + utility bill ready to upload.'),
('Anduril Pre-IPO Opportunity Fund III', 'Aquila Capital Partners LLC', 'UpMarket', 'UpMarket', 'Pending Docs', NULL, 'Complete UpMarket account activation', 'Sub docs signed. W9 pending. Formation cert + proof of address needed for portal activation.'),
('SPX Management Fees', 'Aquila Capital Partners LLC', 'UpMarket', 'UpMarket', 'Action Needed', NULL, 'Wire via UpMarket portal', 'Blocked on UpMarket account activation.'),
('021T Capital Fund I', 'Pacific Premier Trust IRA', 'Pacific Premier Trust', 'Vanilla', 'Active', NULL, NULL, 'ERISA correction completed May 18, 2026 (Bobbi Milliken confirmed). Devon Triplett: devon@021t.vc'),
('Immunis Biomedical SAFE', 'Aquila Capital Partners LLC', NULL, 'SimplyAgree', 'Pending Docs', 500000, 'Confirm with Cabato if $500K allocation still open', 'June 15 close passed. SimplyAgree docs never arrived. Separate from Imagine SPV 2.'),
('Imagine SPV 2 (Immunis)', 'Aquila Capital Partners LLC', 'Imagine Global', NULL, 'Pending Docs', NULL, 'Review dataroom and decide', 'Syndicated SPV via Imagine Global. Dataroom: https://imagine-global.docsend.com/view/s/kc5m2egn4u76iitf Ani Chahal Honan managing partner.'),
('North Run SOF', 'Pacific Premier Trust IRA', 'Pacific Premier Trust', 'Carta', 'Active', NULL, NULL, 'Mark already invested. Distribution received June 11, 2026. Matt Weber: mweber@sagevp.com'),
('Sempulse', 'Pacific Premier Trust IRA', 'Pacific Premier Trust', NULL, 'Active', NULL, NULL, 'DIU win July 10 — AI-Assisted Triage and Treatment Challenge. 15,000 device contract. UK MoD sale closed. CEO: kurt@sempulse.com'),
('Clearway Capital Fund', 'Unknown', NULL, NULL, 'Action Needed', NULL, 'Confirm active holding and which trust', 'June 2026 performance PDF received July 10. Not in documented trust holdings.'),
('GLO Pharma / Ourself', 'Unknown', NULL, NULL, 'Action Needed', NULL, 'Confirm active holding and which trust', 'Q2 2026 update from Jim Hartman (jhartman@ourself.com) July 12. Not in documented holdings.')
ON CONFLICT DO NOTHING;

