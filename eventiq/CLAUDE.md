# EventIQ — Small Business Lending Market Intelligence Platform

## Project Overview
Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui application for HyperVerge's GTM and Product teams. Market intelligence platform for HyperVerge's expansion into the small business lending space — covering MCA, equipment finance, SBA lending, revenue-based financing, and adjacent verticals.

**Purpose:** Comprehensive intelligence on 1,000+ companies and their leaders in the small business lending ecosystem. Used by:
- **BD/Sales** — Account research, conversation prep, engagement tracking, outreach prioritization
- **Product** — Market landscape analysis, competitor feature mapping, trend identification
- **Leadership** — TAM sizing, market segmentation, strategic planning

**Not just events.** While the tool originated for DeBanked CONNECT 2026, it now serves as the persistent GTM intelligence layer for all go-to-market activities across the small business lending vertical.

**Version:** 3.1.80
**Dev server:** `npm run dev` → http://localhost:3000
**Build:** `npm run build` → `.next/` (SSR, no static export)
**Deploy target:** Vercel (auto-deploy from Git)

---

## Deployment

### Branches & Domains

| Branch | Domain | Environment |
|--------|--------|-------------|
| `main` | `us.hyperverge.space` | Production (auto-deploy via GitHub) |
| `missioniq` | `us2.hyperverge.space` | Preview (aliased from Vercel preview deploy) |

### Deploying `missioniq` branch to `us2.hyperverge.space`

The `missioniq` branch deploys as a Vercel **preview** (not production). After pushing, you must re-alias the domain:

```bash
# 1. Push changes
git push origin missioniq

# 2. Wait ~60s for Vercel preview build to complete, then check:
npx vercel ls --scope hv-one 2>&1 | head -6

# 3. Find the latest "Ready" preview deployment URL, then alias it:
npx vercel alias <preview-url> us2.hyperverge.space --scope hv-one
```

**Example:**
```bash
npx vercel alias https://eventiq-1je8h6709-hv-one.vercel.app us2.hyperverge.space --scope hv-one
```

### Why not `vercel --prod`?

CLI production deploys (`vercel --prod`) fail with a Turbopack edge runtime module resolution error (`Can't resolve '@supabase/ssr'` in middleware). Root cause: the repo has two `.vercel/project.json` files — one in `debanked/` (parent) and one in `debanked/eventiq/` — causing CLI root directory confusion. GitHub auto-deploys work fine because the Vercel GitHub app correctly resolves the project root.

**Workaround:** Use the preview alias approach above. To fix permanently, delete `/debanked/.vercel/project.json` (the parent one).

### Environment Variables

MissionIQ env vars are set for both Production and Preview (missioniq branch):
- `TOOL_API_KEY` — Machine-to-machine auth for tool API endpoints
- `NEXT_PUBLIC_OPENCLAW_WS_URL` — OpenClaw WebSocket gateway URL
- `NEXT_PUBLIC_OPENCLAW_TOKEN` — OpenClaw auth token (client-visible, acceptable behind OAuth)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` — Supabase

Manage via: `npx vercel env ls --scope hv-one`

### Kiket (formerly MissionIQ) Infrastructure

| Component | Location |
|-----------|----------|
| Chat panel (integrated) | `src/components/kiket-chat-panel.tsx` → `src/components/missioniq-chat.tsx` |
| Chat page (standalone) | `src/app/chat/page.tsx` |
| OpenClaw WebSocket client | `src/lib/openclaw-client.ts` (sessionKey filtering for agent isolation) |
| Chat message renderer | `src/components/chat-message.tsx` (markdown with code blocks, tables, lists) |
| Tool API endpoints | `src/app/api/tools/` (8 routes: search, company, leader, brief, stats, news, similar, team-notes) |
| Tool auth middleware | `src/lib/tool-auth.ts` (X-Tool-Key header validation) |
| Supabase tables | `miq_` prefix: conversations, messages, notes, engagements, reminders, user_config |
| OpenClaw agent config | Remote server `keti@ketea:/Users/keti/.openclaw/agents/missioniq/agent/` |
| OpenClaw agent memory | Remote server `keti@ketea:/Users/keti/.openclaw/agents/missioniq/agent/memory/` |
| OpenClaw gateway (Mac Mini) | `wss://ketea.tail38a898.ts.net` (Tailscale Funnel, port 18789) |
| OpenClaw gateway (Vercel Sandbox) | `wss://sb-*.vercel.run/ws` (ephemeral, 45min max on Hobby plan) |
| Sandbox snapshot | `snap_mAlWAiLElakgzmW4bg7TCNh3EF0A` (full OpenClaw + Kiket config) |
| Sandbox launcher | `scripts/kiket-sandbox.sh` (start/stop/status) |

#### OpenClaw Multi-Agent Architecture

The gateway hosts multiple agents on a single process. Kiket (work) is isolated from kkbot (personal):

```
Gateway (keti@ketea:18789)
├── main (kkbot)     — Personal assistant, WhatsApp groups only
├── missioniq (Kiket) — GTM intelligence, webchat + EventIQ tools
├── fitty            — Fitness agent, WhatsApp group
├── clawd            — Purva agent, WhatsApp group
└── walassistant     — Walmart agent, WhatsApp group

Isolation: Separate AGENT.md, memory, workspace per agent
Shared: API key, gateway port, event bus, Tailscale funnel
Client fix: sessionKey filtering in openclaw-client.ts prevents cross-agent event bleed
```

#### Kiket on Vercel Sandbox (Ephemeral)

Kiket can run on Vercel Sandbox when the Mac Mini is offline. The setup is preserved as a snapshot.

```bash
# Start Kiket sandbox (restores from snapshot, starts gateway)
./scripts/kiket-sandbox.sh start

# Check status
./scripts/kiket-sandbox.sh status

# Stop
./scripts/kiket-sandbox.sh stop
```

**Limitations:**
- Max 45 minutes on Hobby plan (5 hours on Pro at $20/mo)
- URL changes on every restart (need to update Vercel env var + redeploy)
- No WhatsApp (can't scan QR in sandbox) — webchat only
- Snapshot ID: `snap_mAlWAiLElakgzmW4bg7TCNh3EF0A`

**After starting a sandbox**, update the EventIQ env var and redeploy:
```bash
# 1. Update env var (URL from sandbox start output)
printf "wss://sb-XXXXX.vercel.run/ws" | npx vercel env add NEXT_PUBLIC_OPENCLAW_WS_URL preview missioniq --scope hv-one
# 2. Redeploy: use Vercel API or push to missioniq branch
```

#### Kiket Server Migration

Full backup lives in `server-backup/` with a migration README. When migrating to a new machine:

```bash
# 1. Install OpenClaw on new machine
npm install -g openclaw && openclaw init

# 2. Copy agent files
cp -r server-backup/agent/ ~/.openclaw/agents/missioniq/agent/

# 3. Create config from template, fill in secrets from server-backup/.env (local only, gitignored)
cp server-backup/gateway/openclaw.template.json ~/.openclaw/openclaw.json
# Replace all <PLACEHOLDER> values with real keys from .env

# 4. Create workspace and start
mkdir -p ~/clawd-missioniq
tailscale funnel 18789
openclaw gateway install

# 5. Update Vercel env vars with new funnel URL + gateway token
# NEXT_PUBLIC_OPENCLAW_WS_URL → new Tailscale funnel URL
# NEXT_PUBLIC_OPENCLAW_TOKEN → new GATEWAY_AUTH_TOKEN
```

See `server-backup/README.md` for full details. Secrets are in `server-backup/.env` (gitignored, local only).

---

## Session Start — QUICK SCAN

**At the start of each coding session, run a quick scan (not a full read) of these three files:**

1. **`../bugs.md`** — Bug register with severity, evidence, and fix options. Check for Critical/High items that may relate to the current task.
2. **`../improvements.md`** — Improvement plan with priorities (P0/P1/P2), implementation guidance, and acceptance criteria.
3. **`../ROADMAP.md`** — Combined product vision + engineering execution plan. Understand what phase we're in and what's prioritized.

**Quick-scan rule to avoid context overload:**
- Read headings, priority/status sections, and only the entries relevant to the current task.
- Do not deep-read entire files unless the task explicitly requires it.

**During development:**
- If you discover a new bug, add it to `../bugs.md` following the existing format (BUG-XXX with severity, evidence, impact, fix options).
- If you identify an improvement opportunity, add it to `../improvements.md` following the existing format (IMP-XXX with priority, evidence, rationale).
- If you complete a bug fix or improvement, update the status in the respective file and note what was done.
- If product direction or priorities change during a conversation, update `../ROADMAP.md` accordingly.
- When ideating on new features or architecture, check the roadmap first to ensure alignment with the current phase and priorities.

**File locations (relative to eventiq/):**
```
../bugs.md           — Bug register
../improvements.md   — Improvement plan
../ROADMAP.md        — Product roadmap (vision + engineering execution)
```

**Conditional reference (only when task involves PhantomBuster):**
```
./phantom-buster.md  — PhantomBuster API research and integration guide
```

---

## Data Architecture

### Data Sources
- **Supabase `companies` table** — Canonical dataset: 959 companies, served via `/api/companies` API route
- **`src/data/all-companies.json`** — Local backup (gitignored), used for seeding Supabase via `scripts/seed-companies-to-supabase.js`

### Company Category Distribution (as of v3.1.54)
| Category | Count | Display Tag |
|----------|-------|-------------|
| Funder | 824 | Fndr-MCA, Fndr-SBA, Fndr-EqFin, Fndr-Factr, Fndr-RBF, Funder |
| ISO | 62 | ISO |
| Bank | 40 | Bank |
| Marketplace | 15 | Marketplace |
| Service | 8 | Service |
| Technology | 6 | Technology |
| Competitor | 4 | Competitor |

### Company Priority Tiers
| Priority | Label | Description |
|----------|-------|-------------|
| 1 | P0 / SQO | Strategic accounts with active deal flow |
| 2 | P1 / ICP | Ideal customer profile — primary targets |
| 3 | P2 | Secondary targets |
| 4 | TAM | Broader addressable market |
| 5-7 | Other | Lower priority / informational |

### Company Data Schema
```typescript
interface Company {
  id: number;
  name: string;
  type: 'SQO' | 'Client' | 'ICP' | 'TAM';
  priority: number;          // 1=P0, 2=P1, 3=P2, 4=TAM
  phase: number;
  booth: boolean;
  clear?: boolean;
  contacts: Contact[];       // Quick reference: {n, t}
  leaders?: Leader[];        // Deep profiles: {n, t, bg, hooks, li}
  desc: string;              // Company description paragraph
  notes: string;             // Internal notes (selling angles, board, competitors)
  news: NewsItem[];          // {h: headline, s: source, d: description}
  ice: string;               // Primary icebreaker
  icebreakers?: string[];    // 4 rotation variants
  tp: string[];              // 3 talking points tied to HyperVerge value prop
  ask: string;               // Personalized CTA
  location?: string;
  full_address?: string;     // Full street address for delivery/visits (e.g. "90 Broad St, Suite 300, New York, NY 10004")
  employees?: number;
  website?: string;
  linkedinUrl?: string;
  source: string[];          // Tags: ["researched", "enriched", "refreshed-YYYY-MM"]
  category?: CompanyCategory; // funder, iso, marketplace, bank, technology, competitor, service_provider
}
```

### Leader Data Schema
```typescript
interface Leader {
  n: string;    // Full name
  t: string;    // Title
  bg: string;   // Background paragraph (career, education, achievements)
  hooks?: string[];  // 2-4 short conversation starters (2-5 words each)
  li?: string;       // LinkedIn profile URL
  email?: string;           // Work email (from Apollo or research)
  phone?: string;           // Direct phone
  mailing_address?: string; // For gift/mail delivery (e.g. "90 Broad St, Suite 300, New York, NY 10004")
  delivery_notes?: string;  // e.g. "Remote worker", "Has EA: Jane Smith", "Use LinkedIn instead"
}
```

### Leader Stats (as of v2.2.05)
- **Total leaders:** 476
- **With hooks:** 476 (100%)
- **With LinkedIn URLs:** 327 (68.7%)
- **With bg field:** 476 (100%)
- **Deep-researched companies:** 243/243 with leaders (100%)

---

## Company Categories

Every company MUST have a `category` field. No uncategorized companies.

| Category | Tag Display | What it means | How to identify |
|----------|-------------|---------------|-----------------|
| `funder` | Fndr-MCA, Fndr-SBA, Fndr-EqFin, Fndr-Factr, Fndr-RBF, Funder | Direct lenders — fund from own balance sheet or institutional credit facilities | Look for: origination volume, balance sheet receivables, credit facilities, loss rates |
| `iso` | ISO | People-driven sales/broker operations | Look for: small team (1-10 people), commissions, "submit applications to funders", sales-driven |
| `marketplace` | Marketplace | Tech-driven self-service platforms that algorithmically match borrowers with lenders | Look for: proprietary scoring, self-service platform, 100+ lender integrations, tech team |
| `bank` | Bank | Chartered banks, credit unions, CDFIs | Look for: banking charter, FDIC, NCUA, CDFI certification |
| `technology` | Technology | SaaS/software providers for lenders (non-competitors) | Look for: CRM, LOS, servicing platform, white-label — they sell TO lenders, not lend |
| `competitor` | Competitor | Direct HyperVerge competitors | AI document analysis, identity verification, KYC/KYB, underwriting automation |
| `service_provider` | Service | Law firms, media, trade associations | Legal services, industry publications, associations |

### Critical Classification Distinctions

**ISO vs. Marketplace** — The #1 classification mistake. Many ISOs call themselves "marketplaces" in marketing.
- **ISO**: Sales reps prospect businesses, submit apps to funders on their behalf. Revenue from commissions. Scales by hiring reps. Even if they work with 75+ funders, if it's human-driven deal flow → ISO.
- **Marketplace**: Self-service tech platform. Businesses enter info, get algorithmically matched. Revenue from platform/referral fees. Scales through technology. Think Nav, Lendio, LendingTree.
- **Employee count is a strong signal**: 1-10 employees claiming "75+ lender marketplace" = almost certainly an ISO.

**Funder vs. Technology** — Does the company provide capital or software?
- If they say "platform for lenders" or "built for MCA companies" → technology (they sell to lenders)
- If they say "we fund businesses" or have origination volume → funder
- Some explicitly state "(not a lender)" in their description → technology
- Watch for companies with both: Ivy Lender does marketplace + white-label SaaS

**Embedded Lenders** — Tech companies (Shopify, Square, PayPal) that also lend. Classify by what matters:
- If they fund from own balance sheet (Shopify: $1.6B receivables, Square: $5.7B originated) → `funder`
- If they stopped lending and now refer to partners (Amazon Lending since Mar 2024) → `marketplace`
- If they provide lending infrastructure but don't fund (LiftForward, Prime Financial Tech) → `technology`
- Key research: check financial filings for "receivables", "origination volume", "loss rates" — these prove direct funding

---

## Research Methodology — MANDATORY STANDARD

**CRITICAL: Every company and person added to the dataset MUST go through deep web research. No shortcuts. No text extraction from existing fields. This is the quality bar.**

### Research Depth — Adapt to Context

The depth of research should match the purpose. The user's context determines what to prioritize:

| Context | Research Focus | Depth |
|---------|---------------|-------|
| **Outreach prep** ("I'm meeting their CEO") | Deep personal dossier: podcasts, interviews, board seats, personal philosophy, LinkedIn activity, mutual connections | Maximum — find the unique personal angles |
| **Company refresh** ("update research on X") | Leaders, recent news, funding rounds, product launches, leadership changes, selling angles | High — refresh everything stale |
| **Classification audit** ("is this a funder or ISO?") | Business model evidence: balance sheet vs. commissions, employee count, origination volume, funding structure | Focused — find the structural truth |
| **Batch enrichment** ("refresh P1 companies") | Recent news, leadership changes, funding rounds — efficient breadth over depth | Medium — cover more companies |
| **Quick data fix** ("add this company") | Basic fields: desc, contacts, category, location, website | Standard — fill required fields |

### The Deep Research Difference

Standard research fills in the schema fields. **Deep research reveals the structural truth about a company** — the kind of insight that changes how you approach them. Patterns discovered:

**1. Follow the money — not the marketing copy**
- Companies describe themselves aspirationally. "AI-powered lending marketplace" might be 2 people with a Google Form.
- Search for: origination volume, balance sheet receivables, credit facility announcements, loss rates, funding rounds.
- Example: Shopify Capital says "embedded lending" but financial filings reveal $1.6B in receivables on their own balance sheet — they're a balance sheet lender using WebBank as regulatory originator.

**2. Check the funding structure**
- "Funds from own balance sheet" = true funder (Shopify, Square, Lightspeed)
- "Originated by WebBank, purchased by X" = funder using bank-as-a-service regulatory wrapper (PayPal, Shopify)
- "Capital from Citi/Goldman/institutional facility" = funder with institutional backing (SellersFi, Liberis)
- "Connects businesses with 75+ lenders" = ISO or marketplace (never a funder)
- "Revenue from commissions/points on funded deals" = ISO

**3. Employee count reveals business model**
- 1-5 employees claiming "marketplace with 75+ lenders" = ISO (broker with a website)
- 50-200+ employees with engineering team = likely real technology platform
- 10-50 employees in "sales" roles = ISO scaling through headcount

**4. Track strategic pivots**
- Amazon Lending stopped direct lending in March 2024 — now just refers to Parafin/SellersFi. The old description was wrong.
- Greg Ott left Nav as CEO — Levi King returned. Leadership changes affect outreach strategy.
- Acquisitions change capabilities (Nav acquired Nuula + Tillful for cash flow scoring)

**5. Research the person, not just the title**
For outreach targets, go beyond the company bio:
- **Podcast/interview search**: `"Person Name" podcast OR interview OR conference` — reveals their thinking, priorities, communication style
- **Board seats and advisory roles**: Shows their network and what they care about beyond the day job
- **Content they've written**: Inc., Forbes, LinkedIn articles — reveals their public positions
- **Personal philosophy**: Levi King's "business is personal" mantra and 360-review transformation story are more valuable icebreakers than any company metric
- **Career arc**: 7 businesses before fintech, farm kid from Idaho → serial entrepreneur. The personal journey creates connection.

**6. Verify "Limited public information available" companies**
~65 companies in the dataset have this boilerplate. Before accepting it:
- Search `"Company Name" deBanked` — deBanked covers niche MCA players others miss
- Search `"Company Name" UCC filing` — UCC filings reveal active lending
- Search `"Company Name" BBB` or `"Company Name" Trustpilot` — reviews reveal if they're active
- Check state business registrations — confirms if still operating
- If truly nothing exists, mark as `funder` (default for SMB lending companies) and note "Limited public information"

### Required Research Per Company
Every company entry must have ALL of the following populated via real web research:

1. **`desc`** — 1-2 paragraphs with real metrics (origination volume, funding rounds, customer count, growth %, balance sheet size, loss rates). Source from company website, press releases, financial filings, LinkedIn About, Crunchbase (free tier), news articles. **Include the business model truth**: how they actually make money, where the capital comes from, what they really are (not just what they claim to be).

2. **`contacts`** — 2-3 key decision-makers with name + title. Source from company website team page, LinkedIn company page.

3. **`leaders`** — Deep profiles for 2-4 key executives. Each leader MUST have:
   - **`n`**: Full name
   - **`t`**: Title (with context if useful, e.g. "CEO, Co-Founder")
   - **`bg`**: 30-100 word background paragraph from web research covering:
     - Career history and prior roles (search LinkedIn, company bios)
     - Educational background (university, degree)
     - Key accomplishments and milestones
     - Personal details if publicly available (hobbies, podcasts, speaking, board seats)
   - **`li`**: LinkedIn profile URL (search `site:linkedin.com/in/ "Person Name" "Company"`)
   - **`hooks`**: 2-4 conversation starters based on RESEARCHED facts, not generic phrases

4. **`news`** — 3-4 most recent headlines with:
   - **`h`**: Headline text
   - **`s`**: Source publication + date (e.g. "Yahoo Finance, Dec 2025")
   - **`d`**: 1-2 sentence description of impact/relevance

5. **`ice`** — One carefully crafted primary icebreaker that:
   - References specific recent news or achievement
   - Asks a strategic question tied to HyperVerge's value prop
   - Shows genuine understanding of their challenges

6. **`icebreakers`** — 4 rotation variants covering different angles:
   - News-based angle (references recent announcement)
   - Metrics/milestone angle (celebrates accomplishment)
   - Challenge/pain angle (acknowledges scaling problem)
   - Competitive/trend angle (industry positioning)

7. **`tp`** — 3 talking points tied to HyperVerge's underwriting product:
   - Volume/scaling argument referencing their specific scale
   - Proven platform argument with "450+ MCA companies" social proof
   - Efficiency argument with specific time/cost savings

8. **`ask`** — Personalized CTA that names the decision-maker by first name, references their specific trigger event, and proposes a concrete next step

9. **`notes`** — Selling angles and strategic context:
   - `SELLING ANGLES:` — bullet points for how HyperVerge could help this specific company
   - `BOARD:` — board members and investors (useful for warm introductions)
   - `COMPETITORS:` — who they compete with (context for positioning)
   - `KEY INSIGHT:` — the one non-obvious thing that changes the approach

10. **`category`** — Must be set based on business model research (see Company Categories above)

11. **`full_address`** — Full street address for in-person visits and gift/mail delivery:
   - Source from: company website contact/about page, Google Maps, Google Places, BBB listing, state business registration
   - Format: "123 Main St, Suite 400, City, ST 12345"
   - Include suite/floor number when available (critical for delivery)
   - If company has multiple offices, use headquarters
   - For companies with no identifiable office (1-person shops, virtual offices), note "Virtual/remote" in the field

### Required Research Per Leader (hooks quality standard)
**Delivery intelligence** — For P0/P1 leaders, also capture:
- **`mailing_address`**: If different from company HQ (e.g., leader is remote, or works from a branch office)
- **`delivery_notes`**: Anything that helps ensure a gift reaches them: "Has EA: Jane Smith", "Works from Miami office not HQ", "Remote — use company address ATTN leader name", "Small office — leader will receive directly"
- **`email`**: Work email (found via company website, press releases, conference speaker bios)
Hooks must come from ACTUAL web research, not rephrasing existing text:

**Research sources for each person:**
- Web search: `"Person Name" "Company Name"` — find news mentions, quotes, interviews
- Web search: `"Person Name" LinkedIn` — find profile details, career history
- Web search: `"Person Name" podcast OR conference OR panel OR speaking` — find public appearances
- Web search: `"Person Name" board OR advisor OR advisory` — find governance roles
- Company website team/about page — find official bio
- Industry publications (deBanked, BusinessWire, Yahoo Finance) — find quotes and features

**Quality standard for hooks:**
- GOOD: `"*Former Navy SEAL"`, `"UC Berkeley"`, `"*Sold company to Microsoft"`, `"Runs food blog"`, `"*D-1 lacrosse All-American"`
- BAD: `"MCA expert"`, `"Industry veteran"`, `"Sales leader"`, `"Finance professional"`
- Use `*` prefix for truly standout/memorable items
- Each hook must be traceable to a specific fact found via research

### Web Research Sources (free, public)
- LinkedIn public profiles and company pages
- Company websites (team pages, press rooms, about pages)
- Press releases (PR Newswire, BusinessWire, GlobeNewswire)
- Industry publications (deBanked, Lending Times, Fintech Nexus)
- General news (Yahoo Finance, Bloomberg, TechCrunch, Forbes)
- SEC/regulatory filings (for public companies — 10-K, 10-Q for origination data)
- Financial filings and earnings calls (for balance sheet / receivables data)
- Inc. 5000, Deloitte Fast 500, other ranking lists
- Conference/event speaker lists and agendas
- Podcast directories (for speaking appearances)
- State business registrations (for confirming active status)
- deBanked (covers niche MCA players other publications miss)
- Crunchbase free tier (funding rounds, investors, employee count)

### What NOT to Do
- NEVER generate hooks by reformatting existing `bg` text — that's circular, not research
- NEVER use paid APIs (Crunchbase Pro, ZoomInfo, PitchBook) without explicit approval
- NEVER scrape LinkedIn programmatically (violates ToS)
- NEVER fabricate or hallucinate facts — if research finds nothing, say so
- NEVER use generic filler ("experienced leader", "industry expert")
- NEVER accept marketing copy at face value — verify the business model with structural evidence
- NEVER leave a company uncategorized — every company gets a `category` based on research

### Research Workflow for New Companies
```
1. Web search company name → find website, LinkedIn, recent news
2. Read company website (about page, team page, press room)
3. CLASSIFY FIRST: determine category (funder/iso/marketplace/etc.)
   - Search for origination volume, balance sheet data, funding structure
   - Check employee count vs. claims (5 employees ≠ marketplace)
   - Look for how they make money (commissions vs. platform fees vs. interest)
4. For each leader: web search name + company → LinkedIn, bios, news mentions
   - For outreach targets: also search podcasts, interviews, board seats, articles
5. Capture FULL STREET ADDRESS from company website, Google Maps, or BBB
   - Include suite/floor number — critical for delivery
   - Format: "123 Main St, Suite 400, City, ST 12345"
6. Compile desc (with business model truth), contacts, leaders, news
7. Write notes: selling angles, board members, competitors, key insights
8. Craft icebreakers (4 variants) tied to recent findings
9. Write 3 talking points connecting their challenges to HyperVerge
10. Write personalized ask naming the key decision-maker
11. Output as JSON matching the Company schema with category and full_address set
```

---

## Enrichment Pipeline

### Scripts (`eventiq/scripts/`)
| Script | Purpose |
|--------|---------|
| `refresh.js` | Generate batch files for research agents (split by priority/count) |
| `merge-research.js` | Merge deep research results into all-companies.json |
| `merge-enrichment.js` | Merge enrichment results (hooks, LinkedIn, news) |
| `merge-hooks.js` | Merge standalone hooks-result files |
| `merge-tam.js` | Merge TAM company data |
| `import-merge.js` | Mechanical merge — takes pre-mapped JSON → fuzzy match → merge into all-companies.json |
| `hubspot-sync.js` | Pull companies, contacts, deals, engagements from HubSpot CRM |
| `refresh-orchestrate.sh` | End-to-end orchestration (batch → agents → merge → build) |
| `refresh-poller.sh` | Poll GitHub issues for refresh signals |

### Shared Libraries (`eventiq/scripts/lib/`)
| Module | Purpose |
|--------|---------|
| `fuzzy-match.js` | Company name normalization + Levenshtein fuzzy matching |
| `csv-parser.js` | Lightweight CSV/TSV/JSON parser with auto-detect |
| `field-mapper.js` | Heuristic field mapping (columns → schema) — used by in-app import |

### Import Drop Zone (`eventiq/scripts/imports/`)
Raw data files go here. Agent reads them, maps fields, produces JSON, runs `import-merge.js`.
- `*.csv`, `*.tsv`, `*.xlsx` — gitignored (may contain PII)
- `import-mapped-*.json` — Agent-produced mapped data (committed)
- `import-log-*.json` — Merge logs (committed)

### Import Workflow — Agent-Driven Architecture

**Key insight:** When a user tells Claude Code "import this data", the agent IS Claude. No separate API call needed. The agent reads raw data, reasons about field mapping, produces clean JSON, and calls the mechanical merge script.

**Two paths:**

1. **In-app (clean data):** Paste CSV → heuristic auto-map → preview → confirm → localStorage
2. **Agent (messy data):** User drops file in `scripts/imports/` or pastes in chat → agent maps → `import-merge.js`

**Agent import workflow:**
```
1. Read the raw file (CSV/TSV/JSON) from scripts/imports/ or from chat paste
2. Examine headers and sample data rows
3. Reason about field mapping: which columns → which Company schema fields
4. Produce a JSON array of Company-shaped objects
5. Save to scripts/imports/import-mapped-YYYY-MM-DD.json
6. Run: node scripts/import-merge.js scripts/imports/import-mapped-YYYY-MM-DD.json --dry-run
7. Review dry-run output, verify matches look correct
8. Run: node scripts/import-merge.js scripts/imports/import-mapped-YYYY-MM-DD.json
9. Run: npm run build (verify no errors)
```

**Common HubSpot/CRM column mappings for agent reference:**
| CRM Column | → Schema Field |
|------------|----------------|
| Company name, Account Name, Organization | `name` |
| Company Domain Name, Website URL | `website` |
| City, State/Region, Country | `location` (combine) |
| Number of Employees, Company size | `employees` |
| About Us, Company Description | `desc` |
| LinkedIn Company Page | `linkedinUrl` |
| First Name + Last Name | `contacts[].n` |
| Job Title, Title | `contacts[].t` |
| Email, Email Address | (store in notes, not in schema) |
| Phone Number | (store in notes, not in schema) |
| Industry, Type, Lifecycle Stage | `type` (map to SQO/Client/ICP/TAM) |
| Deal Stage, Pipeline | (store in notes) |
| Last Activity Date | (store in notes) |
| Notes, Description | `notes` |

**import-merge.js flags:**
```
node scripts/import-merge.js <file>              # Merge mapped JSON
node scripts/import-merge.js <file> --dry-run    # Preview only
node scripts/import-merge.js <file> --threshold 0.8  # Fuzzy match threshold
node scripts/import-merge.js <file> --overwrite  # Overwrite non-empty fields
```

**HubSpot CRM sync (still available):**
```
HUBSPOT_API_KEY=xxx node scripts/hubspot-sync.js
```

### Batch Research Workflow
```
1. Generate batches:  node scripts/refresh.js --priority P0
2. Spawn 5 parallel Claude agents, each processing one batch
3. Agents produce: scripts/refresh-result-{1..5}.json
4. Merge results:    node scripts/merge-enrichment.js scripts/refresh-result-*.json
5. Verify build:     npm run build
```

### Research Agent Prompt Template
Each agent receives a batch of companies and should:
- Search the web for each company + leader
- Find latest news (2-3 headlines with source + date)
- Find missing LinkedIn URLs
- Generate 2-4 conversation hooks per leader based on REAL research
- Update leader backgrounds with fresh information
- Output as JSON array matching the enrichment schema

### GitHub Actions Integration
- `.github/workflows/refresh-news.yml` — Weekly cron trigger (Monday 8AM UTC)
- Creates a GitHub issue with `refresh-news` label
- `refresh-poller.sh` watches for these issues and triggers local orchestration

---

## Decisions Log

### v3.1.80 (2026-03-01) — Kiket Vercel Sandbox Deployment
- **Decision**: Deploy Kiket-only OpenClaw gateway to Vercel Sandbox as a fallback when Mac Mini is offline.
- **Setup**: Sandbox with Node 22, OpenClaw v2026.2.26, port 18789 published. Config stripped to missioniq agent only (no WhatsApp, no personal agents).
- **Snapshot**: `snap_mAlWAiLElakgzmW4bg7TCNh3EF0A` preserves full filesystem. Restore takes ~0.4s vs ~16s cold start.
- **Launcher**: `scripts/kiket-sandbox.sh` (start/stop/status) automates sandbox lifecycle.
- **Limitations**: 45-minute max on Hobby plan (5h on Pro). URL changes per sandbox — need env var update + redeploy.
- **Files**: `scripts/kiket-sandbox.sh` (new), `CLAUDE.md` (updated infrastructure table, sandbox docs).
- **Why not always-on**: Vercel Sandbox is ephemeral by design. For true 24/7: need Mac Mini or a VPS ($5-7/mo on Railway/Fly.io).

### v3.1.79 (2026-03-01) — Kiket Agent Isolation (Shared Gateway, Separate Identity)
- **Decision**: Keep Kiket (work) and kkbot (personal) on the same OpenClaw gateway. No process separation needed.
- **Architecture**: Single gateway process on Keti's Mac Mini (port 18789) hosts multiple agents. Each agent has isolated AGENT.md, memory directory, workspace, and conversation history. They share: API key, WebSocket port, event bus, Tailscale funnel.
- **Bug found**: Operator WebSocket delivers events from ALL agents. When kkbot replied on WhatsApp, the "Hey Keti!" response bled into EventIQ's Kiket webchat panel.
- **Fix**: Client-side `sessionKey` filtering in `openclaw-client.ts` — drops events not matching the `missioniq` session. Also passes `agentId` in connect handshake for server-side scoping.
- **Why not full separation**: Two gateway processes means double memory, dual configs, second Tailscale funnel. The client-side filter achieves functional isolation with zero infrastructure overhead.
- **Revisit if**: Fault isolation becomes needed (one agent crashing shouldn't affect the other), or billing separation is required.

### v3.1.77 (2026-03-01) — Kiket Chat Panel Integration + Memory Architecture
- **Decision**: Kiket (renamed from MissionIQ) is an integrated right panel in the main dashboard, not a separate `/chat` route.
- **Layout**: `[Sidebar] [Company List] [Company Detail] [Kiket Panel (resizable 300-700px)]`. Sidebar collapses when chat opens.
- **Memory architecture**: 14 domain-separated memory files on server (`memory/sales/`, `memory/marketing/`, `memory/product/`, `memory/solutions/`, `memory/decisions/`, `memory/people/`) with master index `memory/MEMORY.md`.
- **Scroll fix**: Replaced Radix `ScrollArea` with native `overflow-y-auto` div — Radix creates nested viewport that breaks `ref`-based scroll control.
- **Files**: `kiket-chat-panel.tsx` (new), `missioniq-chat.tsx`, `openclaw-client.ts`, `chat-message.tsx`, `app-sidebar.tsx`, `mobile-nav.tsx`, `company-detail.tsx`, `page.tsx`

### v2.3.02 (2026-02-15) — Full-Text Search, Data Quality, Engagement Analytics
- **Full-text search**: Cmd+K now searches across ALL company fields (name, contacts, leaders, bios, location, desc, news, icebreakers, talking points, notes, website) with contextual snippets showing where the match was found
- **Data quality indicators**: Research completeness score (0-100) with colored quality bars on every company card. Sort by "Quality" to find under-researched companies. Score based on weighted field presence.
- **Engagement analytics dashboard**: Channel breakdown, hottest prospects ranking, needs-follow-up detection (3+ day stale), recent activity feed. Dashboard now shows data quality distribution chart.
- **Files changed**: `search-command.tsx`, `types.ts`, `company-card.tsx`, `filter-bar.tsx`, `company-list.tsx`, `dashboard-tab.tsx`, `page.tsx`

### v2.3.01 (2026-02-15) — Agent-Driven Import Architecture
- **Decision**: Refactor import pipeline from heuristic+API to agent-driven architecture
- **Key insight**: When user tells Claude Code "import this data", the agent IS Claude — no separate API call needed
- **Created**: `scripts/import-merge.js` (mechanical merge), `scripts/imports/` (drop zone)
- **Simplified**: `scripts/lib/field-mapper.js` (removed claudeMap, buildClaudePrompt), `src/components/import-dialog.tsx` (removed map step, added agent path)
- **Deleted**: `scripts/import.js` (replaced by agent + import-merge.js), `scripts/hubspot-import-engagements.js` (broken, agent handles directly)
- **Two paths**: Clean data → in-app heuristic auto-map → preview → localStorage. Messy data → agent maps fields → import-merge.js → all-companies.json

### v2.3.00 (2026-02-15) — Import + HubSpot Sync
- **Decision**: Add data import pipeline (CLI + in-app) and HubSpot CRM sync
- **Superseded by**: v2.3.01 agent-driven architecture
- **Storage**: In-app imports stored in localStorage (`eventiq_imported_companies`), merged at runtime with build-time data
- **New EngagementSource values**: `'hubspot'` and `'import'` added to type union

### Research Quality Standard (2026-02-13) — PERMANENT POLICY
- **Decision**: All companies and leaders MUST go through deep web research before being added
- **Rationale**: Surface-level text extraction produces generic, unhelpful hooks. Real web research finds the specific personal details that make conversations work.
- **Applies to**: All new companies, all new leaders, all enrichment refreshes
- **Enforced by**: Research Methodology section above is the mandatory standard

### Strategic Pivot (2026-02-15) — From Event Tool to GTM Platform
- **Decision**: EventIQ is no longer scoped to a single event (DeBanked CONNECT 2026). It is now the persistent market intelligence platform for HyperVerge's expansion into small business lending.
- **Users**: BD/Sales (account research, engagement tracking), Product (market landscape, competitor analysis), Leadership (TAM sizing, strategy)
- **Implications**: Features should serve ongoing GTM workflows, not just event prep. Data freshness, engagement analytics, and export/reporting matter more than event schedules and checklists.

### v2.2.05 (2026-02-15) — 100% Deep Research Coverage
- **Decision**: Deep web research completed for ALL 243 companies with leaders (P0, P1, P2, TAM)
- **Stats**: 476 leaders, 327 LinkedIn URLs, 243 companies deep-researched
- **Pipeline**: P0 (4 companies) → P1 (198 companies, 5 parallel agents) → P2+TAM (41 companies, 2 agents)

### v2.2.01 (2026-02-13) — Leader Hooks Enrichment
- **Decision**: Generate hooks for all 475 leaders to reach 100% coverage
- **Approach**: Merged existing enrich-result-3/4/5 (165 hooks), then spawned 5 parallel agents to generate hooks from existing `bg` data for remaining 288 leaders
- **Superseded by**: v2.2.02-v2.2.05 deep research replaced all shallow hooks with real web-researched hooks

### v2.1.00 (2026-02-13) — Engagement Tracking
- **Decision**: Add contact-level engagement tracking system
- **Components**: EngagementLog dialog, EngagementTimeline display, engagement-helpers.ts
- **Channels**: email, linkedin, imessage, call, meeting, note
- **Storage**: localStorage (`eventiq_engagements`)
- **Architecture ready for**: Gmail sync, LinkedIn extension, Chrome extension (source field)

### v2.0.01 — Dataset Expansion
- **Decision**: Expand from 225 companies to 1,021 (added TAM companies)
- **Data files**: all-companies.json (canonical), tam-companies.json (TAM source)
- **Researched**: 408 of 1,021 companies (39.9%) have deep research

### v1.x — Core App
- **Stack choice**: Next.js 16 + static export (no backend needed)
- **Data choice**: All data embedded at build time, user state in localStorage
- **Offline**: PWA with service worker for offline use at events
- **Priority system**: SQO (red) > Client (gold) > ICP (green) > TAM (default)

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          # Root layout, providers, PWA meta
│   ├── page.tsx            # Main app — state management, responsive layout
│   └── globals.css         # Dark theme, type colors, scrollbar
├── components/
│   ├── ui/                 # shadcn/ui primitives (18 components)
│   ├── app-sidebar.tsx     # Desktop sidebar navigation
│   ├── company-list.tsx    # Company list with filtering/sorting
│   ├── company-card.tsx    # Individual company card
│   ├── company-detail.tsx  # Detail panel + persona badges + battlecards + threading
│   ├── company-table.tsx   # Table view alternative
│   ├── search-command.tsx  # Cmd+K command palette
│   ├── filter-bar.tsx      # Filter toggles + sort + view switch
│   ├── rating-dialog.tsx   # Post-meeting rating modal
│   ├── mobile-nav.tsx      # Bottom tab navigation (mobile)
│   ├── pitch-tab.tsx       # HyperVerge pitch content
│   ├── schedule-tab.tsx    # Event schedule + booth plan
│   ├── checklist-tab.tsx   # End-of-day checklist
│   ├── dashboard-tab.tsx   # Analytics dashboard
│   ├── engagement-log.tsx  # Engagement logging + Quick Capture mode
│   ├── engagement-timeline.tsx  # Engagement history display
│   ├── pre-call-briefing.tsx    # Pre-call briefing dialog
│   └── sequence-panel.tsx       # Multi-touch sequence timeline
├── data/
│   ├── all-companies.json  # 1,021 companies (canonical)
│   ├── tam-companies.json  # 895 TAM companies
│   └── companies.json      # 225 companies (legacy)
├── hooks/
│   ├── use-keyboard.ts     # Keyboard shortcut handler
│   ├── use-local-storage.ts # Persistent state hook
│   └── use-mobile.ts       # Mobile breakpoint detection
└── lib/
    ├── types.ts            # TypeScript interfaces
    ├── engagement-helpers.ts # Engagement utility functions
    ├── persona-helpers.ts    # Persona detection from titles
    ├── battlecard-helpers.ts # Objection battlecard generation
    ├── threading-helpers.ts  # Multi-threading map computation
    ├── briefing-helpers.ts   # Pre-call briefing assembly
    ├── morning-briefing-helpers.ts # Morning briefing data
    ├── sequence-helpers.ts   # Multi-touch sequence generation
    ├── sentiment-helpers.ts  # Post-meeting sentiment config
    └── utils.ts            # cn() utility (shadcn)
```

## Key shadcn/ui Components
Sidebar, Card, Command, Sheet, Dialog, Tabs, Badge, ScrollArea, Resizable, ToggleGroup, Input, Tooltip, Sonner, Button, Toggle, Separator, Skeleton

---

## UI Rules — MANDATORY

**CRITICAL: All UI code MUST use shadcn/ui components. No raw HTML elements for interactive/display primitives.**

### Component Requirements
| Need | Use This | NEVER Use |
|------|----------|-----------|
| Button/clickable action | `<Button>` from `@/components/ui/button` | Raw `<button>` with custom styles |
| Text input | `<Input>` from `@/components/ui/input` | Raw `<input>` |
| Textarea | `<Textarea>` from `@/components/ui/textarea` | Raw `<textarea>` |
| Dropdown select | `<Select>` from `@/components/ui/select` | Raw `<select>` |
| Label | `<Label>` from `@/components/ui/label` | Raw `<label>` |
| Table | `<Table>` from `@/components/ui/table` | Raw `<table>/<tr>/<td>` |
| Modal/popup | `<Dialog>` from `@/components/ui/dialog` | Custom modal div |
| Side panel | `<Sheet>` from `@/components/ui/sheet` | Custom sliding div |
| Dropdown menu | `<DropdownMenu>` from `@/components/ui/dropdown-menu` | Custom dropdown div |
| Tabs | `<Tabs>` from `@/components/ui/tabs` | Custom tab buttons |
| Toggle | `<Toggle>` or `<ToggleGroup>` | Custom toggle buttons |
| Progress | `<Progress>` from `@/components/ui/progress` | Custom progress bar div |
| Avatar/initials | `<Avatar>` from `@/components/ui/avatar` | Custom rounded div |
| Tooltip | `<Tooltip>` from `@/components/ui/tooltip` | `title` attribute |
| Accordion | `<Accordion>` from `@/components/ui/accordion` | Custom expand/collapse |
| Keyboard shortcut display | `<Kbd>` from `@/components/ui/kbd` | Raw `<kbd>` |
| Icons | `lucide-react` | Raw `<svg>` elements |
| Toast/notification | `sonner` (`toast()`) | Custom notification div |
| Scroll container | `<ScrollArea>` | `overflow-auto` div |

**Full catalog:** https://ui.shadcn.com/docs/components

### Adding New shadcn Components
If a component isn't installed yet, add it:
```bash
npx shadcn@latest add <component-name>
```

### Spacing & Layout Rules
- **Minimum text size:** `text-xs` (12px). Never use `text-[9px]` or `text-[10px]` — use `text-xs` instead
- **Spacing scale:** Use Tailwind's default spacing: `gap-1` (4px), `gap-1.5` (6px), `gap-2` (8px), `gap-3` (12px), `gap-4` (16px), `gap-6` (24px)
- **Padding:** Cards use `p-3` or `p-4`. Compact items use `p-2`. Never mix arbitrarily
- **Border radius:** Use `rounded-lg` for cards/panels, `rounded-md` for buttons/inputs, `rounded-full` for pills/avatars
- **No hardcoded pixels** in className — use Tailwind spacing scale
- **No inline `style={}` for layout** — use Tailwind classes. Only exception: dynamic values from JS (e.g. chart widths)

### Color Rules
- Use CSS variables: `var(--sqo)`, `var(--client)`, `var(--icp)`, `var(--primary)`
- Use Tailwind theme colors: `text-foreground`, `text-muted-foreground`, `bg-card`, `bg-muted`, `border-border`
- Never hardcode hex colors in components

### Responsive
- Desktop: `md:` breakpoint and above
- Mobile: default styles (mobile-first)
- Use `useIsMobile()` hook for JS-level responsive logic

---

## Data Flow
- Company data: Supabase `companies` table → `/api/companies` API route → fetched at runtime
- User state (met/notes/ratings/checks/engagements): localStorage via `useSyncedStorage` hook ↔ Supabase
- Auth: Google OAuth (@hyperverge.co) via Supabase Auth, enforced by Next.js middleware
- Offline: PWA with service worker, localStorage fallback

## LocalStorage Keys
- `eventiq_met` — Set of met company IDs
- `eventiq_ratings` — Rating data per company
- `eventiq_notes` — User notes per company
- `eventiq_checks` — Checklist state
- `eventiq_quick_notes` — Quick notes text
- `eventiq_engagements` — Engagement entries array
- `eventiq_imported_companies` — Companies imported via in-app dialog (merged at runtime)
- `eventiq_pipeline` — Pipeline stage records per company
- `eventiq_follow_ups` — Follow-up reminders array
- `eventiq_sequences` — Multi-touch sequence progress per company

---

## Testing Checklist

### Quick Smoke Test
```bash
npm run build    # Must succeed with zero errors
npm run dev      # Dev server at localhost:3000
```

### Key Validations
- 1,021 companies load (or 225 if using legacy companies.json)
- SQO filter: 4 companies (Bitty, BriteCap, PIRS Capital, Wing Lake)
- Client filter: 2 companies (Fundfi, FundKite)
- Cmd+K search works across company names AND contact names
- Met/rating state persists across page refresh
- Mobile layout: bottom nav, sheet-based detail panel
- Engagement logging: `e` key shortcut, multi-channel support

### Visual Theme
- Dark theme default (#0c0c12 background)
- SQO = red, Client = gold, ICP = green, Primary = blue (#5b8def)
- No white flash on load

---

## Browser Automation Preferences

**Chrome Profile:** Always use the **kishore** Chrome profile when using Claude in Chrome (`mcp__claude-in-chrome__*`) for browser automation and testing. This profile has the necessary extensions and logged-in sessions.
