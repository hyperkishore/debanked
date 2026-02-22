-- EventIQ Phase 3: AI Briefing Layer
-- Cached AI-generated briefings per company per user

create table if not exists company_briefings (
  id bigint generated always as identity primary key,
  company_id int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  briefing_data jsonb not null,
  signal_hash text,
  created_at timestamptz default now(),
  unique(company_id, user_id)
);

-- RLS
alter table company_briefings enable row level security;

create policy "Own briefings read" on company_briefings
  for select using (auth.uid() = user_id);
create policy "Own briefings insert" on company_briefings
  for insert with check (auth.uid() = user_id);
create policy "Own briefings update" on company_briefings
  for update using (auth.uid() = user_id);
create policy "Own briefings delete" on company_briefings
  for delete using (auth.uid() = user_id);

-- Index
create index if not exists idx_briefings_user on company_briefings(user_id);
create index if not exists idx_briefings_company on company_briefings(company_id);
