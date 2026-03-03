-- Migration 006: Intelligence + Coaching tables
-- Features: Account Memory, LinkedIn Activity, Marketing Campaigns

-- 1. Kiket Account Memory — persistent per-company memory for the AI assistant
CREATE TABLE IF NOT EXISTS kiket_account_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('strategy', 'interaction', 'insight', 'preference')),
  content TEXT NOT NULL,
  source TEXT DEFAULT 'kiket' CHECK (source IN ('kiket', 'user', 'system')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kam_company ON kiket_account_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_kam_type ON kiket_account_memory(company_id, memory_type);

-- RLS: service role manages (agent API uses service key)
ALTER TABLE kiket_account_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages account memory"
  ON kiket_account_memory FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. LinkedIn Activity — weekly extraction of leader LinkedIn posts/engagement
CREATE TABLE IF NOT EXISTS linkedin_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  leader_name TEXT NOT NULL,
  company_id INTEGER,
  activity_type TEXT CHECK (activity_type IN ('post', 'share', 'comment', 'reaction')),
  content_summary TEXT,
  original_url TEXT,
  extracted_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_la_company ON linkedin_activity(company_id);
CREATE INDEX IF NOT EXISTS idx_la_extracted ON linkedin_activity(extracted_at DESC);

ALTER TABLE linkedin_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages linkedin activity"
  ON linkedin_activity FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Marketing Campaigns — track outbound campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email_sequence', 'linkedin_sequence', 'event', 'content', 'webinar', 'direct_mail')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  start_date DATE,
  end_date DATE,
  target_audience TEXT,
  metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage campaigns"
  ON marketing_campaigns FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Campaign Activities — individual touches within a campaign
CREATE TABLE IF NOT EXISTS campaign_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  company_id INTEGER,
  leader_name TEXT,
  activity_type TEXT NOT NULL,
  result TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ca_campaign ON campaign_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ca_company ON campaign_activities(company_id);

ALTER TABLE campaign_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users manage campaign activities"
  ON campaign_activities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
