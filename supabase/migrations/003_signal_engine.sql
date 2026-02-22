-- EventIQ Phase 2: Signal Engine
-- Enhance company_news with heat/source_url, add ingestion logging

-- Add heat and source_url to company_news
alter table company_news add column if not exists heat text default 'cool';
alter table company_news add column if not exists source_url text;

-- Signal ingestion log — tracks each run of the signal engine
create table if not exists signal_ingestion_log (
  id bigint generated always as identity primary key,
  run_at timestamptz default now(),
  source text not null,
  companies_searched int default 0,
  signals_found int default 0,
  signals_new int default 0,
  duration_ms int
);

-- RLS for ingestion log
alter table signal_ingestion_log enable row level security;

create policy "Authenticated reads ingestion log"
  on signal_ingestion_log for select
  using (auth.role() = 'authenticated');

create policy "Service role manages ingestion log"
  on signal_ingestion_log for all
  using (true);
