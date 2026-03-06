-- Enrichment Pipeline Tables
-- Run in Supabase SQL Editor (Dashboard → SQL → New Query)

-- 1. enrichment_log — All enrichment events (activity, hooks, company intel, emails)
CREATE TABLE IF NOT EXISTS enrichment_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER,
  company_name TEXT,
  leader_name TEXT,
  enrichment_type TEXT NOT NULL,  -- linkedin_activity, profile_hooks, company_intel, email_found
  summary TEXT,                    -- Human-readable: "John Smith posted about AI lending trends"
  data JSONB DEFAULT '{}',         -- Raw enrichment data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_el_company ON enrichment_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_el_type ON enrichment_log(enrichment_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_el_recent ON enrichment_log(created_at DESC);

-- 2. kiket_daily_briefs — Daily intelligence digests for Kiket
CREATE TABLE IF NOT EXISTS kiket_daily_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brief_date DATE NOT NULL UNIQUE,
  highlights TEXT[],
  leader_activity JSONB,
  company_news JSONB,
  hooks_updated JSONB,
  recommended_actions TEXT[],
  full_brief JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kdb_date ON kiket_daily_briefs(brief_date DESC);

-- Enable RLS (allow service key full access, anon key read-only)
ALTER TABLE enrichment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiket_daily_briefs ENABLE ROW LEVEL SECURITY;

-- Policies: anon can read, service key has full access
CREATE POLICY "anon_read_enrichment_log" ON enrichment_log
  FOR SELECT USING (true);

CREATE POLICY "service_insert_enrichment_log" ON enrichment_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anon_read_daily_briefs" ON kiket_daily_briefs
  FOR SELECT USING (true);

CREATE POLICY "service_insert_daily_briefs" ON kiket_daily_briefs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "service_update_daily_briefs" ON kiket_daily_briefs
  FOR UPDATE USING (true);
