-- Research Requests Queue
-- Tracks manual, scheduled, and signal-driven research refresh requests.
-- Polled by the EC2 research worker.

CREATE TABLE IF NOT EXISTS research_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id INTEGER NOT NULL,
  company_name TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual',  -- manual, scheduled, signal
  trigger_detail JSONB,
  status TEXT NOT NULL DEFAULT 'pending',        -- pending, processing, completed, failed
  priority INTEGER DEFAULT 5,
  user_email TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT
);

-- Fast lookup for worker polling: pending requests by priority then time
CREATE INDEX idx_rr_pending ON research_requests(status, priority, requested_at)
  WHERE status = 'pending';

-- Prevent duplicate pending requests for the same company
CREATE UNIQUE INDEX idx_rr_company_pending ON research_requests(company_id)
  WHERE status = 'pending';

-- RLS: service role only (worker uses service key)
ALTER TABLE research_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON research_requests
  FOR ALL USING (auth.role() = 'service_role');
