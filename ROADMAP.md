# EventIQ — Product Roadmap

> Single source of truth for product vision, engineering execution, and operational health.
> Updated continuously as bugs are fixed, features ship, and strategy evolves.

---

## Part 1: Product Vision

### The Opportunity

**Zero tools today combine event/meeting prep + AI-generated talking points + deep research on private companies + offline mobile access.** The $4.4B sales intelligence market is growing at 13% CAGR, and the whitespace is wide open.

### What We Proved (DeBanked Connect, Feb 12, 2026)

| Metric | Result |
|--------|--------|
| Companies researched | 1,000+ (with icebreakers, talking points, leadership bios, recent news) |
| Time to build | Hours, not the 16-33 hours of manual research |
| Output | Offline PWA with search, filters, schedule, "met" tracking, engagement logging |
| Data quality | Confidence-tiered, financially verified, LinkedIn-linked |

### Why MCA is the Perfect First Vertical

| Factor | Detail |
|--------|--------|
| Market size | $18-22B annually, 6.6-9.0% CAGR |
| Total funders | 200+ direct funders, 10,000+ ISOs/brokers |
| Market structure | Top 5 hold ~55%, rest is highly fragmented = long-tail sales opportunity |
| Geographic concentration | NYC metro + South Florida = dense event circuit |
| Event density | deBanked Connect, Broker Fair, Funders Forum, LendIt = 6+ major events/year |
| Public data richness | UCC filings, state registries (VA, NY, CA), SBFA/RBFC membership |
| Pain point alignment | Manual underwriting is the #1 industry pain point = perfect for HyperVerge's pitch |

### Who Uses It: 6 Personas

| Persona | Sessions/Day | Primary Use | Time Saved/Week |
|---------|-------------|-------------|-----------------|
| SDR/BDR (3 people) | 15-25 each | Pre-call lookup, email personalization | 20-28 hrs each |
| AE/BD Rep (4 people) | 8-12 each | Pre-call deep dive, event prep | 12-16 hrs each |
| Account Manager (1) | 4-6 | QBR prep, upsell research | 30-45 hrs/month |
| VP Sales (1) | 3-5 | Coaching prep, market intel | 5 hrs/event |
| Marketing (1) | 3-6 | ABM lists, event strategy | 25 hrs/ABM list |
| Executive (1) | 2-4 | Pre-dinner/meeting briefs | 10 hrs/quarter |

### Competitive Positioning

| Gap | Who Comes Close | Why They Fail |
|-----|-----------------|---------------|
| Event-specific attendee prep | Brella, Grip, Swapcard | They do matchmaking (WHO to meet), not preparation (WHAT to say) |
| Unified research + talking points | Cirrus Insight, Salesloft | Calendar-only, no event workflow, no offline |
| Private company intelligence | Clay.com | Requires technical skill to configure, no pre-built output |
| Offline mobile access | Nobody | Every tool requires constant connectivity |
| Icebreaker generation | folk CRM | Formulaic one-liners from CRM fields, not deep research |

### Pricing Model (Future)

| Tier | Price | Research Credits/mo | Key Features |
|------|-------|---------------------|-------------|
| Individual | $29/mo | 50 companies, 100 contacts | Research, Chrome ext, PWA export |
| Team | $79/user/mo | 200 companies, 500 contacts (shared) | Collaboration, CRM sync, Slack bot |
| Business | $149/user/mo | 1,000 companies, 2,500 contacts (shared) | Triggers, API, analytics |
| Enterprise | Custom | Custom | SSO, SLA, white-label |
| Event Add-On | $199/event | Up to 200 companies | One-time event prep projects |

---

## Part 2: Product Phases

### Phase 1: MVP (Current — Internal Tool)
**Status: SHIPPED.** EventIQ is live as HyperVerge's internal GTM intelligence platform.

What's built:
- 1,000+ companies in Supabase with deep research
- Market Map, Signal Engine, AI Briefing, Enrichment pipeline
- Offline PWA with search, filters, engagement tracking
- Pipeline management, daily task queue, pre-call briefings
- Google OAuth with @hyperverge.co domain restriction
- Dinner roundtable prep with 13 attendee deep profiles

### Phase 2: Multi-User Product (Next)
**Goal:** Team features, CRM integrations, daily use mode.

| Feature | Details |
|---------|---------|
| Chrome Extension (P0) | LinkedIn sidebar, company website widget, Gmail compose helper |
| Slack Bot (P0) | `/eventiq [company]` quick lookup, daily trigger alerts |
| CRM Integration (P1) | Salesforce + HubSpot bidirectional sync |
| Calendar Integration (P1) | Auto-detect meetings, push briefs 30 min before |
| Team Collaboration | Shared research, private notes, SDR-to-AE handoff briefs |
| Trigger Alerts | Funding, leadership changes, job postings, competitor mentions |

### Phase 3: Intelligence Platform
**Goal:** Living dossiers, continuous monitoring, analytics.

| Feature | Details |
|---------|---------|
| Living Dossiers | Auto-refresh research quarterly, news monitoring |
| Weekly Digest | Monday AM email: urgent changes, market intel |
| Analytics | Which talking points led to meetings? Event ROI tracking |
| Prospecting Mode | ICP filters, buying signals, "similar companies" discovery |

### Phase 4: Platform & Scale
**Goal:** API, vertical templates, event organizer tools.

| Feature | Details |
|---------|---------|
| API / SDK | Research-as-a-Service: company name in, full dossier out |
| Industry Templates | Pre-built research profiles for MCA, SaaS, Healthcare, Real Estate |
| Event Organizer Tools | White-label briefs for event attendees |
| AI Copilot | Pre-meeting push notifications, post-meeting note prompts, auto-draft follow-ups |

### Vertical Expansion (After MCA)

| Vertical | Target Companies | Events |
|----------|-----------------|--------|
| SaaS Sales | Tech companies | SaaStr, Web Summit, Dreamforce |
| Healthcare | Hospital systems, clinics | HIMSS, HLTH, Becker's |
| Real Estate | Brokerages, REITs, proptech | ICSC, NAR, CRETech |
| Financial Services | Banks, credit unions, fintechs | Money20/20, Finovate, ABA |

---

## Part 3: Tech Architecture

### Research Pipeline

```
STAGE 1: INGEST              STAGE 2: ENRICH              STAGE 3: SYNTHESIZE
CSV / Event URL /             Per company (parallel):       Per company:
Screenshot / CRM              - Apollo.io (firmographics)   - Claude Sonnet (batch)
      |                       - Proxycurl (LinkedIn data)     generates:
      v                       - Cobalt Intelligence (UCC)    - Icebreakers
  Parse & Dedup               - Tavily + Brave (web)        - Talking points
  (fuzzy matching)            - GNews (news monitoring)      - The Ask
      |                       - Company website (AI scrape)  - Objection preempts
      v                                |                     - Confidence tiers
  Structured list                      v                           |
  {company, contacts[]}       Per contact:                         v
                              - Proxycurl (LinkedIn)        STAGE 4: DELIVER
                              - Hunter.io (email verify)    - PWA (event mode)
                                                            - Dashboard (daily)
                                                            - Chrome extension
                                                            - API
```

### Data Source Stack (~$500-1,500/mo)

| Component | Tool | Monthly Cost | Purpose |
|-----------|------|-------------|---------|
| Company + Contact Data | Apollo.io (Pro) | $79 | 210M contacts, 30M companies |
| LinkedIn Data | Proxycurl | $49-199 | Executive backgrounds, career history |
| UCC Filings + SOS Data | Cobalt Intelligence | ~$200-500 | MCA lending activity proxy |
| AI-Native Search | Tavily | $30 | Purpose-built for LLM research pipelines |
| Web Search | Brave Search | Free | 2,000 queries/month |
| News Monitoring | GNews | ~EUR50 | Full article content, history from 2020 |
| LLM (bulk extraction) | Gemini Flash-Lite | ~$20-50 | Cheapest option |
| LLM (synthesis) | Claude Sonnet 4.5 (Batch) | ~$50-100 | Best reasoning |
| Email Verification | Hunter.io (Starter) | $49 | <1% bounce rate |

### Unit Economics

| Tier | Monthly Revenue | Research Cost | Gross Margin |
|------|----------------|---------------|-------------|
| Individual ($29) | $29 | $13.50 | 53% |
| Team ($79 x 5) | $395 | $54 | 86% |
| Business ($149 x 10) | $1,490 | $270 | 82% |

---

## Part 4: Engineering Execution

### Current Baseline
- Frontend: Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui
- APIs: Route handlers in `src/app/api/**` with repeated auth/client patterns
- Persistence: Supabase with localStorage-first sync + queue
- Signal ingestion: Multi-source ingest pipeline
- Auth: Google OAuth via Supabase Auth, enforced by middleware

### Guiding Principles
- Reliability first: prevent silent failures and hidden degradation
- Security by default: enforce explicit authorization boundaries
- Deterministic data consistency: avoid merge behavior that can lose user writes
- Observable systems: every background flow should expose health and errors
- Incremental delivery: quick wins first, then structural refactors

### Engineering Phase 1 (Quick Wins)
**Goal:** Remove top user-visible and security-adjacent failure modes.

Items from bugs.md:
- BUG-001, BUG-002: Validate numeric IDs before DB operations
- BUG-004: Stop masking backend outages as empty success
- BUG-005: Add explicit UI failure states for company fetch
- BUG-008, BUG-010: Make third-party sync semantics truthful
- BUG-012: Remove hard-coded absolute paths

### Engineering Phase 2 (Security + Consistency)
**Goal:** Enforce access boundaries and stabilize cross-device/offline consistency.

Items from bugs.md:
- BUG-003: Enforce document access policy (CRITICAL)
- BUG-006: Redesign sync merge with deterministic conflict resolution (CRITICAL)
- BUG-007: Fix pipeline initialization race
- BUG-009: Correct sync queue delete semantics
- BUG-011: Restrict ingestion trigger to authorized principals

### Engineering Phase 3 (Architecture)
**Goal:** Reduce duplicate logic and improve maintainability.

Items from improvements.md:
- IMP-001: Shared API auth/client helper
- IMP-004: Unified error contract for API responses
- IMP-005, IMP-006: Ingestion orchestration upgrades
- Pagination/caching for company listing endpoint

### Engineering Phase 4 (Test + CI)
**Goal:** Prevent regression through automated checks.

Items from improvements.md:
- IMP-015: Add test command and baseline suites
- CI workflow running lint + tests on pull requests

### SLO Targets
- API reliability: `/api/companies` failure rate < 1%
- Ingestion: Daily success rate >= 99%, median runtime down 30%
- Sync integrity: Queue drain within 5 min after reconnect for 99% of sessions
- Security: 0 unauthorized document access or ingestion trigger events

---

## Part 5: Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| LinkedIn blocks Proxycurl | Lose contact data | Fallback to Apollo, web search |
| AI hallucinations | Wrong talking points | Confidence tiers, human review, citations |
| Data freshness | Stale info at events | 24-hour pre-event refresh, news monitoring |
| Sync merge overwrites local edits | Data loss | Per-record versioning (BUG-006) |
| Silent third-party failures | Hidden degradation | Explicit error semantics (BUG-008, BUG-010) |
| API costs scale faster than revenue | Margin compression | Aggressive caching, tiered research depth |
| Clay.com adds event features | Direct competition | Move fast, own the event wedge |

---

## Part 6: Top-of-Funnel Acceleration Program (BDR + AE + Marketing + Demand Gen)

### 2026 Research Baseline (External)

The product strategy should be calibrated against current GTM execution realities:

- **Prospecting efficiency is the bottleneck.** HubSpot's 2025 sales trends report says reps spend only ~29% of time actually selling, and prospecting is the #1 challenge for 42% of reps.
  - Source: https://www.hubspot.com/state-of-sales/sales-trends-report
- **Pipeline quality is under pressure.** Salesforce's State of Sales (6th edition) reports that 81% of sales teams missed quota and 79% say customers are taking longer to decide.
  - Source: https://www.salesforce.com/resources/research-reports/state-of-sales/
- **Cold outbound baseline is low.** Gong's 2025 benchmark shows median outbound cold-email meeting rate around 0.4%, reinforcing that generic outreach underperforms.
  - Source: https://www.gong.io/blog/b2b-cold-email-benchmarks/
- **AI adoption is now table stakes.** Salesforce and HubSpot both report rapid AI adoption in sales orgs; tooling should be AI-native, not AI-add-on.
  - Sources:
    - https://www.salesforce.com/resources/research-reports/state-of-sales/
    - https://www.hubspot.com/state-of-sales/sales-trends-report

### Top-of-Funnel North Star

Build EventIQ into an **intent-to-outreach operating system** that:

1. Detects buying signals earlier than competitors.
2. Converts signals into prioritized, role-specific actions.
3. Executes multi-channel outreach with minimal context-switching.
4. Measures conversion by segment, campaign, rep, and message variant.

### Product Pillars

#### Pillar A: Signal Graph and Intent Scoring
- Combine:
  - company news signals (`company_news`)
  - engagement recency
  - pipeline stage momentum
  - persona fit
  - campaign touches
- Output:
  - account intent score (0-100)
  - contact intent score (0-100)
  - trigger reason codes ("funding", "leadership change", "hiring", "stale deal risk")

#### Pillar B: Action OS for BDRs
- One queue for:
  - due sequence steps
  - stale-deal rescues
  - hot-signal follow-ups
  - quick wins
- Required capabilities:
  - contact waterfall (email/phone enrichment confidence)
  - one-click launch to email/LinkedIn/call workflows
  - suggested opener + objection-safe CTA + next best step

#### Pillar C: AE Deal Acceleration
- Pre-call brief should include:
  - buying committee map + role tags
  - risk flags (single-threaded, no champion, long stage age)
  - recommended expansion contacts
- Post-call capture should create:
  - structured meeting memory
  - automations for follow-ups and stakeholder threading

#### Pillar D: Demand Gen Control Tower
- Segment builder:
  - type/priority/sub-vertical/tags/signal heat/engagement status
- Campaign operations:
  - list export, campaign tagging, and attribution events
- Funnel view:
  - Segment -> Campaign -> Engaged -> Meeting -> Opportunity

#### Pillar E: Closed-Loop Revenue Analytics
- Team dashboards:
  - BDR: touches/day, meetings booked, meeting rate by sequence
  - AE: stage velocity, multi-thread score, win/loss reasons
  - Marketing: sourced pipeline, influenced pipeline, campaign ROI
- Feedback loops:
  - message variant lift
  - signal-source yield
  - sequence decay points

### 90-Day Execution Waves

#### Wave 1 (Weeks 1-3): Data and Security Foundation
- Remove all hardcoded secrets from frontend and rotate exposed credentials.
- Define campaign + attribution schema.
- Define intent scoring inputs and reason-code taxonomy.

#### Wave 2 (Weeks 4-7): Execution Layer
- Ship unified work queue with role-specific filters.
- Ship contact enrichment confidence model + export-ready list builder.
- Add campaign tags and source tracking at account/contact engagement level.

#### Wave 3 (Weeks 8-12): Optimization Layer
- Add message and sequence experimentation (A/B/n).
- Add dashboard slices by persona, segment, and source.
- Add weekly "what changed" digest for GTM leadership.

### Success Metrics (Top-of-Funnel)

- Prospecting throughput:
  - +40% weekly touches per rep (without quality decline)
- Meeting conversion:
  - +25% meeting-booked rate from outbound
- Pipeline quality:
  - +20% SQL-to-opportunity conversion
- Velocity:
  - -15% days from first touch to first meeting
- Marketing efficiency:
  - +30% campaign-attributed meetings from targeted segments

### Current Go-After List (Live Supabase Snapshot)

Snapshot date: **February 23, 2026** (1023 companies in `companies` table).
Ranking objective: maximize **meetings booked** and **SQL generation** for BDR + marketing pipeline.

Top priority accounts to work now:

1. BriteCap Financial (SQO, P1) — Chief Credit Officer identified
2. FundKite (Client, P2) — COO identified
3. PIRS Capital (SQO, P1) — COO identified
4. Spartan Capital (ICP, P2) — Underwriting leader identified
5. CFG Merchant Solutions (ICP, P2) — Senior underwriter identified
6. Fundfi (Client, P2) — CFO/COO identified
7. Wing Lake Capital Partners (SQO, P1) — Director of underwriting identified
8. Elevate Funding (ICP, P2) — Underwriting manager + underwriter identified
9. Velocity Capital Group (ICP, P2) — CRO + risk leader identified
10. Rapid Finance (ICP, P2) — CRO + chief credit leader identified
11. Forward Financing (ICP, P2) — CRO identified
12. CapFlow Funding Group (ICP, P2) — Chief Risk Officer identified
13. Credibly (ICP, P2) — high signal, RICP gap
14. Bitty (SQO, P1) — high signal, RICP gap
15. Vox Funding (ICP, P2) — high signal, RICP gap

Immediate RICP research queue (high-signal accounts missing COO/CRO/underwriting contact coverage):

1. Credibly
2. Bitty
3. Vox Funding
4. idea Financial
5. CAN Capital
6. Kapitus
7. Mulligan Funding
8. BlueVine
9. World Business Lenders
10. Lendini

Execution rule:
- No account enters a full outbound sequence until at least one RICP profile is identified and quality-checked.

### Claude Handoff Protocol (for the parallel Claude coding session)

Use this sequence when implementing:

1. Read `bugs.md` for critical/high issues first.
2. Implement P0 security + reliability fixes before net-new growth features.
3. Pull feature backlog directly from `improvements.md` (IMP-016+ for GTM growth layer).
4. Update this roadmap section as each wave ships.

---

## Changelog
- **2026-02-22**: Combined ROADMAP.md and ROADMAP_V2.md into single document. Added engineering phases referencing bugs.md and improvements.md.
- **2026-02-23**: Added Part 6 top-of-funnel acceleration program with BDR/AE/marketing/demand-gen pillars, external benchmark anchors, 90-day waves, and Claude handoff protocol.

---

## Part 7: RICP Enrichment Program (Definition + Execution)

### What RICP Enrichment Means

RICP enrichment is the process of converting each target account into role-addressable buying-committee coverage for the three core personas:

1. COO / Operations decision owner
2. CRO / Risk or Credit decision owner
3. Underwriting decision owner

For each discovered persona, the minimum usable record should include:
- Full name
- Current title (normalized)
- Function mapping (`operations`, `risk`, `underwriting`)
- Verification source URL(s)
- Verification date
- Confidence (`high`, `medium`, `low`)
- Personalized outreach hook

### Live Baseline (Read-Only Supabase Check)

As of **February 23, 2026** (live read at 13:18 UTC):

- Live `companies` count: **1000**
- Priority cohort (`SQO`/`Client`/`ICP`, `priority <= 3`): **68**
- Accounts with at least one RICP match: **24**
- Accounts missing RICP coverage: **44**
- Current RICP coverage: **35.3%**

Highest-impact no-RICP accounts for immediate enrichment:
1. Credibly
2. Bitty
3. Vox Funding
4. idea Financial
5. Lendini
6. World Business Lenders
7. Lendr
8. CAN Capital
9. Tip Top Capital
10. National Funding
11. Reliant Funding
12. BlueVine
13. Expansion Capital Group
14. Likety
15. Greenbox Capital

### Data Drift Note (Must Be Managed)

Current datasets are not fully synchronized:
- Local `all-companies.json`: **1021**
- Saved snapshot (`live-targeting-snapshot-2026-02-23.json`): **1023**
- Live Supabase `companies`: **1000**

Execution rule:
- Use **live Supabase** as GTM source of truth for meetings/SQL decisions.
- Track and reconcile local/snapshot drift weekly.

### 90-Day RICP Outcomes (Meetings + SQL)

Primary goal alignment:
- Increase meetings booked and SQL generation from prioritized account list.

RICP targets:
1. Reach **>=85%** RICP coverage for priority cohort by day 45.
2. Reach **>=95%** RICP coverage for top 25 ranked accounts by day 21.
3. Reduce no-RICP priority accounts from **44 -> <=10** by day 90.

Pipeline conversion targets:
1. Improve meeting-booked rate on enriched accounts by **>=25%** vs non-enriched baseline.
2. Improve meeting-to-SQL conversion by **>=15%** on enriched cohort.

### Operating Cadence

Daily:
1. Generate top 15 no-RICP queue from live data.
2. Enrich 8-12 accounts with source-backed COO/CRO/underwriting contacts.
3. Release only `high`/`medium` confidence profiles into outbound.

Weekly:
1. Recompute RICP coverage and gap queue from live Supabase.
2. Review enriched-account meeting and SQL conversion deltas.
3. Re-prioritize by fit + signal + coverage gap.

Governance:
1. No full outbound sequence for top-priority account until at least one validated RICP exists.
2. Keep evidence links and verification date for every added persona record.


### RICP Enrichment Sprint Sheet (Live Append)

Snapshot date: **February 23, 2026** (live Supabase read).

- Priority cohort size: **68**
- Missing RICP accounts: **44**
- Current coverage: **35.3%**
- SLA buckets: top 10 in 24h, next 15 in 72h, remainder in rolling weekly backlog.

#### SLA Bucket A (24 hours) — Top 10

| Rank | Account | ID | Type | Priority | Score | Signal | Leaders | News |
|---|---|---:|---|---:|---:|---:|---:|---:|
| 1 | Credibly | 64 | ICP | 2 | 28 | 9 | 5 | 7 |
| 2 | Bitty | 1 | SQO | 1 | 27 | 7 | 3 | 6 |
| 3 | Vox Funding | 7 | ICP | 2 | 26 | 9 | 5 | 6 |
| 4 | idea Financial | 17 | ICP | 2 | 26 | 9 | 4 | 6 |
| 5 | Lendini | 38 | ICP | 2 | 26 | 7 | 4 | 3 |
| 6 | World Business Lenders | 57 | ICP | 2 | 26 | 9 | 5 | 4 |
| 7 | Lendr | 113 | ICP | 2 | 23 | 9 | 2 | 3 |
| 8 | CAN Capital | 8 | ICP | 2 | 22 | 5 | 5 | 3 |
| 9 | Tip Top Capital | 45 | ICP | 2 | 22 | 9 | 1 | 3 |
| 10 | National Funding | 70 | ICP | 2 | 22 | 7 | 3 | 3 |

#### SLA Bucket B (72 hours) — Next 15

| Rank | Account | ID | Type | Priority | Score | Signal | Leaders | News |
|---|---|---:|---|---:|---:|---:|---:|---:|
| 11 | Reliant Funding | 85 | ICP | 2 | 22 | 7 | 3 | 3 |
| 12 | BlueVine | 102 | ICP | 2 | 22 | 7 | 3 | 4 |
| 13 | Expansion Capital Group | 114 | ICP | 2 | 19 | 7 | 0 | 1 |
| 14 | Likety | 20 | ICP | 3 | 19 | 7 | 4 | 3 |
| 15 | Greenbox Capital | 68 | ICP | 2 | 19 | 5 | 2 | 2 |
| 16 | One Park Financial | 89 | ICP | 2 | 19 | 4 | 3 | 3 |
| 17 | Lighter Capital | 160 | ICP | 2 | 19 | 7 | 0 | 1 |
| 18 | Simply Funding | 11 | ICP | 3 | 18 | 5 | 5 | 3 |
| 19 | Lendio | 86 | ICP | 2 | 18 | 4 | 2 | 3 |
| 20 | Shield Funding | 104 | ICP | 2 | 18 | 5 | 1 | 3 |
| 21 | ByzFunder | 159 | ICP | 2 | 18 | 6 | 0 | 2 |
| 22 | MonetaFi | 12 | ICP | 3 | 17 | 7 | 1 | 3 |
| 23 | Gulf Coast Business Credit | 18 | ICP | 3 | 17 | 4 | 5 | 4 |
| 24 | Lexington Capital Holdings | 47 | ICP | 2 | 17 | 4 | 1 | 5 |
| 25 | ROK Financial | 94 | ICP | 2 | 16 | 2 | 2 | 3 |

#### SLA Bucket C (Weekly Backlog) — Remaining 19

| Rank | Account | ID | Type | Priority | Score | Signal | Leaders | News |
|---|---|---:|---|---:|---:|---:|---:|---:|
| 26 | Wayflyer | 132 | ICP | 2 | 16 | 4 | 0 | 1 |
| 27 | Lendistry | 176 | ICP | 2 | 16 | 4 | 0 | 1 |
| 28 | Barclays Advance | 46 | ICP | 3 | 15 | 6 | 1 | 2 |
| 29 | Dexly Finance | 9 | ICP | 3 | 14 | 4 | 1 | 2 |
| 30 | Cardiff | 115 | ICP | 2 | 12 | 0 | 0 | 0 |
| 31 | Revenued | 116 | ICP | 2 | 12 | 0 | 0 | 0 |
| 32 | ARF Financial | 118 | ICP | 2 | 12 | 0 | 0 | 0 |
| 33 | NewCo Capital Group | 131 | ICP | 2 | 12 | 0 | 0 | 0 |
| 34 | SellersFi | 138 | ICP | 2 | 12 | 0 | 0 | 0 |
| 35 | Alternative Funding Group | 139 | ICP | 2 | 12 | 0 | 0 | 0 |
| 36 | SBG Funding | 145 | ICP | 2 | 12 | 0 | 0 | 0 |
| 37 | Backd Business Funding | 146 | ICP | 2 | 12 | 0 | 0 | 0 |
| 38 | Nav | 175 | ICP | 2 | 12 | 0 | 0 | 0 |
| 39 | Accion Opportunity Fund | 177 | ICP | 2 | 12 | 0 | 0 | 0 |
| 40 | Grameen America | 178 | ICP | 2 | 12 | 0 | 0 | 0 |
| 41 | Torro | 180 | ICP | 2 | 12 | 0 | 0 | 0 |
| 42 | Uplyft Capital | 185 | ICP | 2 | 12 | 0 | 0 | 0 |
| 43 | Onramp Funds | 186 | ICP | 2 | 12 | 0 | 0 | 0 |
| 44 | Fox Business Funding | 193 | ICP | 2 | 12 | 0 | 0 | 0 |

Operational notes:
1. Sequence gate: do not launch full outbound for Bucket A/B until at least one validated RICP record exists.
2. Validation minimum: name, normalized title, source URL, verification date, confidence.
3. Promotion rule: any Bucket C account with fresh high-intent signal moves to Bucket A in next daily run.

---

## Part 8: Data Enrichment Program (Primary Focus - 80%)

### Objective

Build a reliable enrichment system that improves:
1. Meeting-booked rate (BDR + marketing outbound)
2. Meeting-to-SQL conversion (AE handoff quality)

### Enrichment Streams (Execution Order)

#### Stream 1: Buyer-Coverage Enrichment (RICP + Adjacent Committee)
Scope:
1. Core roles: COO, CRO/credit-risk, underwriting owner.
2. Adjacent roles: CFO, Head of Credit, VP Risk, Head of Ops.

Exit criteria:
1. Top 25 accounts: >=95% have at least one validated core RICP.
2. Priority cohort: >=85% have at least one validated core RICP.
3. Active SQO accounts: >=2 decision-thread contacts each.

#### Stream 2: Contactability Enrichment (Reachability)
Scope:
1. Add and verify work email, direct phone, LinkedIn URL.
2. Add deliverability/reachability confidence score.
3. Add preferred channel hint (`email`, `linkedin`, `phone`, `event`).

Exit criteria:
1. Top 25 accounts: >=80% have at least one high-confidence channel.
2. Bounce-risk segment is explicitly tagged and excluded from aggressive sequencing.

#### Stream 3: Intent + Signal Enrichment (Why Now)
Scope:
1. Capture fresh triggers: funding, leadership, hiring, new product, partnership, compliance/regulatory moves.
2. Add signal recency bucket: `0-7d`, `8-30d`, `31-90d`, `stale`.
3. Attach signal-to-persona relevance note (which role should care and why).

Exit criteria:
1. Every top 25 account has at least one persona-relevant signal in last 90 days.
2. Daily queue uses signal recency + fit + RICP coverage state.

#### Stream 4: Messaging-Asset Enrichment (Execution Readiness)
Scope:
1. Role-specific pain points (COO, CRO, underwriting).
2. Evidence-backed personalization hooks.
3. CTA templates by stage (`cold`, `warm`, `post-event`, `re-engage`).

Exit criteria:
1. Each top-priority account has at least 3 role-specific hooks and 2 CTA variants.
2. BDR can launch a first-touch without manual research.

### Enrichment Record Contract (Minimum Required Fields)

For each enriched contact/persona:
1. `name`
2. `title_raw`
3. `title_normalized`
4. `functional_role` (`operations` | `risk` | `underwriting` | `finance`)
5. `linkedin_url` (if available)
6. `email` / `phone` with confidence
7. `source_urls[]`
8. `verified_at` (UTC date)
9. `confidence` (`high` | `medium` | `low`)
10. `last_reviewed_at`

### Weekly Operating Plan (Next 6 Weeks)

Week 1:
1. Close Bucket A (top 10 no-RICP) and re-rank daily.
2. Backfill verification metadata for newly added personas.

Week 2:
1. Close Bucket B (next 15).
2. Add contactability confidence and channel hints.

Week 3:
1. Reduce remaining no-RICP backlog by at least 30%.
2. Add persona-relevant trigger notes for top 25.

Week 4:
1. Complete top 25 to >=95% validated RICP coverage.
2. Ensure >=80% top 25 reachability via high-confidence channel.

Week 5:
1. Push cohort-wide coverage to >=80%.
2. Add role-specific messaging assets for all top 40 ranked accounts.

Week 6:
1. Push cohort-wide coverage to >=85%.
2. Compare enriched vs non-enriched conversion deltas (meeting and SQL).

### Role-Specific Outputs

BDR output:
1. Daily ranked account queue with validated target persona and channel.
2. Ready-to-send personalization hooks and CTA by role.

AE output:
1. Multi-thread map per active account.
2. Coverage-gap alerts before discovery/demo calls.

Marketing output:
1. Segment lists by sub-vertical + signal + persona coverage state.
2. Campaign audiences with minimum data quality threshold.

### Metrics Dashboard (Data-Enrichment-Specific)

Leading metrics:
1. RICP coverage %
2. Reachability coverage %
3. Verification freshness (median days since verification)
4. Accounts blocked by sequence gating

Lagging metrics:
1. Meeting-booked rate by coverage state (`missing`, `partial`, `validated`)
2. Meeting-to-SQL conversion by coverage state
3. Campaign-attributed meetings by enriched segment

### Further Data-Enrichment Upgrades (Next Layer)

1. Build a full **Top-44 Account Enrichment Playbook**:
   - one row per account with missing role, target source set, owner, SLA, and QA status.
2. Publish a strict **Enrichment Schema Contract**:
   - required fields, enums, and validation blockers before records become outbound-ready.
3. Standardize a **Confidence Scoring Model**:
   - deterministic scoring for source trust, recency, and cross-source agreement.
4. Enforce **Freshness and Re-Verification Policy**:
   - tiered re-check cycles (for example 30/60/90 days) by account priority.
5. Add **Entity Resolution and Dedupe Policy**:
   - canonical company identity, alias map, and person-level identity normalization.
6. Expand **Role-Specific Messaging Asset Coverage**:
   - COO/CRO/underwriting messaging packs aligned to signal type and funnel stage.
7. Add **Weekly Enrichment Ops Dashboard**:
   - coverage, stale-data %, reachable-contact %, blocked sequences, and SLA breaches.
8. Implement **Causal Uplift Measurement**:
   - compare enriched vs non-enriched cohorts for meetings booked and SQL conversion.
9. Create **Claude Implementation Handoff Pack**:
   - prioritized tasks, expected outputs, and acceptance tests for parallel execution.
10. Add **30-Day Execution Calendar**:
   - day-level ownership, output targets, and weekly checkpoint reviews.

### API-Driven Financial Enrichment Pipeline

Automated financial data enrichment via government and commercial APIs, integrated as Kiket tool endpoints.

#### Phase 1: Free Government APIs (Shipped — v3.1.92)

| Source | Endpoint | Data | Cost |
|--------|----------|------|------|
| FDIC BankFind | `/api/tools/fdic?name=<bank>` | Assets, deposits, loans, net income, ROA/ROE, efficiency ratio | Free |
| SEC EDGAR | `/api/tools/sec?name=<company>` | Revenue, net income, total assets, liabilities, equity (10-K annual) | Free |
| SBA 7(a) Data | `/api/tools/sba?name=<lender>` | Loan count, total volume, avg loan size, fiscal year | Free |

**Usage**: Kiket auto-queries these when asked about bank size, company financials, or SBA lending. Results supplement EventIQ company profiles.

#### Phase 2: Low-Cost Commercial APIs ($0-100/mo)

| Source | Data | Cost | Priority |
|--------|------|------|----------|
| People Data Labs | Revenue ranges, founding year, tech stack | 100 free/mo, then $0.10/record | High — fills revenue gaps |
| Apollo.io | Contact emails, direct phones, firmographics | 100 free credits/mo | High — improves reachability |
| Financial Modeling Prep | Public company financials (cleaner than raw XBRL) | $19/mo | Medium — if SEC EDGAR parsing insufficient |

#### Phase 3: Mid-Tier APIs ($100-500/mo)

| Source | Data | Cost | Priority |
|--------|------|------|----------|
| Diffbot Enhance | Live web extraction, structured company data | ~$300/mo | Medium — real-time enrichment |
| BuiltWith | Tech stack detection (CRM, LOS, servicing platforms) | One-time batch ~$200 | Medium — identifies tech competitors |

#### Phase 4: Strategic APIs (>$500/mo, revenue-justified)

| Source | Data | Cost | Priority |
|--------|------|------|----------|
| PredictLeads | Hiring signals, job postings, growth indicators | ~$6K/yr | Low — when signal pipeline is mature |
| Middesk UCC API | UCC lien filings, active lending proof | Custom pricing | Low — when funder verification needed at scale |
| OpenCorporates | Founding year, registered agent, subsidiary mapping | ~$2.8K/yr | Low — when entity resolution needed |
| ZoomInfo | Full contact + firmographic database | $15K+/yr | Very low — only when revenue justifies |

---

## Part 9: $3M Pipeline Execution Plan

### The Goal

**$3M qualified pipeline in 12 months.** At typical MCA/fintech deal sizes ($50K-$300K ARR), this means 10-60 new qualified opportunities, or 1-5 per month. Very achievable — but only if EventIQ becomes a daily execution tool, not just a research repository.

### Core Problem

EventIQ generates excellent intelligence (icebreakers, hooks, talking points, leadership profiles) but doesn't close the last mile from "I know what to say" to "I said it and tracked it." The 959 researched companies with deep leadership profiles are the moat — the question is how fast reps convert that research into meetings.

### What Moves Pipeline (Prioritized Build Order)

#### Priority 1: Contact Enrichment for Top 68 Accounts (Week 1-2)
**Why:** You can't book meetings without contact info. The tool has names, titles, LinkedIn URLs, and backgrounds but no verified email addresses or phone numbers.

- Enrich all SQO/Client/ICP accounts with verified work emails + direct dials
- Store with confidence scores so reps know what's safe to email
- Gate outbound sequences on having at least one high-confidence channel

#### Priority 2: One-Click Outreach from Company Detail (Week 2-3)
**Why:** Reps read the research then switch to Gmail/LinkedIn to compose from scratch. This kills the workflow.

- **"Draft Email" button** → opens Gmail compose with pre-populated subject + body using icebreaker + talking points + ask
- **"Open LinkedIn" button** → opens leader's LinkedIn profile (URLs already exist)
- **"Copy Talking Points" button** → clipboard-ready blurb for call prep
- **Estimated impact:** Save 15-20 min per outreach touch

#### Priority 3: HubSpot Bidirectional Sync (Week 3-5)
**Why:** Pipeline tracked in EventIQ localStorage doesn't help leadership see it. Pipeline in HubSpot doesn't inform EventIQ's daily queue.

- **EventIQ → HubSpot:** Push pipeline stage changes, engagement logs, meeting notes
- **HubSpot → EventIQ:** Pull deal stage, last activity date, owner assignments
- Existing foundation: `hubspot-sync.js` and `hubspot-client.ts`

#### Priority 4: Automated Daily Operations (Week 2-4, parallel)
**Why:** Research decays. Reps need a daily push to act on fresh signals.

- **Morning Briefing Email (7 AM UTC weekdays):** Top 5 companies to work today, fresh news triggers, stale deal warnings, quick wins — sent via Resend to @hyperverge.co users
- **Signal Ingestion Cron (8 AM UTC daily):** Google News + Bing News + deBanked RSS automatic ingestion into `company_news` table
- **Weekly Research Refresh (Monday 6 AM UTC):** Re-research top 100 accounts for news, leadership changes, funding events

#### Priority 5: Chrome Extension (Week 5-8, pending user input)
**Why:** Meet reps where they already work — LinkedIn and Gmail.

- **LinkedIn sidebar:** Shows EventIQ research for the person/company they're viewing
- **Gmail compose helper:** Suggests personalized opener based on hooks + recent news
- **Holding for:** User has an existing solution to share; will build on top of it

### What to Deprioritize

These are documented in improvements.md but should NOT be built before the above:

| Item | Why Deprioritize |
|------|-----------------|
| A/B/n message experimentation (IMP-021) | Need outreach volume first before testing variants |
| Deterministic confidence scoring model (IMP-038) | Simple high/medium/low is sufficient at current scale |
| Enrichment uplift measurement framework (IMP-043) | Academic — you'll feel the uplift in meetings booked |
| Signal graphs + intent scoring v2 (IMP-019) | Series A feature; basic scoring works fine |
| Demand gen control tower (IMP-023) | Premature — team is <5 people |
| Most bugs (BUG-001 through BUG-012) | Edge cases that don't affect pipeline generation |

**Exceptions — bugs that DO matter for pipeline:**
- BUG-003 (document access) — matters for multi-user
- BUG-006 (sync conflicts) — matters for cross-device use
- BUG-013 (briefing excludes pipeline companies) — directly affects daily queue
- BUG-015 (missing RICP contacts) — blocking outreach

### API & Tool Stack

#### Contact Enrichment

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Apollo.io (Pro)** | Primary email/phone finder, 210M contacts | $79/mo | Best coverage for MCA/fintech vertical, already in stack |
| **Hunter.io (Starter)** | Email verification, domain search | $49/mo | <1% bounce rate, good for verification layer |
| **RocketReach** | Backup email/phone, 700M profiles | $80/mo | 90-98% deliverability, fills Apollo gaps |
| **Cognism** | Direct dials (phone-verified mobile) | ~$200+/mo | Diamond Data for phone outreach, GDPR-safe |

**Recommended starter stack:** Apollo + Hunter ($128/mo). Add RocketReach if Apollo coverage gaps emerge.

#### Company Intelligence & News

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Tavily** | AI-native web search for research agents | $30/mo | Purpose-built for LLM pipelines, already in stack |
| **GNews API** | News monitoring, full article content | ~$50/mo | History from 2020, good for MCA news |
| **Brave Search API** | Backup web search, 35B page index | $5/1K queries | Independent index, good for deep research |
| **Contify** | Curated company-specific intelligence | Custom | 1M+ sources, company-matched (evaluate if budget allows) |
| **NewsAPI.ai** | Real-time event detection (funding, hiring, M&A) | Custom | Structured signal types, not just keyword matching |

**Recommended starter stack:** Tavily + GNews ($80/mo). Add Brave for research depth.

#### Podcast & Content Intelligence

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Podchaser API** | 16M+ creator/guest credits, podcast appearances | Custom | Only source for "who appeared on which podcast" — great for hooks |
| **Pod Engine API** | Transcripts, sponsors, guest data, 20+ data points | $100+/mo | Powerful for finding executive speaking appearances |
| **ListenNotes API** | 4M+ podcasts, episode search | Free-$99/mo | Good for discovery, cheaper than Podchaser |

**Recommended:** Podchaser or ListenNotes for discovering executive podcast appearances → excellent conversation hooks.

#### Workflow & Enrichment Orchestration

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Clay.com** | Waterfall enrichment across 150+ providers | $134-720/mo | Checks multiple providers sequentially, stops when found |

**Recommendation:** Evaluate Clay only if managing multiple enrichment sources becomes complex. At current scale, direct API integration is simpler and cheaper.

#### Email Delivery & Notifications

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Resend** | Transactional email (briefings, alerts) | Free-$20/mo | Built for Vercel/Next.js, React Email templates, 3K free emails/mo |
| **Slack Incoming Webhooks** | Real-time alerts (signal triggers, cron failures) | Free | Already used by most sales teams |

#### Search & Research APIs

| Tool | Purpose | Pricing | Why |
|------|---------|---------|-----|
| **Serper** | Google SERP results for agent research | $50/mo | Cheapest Google wrapper, $0.30-2/1K requests |
| **Firecrawl** | Website scraping + extraction for LLM | $16+/mo | Good for scraping company team pages |

### Total Recommended Monthly Spend

| Tier | Tools | Monthly Cost |
|------|-------|-------------|
| **Starter** | Apollo + Hunter + Tavily + GNews + Resend | ~$240/mo |
| **Growth** | + RocketReach + Brave + ListenNotes + Serper | ~$470/mo |
| **Scale** | + Cognism + Podchaser + Clay | ~$1,000-1,500/mo |

Start with Starter tier. Graduate to Growth when outbound volume exceeds 100 touches/week.

### Automated Daily Operations Architecture

```
┌─────────────────────────────────────────────────────┐
│                 VERCEL CRON JOBS                      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  6:00 AM UTC Mon    /api/cron/research-refresh        │
│  ├─ Identify stale companies (>30 days, priority 1st) │
│  ├─ Web search for fresh news + leadership changes    │
│  └─ Update company_news + all-companies.json          │
│                                                       │
│  8:00 AM UTC Daily  /api/cron/ingest-signals          │
│  ├─ Google News (P0/P1 companies + industry keywords) │
│  ├─ Bing News (if API key configured)                 │
│  ├─ deBanked RSS (full company matching)              │
│  └─ Classify signals + update company_news table      │
│                                                       │
│  7:00 AM UTC M-F    /api/cron/send-briefing           │
│  ├─ Compute outreach scores for all companies         │
│  ├─ Get top 10 by score + recent signals              │
│  ├─ Include: triggers, stale warnings, quick wins     │
│  ├─ Render HTML email template                        │
│  └─ Send via Resend to @hyperverge.co users           │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### Success Metrics

| Metric | Baseline | 90-Day Target | 12-Month Target |
|--------|----------|---------------|-----------------|
| Qualified pipeline | $0 | $500K | $3M |
| Meetings booked/month | ~2 | 8-10 | 15-20 |
| Outbound touches/week/rep | ~20 | 50+ | 80+ |
| RICP coverage (top 68) | 35% | 85% | 95% |
| Contact email coverage (top 68) | ~10% | 80% | 95% |
| Daily EventIQ active users | 1 | 3-5 | 5-8 |
| Morning briefing open rate | N/A | 60%+ | 70%+ |
| Time from research to first touch | Days | <4 hours | <1 hour |

---

## Changelog
- **2026-02-22**: Combined ROADMAP.md and ROADMAP_V2.md into single document. Added engineering phases referencing bugs.md and improvements.md.
- **2026-02-23**: Added Part 6 top-of-funnel acceleration program with BDR/AE/marketing/demand-gen pillars, external benchmark anchors, 90-day waves, and Claude handoff protocol.
- **2026-02-23**: Added Part 9 — $3M pipeline execution plan with prioritized build order, API stack recommendations, automated daily operations architecture, and success metrics.

## Part 10: Attention Capture System (Top-of-Funnel Execution Layer)

### Why This Exists

The highest-leverage gap is no longer raw research volume. EventIQ already has meaningful coverage in RICP classification, enrichment QA, task generation, sequence progression, HubSpot sync, and pipeline weighting. The next constraint is attention: getting the right target to notice, respond, and book.

This section focuses on the execution primitives that move a priority account from "researched" to "engaged":

`right account + right person + right reason + right channel + right moment`

The initiatives below are limited to the top-of-funnel attention system. They do not replace existing pipeline math; they sit on top of it and convert research into first meetings.

### Current Product Baseline (Already Present in Code)

The following capabilities already exist and should be treated as foundation, not new work:

- **RICP role detection and gap finding** via `eventiq/src/lib/ricp-taxonomy.ts` and `eventiq/src/app/api/ricp-gaps/route.ts`
- **Enrichment readiness states** (`blocked`, `review`, `ready`) via `eventiq/src/lib/enrichment-qa.ts`
- **Marketing prioritization / RICP research queue** via `eventiq/src/components/marketing-ideas-tab.tsx`
- **Daily task queue and per-account next-step surfacing** via `eventiq/src/components/task-queue-tab.tsx` and `eventiq/src/lib/task-queue-helpers.ts`
- **Sequence logic** via `eventiq/src/lib/sequence-helpers.ts`
- **HubSpot sync layer** via `eventiq/src/app/api/hubspot/sync/route.ts`

The new work below should reuse these surfaces rather than creating parallel systems.

### North Star Outcome

Increase attention and response on priority accounts so EventIQ consistently drives more:

- first replies
- positive replies
- meetings booked
- meetings held
- SQLs created

This is the correct upstream system for the 12-month pipeline target. If attention quality improves, pipeline volume follows.

### Selected Initiatives (Priority Scope)

#### Initiative 1: Why-Now Engine

**Goal:** Turn raw account signals into a usable reason to contact a company today.

**What it should produce per company:**
- `why_now`
- `signal_summary`
- `suggested_angle`
- `urgency_score`
- `signal_expiry_window`

**Examples of source triggers:**
- funding events
- executive hires or departures
- product launches
- underwriting/risk hiring
- compliance or regulatory developments
- new partnerships
- expansion into new markets

**Why it matters:** Data without a time-sensitive reason creates generic outbound. This system converts research into a concrete opening angle.

#### Initiative 2: Persona-Specific Hook Generator

**Goal:** Translate the same company signal into role-specific copy for `COO`, `CRO`, `Underwriting`, and adjacent buyers.

**What it should produce per target persona:**
- `pain_hypothesis`
- `opening_line`
- `proof_angle`
- `cta`
- `message_variant_by_channel`

**Design principle:** The app should not stop at "here is the person." It should answer "what should I say to this specific person, given this signal?"

#### Initiative 3: Reachability + Contactability Score

**Goal:** Rank who is practically reachable right now, not just who is relevant.

**What it should score:**
- work email presence and verification quality
- phone/direct dial presence
- LinkedIn presence
- recency of verification
- source confidence
- number of usable channels

**Primary use:** Help BDRs avoid wasting time on theoretically good accounts with no viable path to contact.

#### Initiative 4: Account Briefing Card

**Goal:** Give a rep a one-screen, execution-ready brief before first outreach.

**What it should include:**
- company summary
- current why-now trigger
- recommended target people
- recommended hook by persona
- recommended first channel
- prior engagement summary
- objections or sensitivity notes

**Why it matters:** This removes the gap between "I have research" and "I am ready to send the first touch."

#### Initiative 5: Channel Recommendation Layer

**Goal:** Decide the best first-touch channel for each account/person combination.

**Candidate channels:**
- email
- LinkedIn
- call
- gifting
- event invite

**Decision inputs:**
- persona seniority
- contactability score
- signal strength and recency
- prior non-response history
- account tier
- campaign context

**Output:** `recommended_channel`, `backup_channel`, and a short reason for the recommendation.

#### Initiative 6: Campaign Playbooks For Attention

**Goal:** Standardize the proven top-of-funnel plays so teams can repeat what works.

**Initial playbook set:**
- executive gifting play
- conference / event follow-up play
- trigger-based outbound play
- dormant-account reactivation play
- competitor-displacement play
- new-risk-leader play

**Each playbook should define:**
- target account type
- target persona(s)
- required trigger(s)
- sequence steps
- channel mix
- message framework
- expected meeting-rate benchmark

**Why it matters:** This converts ad hoc rep intuition into a reusable operating system for attention.

#### Initiative 8: Engagement Memory

**Goal:** Preserve outreach context so the next touch is informed, not repetitive.

**What it should remember:**
- prior messages
- prior replies / no replies
- opens or engagement signals (if available)
- prior meetings booked / no-show outcomes
- gifts sent
- events attended
- cooling-off windows / suppression flags

**Why it matters:** Reps need continuity. Attention quality degrades when the system forgets what has already happened.

#### Initiative 9: Attention Score

**Goal:** Create a single operational score that ranks which accounts deserve attention now.

**Core score inputs:**
- ICP fit
- RICP completeness
- why-now urgency
- contactability
- engagement memory
- channel readiness

**Primary use cases:**
- daily rep prioritization
- marketing air-cover prioritization
- manager review of where effort should go this week

**Important distinction:** This is not a late-stage pipeline EV metric. It is an upstream ranking metric for top-of-funnel execution.

### System Design Principles

1. **Reuse current foundations**
- Build on existing RICP, QA, task queue, and sequence logic.
- Avoid introducing a second prioritization system that conflicts with current task generation.

2. **Keep outputs operational**
- Every new feature should end in a usable rep action:
- who to contact
- why now
- what to say
- which channel to use

3. **Prefer explicit data fields over hidden prompts**
- Store reusable structured outputs (`why_now`, `recommended_channel`, `attention_score`) so they can be audited, ranked, and improved.

4. **Optimize for response, not just activity**
- Success metrics should reward attention captured, not volume of touches.

### Suggested Rollout Order (Execution Sequence)

#### Phase 1: Signal and Reachability Foundation
- Why-Now Engine
- Reachability + Contactability Score
- Engagement Memory data model

#### Phase 2: Rep Execution Layer
- Persona-Specific Hook Generator
- Account Briefing Card
- Channel Recommendation Layer

#### Phase 3: Team-Scale Operating System
- Campaign Playbooks For Attention
- Attention Score
- Task queue ranking updates based on attention score

### Top-of-Funnel Success Metrics

Track these before pipeline:

- reply rate
- positive reply rate
- meeting-booked rate
- meeting-held rate
- average time from new signal to first touch
- % of priority accounts with a valid why-now reason
- % of priority contacts with at least one high-confidence reachable channel
- % of rep tasks backed by a channel recommendation

### 90-Day Outcome Target

Within 90 days of shipping this layer:

- every top-tier account should have a current why-now reason or be explicitly marked stale
- every outreach-ready target should have a contactability score and recommended first channel
- reps should be able to open one account brief and send a first touch without leaving the recommended workflow
- gifting and event-driven plays should become first-class, trackable operating motions

### Implementation Note

This section is intentionally scoped to product direction and operating requirements. The detailed build plan, data contracts, UI changes, and sequencing are specified in `TOP_OF_FUNNEL_ATTENTION_IMPLEMENTATION.md`.

## Part 11: Revenue Certainty Plan — $1M Baseline / $3M Stretch (Research-Backed)

> Added 2026-03-02. Based on 3 rounds of competitive intelligence and GTM research. Full research documents: `AI-CRM-SALES-PLATFORMS-RESEARCH.md`, `PIPELINE-REVENUE-RESEARCH.md`, `GTM-ROUND2-RESEARCH.md`.

---

### What We Learned: Competitive Landscape

#### AI CRM / Sales Platform Findings (12+ Platforms Analyzed)

| Platform | Strength | Weakness | Relevance to Us |
|----------|----------|----------|-----------------|
| **Attio** ($116M raised) | AI-native CRM, flexible data model, $0-$119/user | Ceiling at 50 employees, no marketing features | Proves AI-native CRM wins startups; we have deeper vertical intelligence |
| **Salesforce Agentforce** | Massive distribution, 22K deals | 4 conflicting pricing models, 67% struggle with agent autonomy | Enterprise-only; validates agentic AI but proves it's hard to get right |
| **Artisan AI (Ava)** | AI SDR, 300M contacts, 80% task automation | 15% meeting-to-opp rate (vs 25% human), surface personalization | AI SDRs augment, don't replace. Our deep research = deeper personalization |
| **11x.ai (Alice)** | 24/7 operation, 100+ languages | $50K+/yr, many users report zero results, buggy | Cautionary tale: volume without quality fails |
| **Clay** | 150+ data sources, 80% match rates, waterfall enrichment | Requires technical skill, credit costs add up | We already have Apollo + enrichment pipeline; Clay is overkill at our scale |
| **Gong** | Gold standard conversation intelligence, 300+ signals | $1,298-$3K/user/yr + $5-50K platform fee | Too expensive for us; validates that capturing interactions = moat |
| **Apollo.io** | 210M contacts, $49-$119/user, best value ratio | Data accuracy issues, confusing credits | Already in our stack; keep as primary enrichment source |

#### The Big Insight: EventIQ's Unfilled Whitespace

**None of these platforms address:**
- Event/conference attendee intelligence and prep
- Deep private-company research for niche verticals
- Signal-based selling combined with in-person meeting prep
- Offline mobile access for event-day execution
- Multi-threading via event attendee data (multiple people from same company at a conference)

**What this means:** EventIQ isn't competing with Attio or Gong — it's creating a new category: **Vertical Intelligence + Signal-Based Execution for defined-TAM markets.** The closest comparison is Clay + 6sense + Sendoso combined, but purpose-built for a single vertical.

#### AI Sales Benchmarks That Matter

| Benchmark | Number | Source |
|-----------|--------|--------|
| AI-augmented reps: revenue per rep | $1.75M vs $1.24M (+41%) | Optifai, N=938 |
| AI teams quota attainment | 3.7x more likely | Cirrus Insight |
| Hybrid (AI + human) win rates | +43% higher | Industry composite |
| Signal-based reply rates | 10-18% (vs 3.4% cold) | Autobound, Demandbase |
| Signal-based conversion improvement | +47% better conversion, +43% larger deals | Aggregate B2B data |
| Multi-threading win rate boost | +130% for deals >$50K | Gong, 1.8M opportunities |
| Gifting meeting rate boost | 3.08x | Sendoso |
| Event follow-up (within 48h) | 60% more likely to convert | Industry composite |
| First responder advantage | 5x more likely to win | Speed-to-lead research |

---

### The Pipeline Math: Absolute Certainty Model

#### Our Specific Numbers

| Parameter | Value | Basis |
|-----------|-------|-------|
| Total target accounts | 1,000 | Supabase companies table |
| Contacts per account | ~3 (leaders + contacts) | Current dataset: ~1,437 leaders + contacts |
| Total reachable contacts | ~3,000 | Dataset reality |
| Priority accounts (SQO/Client/ICP) | 68 | P0-P3 in current data |
| Companies with deep research | 959 | Current research coverage |

#### Revenue Model: $1M Baseline (Moderate Assumptions)

```
Target: $1M revenue
Average deal size: $30K ACV
Deals needed: 34
Win rate (qualified): 25%
Qualified opps needed: 136 ($4M pipeline)
Meeting-to-opp rate: 55%
Meetings needed: 247
Reply-to-meeting rate: 25%
Replies needed: 988
Reply rate (signal-based): 12%
Total contacts to reach: 8,233 outreach touches
→ ~3,000 contacts × ~3 touches each over 12 months
```

**Verdict: ACHIEVABLE.** Each contact gets ~3 multi-channel touches per year. This is within best-practice cadence (12 touches/22 days per sequence, multiple sequences per year).

#### Revenue Model: $3M Stretch (Balanced Scaling)

You don't 3x by tripling any single lever. You combine modest gains across all levers:

```
$3M = 1.4x more pipeline × 1.3x higher conversion × 1.6x bigger deals

Target: $3M revenue
Average deal size: $48K ACV (push into mid-market lenders)
Deals needed: 63
Win rate (qualified): 32% (improved via multi-threading + gifting)
Qualified opps needed: 197 ($9.5M pipeline)
Meeting-to-opp rate: 60%
Meetings needed: 328
Reply-to-meeting rate: 28%
Replies needed: 1,171
Reply rate (signal-based): 15% (improved via Why-Now Engine + event context)
Total contacts to reach: 7,807 outreach touches
→ ~3,000 contacts × ~2.6 touches each
```

**Verdict: ACHIEVABLE but requires:**
1. Team scaled to 6-8 people (2-3 AEs, 2 SDRs, CS, RevOps)
2. Average deal size pushed from $30K to $48K (add larger lenders to pipeline)
3. Gifting + event plays systematically executed
4. 18-24 months timeline from standing start

---

### What v3.1.89 Already Delivers (Revenue Engine — Just Shipped)

| Capability | Status | Impact |
|------------|--------|--------|
| **Why-Now Engine** | SHIPPED | Per-company signal scoring (0-10) with recency decay + outreach angle generation |
| **Attention Score** | SHIPPED | 6-dimension composite (ICP Fit, RICP, Why-Now, Contactability, Engagement, Channel) |
| **10 Campaign Playbooks** | SHIPPED | cold, warm, re-engage, post-demo + 6 new (event-follow-up, referral-intro, case-study, pain-trigger, executive-briefing, renewal-upsell) |
| **RICP Auto-Enrichment** | SHIPPED | Daily cron fills missing RICP roles via Apollo API |
| **Signal→Task Pipeline** | SHIPPED | Hot signals (Why-Now ≥7) auto-generate prioritized tasks |
| **Smart Morning Briefing** | SHIPPED | Email ranked by Attention Score with Why-Now angles + RICP coverage |
| **Enhanced Outreach** | SHIPPED | Why-Now callout, Full Brief copy, mailto links |
| **Outplay Integration** | SHIPPED | UI to add prospects to Outplay sequences from company detail |
| **Command Center** | SHIPPED | Attention score ranking, RICP coverage, attention distribution |

#### What's Still Missing (Gaps Between Built and $1M)

| Gap | Impact | Priority | Effort |
|-----|--------|----------|--------|
| **Verified contact emails** for top 68 accounts | Can't send outreach without emails | P0 | 2 weeks |
| **HubSpot bidirectional sync** | Pipeline invisible to leadership | P1 | 2 weeks |
| **Event follow-up automation** (48h post-event sequences) | Events generate 33% of new business | P1 | 1 week |
| **Gifting integration** (Sendoso API) | 3.08x meeting rate, 15x ROI | P1 | 2 weeks |
| **LinkedIn Chrome extension** | Meet reps where they work | P2 | 4 weeks |
| **Multi-threading view** (show all contacts per account) | 130% win rate boost for >$50K deals | P1 | 1 week |
| **MCA industry podcast** | Authority building, warm introductions | P2 | Ongoing |
| **Quarterly industry report** | Lead generation, brand positioning | P2 | 2 weeks/quarter |
| **SOC 2 Type I** | Unblocks mid-market deals | P2 | 2-3 months |

---

### 12-Month Execution Calendar

#### Q1 (Months 1-3): Foundation + First Revenue

**Product:**
- [ ] Verify emails for top 68 accounts (Apollo + Hunter)
- [ ] HubSpot bidirectional sync (pipeline visibility)
- [ ] Multi-threading view (all contacts per account with roles)
- [ ] Event follow-up 48h auto-sequences
- [ ] Gifting integration (Sendoso/Postal API)

**Sales:**
- [ ] Founder sells first 10 deals personally
- [ ] Tier 1 (top 50 accounts) → 1:1 strategic ABM
- [ ] First SDR hire at month 2-3 ($80K OTE)
- [ ] Target: 15-20 meetings, 5-8 qualified opps, $150-240K pipeline

**Marketing:**
- [ ] Launch MCA industry podcast (guests = prospects)
- [ ] Publish first "State of MCA Intelligence" report using EventIQ data
- [ ] deBanked Connect follow-up (anyone we met → 48h sequence)

**Revenue target: $0-100K ARR (first 3-5 deals closing)**

#### Q2 (Months 4-6): Scale Outreach

**Product:**
- [ ] LinkedIn Chrome extension (sidebar showing EventIQ research)
- [ ] A/B message variant testing in sequences
- [ ] Campaign attribution tracking
- [ ] Begin SOC 2 Type I process (Vanta/Sprinto)

**Sales:**
- [ ] First AE hire ($160K OTE) if founder pipeline exceeds capacity
- [ ] Expand to Tier 2 (200-300 accounts) with semi-personalized sequences
- [ ] Gifting play for top 50 accounts ($5K budget → $75K+ pipeline at 15x ROI)
- [ ] Target: 30-40 meetings/quarter, 15-20 new qualified opps, $600-900K cumulative pipeline

**Marketing:**
- [ ] Podcast → 12 episodes, each creates LinkedIn content + email snippets
- [ ] Event presence at Broker Fair / Funders Forum (if timing aligns)
- [ ] Case study from first 3-5 customers

**Revenue target: $200-400K ARR (8-15 cumulative deals)**

#### Q3 (Months 7-9): First Deals Closing + Expansion

**Product:**
- [ ] SOC 2 Type I complete (unblocks mid-market deals)
- [ ] Revenue analytics dashboard (rep activity, pipeline velocity, win/loss)
- [ ] Engagement memory (prevent repetitive outreach)
- [ ] Calendar integration (auto-push briefs 30 min before meetings)

**Sales:**
- [ ] Second SDR if first is hitting quota (12+ meetings/month)
- [ ] Full coverage of Tier 1+2 (350+ accounts actively worked)
- [ ] Multi-threading execution: 3+ contacts per Tier 1 account
- [ ] Target: $1M-$1.5M active pipeline, 5-10 deals closed ($150-300K revenue)

**Revenue target: $500-700K ARR (15-25 cumulative deals)**

#### Q4 (Months 10-12): Acceleration + NRR

**Product:**
- [ ] Begin SOC 2 Type II observation period
- [ ] API for research-as-a-service
- [ ] Demand gen control tower (segment builder, campaign ops)
- [ ] Weekly "what changed" digest for GTM leadership

**Sales:**
- [ ] Customer success hire to protect existing revenue (NRR >100%)
- [ ] RevOps part-time to optimize funnel
- [ ] Push deal sizes up: target mid-market lenders ($50K+ ACV)
- [ ] Target: $2M-$3M cumulative pipeline, 25-35 total deals

**Revenue target: $800K-$1.2M ARR**

---

### Hiring Plan: $1M Path

| Role | When | OTE | Expected Output |
|------|------|-----|-----------------|
| **Founder** (0.5 FTE selling) | Now | $0 incremental | $300-500K ARR, prove playbook |
| **SDR #1** | Month 2-3 | $80K | 12-15 qualified meetings/month |
| **AE #1** | Month 4-6 (when founder pipeline > capacity) | $160-180K | $500-800K ARR annually |
| **CS/AM** | Month 8-10 | $90-100K | Protect NRR, drive expansion |
| **Total Year 1 sales cost** | | **$330-360K** | **$800K-$1.3M ARR capacity** |

### Hiring Plan: $3M Path (Months 13-24)

| Role | When | OTE | Expected Output |
|------|------|-----|-----------------|
| **SDR #2** | Month 10-12 | $80K | +12 meetings/month |
| **AE #2** | Month 12-15 | $170K | +$500K ARR |
| **RevOps (part-time → full)** | Month 12 | $100K | Funnel optimization, +10-15% conversion |
| **VP Sales** | Month 18-24 (at $1M-$2M ARR) | $200-250K | Scale to $5M+ |
| **Total Year 2 sales cost** | | **$550-680K** | **$2-3M ARR capacity** |

---

### Tool Stack: Cost vs. Impact

#### Current (Already Deployed)

| Tool | Monthly Cost | Status |
|------|-------------|--------|
| Apollo.io (Pro) | $79 | Active — primary enrichment |
| Resend | $0 (free tier) | Active — morning briefings |
| Supabase | $25 | Active — database |
| Vercel | $20 | Active — hosting |
| **Total** | **$124/mo** | |

#### Q1 Additions (Unlock $1M path)

| Tool | Monthly Cost | Why |
|------|-------------|-----|
| Hunter.io (Starter) | $49 | Email verification (<1% bounce) |
| Sendoso (Starter) | ~$1,000 + gift costs | 15x ROI, 3.08x meeting rate boost |
| LinkedIn Sales Navigator | $80 | Required for Chrome extension + InMail |
| Vanta (SOC 2) | ~$500 | Start Type I process in parallel |
| **Q1 Total** | **~$1,753/mo** | |

#### Q2+ Additions (Scale to $3M path)

| Tool | Monthly Cost | Why |
|------|-------------|-----|
| Gong (or Fireflies) | $100-250/user | Conversation intelligence for deal coaching |
| Outplay (Growth) | $99/user | Sales engagement + sequencing |
| Tavily + GNews | $80 | Deep research + news monitoring |
| **Growth Total** | **~$2,200/mo** | |

---

### Risk Mitigation: What Could Prevent $1M

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Long sales cycles (90-180 days in fintech) | HIGH | H1 pipeline doesn't close until H2 | Start pipeline generation immediately; expect 2-quarter lag |
| Compliance/security review adds 2-5 months | MEDIUM | Deals stall in legal/procurement | Pre-build security questionnaire + pen test report; start SOC 2 Type I early |
| Small TAM = can't burn accounts | HIGH | Bad outreach poisons future opportunities | Every touch must be high quality; signal-based only, no generic blasts |
| Only 27% of reps hit quota | MEDIUM | First AE hire may underperform | Founder continues selling alongside AE; don't fully delegate until playbook is proven |
| MCA companies used to paying less for software | MEDIUM | Pushback on $30K+ ACV | Start with $18-24K ACV entry point; upsell to $36K+ as value proven |
| Key person dependency (small company) | HIGH | Single champion leaves → deal dies | Multi-thread every deal: 3+ contacts per account (Gong: +130% win rate) |

---

### Success Metrics: How We Know We're On Track

| Metric | Month 3 | Month 6 | Month 9 | Month 12 |
|--------|---------|---------|---------|----------|
| **Qualified pipeline** | $250K | $900K | $2M | $3M+ |
| **Closed ARR** | $0-50K | $200K | $500K | $1M |
| **Meetings booked/month** | 8-10 | 15-20 | 20-25 | 25-30 |
| **RICP coverage (top 68)** | 85% | 95% | 95% | 98% |
| **Email coverage (top 68)** | 80% | 95% | 95% | 98% |
| **Account coverage (all tiers)** | 20% | 50% | 80% | 100% |
| **Average deal size** | $24K | $28K | $32K | $35K |
| **Win rate (qualified)** | 20% | 23% | 25% | 28% |
| **Signal-to-first-touch (hours)** | <24h | <12h | <4h | <1h |
| **Multi-thread score (contacts/opp)** | 2 | 3 | 4 | 5+ |
| **Morning briefing open rate** | 50% | 65% | 70% | 75% |
| **NRR** | N/A | N/A | 100% | 110%+ |

---

### The Certainty Framework: What Makes $1M Inevitable

Based on all research, $1M revenue is **not a hope — it's a math problem**:

1. **The math works.** 34 deals at $30K ACV with 25% win rate requires 247 meetings from ~3,000 contacts touched ~3x. Signal-based outreach at 12% reply rate produces this volume.

2. **We have the data moat.** 959 deeply researched companies with leadership profiles, hooks, talking points, and icebreakers. No competitor has this for the MCA vertical.

3. **Signal-based selling is proven.** 47% better conversion, 43% larger deals, 38% more closed deals. EventIQ IS a signal-based selling platform — the Why-Now Engine + Attention Score + Signal→Task Pipeline (shipped in v3.1.89) operationalize this.

4. **Multi-threading is a force multiplier.** Gong data: +130% win rate with multi-threading on >$50K deals. EventIQ's event intelligence uniquely enables this by showing multiple attendees from the same company.

5. **Events are undervalued.** Events generate 33% of new business. 50% of buyers choose the first responder. EventIQ was literally built for this — the 48h follow-up automation is the highest-ROI feature we can ship.

6. **Gifting is a cheat code.** 15x ROI, 3.08x meeting rate. A $50K gift budget targeted at top 50 accounts generates $750K+ in closed-won revenue.

7. **The team is affordable.** Founder + 1 AE ($160K) + 1 SDR ($80K) = $240K total sales cost for $800K-$1.3M ARR capacity. Positive unit economics from day 1.

**What could prevent $1M:** Not execution risk — it's **speed** risk. The fintech sales cycle is 90-180 days. If pipeline generation doesn't start in Q1, revenue won't materialize until Q4 or spills into Year 2. The antidote is: **start yesterday, move fast, don't wait for perfect.**

---

## Changelog
- **2026-02-22**: Combined ROADMAP.md and ROADMAP_V2.md into single document. Added engineering phases referencing bugs.md and improvements.md.
- **2026-02-23**: Added Part 6 top-of-funnel acceleration program with BDR/AE/marketing/demand-gen pillars, external benchmark anchors, 90-day waves, and Claude handoff protocol.
- **2026-02-23**: Added Part 9 — $3M pipeline execution plan with prioritized build order, API stack recommendations, automated daily operations architecture, and success metrics.
- **2026-02-27**: Added Part 10 — Attention Capture System covering Why-Now Engine, persona hooks, contactability scoring, account briefing, channel recommendation, campaign playbooks, engagement memory, and attention scoring.
- **2026-03-02**: Added Part 11 — Revenue Certainty Plan based on 3 rounds of research: competitive intelligence (12+ AI platforms), pipeline math modeling, signal-based selling ROI, multi-threading data, gifting ROI, event follow-up timing, vertical SaaS pricing, and sales compensation benchmarks. Full research in `AI-CRM-SALES-PLATFORMS-RESEARCH.md`, `PIPELINE-REVENUE-RESEARCH.md`, `GTM-ROUND2-RESEARCH.md`.
