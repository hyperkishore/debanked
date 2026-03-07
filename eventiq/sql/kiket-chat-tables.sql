-- Kiket persistent chat tables
-- Run in Supabase SQL Editor

-- Conversations table (one per chat thread per user)
CREATE TABLE IF NOT EXISTS kiket_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,           -- Supabase auth user ID
  user_email TEXT,                 -- For display/debugging
  title TEXT DEFAULT 'New conversation',
  summary TEXT,                    -- LLM-generated summary of conversation
  summary_through_message_id UUID, -- Last message included in summary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kc_user ON kiket_conversations(user_id, updated_at DESC);

-- Messages table (every message in every conversation, persistent like iMessage)
CREATE TABLE IF NOT EXISTS kiket_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES kiket_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  thinking TEXT,                   -- Claude's thinking/reasoning (optional)
  metadata JSONB,                  -- Timing, tool calls, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_km_conv ON kiket_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_km_recent ON kiket_messages(created_at DESC);
