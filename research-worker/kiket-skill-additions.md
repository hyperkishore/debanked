# Kiket Skill Additions for Enrichment Pipeline

Add these tools to `~/.openclaw/agents/missioniq/agent/skills/eventiq/SKILL.md` on EC2.

## daily_brief

**Purpose:** Get today's intelligence digest — what happened across all monitored companies and leaders.

**Endpoint:** `GET https://us.hyperverge.space/api/tools/daily-brief`

**Query Parameters:**
- `date` (optional) — Date in YYYY-MM-DD format. Defaults to today.

**Auth:** `X-Tool-Key` header

**Response:**
```json
{
  "date": "2026-03-06",
  "highlights": ["3 leaders posted on LinkedIn", "2 companies in the news"],
  "leader_activity": [{"name": "...", "company": "...", "summary": "..."}],
  "company_news": [{"company": "...", "headline": "...", "relevance": "..."}],
  "hooks_updated": [{"leader": "...", "company": "...", "hook": "..."}],
  "recommended_actions": ["Follow up with X about their post on Y"]
}
```

**When to use:** When user asks "what happened today?", "morning briefing", "daily update", or "what's new?".

## enrichment_feed

**Purpose:** Get recent enrichment events — LinkedIn activity, hook updates, company intelligence changes.

**Endpoint:** `GET https://us.hyperverge.space/api/enrichment-feed`

**Query Parameters:**
- `limit` (optional) — Max items, default 20, max 100
- `since` (optional) — Date in YYYY-MM-DD format, only events after this date

**Auth:** None required (public read)

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "companyId": 123,
      "companyName": "Company X",
      "leaderName": "John Smith",
      "type": "profile_hooks",
      "summary": "Updated hooks based on recent LinkedIn post about AI lending",
      "data": {"hooks": ["Recent AI lending post", "Spoke at LendIt"]},
      "createdAt": "2026-03-06T08:00:00Z"
    }
  ],
  "total": 42
}
```

**When to use:** When user asks about enrichment activity, "what profiles were updated?", "recent LinkedIn activity", or "enrichment status".
