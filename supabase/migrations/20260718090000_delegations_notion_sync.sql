-- Notion sync support for delegations
ALTER TABLE public.delegations ADD COLUMN IF NOT EXISTS notion_page_id TEXT UNIQUE;
ALTER TABLE public.delegations ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Track last sync run for UI display
INSERT INTO public.app_settings (key, value)
VALUES ('delegations_last_sync', '""'::jsonb)
ON CONFLICT (key) DO NOTHING;
