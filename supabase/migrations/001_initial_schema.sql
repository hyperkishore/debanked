-- EventIQ Supabase Schema
-- Run this in the Supabase SQL editor to create all tables

-- ============================================================
-- 1. profiles — user identity
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text default 'member',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. company_met — maps to eventiq_met
-- ============================================================
create table if not exists company_met (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  met boolean not null default true,
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 3. company_ratings — maps to eventiq_ratings
-- ============================================================
create table if not exists company_ratings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  rating text default '',
  follow_ups text[] default '{}',
  care_about text default '',
  promised text default '',
  personal text default '',
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 4. company_notes — maps to eventiq_notes
-- ============================================================
create table if not exists company_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  notes text default '',
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 5. engagements — maps to eventiq_engagements
-- ============================================================
create table if not exists engagements (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  contact_name text not null default '',
  channel text not null default '',
  action text not null default '',
  timestamp timestamptz not null default now(),
  notes text default '',
  source text default 'manual',
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- 6. pipeline_records — maps to eventiq_pipeline
-- ============================================================
create table if not exists pipeline_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  stage text not null default 'researched',
  moved_at timestamptz default now(),
  deal_value numeric,
  close_date date,
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 7. follow_ups — maps to eventiq_follow_ups
-- ============================================================
create table if not exists follow_ups (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  contact_name text default '',
  due_date date not null,
  notes text default '',
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- 8. sequence_progress — maps to eventiq_sequences
-- ============================================================
create table if not exists sequence_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  sequence_type text default 'cold',
  started_at timestamptz default now(),
  completed_steps text[] default '{}',
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 9. company_tags — maps to eventiq_tags
-- ============================================================
create table if not exists company_tags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id int not null,
  tags text[] default '{}',
  updated_at timestamptz default now(),
  unique(user_id, company_id)
);

-- ============================================================
-- 10. checklist_state — maps to eventiq_checks
-- ============================================================
create table if not exists checklist_state (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_key text not null,
  checked boolean default false,
  updated_at timestamptz default now(),
  unique(user_id, check_key)
);

-- ============================================================
-- 11. user_settings — maps to eventiq_quick_notes, eventiq_sheets_config
-- ============================================================
create table if not exists user_settings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb default '{}',
  updated_at timestamptz default now(),
  unique(user_id, setting_key)
);

-- ============================================================
-- 12. chat_messages — maps to eventiq_user_inputs
-- ============================================================
create table if not exists chat_messages (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'user',
  content text not null default '',
  timestamp timestamptz not null default now(),
  category text,
  context jsonb default '{}',
  resolved boolean default false
);

-- ============================================================
-- 13. imported_companies — maps to eventiq_imported_companies
-- ============================================================
create table if not exists imported_companies (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  company_data jsonb not null,
  updated_at timestamptz default now()
);

-- ============================================================
-- 14. company_news — automated pipeline (new table)
-- ============================================================
create table if not exists company_news (
  id bigint generated always as identity primary key,
  company_id int not null,
  company_name text not null default '',
  headline text not null,
  source text default '',
  description text default '',
  published_at date,
  signal_type text default 'general',
  created_at timestamptz default now(),
  unique(company_id, headline)
);

create index if not exists idx_company_news_company on company_news(company_id);
create index if not exists idx_company_news_published on company_news(published_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on all user-data tables
alter table profiles enable row level security;
alter table company_met enable row level security;
alter table company_ratings enable row level security;
alter table company_notes enable row level security;
alter table engagements enable row level security;
alter table pipeline_records enable row level security;
alter table follow_ups enable row level security;
alter table sequence_progress enable row level security;
alter table company_tags enable row level security;
alter table checklist_state enable row level security;
alter table user_settings enable row level security;
alter table chat_messages enable row level security;
alter table imported_companies enable row level security;
alter table company_news enable row level security;

-- Profiles: users read/write own, team can read all
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Team reads all profiles" on profiles for select using (true);

-- Generic pattern: own data read/write, team read
-- company_met
create policy "Own met read" on company_met for select using (auth.uid() = user_id);
create policy "Own met insert" on company_met for insert with check (auth.uid() = user_id);
create policy "Own met update" on company_met for update using (auth.uid() = user_id);
create policy "Own met delete" on company_met for delete using (auth.uid() = user_id);
create policy "Team reads met" on company_met for select using (true);

-- company_ratings
create policy "Own ratings read" on company_ratings for select using (auth.uid() = user_id);
create policy "Own ratings insert" on company_ratings for insert with check (auth.uid() = user_id);
create policy "Own ratings update" on company_ratings for update using (auth.uid() = user_id);
create policy "Own ratings delete" on company_ratings for delete using (auth.uid() = user_id);
create policy "Team reads ratings" on company_ratings for select using (true);

-- company_notes
create policy "Own notes read" on company_notes for select using (auth.uid() = user_id);
create policy "Own notes insert" on company_notes for insert with check (auth.uid() = user_id);
create policy "Own notes update" on company_notes for update using (auth.uid() = user_id);
create policy "Own notes delete" on company_notes for delete using (auth.uid() = user_id);
create policy "Team reads notes" on company_notes for select using (true);

-- engagements
create policy "Own engagements read" on engagements for select using (auth.uid() = user_id);
create policy "Own engagements insert" on engagements for insert with check (auth.uid() = user_id);
create policy "Own engagements update" on engagements for update using (auth.uid() = user_id);
create policy "Own engagements delete" on engagements for delete using (auth.uid() = user_id);
create policy "Team reads engagements" on engagements for select using (true);

-- pipeline_records
create policy "Own pipeline read" on pipeline_records for select using (auth.uid() = user_id);
create policy "Own pipeline insert" on pipeline_records for insert with check (auth.uid() = user_id);
create policy "Own pipeline update" on pipeline_records for update using (auth.uid() = user_id);
create policy "Own pipeline delete" on pipeline_records for delete using (auth.uid() = user_id);
create policy "Team reads pipeline" on pipeline_records for select using (true);

-- follow_ups
create policy "Own follow_ups read" on follow_ups for select using (auth.uid() = user_id);
create policy "Own follow_ups insert" on follow_ups for insert with check (auth.uid() = user_id);
create policy "Own follow_ups update" on follow_ups for update using (auth.uid() = user_id);
create policy "Own follow_ups delete" on follow_ups for delete using (auth.uid() = user_id);
create policy "Team reads follow_ups" on follow_ups for select using (true);

-- sequence_progress
create policy "Own sequences read" on sequence_progress for select using (auth.uid() = user_id);
create policy "Own sequences insert" on sequence_progress for insert with check (auth.uid() = user_id);
create policy "Own sequences update" on sequence_progress for update using (auth.uid() = user_id);
create policy "Own sequences delete" on sequence_progress for delete using (auth.uid() = user_id);
create policy "Team reads sequences" on sequence_progress for select using (true);

-- company_tags
create policy "Own tags read" on company_tags for select using (auth.uid() = user_id);
create policy "Own tags insert" on company_tags for insert with check (auth.uid() = user_id);
create policy "Own tags update" on company_tags for update using (auth.uid() = user_id);
create policy "Own tags delete" on company_tags for delete using (auth.uid() = user_id);
create policy "Team reads tags" on company_tags for select using (true);

-- checklist_state
create policy "Own checks read" on checklist_state for select using (auth.uid() = user_id);
create policy "Own checks insert" on checklist_state for insert with check (auth.uid() = user_id);
create policy "Own checks update" on checklist_state for update using (auth.uid() = user_id);
create policy "Own checks delete" on checklist_state for delete using (auth.uid() = user_id);
create policy "Team reads checks" on checklist_state for select using (true);

-- user_settings
create policy "Own settings read" on user_settings for select using (auth.uid() = user_id);
create policy "Own settings insert" on user_settings for insert with check (auth.uid() = user_id);
create policy "Own settings update" on user_settings for update using (auth.uid() = user_id);
create policy "Own settings delete" on user_settings for delete using (auth.uid() = user_id);

-- chat_messages
create policy "Own chat read" on chat_messages for select using (auth.uid() = user_id);
create policy "Own chat insert" on chat_messages for insert with check (auth.uid() = user_id);
create policy "Own chat update" on chat_messages for update using (auth.uid() = user_id);
create policy "Own chat delete" on chat_messages for delete using (auth.uid() = user_id);

-- imported_companies
create policy "Own imports read" on imported_companies for select using (auth.uid() = user_id);
create policy "Own imports insert" on imported_companies for insert with check (auth.uid() = user_id);
create policy "Own imports update" on imported_companies for update using (auth.uid() = user_id);
create policy "Own imports delete" on imported_companies for delete using (auth.uid() = user_id);

-- company_news — readable by all authenticated users (shared resource)
create policy "Authenticated reads news" on company_news for select using (auth.role() = 'authenticated');
create policy "Service role inserts news" on company_news for insert with check (true);
create policy "Service role updates news" on company_news for update using (true);

-- ============================================================
-- Indexes for performance
-- ============================================================
create index if not exists idx_met_user on company_met(user_id);
create index if not exists idx_ratings_user on company_ratings(user_id);
create index if not exists idx_notes_user on company_notes(user_id);
create index if not exists idx_engagements_user on engagements(user_id);
create index if not exists idx_engagements_company on engagements(company_id);
create index if not exists idx_pipeline_user on pipeline_records(user_id);
create index if not exists idx_follow_ups_user on follow_ups(user_id);
create index if not exists idx_sequences_user on sequence_progress(user_id);
create index if not exists idx_tags_user on company_tags(user_id);
create index if not exists idx_checks_user on checklist_state(user_id);
create index if not exists idx_settings_user on user_settings(user_id);
create index if not exists idx_chat_user on chat_messages(user_id);
create index if not exists idx_imports_user on imported_companies(user_id);

-- ============================================================
-- updated_at trigger (auto-touch on update)
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to all tables with updated_at
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles', 'company_met', 'company_ratings', 'company_notes',
    'pipeline_records', 'follow_ups', 'sequence_progress',
    'company_tags', 'checklist_state', 'user_settings', 'imported_companies'
  ] loop
    execute format(
      'drop trigger if exists touch_updated_at on %I; create trigger touch_updated_at before update on %I for each row execute function public.touch_updated_at();',
      tbl, tbl
    );
  end loop;
end;
$$;
