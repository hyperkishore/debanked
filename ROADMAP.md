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
