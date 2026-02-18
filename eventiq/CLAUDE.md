# EventIQ — Small Business Lending Market Intelligence Platform

## Project Overview
Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui application for HyperVerge's GTM and Product teams. Market intelligence platform for HyperVerge's expansion into the small business lending space — covering MCA, equipment finance, SBA lending, revenue-based financing, and adjacent verticals.

**Purpose:** Comprehensive intelligence on 1,000+ companies and their leaders in the small business lending ecosystem. Used by:
- **BD/Sales** — Account research, conversation prep, engagement tracking, outreach prioritization
- **Product** — Market landscape analysis, competitor feature mapping, trend identification
- **Leadership** — TAM sizing, market segmentation, strategic planning

**Not just events.** While the tool originated for DeBanked CONNECT 2026, it now serves as the persistent GTM intelligence layer for all go-to-market activities across the small business lending vertical.

**Version:** 2.8.00
**Dev server:** `npm run dev` → http://localhost:3000
**Build:** `npm run build` → static export to `out/`
**Live:** GitHub Pages (auto-deploy on push to main)

---

## Data Architecture

### Data Files
- **`src/data/all-companies.json`** — Canonical dataset: 1,021 companies (4 SQO + 2 Client + 238 ICP + 575 TAM + others)
- **`src/data/tam-companies.json`** — 895 TAM companies (broader addressable market)
- **`src/data/companies.json`** — Legacy file (225 companies), kept for backward compat

### Company Priority Tiers
| Priority | Label | Companies | Leaders | Description |
|----------|-------|-----------|---------|-------------|
| 1 | P0 / SQO | 4 | 17 | Strategic accounts: Bitty, BriteCap, PIRS Capital, Wing Lake |
| 2 | P1 / ICP | 238 | 370 | Ideal customer profile — primary targets |
| 3 | P2 | 9 | 30 | Secondary targets |
| 4 | TAM | 575 | 45 | Broader addressable market |
| 5-6 | Other | 134 | 13 | Lower priority / informational |

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
  notes: string;             // Internal notes
  news: NewsItem[];          // {h: headline, s: source, d: description}
  ice: string;               // Primary icebreaker
  icebreakers?: string[];    // 4 rotation variants
  tp: string[];              // 3 talking points tied to HyperVerge value prop
  ask: string;               // Personalized CTA
  location?: string;
  employees?: number;
  website?: string;
  linkedinUrl?: string;
  source: string[];          // Tags: ["researched", "enriched", etc.]
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
}
```

### Leader Stats (as of v2.2.05)
- **Total leaders:** 476
- **With hooks:** 476 (100%)
- **With LinkedIn URLs:** 327 (68.7%)
- **With bg field:** 476 (100%)
- **Deep-researched companies:** 243/243 with leaders (100%)

---

## Research Methodology — MANDATORY STANDARD

**CRITICAL: Every company and person added to the dataset MUST go through deep web research. No shortcuts. No text extraction from existing fields. This is the quality bar.**

### Required Research Per Company
Every company entry must have ALL of the following populated via real web research:

1. **`desc`** — 1-2 paragraphs with real metrics (AUM, origination volume, funding rounds, customer count, growth %). Source from company website, press releases, LinkedIn About, Crunchbase (free tier), news articles.

2. **`contacts`** — 2-3 key decision-makers with name + title. Source from company website team page, LinkedIn company page.

3. **`leaders`** — Deep profiles for 2-4 key executives. Each leader MUST have:
   - **`n`**: Full name
   - **`t`**: Title (with context if useful, e.g. "CEO, Co-Founder")
   - **`bg`**: 30-100 word background paragraph from web research covering:
     - Career history and prior roles (search LinkedIn, company bios)
     - Educational background (university, degree)
     - Key accomplishments and milestones
     - Personal details if publicly available (hobbies, podcasts, speaking)
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

### Required Research Per Leader (hooks quality standard)
Hooks must come from ACTUAL web research, not rephrasing existing text:

**Research sources for each person:**
- Web search: `"Person Name" "Company Name"` — find news mentions, quotes, interviews
- Web search: `"Person Name" LinkedIn` — find profile details, career history
- Web search: `"Person Name" podcast OR conference OR panel OR speaking` — find public appearances
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
- SEC/regulatory filings (for public companies)
- Inc. 5000, Deloitte Fast 500, other ranking lists
- Conference/event speaker lists and agendas
- Podcast directories (for speaking appearances)

### What NOT to Do
- NEVER generate hooks by reformatting existing `bg` text — that's circular, not research
- NEVER use paid APIs (Crunchbase Pro, ZoomInfo, PitchBook) without explicit approval
- NEVER scrape LinkedIn programmatically (violates ToS)
- NEVER fabricate or hallucinate facts — if research finds nothing, say so
- NEVER use generic filler ("experienced leader", "industry expert")

### Research Workflow for New Companies
```
1. Web search company name → find website, LinkedIn, recent news
2. Read company website (about page, team page, press room)
3. For each leader: web search name + company → LinkedIn, bios, news mentions
4. Compile desc, contacts, leaders (with bg + hooks + li), news
5. Craft icebreakers (4 variants) tied to recent findings
6. Write 3 talking points connecting their challenges to HyperVerge
7. Write personalized ask naming the key decision-maker
8. Output as JSON matching the Company schema
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

## Data Flow
- All company data: `src/data/all-companies.json` → imported at build time
- User state (met/notes/ratings/checks/engagements): localStorage via `useLocalStorage` hook
- No backend/API — fully static, offline-capable

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
