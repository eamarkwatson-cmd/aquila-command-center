-- Activity log
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text,
  entity_title text,
  action text not null,
  performed_by text,
  details text,
  created_at timestamptz default now() not null
);
alter table public.activity_log enable row level security;
create policy "auth read activity" on public.activity_log for select to authenticated using (true);
create policy "auth insert activity" on public.activity_log for insert to authenticated with check (true);
create index if not exists activity_log_created_at_idx on public.activity_log(created_at desc);

-- App settings (if not exists)
create table if not exists public.app_settings (
  key text primary key,
  value text
);
alter table public.app_settings enable row level security;
create policy "auth read settings" on public.app_settings for select to authenticated using (true);
create policy "auth upsert settings" on public.app_settings for insert to authenticated with check (true);
create policy "auth update settings" on public.app_settings for update to authenticated using (true);

-- Investments table
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fund_entity text,
  holding_entity text,
  category text,
  status text default 'Active',
  amount_committed text,
  capital_call_status text default 'N/A',
  docsign_status text default 'N/A',
  contact text,
  notes text,
  drive_folder_link text,
  next_action text,
  next_action_due date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
alter table public.investments enable row level security;
create policy "auth all investments" on public.investments for all to authenticated using (true) with check (true);
