# PRD: MissionIQ — Smart Sales Partner

> The conversational AI layer that turns EventIQ's intelligence into action.

**Owner:** Kishore Natarajan
**Last Updated:** 2026-03-01
**Status:** Phase 0 shipped (chat + database access). Phase 1 in progress.

---

## 1. Problem Statement

HyperVerge's BD team has 959 deeply researched companies with icebreakers, talking points, 1,398 leadership profiles, and recent news. They have a $127K active pipeline targeting $3M revenue. But the intelligence sits passively — reps have to navigate to a company, read the brief, copy the template, switch to Gmail, paste, and manually log the engagement. The gap between "knowing what to say" and "saying it" is 5-10 minutes per touch. At 70-400 meetings needed over 12 months, this friction compounds into lost velocity.

**The deeper problem:** EventIQ has excellent intelligence but no agency. It can't tell you what to do, can't do it for you, and can't learn from what happened. It's a reference tool, not a partner.

### What the Product Strategy Analysis Identified

The Feb 2026 analysis concluded:

> "EventIQ is the **brain** (research, prioritization, messaging, briefings) that connects to **hands** (email tools, CRM, LinkedIn) for execution. Right now the brain is excellent but it has no hands."

Key gaps identified across all personas:
- BDR: No one-click outreach execution, no daily task queue, no activity tracking
- AE: No conversation history across meetings, no deal velocity alerts, no CRM sync
- Both: Data trapped in single-user context, no proactive alerts, copy-paste workflow

---

## 2. Vision: What a Smart Sales Partner Does

A smart sales partner is not a chatbot that answers questions. It's an agent that:

| Attribute | Chatbot | Sales Partner |
|-----------|---------|---------------|
| Initiative | Waits for user to ask | Proactively surfaces what matters |
| Context | Starts from zero each conversation | Knows your pipeline, history, and patterns |
| Output | Information | Action — drafts sent, engagements logged, pipeline moved |
| Learning | Stateless | Remembers what worked, what didn't, adapts |
| Availability | Desktop web page | Mobile, WhatsApp, desktop — wherever the rep is |
| Coaching | Answers factual questions | Suggests strategy, reframes objections, identifies patterns |

### The MissionIQ Promise

**Before a meeting:** "Here's who you're meeting, what they care about, what happened last time, and the one thing you should lead with."

**During the day:** "You have 3 stale deals that need attention today. Kapitus has been in demo for 12 days. Want me to draft a follow-up?"

**After an interaction:** "Logged your call with Yoel. Based on what you described, here's the post-demo sequence. I drafted the recap email — want to send it?"

**On the go:** Available on mobile and WhatsApp. Same intelligence, same agency, any surface.

---

## 3. Current State (What's Built)

### Infrastructure (Phase 0 — Shipped)

| Component | Status | Location |
|-----------|--------|----------|
| Chat UI (desktop + mobile web) | Live | `src/app/chat/page.tsx`, `src/components/missioniq-chat.tsx` |
| OpenClaw WebSocket gateway | Live | `wss://ketea.tail38a898.ts.net/ws` via Tailscale Funnel |
| OpenClaw agent with Claude Sonnet | Live | `~/.openclaw/agents/missioniq/` on keti server |
| EventIQ Tool API (8 read endpoints) | Live | `src/app/api/tools/` — search, company, leader, brief, stats, news, similar, team-notes |
| Tool auth middleware | Live | `src/lib/tool-auth.ts` (X-Tool-Key header) |
| Supabase tables for chat | Created | `miq_conversations`, `miq_messages`, `miq_notes`, `miq_engagements`, `miq_reminders`, `miq_user_config` |
| WhatsApp channel (via OpenClaw) | Live | Bound to webchat channel in openclaw.json |
| Agent SKILL.md for database queries | Live | `~/.openclaw/skills/eventiq/SKILL.md` |

### What Works Today

1. User asks "Tell me about Fortun Advance" → Agent queries EventIQ API → Returns comprehensive company brief with leaders, news, market position
2. User asks "Top funders in New York" → Agent searches database → Returns filtered results
3. User asks "Prep me for a call with [company]" → Agent assembles outreach brief
4. Streaming responses with markdown rendering
5. Works on mobile web (responsive layout)

### What Doesn't Work Yet

1. **No mobile access** — Chat tab missing from mobile bottom nav. Users can't reach MissionIQ without typing `/chat` in URL
2. **No conversation persistence** — Messages lost on page reload (in-memory only)
3. **No write-back** — Agent can READ the database but can't LOG engagements, MOVE pipeline stages, SET reminders, or ADD notes
4. **No proactive intelligence** — Waits for user to ask; doesn't push morning briefings, stale deal alerts, or next-best-action
5. **No web search** — Can't search for real-time info (Brave API key not configured)
6. **No context awareness** — Doesn't know who the user is, what their pipeline looks like, or what they did yesterday
7. **No deep linking** — Company names in chat responses don't link back to company detail pages
8. **No "Ask MissionIQ" from context** — Can't ask about a specific company from the company detail page

---

## 4. Architecture

### How the Pieces Fit

```
                    USER SURFACES
        ┌──────────────────────────────────┐
        │  Mobile App    Desktop Web    WhatsApp  │
        │  (chat tab)   (sidebar)     (OpenClaw)  │
        └──────────────┬───────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  OpenClaw Gateway │  WebSocket + WhatsApp
              │  (on keti server) │  Protocol v3
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  MissionIQ Agent │  Claude Sonnet + Skills
              │  AGENT.md + SKILL│
              └────────┬────────┘
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
    ┌─────────────┐ ┌──────┐ ┌──────────┐
    │ EventIQ API │ │ Web  │ │ Supabase │
    │ (tool routes)│ │Search│ │ (direct) │
    │ 8 read +    │ │Brave │ │ write-back│
    │ N write     │ │ API  │ │ tables   │
    └─────────────┘ └──────┘ └──────────┘
```

### Key Design Decisions

**1. Agent-first, not UI-first.**
MissionIQ features should be built as agent capabilities (tool endpoints + skill instructions), not as new UI components. The chat is the primary interface. The dashboard is the secondary interface. This means: if you can do it in chat, you can do it on WhatsApp too.

**2. Read-write, not read-only.**
The agent must be able to take actions, not just provide information. Every read endpoint should have a write counterpart where it makes sense.

**3. Context comes from the database, not the conversation.**
The agent should query Supabase for user context (pipeline, engagements, follow-ups) at the start of each conversation, not rely on the user explaining their situation.

**4. Proactive > Reactive.**
The highest-value features are ones where MissionIQ initiates: morning briefings, stale deal alerts, post-engagement coaching. The lowest-value features are ones where the user has to know what to ask.

---

## 5. Phased Roadmap

### Phase 1: Accessible & Persistent (This Week)

**Goal:** MissionIQ is reachable from everywhere and remembers conversations.

| Feature | What | Why | Effort |
|---------|------|-----|--------|
| **Chat in mobile nav** | Add MessageCircle tab to mobile-nav.tsx | BD reps can't access MissionIQ on mobile AT ALL | 30 min |
| **"Ask MissionIQ" on company detail** | Floating button on company detail that opens chat with "Tell me about [company]" pre-filled | Context-aware entry point; most natural moment to ask for help | 1 hr |
| **Conversation persistence** | Store messages in Supabase `miq_messages` table; load history on page open | Messages lost on reload = useless for multi-session work | 3 hr |
| **Mobile UX fixes** | Safe-area inset on input, touch-friendly copy button, word-wrap on long text | Input hidden behind iPhone home indicator; copy button too small | 30 min |
| **Deep links in responses** | Company names in chat responses become clickable links to `/company/{id}` | Bridge between chat intelligence and full company detail | 2 hr |

**Acceptance criteria:**
- Open EventIQ on iPhone → see Chat tab in bottom nav → tap → MissionIQ loads
- Send message → close tab → reopen → see previous conversation
- On company detail page → tap "Ask MissionIQ" → chat opens with company context
- Agent mentions "Kapitus" → user taps it → navigates to Kapitus detail page

---

### Phase 2: Write-Back Actions (Week 2)

**Goal:** MissionIQ can DO things, not just tell you things.

| Feature | What | Why | Effort |
|---------|------|-----|--------|
| **Log engagement from chat** | New tool endpoint: `POST /api/tools/log-engagement` | "I just had a call with Yoel at Fortun" → auto-logs engagement | 3 hr |
| **Move pipeline from chat** | New tool endpoint: `POST /api/tools/update-pipeline` | "Move Fortun Advance to demo stage" → updates pipeline | 2 hr |
| **Set follow-up reminder** | New tool endpoint: `POST /api/tools/set-reminder` | "Remind me to follow up with BriteCap next Tuesday" → creates reminder | 2 hr |
| **Add team note** | New tool endpoint: `POST /api/tools/add-note` | "Note: Yoel mentioned they're evaluating Ocrolus" → saves to company notes | 1 hr |
| **Update SKILL.md** | Add write endpoints to agent's skill definition | Agent knows how to use the new write endpoints | 1 hr |

**Acceptance criteria:**
- "I just called Yoel at Fortun Advance, he's interested in a demo" → engagement logged (channel: call, action: outbound_call, contact: Yoel Damas) + pipeline moved to "engaged" + confirmation shown in chat
- "Remind me to follow up with BriteCap on Thursday" → reminder created, shows in Today tab
- "Note: PIRS Capital is evaluating two other vendors" → note saved, visible in company detail

---

### Phase 3: Contextual Intelligence (Week 2-3)

**Goal:** MissionIQ knows your world without you explaining it.

| Feature | What | Why | Effort |
|---------|------|-----|--------|
| **User context on connect** | On new conversation, agent auto-queries: user's pipeline, stale deals, due follow-ups, recent engagements | Agent greets with "Good morning! You have 3 stale deals..." instead of waiting | 3 hr |
| **Web search** | Configure Brave API key; agent can search web for real-time intel | "What's the latest news on Kapitus?" → live web results | 1 hr |
| **Morning briefing push** | Endpoint that generates daily briefing; agent auto-posts on first conversation of the day | Proactive intelligence — the partner tells you what matters today | 3 hr |
| **Email draft generation** | "Draft email to Yoel at Fortun" → agent generates personalized email using leader hooks, news, talking points, and returns with "Open in Gmail" mailto link | Closes the gap from intelligence to execution | 2 hr |
| **Outreach brief** | "Prep me for a call with BriteCap" → full brief: WHO (name, title, hooks), CONTEXT (pipeline stage, last touch, engagement history), ANGLE (matched talking point), NEWS (latest), OBJECTIONS (preempts) | Already partially works via /api/tools/brief; enhance with engagement history | 2 hr |

**Acceptance criteria:**
- Open MissionIQ in the morning → first message from agent: "Good morning, Kishore! Here's your focus for today: [3 items]. Kapitus has been in demo for 12 days — want me to draft a follow-up?"
- "Draft email to Yoel" → returns formatted email with subject, body, hooks, CTA + "Open in Gmail" link
- "What's the latest on Square Capital?" → web search results + database context combined

---

### Phase 4: Coaching & Pattern Recognition (Week 3-4)

**Goal:** MissionIQ helps you sell better, not just sell faster.

| Feature | What | Why | Effort |
|---------|------|-----|--------|
| **Post-engagement coaching** | After user logs a call/meeting, agent suggests: next steps, follow-up timing, sequence recommendation | "Based on what happened, here's what I'd suggest next..." | 3 hr |
| **Objection coaching** | "They pushed back on pricing" → agent responds with company-specific battlecard + reframe strategy + what worked with similar companies | Real-time coaching during deal progression | 2 hr |
| **Deal health assessment** | "How is my pipeline looking?" → agent analyzes pipeline: deal velocity, stale deals, coverage gaps, win probability estimates | Proactive risk identification | 3 hr |
| **Similar company strategy** | "We won FundKite. Who else should we approach the same way?" → finds similar companies by size/type/location and suggests outreach strategy | Pattern-based prospecting | 2 hr |
| **Competitive intelligence** | "Who competes with BriteCap?" + "What's our positioning against Ocrolus?" → cross-references competitor data + suggests differentiation | In-deal competitive strategy | 2 hr |

**Acceptance criteria:**
- Log "completed demo with PIRS Capital" → agent responds: "Great progress! Based on PIRS's profile, I'd recommend sending the MCA case study within 24 hours. Want me to draft a post-demo recap email?"
- "They said HyperVerge is too expensive compared to Ocrolus" → agent responds with specific pricing reframe for that company size + what worked with similar deals
- "How's my pipeline?" → summary with green/yellow/red deals, velocity analysis, recommended actions

---

### Phase 5: Team Intelligence (Month 2+)

**Goal:** MissionIQ knows the full team context, not just one rep's view.

| Feature | What | Why | Effort |
|---------|------|-----|--------|
| **Multi-user awareness** | Agent knows which user is chatting; queries their specific engagements, pipeline, reminders | "Amit logged a call with Kapitus yesterday" ≠ "Kishore logged a call" | 4 hr |
| **Team engagement history** | "What's our full history with Kapitus?" → all team members' engagements, notes, pipeline changes | Complete account picture for handoffs | 3 hr |
| **Account ownership** | "Who owns the BriteCap account?" / "Assign Fortun Advance to Amit" | Prevent duplicate outreach; enable handoffs | 3 hr |
| **Win/loss analysis** | "Why did we win FundKite?" → synthesizes all engagement data into narrative + learnings | Pattern recognition across deals | 3 hr |
| **Market trend synthesis** | "How is the MCA market trending?" → aggregates news across 959 companies, identifies themes | Strategic intelligence for leadership | 2 hr |
| **Team activity summary** | "What did the team do this week?" → engagement counts, pipeline movement, meetings booked | Manager visibility without micromanagement | 2 hr |

**Acceptance criteria:**
- Kishore asks "What's our history with Kapitus?" → sees both Kishore's and Amit's engagements, pipeline moves, and notes
- "Give me the team activity summary for this week" → emails sent: 23, calls: 8, demos: 3, pipeline added: $45K
- "Why did we win FundKite?" → narrative: "4-touch sequence over 3 weeks, champion was CFO, key differentiator was processing speed"

---

## 6. Tool API Endpoints (Current + Planned)

### Existing (Read-Only)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tools/search` | GET | Full-text search across companies |
| `/api/tools/company/[id]` | GET | Full company profile with leaders, news, talking points |
| `/api/tools/leader` | GET | Search leaders by name |
| `/api/tools/brief/[id]` | GET | Outreach brief for a company |
| `/api/tools/stats` | GET | Market statistics (counts, categories, locations) |
| `/api/tools/news` | GET | Latest news across companies |
| `/api/tools/similar/[id]` | GET | Find similar companies |
| `/api/tools/team-notes/[companyId]` | GET | Team notes and engagement history |

### Planned (Write-Back — Phase 2)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tools/log-engagement` | POST | Log an engagement (channel, action, contact, notes) |
| `/api/tools/update-pipeline` | POST | Move company to a pipeline stage |
| `/api/tools/set-reminder` | POST | Create a follow-up reminder |
| `/api/tools/add-note` | POST | Add a team note to a company |

### Planned (Context — Phase 3)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tools/my-pipeline` | GET | Current user's pipeline with deal health |
| `/api/tools/my-actions` | GET | Today's due follow-ups, stale deals, suggested actions |
| `/api/tools/morning-briefing` | GET | Full morning briefing (news triggers, stale warnings, quick wins) |

---

## 7. Agent Personality & Communication Style

MissionIQ should feel like a sharp, well-prepared colleague — not a generic AI assistant.

### Tone
- **Concise.** BD reps are busy. Lead with the actionable information.
- **Specific.** Never say "consider reaching out." Say "Email Yoel — open with the ThinkEquity news, pivot to processing speed, ask for a 15-min demo."
- **Confident but honest.** When data is from the database, cite it. When it's from web search, say so. When it doesn't know, say so.
- **Structured.** Use headers, bullet points, and bold for key facts. Reps scan, they don't read essays.

### Response Structure (by query type)

**Company lookup:**
```
**[Company Name]** — [one-line description]
- Category: [funder/iso/etc] | Priority: [P0/P1/P2/TAM]
- Key leaders: [Name 1] (Title), [Name 2] (Title)
- Latest news: [headline] — [source, date]
- Quick icebreaker: [icebreaker]

Want a full outreach brief, email draft, or competitive analysis?
```

**Call prep:**
```
## Pre-Call Brief: [Company]

**WHO:** [Leader] — [Title]
[One-line background + top hook]

**CONTEXT:** [Pipeline stage] | Last touch: [date, channel] | [engagement summary]

**YOUR ANGLE:** [Best talking point for this persona]

**NEWS HOOK:** "[Headline]" — use this to open

**WATCH OUT:** [Land mines / objection preempts]

**THE ASK:** [Specific CTA for this stage]
```

**Email draft:**
```
**To:** [name] <[email or "email not on file"]>
**Subject:** [subject line]

[Email body with icebreaker, value prop, CTA]

---
[Open in Gmail] | [Copy to clipboard]
```

---

## 8. Success Metrics

| Metric | Phase 1 Target | Phase 3 Target | Phase 5 Target |
|--------|----------------|----------------|----------------|
| Daily active users (chat) | 2 (Kishore + 1) | 3-4 (BD team) | Full GTM team |
| Messages per user per day | 5-10 | 15-25 | 20-30 |
| Actions taken via chat (log, pipeline, remind) | 0 (not built) | 5/day | 15/day |
| Time from "research" to "outreach sent" | 5-10 min | 1-2 min | <1 min |
| Mobile usage share | 0% (no access) | 20% | 40% |
| Stale deal response time | Discovered by accident | Proactively surfaced same day | Auto-suggested action |

### North Star Metric

**Outreach velocity:** Number of personalized, intelligence-backed touches per rep per day. Current: ~5-8 (manual). Target: 20-30 (MissionIQ-assisted).

---

## 9. What MissionIQ is NOT

- **Not a CRM.** HubSpot is the system of record. MissionIQ is the intelligence and action layer on top.
- **Not an email tool.** It drafts emails and opens Gmail/Outplay. It doesn't send emails directly.
- **Not a replacement for EventIQ UI.** The dashboard, company list, pipeline kanban, and map are better as visual tools. MissionIQ is for quick actions, prep, and coaching.
- **Not an autonomous agent.** It suggests and drafts. The rep approves and executes. No auto-sending, no auto-scheduling without confirmation.

---

## 10. Open Questions

1. **WhatsApp as primary mobile surface?** The OpenClaw WhatsApp channel is already bound. Should we invest in the mobile web chat or lean into WhatsApp for mobile BD reps?

2. **Brave vs. other search providers?** Brave dropped free tier. $5/mo credit is fine for now. Is Perplexity or Tavily better for MCA-specific search?

3. **Proactive briefings — push notification or in-chat?** Morning briefing could be a push notification (requires PWA push setup) or auto-posted when user opens chat. Which is more useful?

4. **Write-back auth model.** Tool API currently uses a shared `X-Tool-Key`. For write operations (log engagement, move pipeline), should we pass user identity from the chat session to attribute actions correctly?

5. **Conversation context window.** OpenClaw sessions are stateful within a session. But should MissionIQ remember context across days? ("Last time we talked about Kapitus — any update?")

---

## 11. Dependencies

| Dependency | Status | Needed For |
|------------|--------|------------|
| OpenClaw gateway running on keti server | Live | All phases |
| Tailscale Funnel for WS exposure | Live | All phases |
| Supabase `miq_*` tables | Created | Phase 1 (persistence) |
| Brave Search API key | Not configured | Phase 3 (web search) |
| Vercel preview deploy (us2.hyperverge.space) | Live | All phases |
| EventIQ tool API endpoints | 8 live (read) | Phase 2 needs write endpoints |

---

## 12. Appendix: Related Documents

- **Product Strategy Analysis** — `docs/PRODUCT_STRATEGY_ANALYSIS.md` — Deep persona analysis, gap inventory, competitive analysis. MissionIQ addresses many of the gaps identified here.
- **Product Roadmap** — `../ROADMAP.md` — Overall EventIQ vision and phases. MissionIQ should be added as a core component of Phase 2 (Multi-User Product).
- **Pre-Pipeline Signal Tracker PRD** — `docs/PRD_PRE_PIPELINE_SIGNAL_TRACKER.md` — Revenue extrapolation engine. MissionIQ should surface deal value estimates in pipeline discussions.
- **OpenClaw Agent Config** — Remote: `~/.openclaw/agents/missioniq/agent/AGENT.md`
- **EventIQ CLAUDE.md** — `./CLAUDE.md` — Technical architecture reference.
