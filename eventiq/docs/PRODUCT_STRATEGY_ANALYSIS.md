# EventIQ Product Strategy Analysis

## Comprehensive Assessment for BDR, AE, and Demand Gen Personas

---

## 1. CURRENT STATE ASSESSMENT

### What EventIQ Is Today

EventIQ is a Next.js static site (GitHub Pages) serving as a market intelligence platform for HyperVerge's GTM team targeting the MCA/alternative lending vertical. Key facts:

- **1,021 companies** (4 SQO, 2 Client, 238 ICP, 575 TAM, 202 other)
- **476 leaders** with deep research (backgrounds, hooks, LinkedIn URLs)
- **Fully client-side** -- all data baked in at build time, user state in localStorage
- **No backend, no auth, no database** -- single-user by design
- **No real integrations** -- Google Sheets sync via Apps Script is the only external connection

### Feature Inventory

| Feature | Maturity | Used By |
|---------|----------|---------|
| Company database with search | Solid | All |
| Research quality scoring | Solid | Admin/PM |
| Persona detection from titles | Good | BDR/AE |
| Email/LinkedIn message drafts (3 variants each) | Good | BDR |
| Pre-call briefing with land mines | Good | AE |
| Battlecard objection handling | Good | AE |
| Multi-touch sequence templates (4 types) | Good | BDR |
| Engagement logging (6 channels, manual) | Functional | BDR/AE |
| Pipeline kanban (7 stages, drag-and-drop) | Functional | AE |
| Morning briefing (news triggers, stale warnings, quick wins) | Good | BDR |
| Outreach scoring and prioritization | Good | BDR |
| Account coverage / multi-threading map | Good | AE |
| Follow-up reminders with snooze | Functional | BDR/AE |
| Post-meeting sentiment capture (quick capture) | Good | BDR/AE |
| Google Sheets sync | Basic | Admin |
| Feedback widget | Basic | Internal |
| Dashboard analytics | Basic | Manager |

### Architecture Constraints

The architecture imposes fundamental limitations:

1. **No backend** -- Cannot store data across users, no APIs, no webhooks
2. **localStorage only** -- All engagement data, pipeline state, and follow-ups are trapped in one browser on one device
3. **Static build data** -- Company data is frozen at build time; no live enrichment
4. **No authentication** -- Cannot have user-specific views, permissions, or activity history
5. **No integrations** -- No CRM sync (HubSpot integration exists as a script but not live), no email tracking, no LinkedIn extension, no calendar

---

## 2. PERSONA ANALYSIS

### Persona 1: BDR (Business Development Rep)

**Goal:** Book meetings with decision-makers at target accounts in the MCA/alternative lending space.

**Daily Workflow:**
1. Open laptop, check what to work on today
2. Research 5-10 target accounts
3. Find decision-maker contacts (email, phone, LinkedIn)
4. Send personalized cold outreach (email + LinkedIn)
5. Follow up on previous outreach (replies, no-replies)
6. Track what was sent to whom and when
7. Log meetings booked
8. Report on activity metrics

**What EventIQ Currently Provides:**
- Morning briefing with "Today's Actions" -- news triggers, stale warnings, quick wins, top 5 priorities (good)
- Outreach score-based prioritization telling them who to reach first (good)
- Pre-written email drafts in 3 styles (formal, casual, news-hook) with copy buttons (good)
- Pre-written LinkedIn messages (connection request, InMail) (good)
- Multi-touch sequence templates (cold, warm, re-engage, post-demo) with timelines (good)
- Conversation hooks per leader for personalization (good)
- Company research (description, news, talking points, icebreakers) (good)
- Engagement logging dialog with channel/action/contact/notes (functional)
- Follow-up reminders with snooze (functional)

**What Is MISSING (Critical Gaps):**

| Gap | Impact | Priority |
|-----|--------|----------|
| **No contact email addresses or phone numbers** | Cannot execute outreach without leaving app to find contact info | P0 |
| **No email send/track integration** | Must copy message, switch to Gmail, paste, send -- no tracking of opens/clicks/replies | P0 |
| **No LinkedIn integration** | Must copy message, switch to LinkedIn, paste, send -- no tracking | P1 |
| **Data is trapped in localStorage** | If BDR switches browsers/devices or clears cache, all engagement history is lost | P0 |
| **No activity metrics/reporting** | Cannot report on emails sent, connections made, meetings booked this week | P1 |
| **No contact discovery** | Has names and titles but no emails; BDR must use Apollo/Lusha/RocketReach separately | P0 |
| **No calendar integration** | Cannot check availability or schedule meetings from the app | P1 |
| **No task queue** | Morning briefing shows priorities but no persistent task list that tracks completion through the day | P2 |
| **No A/B testing of messages** | Cannot know which email variant performs better | P2 |

**Specific Feature Recommendations for BDR:**

**P0: Contact Data Enrichment**
Add email and phone fields to the Leader/Contact schema. Either enrich via external APIs (Apollo, Hunter.io, RocketReach) at build time, or provide a UI that lets BDRs manually add contact info they find. Without emails and phones, the tool generates messages that cannot be sent.

**P0: Persistent Data Layer**
Replace localStorage with a lightweight backend (Supabase, Firebase, or even a Google Sheet as database). Without this, a BDR who clears their browser cache loses all engagement history, pipeline data, and follow-ups.

**P0: BDR Activity Dashboard**
Add a weekly/daily activity report: emails sent, LinkedIn connections sent, calls made, meetings booked, response rate. BDRs are measured on activity volume; they need to see their numbers.

**P1: Direct Email Compose**
Instead of "copy to clipboard," add a `mailto:` link that opens Gmail with the subject and body pre-filled. Even better, integrate with Gmail API to send directly and auto-log the engagement.

**P1: LinkedIn Quick-Launch**
When a leader has a LinkedIn URL, add a button that opens the LinkedIn messaging window with the pre-written message copied to clipboard. Add a browser extension that auto-populates the LinkedIn connection request with the generated message.

**P1: Task Queue / Sequence Engine**
The current sequence panel shows what to do but has no reminder system. Build a daily task queue: "Send LinkedIn to John Doe (Day 0 of Cold Sequence)" with a checkbox that auto-logs the engagement when completed. Think of this as a mini-Salesloft inside EventIQ.

**P2: Response Tracking**
Add "Replied" and "No Reply" actions to email engagements, and compute response rates per message variant. Show which email style (formal vs. casual vs. news-hook) gets the best response rate.

---

### Persona 2: AE (Account Executive)

**Goal:** Close deals with qualified opportunities from the BDR pipeline.

**Daily Workflow:**
1. Review pipeline -- what deals are active, what is stale, what needs attention
2. Prepare for calls -- research the person, review conversation history, anticipate objections
3. Conduct discovery/demo calls
4. Send follow-up materials (proposals, case studies, ROI analyses)
5. Handle objections and navigate buying committees (multi-threading)
6. Forecast deal outcomes and timelines
7. Coordinate with BDR on handoff accounts

**What EventIQ Currently Provides:**
- Pipeline kanban board with drag-and-drop (functional)
- Pre-call briefing with WHO/LAST TOUCH/YOUR ANGLE/NEWS HOOK/LAND MINES (good)
- Battlecards for objection handling, context-aware based on company type and pipeline stage (good)
- Account coverage / multi-threading map showing which contacts are engaged vs. untouched (good)
- Persona detection to tailor messaging by role (executive, operations, technical, growth, finance) (good)
- Post-meeting sentiment capture with pipeline auto-advance (good)
- Talking points tied to HyperVerge value prop (good)

**What Is MISSING (Critical Gaps):**

| Gap | Impact | Priority |
|-----|--------|----------|
| **No deal value / revenue tracking** | Pipeline has no dollar amounts -- cannot forecast revenue or prioritize by deal size | P0 |
| **No conversation history across meetings** | After a demo, AE needs to remember what was discussed; only raw engagement log exists | P0 |
| **No proposal/document tracking** | Cannot track if proposals were viewed, downloaded, or shared | P1 |
| **No buying committee map** | Threading map shows contacts but not their role in the buying decision (champion, blocker, decision-maker, influencer) | P1 |
| **No meeting notes integration** | AE takes notes in a separate tool; no way to attach structured meeting notes to an engagement | P1 |
| **No competitive intelligence** | Battlecards are generic HyperVerge responses; no data on what specific competitors the prospect is evaluating | P1 |
| **No deal timeline / close date** | Pipeline shows stage but not expected close date or days in stage | P1 |
| **No handoff from BDR** | No structured way to pass context from BDR's outreach history to AE taking over the account | P2 |
| **No win/loss analysis** | When deals close (won or lost), no structured capture of why | P2 |

**Specific Feature Recommendations for AE:**

**P0: Deal Metadata on Pipeline**
Add `dealValue`, `closeDate`, `confidence` fields to PipelineRecord. Show these on pipeline cards and compute weighted pipeline value. AEs live and die by pipeline numbers -- without deal values, the pipeline view is just a list.

**P0: Structured Meeting Notes**
After the quick capture sentiment, let AEs add structured notes: "What they care about," "Objections raised," "Next steps agreed," "Who else needs to be involved." These should be tied to the engagement entry and visible in the pre-call briefing next time.

**P1: Buying Committee Roles**
Extend the threading map to let AEs tag each contact as Champion, Decision-Maker, Influencer, Blocker, or End User. Show warnings like "No executive sponsor identified" or "Decision-maker not yet engaged." This is critical for enterprise deals.

**P1: Deal Velocity Metrics**
Track days in each pipeline stage. Show average time from contacted to demo, demo to proposal, proposal to won. Highlight deals that are stuck (e.g., "In Demo stage for 14 days -- 3x average").

**P1: Competitive Intel Fields**
Add a field to company/pipeline for "competing with" -- AE can note which competitors are in the deal. Battlecards should then show competitor-specific responses, not just generic objections.

**P2: Win/Loss Capture**
When a deal moves to Won or Lost, prompt for structured feedback: reason (price, timing, competitor, no budget, champion left), key learnings, and whether to re-engage later. Aggregate this for strategy reviews.

---

### Persona 3: Demand Gen

**Goal:** Generate qualified leads through targeted campaigns and pass them to BDR/AE.

**Daily Workflow:**
1. Identify target account segments for campaigns (by industry, size, location, tech stack)
2. Build campaign lists (email marketing, LinkedIn ads, event invites)
3. Track campaign performance (opens, clicks, conversions)
4. Score and qualify leads based on engagement
5. Pass qualified leads to BDR with context
6. Analyze which segments and messages convert best
7. Report on MQL/SQL conversion rates

**What EventIQ Currently Provides:**
- Company database with filtering by type (SQO/Client/ICP/TAM) and research quality (minimal)
- Company metadata: location, employee count, description (partial)
- Dashboard with priority breakdown, size distribution, location breakdown (basic)
- Outreach scoring that could be repurposed for lead scoring (basic)

**What Is MISSING (Critical Gaps):**

| Gap | Impact | Priority |
|-----|--------|----------|
| **No segmentation beyond type/priority** | Cannot segment by industry vertical (MCA vs. equipment finance vs. SBA), tech stack, funding stage, or buying signals | P0 |
| **No list export** | Cannot export a filtered list of companies to use in email marketing tools (Mailchimp, HubSpot, Outreach) | P0 |
| **No campaign tracking** | No way to associate companies with campaigns or track which campaigns drove engagement | P1 |
| **No lead scoring model** | Outreach score is activity-based, not intent-based; no website visit tracking, content download tracking, or event attendance signals | P1 |
| **No content/asset library** | No way to track which case studies, whitepapers, or videos have been shared with which accounts | P2 |
| **No ABM territory mapping** | Cannot visualize target accounts on a map or by segment for territory planning | P2 |
| **No MQL/SQL handoff** | No formalized process for passing a lead from marketing to sales with campaign context | P2 |

**Specific Feature Recommendations for Demand Gen:**

**P0: Advanced Segmentation and Tagging**
Add custom tags to companies (e.g., "MCA funder," "Equipment finance," "SBA lender," "Revenue-based," "Uses Ocrolus," "Series B+," "DeBanked attendee 2026"). Let Demand Gen filter by any combination of tags, location, size, research quality, and engagement status. This is the foundation for campaign targeting.

**P0: List Export**
Add a "Export filtered list" button that generates a CSV with company name, website, location, employee count, leader names, leader emails (when available), leader LinkedIn URLs, tags, and pipeline stage. This feeds directly into email marketing and LinkedIn campaign tools.

**P1: Campaign Attribution**
Add a `campaigns` field to company records where Demand Gen can tag which campaigns a company was included in (e.g., "DeBanked 2026 Pre-Event Email," "Q1 LinkedIn Ads," "Webinar Invite Feb"). Track how many companies in each campaign have moved through the pipeline.

**P1: Intent Signals / Buying Signals**
Add a field for buying signals that can be manually or automatically populated: "Hiring underwriting roles," "Recently raised funding," "Announced new lending product," "Expanding to new state." These are high-value triggers for Demand Gen to create timely campaigns.

**P2: Content Tracking**
Track which collateral (case studies, demo videos, ROI calculators) has been shared with which accounts. Let Demand Gen see content engagement patterns: "Companies that received the MCA case study convert to demo 2x more often."

---

## 3. GAP ANALYSIS

### 3.1 Data Gaps

| Missing Data | Value | How to Get It |
|-------------|-------|---------------|
| **Email addresses** | Cannot do email outreach without them | Hunter.io API, Apollo enrichment, or manual entry |
| **Phone numbers** | Cannot do cold calls without them | ZoomInfo, Apollo, or manual entry |
| **Tech stack** | Know if they use Ocrolus, Plaid, LendingFront (competitors/complements) | BuiltWith API, or manual research |
| **Funding data** | Know if they recently raised, stage, investors | Crunchbase, PitchBook scraping, or manual |
| **Revenue estimates** | Prioritize by company size/revenue | ZoomInfo, LinkedIn estimates |
| **Industry sub-vertical** | Segment MCA vs. equipment vs. SBA vs. factoring | Manual tagging or NLP on descriptions |
| **Buying signals** | "Hiring underwriters," "Launched new product," "Expanding states" | Google Alerts, LinkedIn job postings, news monitoring |
| **Org chart / reporting structure** | Know who reports to whom for multi-threading | LinkedIn Sales Navigator, manual |

### 3.2 Workflow Gaps

| Missing Workflow | Impact | Persona |
|-----------------|--------|---------|
| **Copy message -> send email -> log engagement** is 3 separate steps | Takes 2-3 minutes per outreach instead of 30 seconds | BDR |
| **No daily task queue** | BDR has to mentally track what to do next; morning briefing is informational but not actionable as a checklist | BDR |
| **No demo scheduling** | After identifying a prospect, no way to share a scheduling link | AE |
| **No proposal generation** | AE must create proposals in a separate tool with no context carry-over | AE |
| **No BDR-to-AE handoff** | When BDR qualifies a meeting, context (engagement history, pain points, champion) is not packaged for AE | BDR/AE |
| **No list building workflow** | Demand Gen must filter, then manually export, then import into another tool | Demand Gen |

### 3.3 Integration Gaps

| Missing Integration | Impact | Difficulty |
|--------------------|--------|------------|
| **HubSpot CRM (live bi-directional)** | All GTM teams use HubSpot as system of record; EventIQ data is siloed | Medium (HubSpot API is well-documented) |
| **Gmail** | Auto-log emails sent/received, open/click tracking | Medium (Gmail API or Chrome extension) |
| **LinkedIn Sales Navigator** | Import contact data, track connection status | Hard (LinkedIn API is restricted) |
| **Calendar (Google Calendar)** | See upcoming meetings, propose meeting times | Medium (Google Calendar API) |
| **Slack** | Get notifications for follow-up reminders, deal stage changes | Easy (Slack webhook) |
| **Outreach/Salesloft** | Execute multi-touch sequences with tracking | Medium (API integration) |

### 3.4 Intelligence Gaps

These insights could be computed from existing data but are not:

1. **Engagement velocity** -- Which companies are accelerating (more engagements per week) vs. decelerating?
2. **Best time to reach** -- Based on when replies come in, what days/times work best?
3. **Optimal sequence length** -- How many touches before a meeting is booked? Where do most prospects drop off?
4. **Persona conversion rates** -- Do executives convert better than operations contacts? Which persona should BDR target first?
5. **News-based vs. cold outreach** -- Do companies with recent news respond better when outreach references the news?
6. **Research ROI** -- Do companies with higher research scores (80+) convert at higher rates than poorly researched ones?
7. **Stale deal recovery** -- Of deals that went stale and were re-engaged, what percentage came back?

### 3.5 Collaboration Gaps

| Gap | Impact |
|-----|--------|
| **Single-user localStorage** | Two BDRs cannot see each other's engagement history; AE cannot see BDR's outreach for their accounts |
| **No user identity** | Cannot assign accounts to specific team members |
| **No activity feed across users** | Manager cannot see what the team did today |
| **No account ownership** | Two people could accidentally work the same account |
| **No shared notes** | BDR's discovery notes are not visible to AE |

### 3.6 Measurement Gaps

| Missing Metric | Who Needs It |
|---------------|-------------|
| **Meetings booked this week/month** | BDR, Manager |
| **Pipeline value by stage** | AE, Manager |
| **Win/loss rate by company type** | AE, Manager |
| **Average deal velocity (days per stage)** | AE, Manager |
| **Response rate by message variant** | BDR |
| **Campaign conversion rate** | Demand Gen |
| **Cost per lead by channel** | Demand Gen |
| **MQL to SQL conversion rate** | Demand Gen, Manager |
| **Engagement-to-meeting conversion** | BDR |
| **Team activity leaderboard** | Manager |

---

## 4. PRIORITIZED ROADMAP

### Quick Wins (less than 1 day of dev work, high impact)

**QW1: Add email/phone fields to schema + manual entry UI**
- What: Add `email` and `phone` fields to the Leader interface. Show in company detail view. Let users click to add/edit.
- Why: BDRs need contact info to execute outreach. Even manual entry is better than no fields.
- Impact: Enables BDRs to use EventIQ as their single working surface instead of switching between tools.

**QW2: Add `mailto:` and `tel:` links on message drafts**
- What: When email is known, the "Copy" button on email drafts becomes "Open in Gmail" (`mailto:email?subject=...&body=...`). When phone is known, add "Call" link.
- Why: Reduces 3-step workflow to 1 click. BDR copies message and opens Gmail in one action.
- Impact: Cuts outreach execution time by 50%.

**QW3: CSV export of filtered company list**
- What: Add an "Export CSV" button to the filter bar. Exports the currently filtered/sorted list with key fields.
- Why: Demand Gen needs this to feed campaign tools. AE needs it for pipeline reviews.
- Impact: Unlocks the entire Demand Gen use case.

**QW4: Deal value and close date on pipeline**
- What: Add `dealValue` (number) and `expectedCloseDate` (string) to PipelineRecord. Show on pipeline cards. Add weighted pipeline total.
- Why: AE pipeline is meaningless without dollar values. Manager needs revenue forecast.
- Impact: Makes pipeline tab actually useful for AE daily workflow.

**QW5: Custom tags on companies**
- What: Add a `tags: string[]` field. Let users add/remove tags from company detail view. Add tag filter to filter bar.
- Why: Enables segmentation for Demand Gen and personal organization for BDR/AE.
- Impact: Transforms the company list from a flat database into a flexible targeting tool.

**QW6: Structured meeting notes on engagement log**
- What: When logging a "meeting/completed" engagement, show additional fields: "What they care about," "Objections raised," "Next steps," "Who else to involve." Persist these in engagement notes as structured JSON.
- Why: AE needs structured call notes for deal progression and pre-call prep.
- Impact: Makes pre-call briefing exponentially more useful when it can reference last meeting's notes.

### Medium Effort (1-3 days, high impact)

**ME1: Persistent backend with Supabase**
- What: Replace localStorage with Supabase (free tier: 500MB, auth, real-time). Store engagements, pipeline, follow-ups, notes, tags in Postgres. Keep company data as static build.
- Why: Solves the single biggest architectural limitation. Enables multi-user, cross-device, data persistence, and future integrations.
- How: Create Supabase project, define tables matching current localStorage keys, add auth (Google SSO for HyperVerge team), migrate localStorage data on first login.
- Impact: Transforms EventIQ from a single-user demo into a team tool.

**ME2: Daily task queue (outbox)**
- What: Generate a daily task list from: (a) sequence steps due today, (b) follow-up reminders due, (c) stale pipeline nudges, (d) morning briefing actions. Show as a persistent sidebar or top panel. Each task has a "Do it" button that opens the right context (company detail + engagement log).
- Why: BDRs need a "what to do next" workflow, not just an informational briefing.
- How: Aggregate data from sequence-helpers, follow-up-helpers, morning-briefing-helpers into a unified TaskQueue component. Persist task completion state.
- Impact: Makes EventIQ the BDR's "start of day" app -- the thing they open first and work from all day.

**ME3: BDR/AE Activity Dashboard**
- What: Add a "My Activity" dashboard showing: emails sent this week, LinkedIn connections this week, calls made, meetings booked, pipeline generated. Show trends (this week vs. last week). If multi-user, show team leaderboard.
- Why: BDRs are measured on activity volume. AEs need pipeline velocity metrics. Managers need team visibility.
- How: Aggregate from engagement entries. Compute weekly/monthly rollups.
- Impact: Replaces the need for separate reporting tools.

**ME4: Buying committee roles**
- What: Extend Leader interface with `buyingRole: 'champion' | 'decision-maker' | 'influencer' | 'blocker' | 'end-user' | 'unknown'`. Show in threading map with role-specific icons. Add warnings when key roles are missing.
- Why: AEs managing multi-stakeholder deals need to know who is the champion, who can say no, and who is missing from the conversation.
- How: Add role field, update threading-helpers.ts to compute coverage gaps, update company-detail.tsx to show buying committee view.
- Impact: Significantly improves AE's ability to navigate complex deals.

**ME5: Contact enrichment at build time**
- What: Add a script that uses Hunter.io or Apollo API to find email addresses for known leaders. Run as part of the enrichment pipeline (like the existing research agent workflow). Store emails in a new `email` field on Leader.
- Why: Bridges the biggest BDR workflow gap -- having messages but no email addresses.
- How: Script iterates leaders, calls enrichment API, fuzzy-matches on name + company domain, writes results back to all-companies.json.
- Impact: Makes EventIQ's message drafts immediately actionable.

**ME6: Slack notifications**
- What: Add Slack webhook integration (alongside Google Sheets sync). Send notifications for: follow-ups due, deals moving stages, new meetings booked, weekly activity summary.
- Why: BDRs and AEs live in Slack. Push notifications bring them back to EventIQ at the right moment.
- How: Add Slack webhook URL to settings. Fire webhook from the same sync points as Google Sheets.
- Impact: Increases daily engagement with EventIQ by meeting users where they are.

### Strategic (1+ week, transformative)

**S1: Chrome Extension for LinkedIn + Gmail**
- What: Build a Chrome extension that: (a) On LinkedIn profile pages, shows EventIQ data for that person/company, (b) On Gmail compose, suggests EventIQ message drafts, (c) Auto-logs emails sent to known contacts as engagements.
- Why: BDRs spend 70% of their time in LinkedIn and Gmail. Meeting them there eliminates context-switching.
- How: Chrome extension with content scripts for LinkedIn and Gmail, communicating with EventIQ via shared Supabase backend.
- Impact: This is the #1 thing that would make EventIQ a daily driver. The current copy-paste workflow is the biggest friction point.

**S2: HubSpot Bi-Directional Sync**
- What: Live sync between EventIQ and HubSpot: (a) Companies/contacts sync both ways, (b) Deal stages sync both ways, (c) Engagements logged in EventIQ appear in HubSpot, (d) Engagements from HubSpot (email tracking, meeting outcomes) appear in EventIQ.
- Why: HubSpot is the system of record. If EventIQ data does not flow into HubSpot, AEs must double-enter data. If HubSpot data does not flow into EventIQ, the engagement history is incomplete.
- How: Use HubSpot API v3 with webhooks for real-time sync. Requires Supabase backend (S1 dependency). Map EventIQ pipeline stages to HubSpot deal stages.
- Impact: Eliminates double data entry. Makes EventIQ the "research + intelligence" layer while HubSpot remains the "system of record."

**S3: AI-Powered Research Agent (Live Enrichment)**
- What: Instead of batch research at build time, add a "Research this company" button that triggers a live AI agent to: search the web, find recent news, update company description, find new contacts, generate fresh icebreakers. Store results in Supabase.
- Why: The current batch research pipeline is impressive but static. Companies change -- people leave, funding rounds happen, products launch. Research that is 2 months old is stale.
- How: Serverless function (Vercel Edge Function or Supabase Edge Function) that calls a research agent (Claude API) with web search, writes results back to the database.
- Impact: Keeps intelligence fresh without manual effort. Turns EventIQ from a static database into a living intelligence platform.

**S4: Intent Signal Monitoring**
- What: Automated monitoring of buying signals for target accounts: (a) Job postings for underwriting roles (LinkedIn Jobs API or Indeed scraping), (b) News mentions (Google News API or news aggregator), (c) Regulatory filings, (d) Tech stack changes (BuiltWith monitoring). Surface alerts in the morning briefing.
- Why: The best time to reach a company is when they are actively hiring for roles that HyperVerge automates, or when they just raised funding. These signals are currently discovered by accident.
- How: Scheduled jobs (daily cron) that monitor known accounts and surface new signals.
- Impact: Transforms outreach from cold to timely. Increases response rates significantly.

**S5: Multi-User with Territories and Permissions**
- What: Full multi-user support with: (a) Google SSO authentication, (b) User profiles (BDR, AE, Demand Gen, Manager), (c) Account ownership / territory assignment, (d) Team activity feed, (e) Manager dashboard with team metrics.
- Why: Currently one person can use the tool. A GTM team of 5-10 people needs shared data, assigned accounts, and manager visibility.
- How: Supabase auth + row-level security + user profiles. Add `ownerId` to company assignments.
- Impact: Makes EventIQ a team platform instead of a personal tool.

---

## 5. COMPETITIVE ANALYSIS

### What the Best Tools Do

**Apollo.io (Contact data + Engagement)**
- 275M contacts with verified emails and phone numbers
- Built-in email sequencing with tracking (opens, clicks, replies)
- LinkedIn extension for contact discovery
- Intent data signals
- What to learn: Apollo's core value is that contact data and outreach execution are in the same tool. EventIQ has intelligence but no contact data and no execution.

**ZoomInfo (Data + Intent)**
- Deep company data: tech stack, org charts, funding, revenue
- Intent signals: which companies are actively researching solutions
- Scoops: real-time alerts on leadership changes, funding, expansion
- What to learn: ZoomInfo's enrichment depth (tech stack, org charts, intent) makes every other workflow downstream more effective. EventIQ has rich qualitative research but lacks quantitative firmographic data.

**Outreach / Salesloft (Sequence Execution)**
- Automated multi-touch sequences across email, phone, LinkedIn
- Engagement tracking (email opens, link clicks, reply detection)
- A/B testing of subject lines and message bodies
- Revenue intelligence (call recording, sentiment analysis)
- What to learn: The sequence panel in EventIQ is a design mockup compared to Outreach. The key difference is execution -- Outreach actually sends the emails, tracks opens, and auto-advances sequences. EventIQ generates text and asks the user to copy-paste.

**Gong (Conversation Intelligence)**
- Records and transcribes sales calls
- Identifies objections, competitors mentioned, next steps discussed
- Tracks talk-to-listen ratio, question frequency
- Deal risk scoring based on conversation signals
- What to learn: Gong proves that structured conversation data is gold. EventIQ's pre-call briefing and battlecards are the "before the call" equivalent; structured meeting notes and outcome capture (which EventIQ partially has via sentiment) are the "after the call" equivalent. The gap is automated capture vs. manual entry.

**Clay (Enrichment + Workflow)**
- Connects 75+ data sources for enrichment
- Visual workflow builder for enrichment pipelines
- AI agent for custom research tasks
- What to learn: Clay's approach of "bring any data source, build enrichment workflows" is exactly what EventIQ's build-time research pipeline does manually with Claude agents. The difference is Clay is self-serve and real-time.

### Minimum Viable Feature Set to Make EventIQ a Daily Driver

Based on competitive analysis, here is the minimum feature set that would make a BDR, AE, or Demand Gen person open EventIQ every morning:

**For BDR (daily driver requirements):**
1. Contact emails and phone numbers for target accounts (not just names)
2. One-click outreach execution (at minimum, `mailto:` links with pre-filled drafts)
3. Daily task queue ("here are your 15 tasks for today, in priority order")
4. Activity tracking that persists and does not disappear (backend, not localStorage)
5. Weekly activity report they can share with their manager

**For AE (daily driver requirements):**
1. Pipeline with deal values and close dates
2. Pre-call briefing that includes last meeting notes (not just generic research)
3. Buying committee map with coverage gaps
4. Deal velocity alerts ("this deal has been in Demo for 14 days")
5. CRM sync so they do not have to double-enter data

**For Demand Gen (daily driver requirements):**
1. Segmentation by tags, vertical, size, engagement status
2. List export to CSV for campaign tools
3. Campaign attribution tracking
4. Conversion funnel visibility (how many campaign targets became meetings)

---

## 6. STRATEGIC RECOMMENDATIONS

### What to Build First (Next 30 Days)

The single most impactful investment is **ME1: Persistent Backend with Supabase**. Everything else -- multi-user, integrations, live enrichment, reporting -- depends on having a real data layer. Without it, EventIQ remains a sophisticated personal tool that no one trusts with their work data because it could vanish with a browser clear.

After the backend, the priority order is:
1. **QW1 + QW2**: Contact emails + mailto links (BDR unblocking)
2. **QW3 + QW5**: CSV export + custom tags (Demand Gen unblocking)
3. **QW4 + QW6**: Deal values + meeting notes (AE unblocking)
4. **ME2**: Daily task queue (BDR daily driver)
5. **ME3**: Activity dashboard (Measurement)

### What to Build in 60-90 Days

6. **S1**: Chrome extension for LinkedIn + Gmail (BDR game-changer)
7. **S2**: HubSpot bi-directional sync (AE and org alignment)
8. **ME4 + ME5**: Buying committee + contact enrichment
9. **ME6**: Slack notifications

### What Makes EventIQ Defensible

EventIQ has something no off-the-shelf tool provides: **deep, MCA-vertical-specific intelligence** on 1,021 companies with hand-researched leader profiles, conversation hooks, personalized talking points, and icebreakers tied to HyperVerge's specific value proposition. This vertical depth is genuinely valuable and cannot be replicated by generic tools.

The strategy should be: **Keep the intelligence layer as EventIQ's core differentiation, but plug the execution and integration gaps that prevent daily usage.** Do not try to build a full-featured CRM or email sequencing tool. Instead, make EventIQ the "intelligence overlay" that enhances the tools the team already uses (HubSpot, Gmail, LinkedIn, Slack).

Think of EventIQ as the **brain** (research, prioritization, messaging, briefings) that connects to **hands** (email tools, CRM, LinkedIn) for execution. Right now the brain is excellent but it has no hands.

---

## 7. KEY FILES REFERENCED

All file paths are absolute from the project root:

- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/types.ts` -- Core data schema (Company, Leader, Contact)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/app/page.tsx` -- Main application state and handlers
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/components/company-detail.tsx` -- Detail view with all intelligence features
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/components/company-list.tsx` -- List with filtering, sorting, outreach scoring
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/components/today-actions.tsx` -- Morning briefing component
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/components/dashboard-tab.tsx` -- Analytics dashboard
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/components/pipeline-tab.tsx` -- Pipeline kanban board
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/persona-helpers.ts` -- Persona detection (6 types)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/battlecard-helpers.ts` -- Objection handling (5 categories)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/threading-helpers.ts` -- Multi-threading map
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/briefing-helpers.ts` -- Pre-call briefing generator
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/morning-briefing-helpers.ts` -- Daily briefing (news triggers, stale warnings, quick wins)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/sequence-helpers.ts` -- Multi-touch sequence templates (4 types)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/sentiment-helpers.ts` -- Post-meeting sentiment (4 levels)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/engagement-helpers.ts` -- Engagement tracking (6 channels)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/outreach-score.ts` -- Outreach prioritization scoring
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/pipeline-helpers.ts` -- Pipeline stage management (7 stages)
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/follow-up-helpers.ts` -- Follow-up reminders
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/src/lib/sheets-sync.ts` -- Google Sheets sync
- `/Users/kishore/Desktop/Claude-experiments/debanked/eventiq/CLAUDE.md` -- Project documentation and architecture