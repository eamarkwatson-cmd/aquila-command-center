-- Activity log table for tracking all important actions
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null, -- 'delegation' | 'linkedin_post' | 'investment' | 'inbox' | 'notion_sync'
  entity_id text,
  entity_title text,
  action text not null, -- 'status_changed' | 'created' | 'deleted' | 'posted_to_linkedin' | 'notion_synced' | 'escalated'
  performed_by text, -- email of user who performed the action
  details text,
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.activity_log enable row level security;

-- Allow authenticated users to read and insert
create policy "authenticated users can read activity log"
  on public.activity_log for select
  to authenticated using (true);

create policy "authenticated users can insert activity log"
  on public.activity_log for insert
  to authenticated with check (true);

-- Index for fast queries
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);
create index if not exists activity_log_entity_type_idx on public.activity_log(entity_type);
