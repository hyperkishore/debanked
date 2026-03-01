# MissionIQ — Product Requirements Document

> **Version:** 2.0 | **Date:** 2026-02-28 | **Author:** Kishore Natarajan
> **Status:** Approved — Ready for Implementation

---

## 1. What Is MissionIQ

MissionIQ is the next generation of EventIQ — an AI-powered GTM intelligence platform where a conversational agent (powered by OpenClaw + Claude) sits at the center. Instead of just browsing a dashboard, BD reps **talk to their data** and get instant research briefs, outreach drafts, and account intelligence.

**The core shift:** EventIQ is a dashboard you read. MissionIQ is an agent you talk to.

```
EventIQ (Gen 1)                    MissionIQ (Gen 2)
─────────────────                  ──────────────────
Dashboard → browse companies       "Tell me about Fortun Advance"
Filter → find companies            "Who should I call in Miami?"
Copy → draft email manually        "Draft an outreach email for Gabriel at NY Tribeca"
Manual → log engagement            "Log that I called SBL Funding today"
Static → research is point-in-time "What's new with Shopify Capital this week?"
```

**What stays:** The entire EventIQ dashboard, data pipeline, research methodology, and 959-company dataset. MissionIQ wraps an AI agent around it.

**What's new:** Conversational chat widget on the website, per-user chat memory, agent that can query and write data.

---

## 2. Problem Statement

### What We Have
- 959 deeply researched companies with 1,398 leaders, icebreakers, talking points, news
- A dashboard that requires browsing, filtering, clicking to find information
- An OpenClaw instance already running on a remote server with Claude Max ($200/mo)

### What BD Reps Actually Need
- "I have a call with Fortun Advance in 10 minutes — give me everything"
- "Who are the top 5 companies in Miami I should visit next week?"
- "Draft a follow-up email to Gabriel Shuster"
- Quick answers without navigating a dashboard

### The Gap
The data exists. The interface is wrong for speed. MissionIQ adds a conversational layer so reps can ask questions and get answers instantly.

---

## 3. Users

### Primary: HyperVerge BD Team (Internal Only)

| Role | How They'd Use MissionIQ | Channel |
|------|--------------------------|---------|
| SDR/BDR (3) | Quick pre-call briefs, batch outreach prep | Website chat |
| AE/BD Rep (4) | Deep account research, meeting prep, email drafting | Website chat |
| Account Manager (1) | QBR prep, relationship history | Website chat |
| VP Sales (1) | Market overview, pipeline intel | Website chat + Slack (Phase 2) |
| Marketing (1) | ABM list building, content research | Website chat |
| Executive (1) | Pre-meeting briefs | Website chat + WhatsApp (Phase 2) |

### Access Model
- **Authentication:** Google OAuth (@hyperverge.co domain) — same as current EventIQ
- **Authorization:** All BD team members have equal access. No role-based restrictions.
- **Chat memory:** Per-user. Each person has their own conversation history.

---

## 4. Architecture

### 4.1 System Overview

```
┌─── Vercel (us.hyperverge.space) ──────────────────────────┐
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Next.js Application                                │   │
│  │                                                     │   │
│  │  EventIQ Dashboard          (existing, main branch) │   │
│  │  ├── Company list, detail, filters, search          │   │
│  │  ├── Pipeline, engagements, briefings               │   │
│  │  └── All existing features unchanged                │   │
│  │                                                     │   │
│  │  MissionIQ Chat             (new, missioniq branch) │   │
│  │  ├── /chat page with embedded chat widget           │   │
│  │  ├── Chat widget component (shadcn/ui)              │   │
│  │  └── Connects to OpenClaw WebChat via WebSocket     │   │
│  │                                                     │   │
│  │  Tool API Endpoints         (new, missioniq branch) │   │
│  │  ├── GET  /api/tools/search?q=...                   │   │
│  │  ├── GET  /api/tools/company/:id                    │   │
│  │  ├── GET  /api/tools/leader/:name                   │   │
│  │  ├── GET  /api/tools/brief/:id                      │   │
│  │  ├── GET  /api/tools/stats                          │   │
│  │  ├── GET  /api/tools/news                           │   │
│  │  └── GET  /api/tools/similar/:id                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                          │                                  │
│                   Reads/Writes                              │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │        Supabase         │
              │                         │
              │  companies       (read) │ ← both read
              │  engagements     (r/w)  │ ← Vercel writes
              │  pipeline        (r/w)  │ ← Vercel writes
              │  chat_messages   (r/w)  │ ← OpenClaw writes
              │  chat_notes      (r/w)  │ ← OpenClaw writes
              │  chat_user_config (r/w) │ ← OpenClaw writes
              │                         │
              └────────────▲────────────┘
                           │
                    Reads + Writes
                    (chat data)
                           │
┌──────────────────────────┼──────────────────────────────────┐
│  Remote Server                                              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  OpenClaw (already running)                          │   │
│  │  ├── Claude Max subscription ($200/mo)               │   │
│  │  ├── WebChat channel (browser WebSocket connects)    │   │
│  │  ├── EventIQ Skill (SKILL.md)                        │   │
│  │  │   └── Calls Vercel /api/tools/* for data queries  │   │
│  │  └── Supabase client (writes chat data directly)     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Changes: Add skill config + Supabase env vars only         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Request Flow

```
1. User opens us.hyperverge.space/chat (authenticated via Google OAuth)
2. Chat widget opens WebSocket connection to OpenClaw WebChat on remote server
3. User types: "Tell me about Fortun Advance"
4. Message sent via WebSocket to OpenClaw
5. OpenClaw reasons with Claude Max about what to do
6. OpenClaw calls EventIQ skill → HTTP GET us.hyperverge.space/api/tools/search?q=Fortun+Advance
7. Vercel tool endpoint queries Supabase companies table, returns JSON
8. OpenClaw formats response with Claude
9. OpenClaw writes message pair to Supabase chat_messages table
10. Response streamed back via WebSocket to chat widget
11. User sees formatted company brief in chat
```

### 4.3 Data Flow — Who Writes What

| Table | Writer | How |
|-------|--------|-----|
| `companies` | Vercel (existing seed scripts) | Existing flow, unchanged |
| `engagements` | Vercel (existing dashboard) | Existing flow, unchanged |
| `pipeline_records` | Vercel (existing dashboard) | Existing flow, unchanged |
| `chat_messages` | OpenClaw (remote server) | New — OpenClaw writes after each exchange |
| `chat_notes` | OpenClaw (remote server) | New — when user says "note: ..." |
| `chat_engagements` | OpenClaw (remote server) | New — when user says "log call with ..." |
| `chat_reminders` | OpenClaw (remote server) | New — when user says "remind me to ..." |
| `chat_user_config` | OpenClaw (remote server) | New — user preferences, channel mappings |

**No conflicts:** Vercel and OpenClaw write to completely separate tables.

---

## 5. Product Requirements

### 5.1 Chat Widget (Website — Phase 1)

A chat interface on the `/chat` page of EventIQ.

**Behavior:**
- Full-page chat view at `us.hyperverge.space/chat` (not a floating bubble — a dedicated page)
- Requires Google OAuth login (same as dashboard)
- Connects to OpenClaw WebChat channel via WebSocket
- Shows conversation history loaded from Supabase `chat_messages`
- Supports markdown rendering (tables, bold, code, links)
- Shows typing/thinking indicator while OpenClaw processes
- "Copy" button on responses for pasting into email
- "New conversation" button to start fresh

**Built with:** shadcn/ui components (consistent with EventIQ design system)

**Navigation:** Add "Chat" link in the sidebar alongside existing tabs (Dashboard, Companies, etc.)

### 5.2 Tool API Endpoints (Vercel)

REST endpoints that OpenClaw's skill calls to query EventIQ data. All are **read-only** from Supabase `companies` table.

**Authentication:** API key in header (`X-Tool-Key`) — shared secret between Vercel and OpenClaw. Configured as env var on both sides.

| Endpoint | Method | Description | Returns |
|----------|--------|-------------|---------|
| `/api/tools/search` | GET | Full-text search: `?q=Miami+funders&category=funder&minEmployees=50` | Array of company summaries |
| `/api/tools/company/[id]` | GET | Full company profile by ID | Complete company JSON |
| `/api/tools/leader` | GET | Search leaders: `?q=Gabriel+Shuster` | Leader details + company context |
| `/api/tools/brief/[id]` | GET | Formatted outreach brief | Structured brief with icebreaker, tp, ask |
| `/api/tools/stats` | GET | Market stats: `?category=funder&priority=1` | Counts, breakdowns, aggregates |
| `/api/tools/news` | GET | Recent news across companies: `?priority=1&limit=10` | News items with company context |
| `/api/tools/similar/[id]` | GET | Companies similar to given ID | Array of similar companies |
| `/api/tools/team-notes/[companyId]` | GET | Chat notes + engagements for a company | Notes and engagement history |

### 5.3 Agent Capabilities

**Read (Day 1):**

| Capability | Example Query |
|------------|---------------|
| Company lookup | "Tell me about Fortun Advance" |
| Leader lookup | "Who is Gabriel Shuster?" |
| Filtered search | "Funders in Miami with 50+ employees" |
| Outreach brief | "Give me an outreach brief for NY Tribeca" |
| Pre-call prep | "I have a call with WeFund in 10 minutes" |
| Market stats | "How many funders vs ISOs do we track?" |
| Similar companies | "Companies similar to Shopify Capital" |
| News summary | "Latest news across P1 companies" |
| Team activity | "What has anyone noted about WeFund?" |

**Write (Day 1 — writes to chat_* tables only):**

| Capability | Example Query |
|------------|---------------|
| Log engagement | "Log that I called Claude Darmony at WeFund today" |
| Add note | "Note: WeFund is interested in our fraud detection module" |
| Set reminder | "Remind me to follow up with WeFund next Tuesday" |
| Draft email | "Draft an intro email to Gabriel at NY Tribeca" (returns text, doesn't send) |

**Safety rails — agent CANNOT:**
- Modify the `companies` table or any curated research data
- Execute shell commands or access the file system
- Browse the web or make arbitrary HTTP requests
- Share company intelligence outside @hyperverge.co users
- Fabricate company information — must cite from dataset or say "I don't have that"

### 5.4 Conversation Memory

| Aspect | Implementation |
|--------|---------------|
| Storage | Supabase `chat_messages` table, keyed by user |
| Context window | Last 20 messages passed to OpenClaw per request |
| Persistence | All messages retained indefinitely |
| Cross-session | User returns next day, sees full history |
| Reset | "New conversation" or "start fresh" clears context (messages still in DB) |
| Search | "What did I ask about WeFund last week?" queries message history |

### 5.5 WhatsApp + Slack (Phase 2 — Future)

Not in initial build. Documented for future reference.

**WhatsApp:** OpenClaw already supports WhatsApp as a channel. When ready:
- Configure WhatsApp channel in OpenClaw
- Map phone numbers to users in `chat_user_config`
- Same skill, same tools, different channel

**Slack:** OpenClaw already supports Slack as a channel. When ready:
- Configure Slack channel in OpenClaw
- Install Slack App in hyperverge.slack.com workspace
- `/missioniq [query]` slash command + DM mode

Both channels would use the same EventIQ skill and write to the same Supabase chat tables.

---

## 6. Security

### 6.1 Authentication

| Layer | Mechanism |
|-------|-----------|
| Website chat page | Google OAuth (@hyperverge.co) — same as dashboard. Must be logged in to access `/chat`. |
| WebSocket to OpenClaw | Token-based. On page load, Vercel generates a short-lived token tied to the authenticated user. Chat widget passes this token when connecting to OpenClaw WebChat. OpenClaw validates against Supabase auth. |
| Tool API endpoints | API key (`X-Tool-Key` header). Shared secret between Vercel and OpenClaw. Reject requests without valid key. |
| OpenClaw → Supabase | Supabase service key. Stored as env var on remote server. Scoped to chat_* tables via RLS. |

### 6.2 Data Protection

| Concern | Mitigation |
|---------|------------|
| Company data leakage | Only authenticated @hyperverge.co users can access chat. Tool APIs require API key. |
| Prompt injection via chat | OpenClaw has tool allowlist — only predefined skill tools. No shell, no file access, no arbitrary HTTP. System prompt includes injection resistance. |
| Tool API abuse | Rate limited (30 req/min per key). API key required. Only returns data from companies table. |
| Chat data at rest | Supabase encryption at rest. RLS policies on chat tables. |
| WebSocket security | WSS (encrypted). Token validated on connection. Invalid token = connection refused. |
| Supabase service key on remote server | Key stored in env var, not in code. Server access restricted to SSH key auth. |

### 6.3 Rate Limiting

| What | Limit | Why |
|------|-------|-----|
| Chat messages per user | 60/hour | Prevent runaway loops, manage Claude Max limits |
| Tool API calls | 30/min per key | Prevent abuse |
| OpenClaw → Claude | Governed by Max tier (~150 msgs/3hrs) | Subscription limit |
| Tool calls per agent turn | Max 5 | Prevent infinite tool loops |

---

## 7. Data Schema

### 7.1 Existing Tables (No Changes)

| Table | Writer | Purpose |
|-------|--------|---------|
| `companies` | Vercel seed scripts | 959 companies. **Read-only for OpenClaw.** |
| `engagements` | Vercel dashboard | Engagement tracking from UI. |
| `pipeline_records` | Vercel dashboard | Pipeline stages. |
| `follow_ups` | Vercel dashboard | Follow-up reminders from UI. |
| `signal_ingestion_log` | Vercel cron | Signal tracking. |

### 7.2 New Tables (Written by OpenClaw)

#### `chat_messages`
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,                 -- Google OAuth email or user identifier
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL,                    -- 'user' | 'assistant' | 'tool'
  content TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'website', -- 'website' | 'whatsapp' | 'slack'
  tool_calls JSONB,                      -- Tool calls made (for debugging/visibility)
  latency_ms INTEGER,                    -- Response time
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at);
```

#### `chat_conversations`
```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT,                            -- Auto-generated from first message
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user ON chat_conversations(user_id, is_active);
```

#### `chat_notes`
```sql
CREATE TABLE chat_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id INTEGER NOT NULL,           -- References companies.id
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_notes_company ON chat_notes(company_id);
```

#### `chat_engagements`
```sql
CREATE TABLE chat_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id INTEGER NOT NULL,
  leader_name TEXT,
  channel TEXT NOT NULL,                 -- 'email' | 'call' | 'meeting' | 'linkedin'
  action TEXT NOT NULL,                  -- 'sent_intro' | 'follow_up' | 'meeting_held'
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_engagements_company ON chat_engagements(company_id);
```

#### `chat_reminders`
```sql
CREATE TABLE chat_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  company_id INTEGER,
  reminder_text TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reminders_due ON chat_reminders(user_id, due_at) WHERE NOT completed;
```

#### `chat_user_config`
```sql
CREATE TABLE chat_user_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  whatsapp_phone TEXT UNIQUE,            -- Phase 2
  slack_user_id TEXT UNIQUE,             -- Phase 2
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. OpenClaw Configuration (Remote Server)

### 8.1 What Needs to Change

The remote server already runs OpenClaw. Only 3 things need to be added:

| Change | What | Effort |
|--------|------|--------|
| 1. EventIQ Skill | `SKILL.md` file defining tools that call Vercel `/api/tools/*` | New file |
| 2. Supabase env vars | `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for chat table writes | Env config |
| 3. WebChat channel config | Enable WebChat channel, configure auth token validation | Config edit |

### 8.2 EventIQ Skill (SKILL.md)

The skill file teaches OpenClaw how to query EventIQ data. It maps natural language intents to HTTP calls against Vercel's tool API endpoints.

```markdown
# EventIQ — Company Intelligence Skill

## Description
Query HyperVerge's market intelligence database of 959+ companies in the small
business lending industry. Search companies, look up leaders, get outreach briefs,
and track team activity.

## Configuration
- EVENTIQ_API_URL: https://us.hyperverge.space
- EVENTIQ_API_KEY: (shared secret)

## Tools

### search_companies
Search for companies by text, category, location, size, or priority.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/search
- Params: q (text), category, priority, location, minEmployees, hasEmail, limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_company
Get the full profile of a company by ID.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/company/{id}
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### search_leader
Search for a leader by name.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/leader
- Params: q (name)
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_outreach_brief
Get a formatted outreach brief for a company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/brief/{id}
- Params: format (short|full|email-draft), leaderName
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_market_stats
Get aggregate market statistics.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/stats
- Params: category, priority, location
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_recent_news
Get recent news across tracked companies.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/news
- Params: priority, category, limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_similar_companies
Find companies similar to a given company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/similar/{id}
- Params: limit
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}

### get_team_notes
Get chat notes and engagements for a company.
- Method: GET
- URL: {EVENTIQ_API_URL}/api/tools/team-notes/{companyId}
- Headers: X-Tool-Key: {EVENTIQ_API_KEY}
```

### 8.3 System Prompt Addition

Add to OpenClaw's system prompt (or create a persona config):

```
You are MissionIQ, HyperVerge's GTM intelligence assistant for the small business
lending market. You help the BD team research accounts, prepare for calls, draft
outreach, and track engagement.

You have access to 959 deeply researched companies with 1,398 leadership profiles,
icebreakers, talking points, and recent news.

Rules:
- Be concise. BD reps are busy.
- Lead with the most actionable information.
- When giving a brief: key contact, icebreaker, top talking point, the ask.
- If you don't have data, say so. Never fabricate company information.
- Log engagements, notes, and reminders when the user asks.
- You can draft emails but never send them.
```

### 8.4 Supabase Write Configuration

OpenClaw needs a Supabase client to write chat data. This can be:
- A simple HTTP client calling Supabase REST API with service key
- Or a custom OpenClaw plugin/skill that wraps Supabase writes

**Env vars to add on remote server:**
```bash
SUPABASE_URL=https://fupoylarelcwiewnvoyu.supabase.co
SUPABASE_SERVICE_KEY=<key>
EVENTIQ_API_URL=https://us.hyperverge.space
EVENTIQ_API_KEY=<shared-secret>
```

---

## 9. Implementation Plan

### Phase 1: Foundation (Current Sprint)

#### Step 1: Vercel — Tool API Endpoints
**Branch:** `missioniq`
**Files:**
- `src/app/api/tools/search/route.ts` — Company search
- `src/app/api/tools/company/[id]/route.ts` — Company detail
- `src/app/api/tools/leader/route.ts` — Leader search
- `src/app/api/tools/brief/[id]/route.ts` — Outreach brief
- `src/app/api/tools/stats/route.ts` — Market statistics
- `src/app/api/tools/news/route.ts` — Recent news
- `src/app/api/tools/similar/[id]/route.ts` — Similar companies
- `src/app/api/tools/team-notes/[companyId]/route.ts` — Team notes
- `src/lib/tool-auth.ts` — API key validation middleware

**Auth:** Each endpoint checks `X-Tool-Key` header against `TOOL_API_KEY` env var.

#### Step 2: Vercel — Chat Page + Widget
**Branch:** `missioniq`
**Files:**
- `src/app/chat/page.tsx` — Chat page (authenticated, full-page layout)
- `src/components/chat-widget.tsx` — Chat interface component (shadcn/ui)
- `src/components/chat-message.tsx` — Individual message rendering (markdown)
- `src/lib/openclaw-client.ts` — WebSocket client for OpenClaw WebChat
- `src/components/app-sidebar.tsx` — Add "Chat" nav link

**UX:** Full-page chat at `/chat`. Message input at bottom, messages scroll up. Markdown rendering. Copy button. New conversation button.

#### Step 3: Supabase — Create Chat Tables
Run migration SQL from Section 7.2 above.

#### Step 4: Remote Server — OpenClaw Skill
- Add `SKILL.md` to OpenClaw skills directory
- Add env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `EVENTIQ_API_URL`, `EVENTIQ_API_KEY`)
- Enable WebChat channel
- Configure WebSocket auth token validation
- Test: type in OpenClaw WebChat → get EventIQ data back

#### Step 5: Integration Test
- Open `us.hyperverge.space/chat`
- Login with Google OAuth
- Type "Tell me about Fortun Advance"
- Verify: message → OpenClaw → skill → Vercel tool API → Supabase → response
- Verify: message saved in `chat_messages` table
- Verify: conversation history persists on page reload

### Phase 2: Polish + Channels (Future)

| Feature | Details |
|---------|---------|
| WhatsApp | Configure OpenClaw WhatsApp channel. Map phone → user. |
| Slack | Configure OpenClaw Slack channel. Install Slack App at hyperverge.slack.com. |
| Floating widget | Optional: add chat bubble overlay on dashboard pages (not just `/chat`) |
| Reminders | Daily cron to check `chat_reminders` and notify via Slack/email |
| AWS migration | Move everything to EC2 when ready. Docker Compose setup. |

### Phase 3: Full Migration (Future)

| Step | Details |
|------|---------|
| Provision AWS EC2 | t3.medium, us-east-1 |
| Docker Compose | Next.js + OpenClaw + Redis + Nginx in one stack |
| DNS cutover | us.hyperverge.space → EC2 IP |
| Decommission Vercel | Cancel hobby plan (free, so just remove) |
| Decommission remote server | Move OpenClaw to EC2 |

---

## 10. Remote Server Access

### What Needs to Happen on the Remote Server

Only 4 things:

```
1. Create skill file:     ~/.openclaw/skills/eventiq/SKILL.md
2. Add env vars:          SUPABASE_URL, SUPABASE_SERVICE_KEY, EVENTIQ_API_URL, EVENTIQ_API_KEY
3. Enable WebChat:        Configure WebChat channel in OpenClaw config
4. Restart OpenClaw:      Apply changes
```

### How to Apply Changes

**Option A: SSH from this Mac (preferred)**
If Kishore can SSH to the remote server from this machine, Claude Code can run SSH commands directly:
```bash
ssh user@remote-server-ip "mkdir -p ~/.openclaw/skills/eventiq"
scp skill-files/* user@remote-server-ip:~/.openclaw/skills/eventiq/
ssh user@remote-server-ip "openclaw restart"
```

**Option B: Generate files locally, user deploys**
Claude Code generates all config files in `eventiq/scripts/openclaw-setup/`. User manually copies to server:
```bash
# On local machine:
ls eventiq/scripts/openclaw-setup/
  SKILL.md
  .env.openclaw
  webchat-config.yaml
  setup.sh

# User runs on remote server:
scp -r eventiq/scripts/openclaw-setup/ user@remote-server:~/
ssh user@remote-server "cd openclaw-setup && bash setup.sh"
```

**Option C: User runs commands Claude provides**
Claude provides step-by-step SSH commands. User runs them manually.

---

## 11. Environment Variables

### Vercel (new)
```bash
# Tool API authentication (shared secret with OpenClaw)
TOOL_API_KEY=<generate-random-64-char-string>

# OpenClaw WebSocket URL (for chat widget to connect)
NEXT_PUBLIC_OPENCLAW_WS_URL=wss://<remote-server-domain>/webchat
```

### Remote Server (new)
```bash
# EventIQ tool API
EVENTIQ_API_URL=https://us.hyperverge.space
EVENTIQ_API_KEY=<same-shared-secret-as-vercel>

# Supabase (for chat data writes)
SUPABASE_URL=https://fupoylarelcwiewnvoyu.supabase.co
SUPABASE_SERVICE_KEY=<key>
```

---

## 12. Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Adoption | 80%+ of BD team using chat weekly within 1 month | `chat_messages` count per user |
| Response quality | < 5% corrections | Manual review |
| Response latency | p50 < 5s, p95 < 15s | `chat_messages.latency_ms` |
| Pre-call usage | 50%+ of calls preceded by a chat query | Timestamp correlation |
| Data coverage | 90%+ of questions answerable from dataset | Sample testing |

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Claude Max rate limits under concurrent use | Low | Medium | $200/mo Max tier is generous. Monitor usage. Queue if needed. |
| WebSocket connection drops | Medium | Low | Auto-reconnect in chat widget. Show "reconnecting..." indicator. |
| OpenClaw breaking update (tracking latest) | Medium | Medium | Test updates before applying. Keep skill file version-controlled. |
| Remote server downtime | Low | High | Chat shows "Agent offline" gracefully. Dashboard still works (it's on Vercel). |
| Tool API latency (Vercel cold starts) | Medium | Low | Vercel serverless functions cold start in ~1s. Acceptable for chat. |

---

## 14. Open Questions (Resolved)

| # | Question | Answer |
|---|----------|--------|
| 1 | Claude subscription tier? | **Max ($200/mo)** — generous rate limits |
| 2 | Domain? | **us.hyperverge.space** — no change |
| 3 | Vercel billing? | **Free tier (Hobby)** — no cost |
| 4 | WhatsApp? | **Phase 2** — start with website chat only |
| 5 | Slack workspace? | **hyperverge.slack.com** — Phase 2 |
| 6 | OpenClaw versioning? | **Track latest** |
| 7 | Remote server? | **Keep as-is** — shared with friend, minimal changes |
| 8 | Rename codebase? | **Later** — keep `eventiq/` for now |

---

## Appendix A: Example Conversations

### Quick Lookup
```
User: Tell me about Fortun Advance
Bot:  **Fortun Advance** | Miami, FL | 20 employees | Funder
      Publicly traded via LRGR. 245% growth surge. $6.4M funded in year one.
      Latino/minority business focus.

      **CEO:** Yoel Damas
      **Icebreaker:** "The 245% growth and LRGR listing are impressive —
       how are you scaling underwriting to match that pace?"

      **Talking Points:**
      1. At your growth rate, faster underwriting unlocks more deal flow
      2. 450+ MCA companies use HyperVerge for document automation
      3. Manual review costs 2-3 hours/deal — AI cuts that to minutes

      Want a full outreach brief or email draft?
```

### Pre-Call Prep
```
User: I have a call with New York Tribeca in 10 minutes
Bot:  **Quick Prep: New York Tribeca Group**
      40 Wall St, NYC | 68 employees | $10-50M revenue | BBB Accredited

      **Talk to:** Gabriel Shuster, CEO
      **Open with:** "Gabriel, the $14M milestone in 8 months is serious
       velocity — how are you keeping underwriting quality tight at that pace?"

      **3 Key Points:**
      1. At $14M/8mo, even 10% faster decisions = significant deal flow
      2. 450+ MCA companies use HyperVerge — we handle your doc formats
      3. Manual review = 2-3 hrs/deal. We cut to minutes.

      **Ask:** "Would a 15-minute demo be worth exploring?"
```

### Log + Remind
```
User: Log that I called Gabriel at NY Tribeca today. Remind me to follow up Friday.
Bot:  Done:
      ✓ Logged: Call with Gabriel Shuster at New York Tribeca Group (today)
      ✓ Reminder set: Follow up with NY Tribeca — Friday Feb 28
```
