-- EventIQ Phase 0.2: Companies table
-- Moves company master data from static JSON into Supabase

create table if not exists companies (
  id int primary key,
  name text not null,
  type text not null default 'TAM',
  priority int not null default 4,
  phase int not null default 0,
  booth boolean not null default false,
  clear boolean default false,
  contacts jsonb default '[]',
  leaders jsonb default '[]',
  desc_text text default '',
  notes text default '',
  news jsonb default '[]',
  ice text default '',
  icebreakers text[] default '{}',
  talking_points text[] default '{}',
  ask text default '',
  location text,
  employees int,
  website text,
  linkedin_url text,
  source text[] default '{}',
  updated_at timestamptz default now()
);

-- RLS: all authenticated users can read
alter table companies enable row level security;

create policy "Authenticated reads companies"
  on companies for select
  using (auth.role() = 'authenticated');

create policy "Service role manages companies"
  on companies for all
  using (true);

-- Indexes
create index if not exists idx_companies_type on companies(type);
create index if not exists idx_companies_priority on companies(priority);
create index if not exists idx_companies_name on companies(name);

-- Auto-update timestamp
drop trigger if exists touch_updated_at on companies;
create trigger touch_updated_at
  before update on companies
  for each row execute function public.touch_updated_at();
