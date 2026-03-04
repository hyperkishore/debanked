# Agent Context Snapshot (debanked / EventIQ)

Updated: 2026-02-26
Purpose: Fast internal context for future sessions (concise, high-signal, low token load).

## 1) Repo Layout

- Root docs/governance:
  - `ROADMAP.md`
  - `improvements.md`
  - `bugs.md`
  - `AGENTS.md`
  - `cloud.md`
- Main product code lives in `eventiq/`.

## 2) Product Summary

EventIQ is a GTM intelligence + execution app for small business lending (MCA and adjacent segments), used by BDR/AE/marketing teams to:

1. prioritize accounts from signals,
2. enrich buying personas (especially RICP roles),
3. run outreach workflows,
4. track pre-pipeline and pipeline progress.

## 3) Current Tech Stack

- Next.js `16.1.6`, React `19.2.3`, TypeScript, Tailwind v4
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Vitest present (`npm test`)
- Main app shell: `eventiq/src/app/page.tsx`

## 4) Core Runtime Architecture

1. UI loads companies from `/api/companies` (`eventiq/src/app/api/companies/route.ts`).
2. Local+team state sync is handled by `useSyncedStorage`:
   - `eventiq/src/hooks/use-synced-storage.ts`
3. Auth and route protection:
   - middleware + domain restriction to `@hyperverge.co`
   - `eventiq/src/middleware.ts`
   - shared auth helpers in `eventiq/src/lib/api-helpers.ts`

## 5) Key Product Surfaces (Tabs)

Tab model in `eventiq/src/lib/types.ts`:

- `companies`, `schedule`, `resources`, `marketing`, `dashboard`, `pipeline`, `feed`, `map`, `dinner`

Notable components:

- `eventiq/src/components/marketing-ideas-tab.tsx` (RICP coverage + go-after ranking)
- `eventiq/src/components/revenue-milestone-tracker.tsx` (pipeline/revenue milestones)
- `eventiq/src/components/pipeline-tab.tsx`
- `eventiq/src/components/feed-tab.tsx`

## 6) Data Model Highlights

Main schema types in `eventiq/src/lib/types.ts`:

- `Company`, `Leader`, `Contact`, `NewsItem`, `HubSpotDeal`, engagement types.
- RICP-related fields already exist on `Leader`:
  - `sourceUrls`, `verifiedAt`, `confidence`, `functionalRole`, `lastReviewedAt`

## 7) Revenue / Pre-Pipeline Logic

- Value estimation engine: `eventiq/src/lib/revenue-model.ts`
- Pipeline stages + inference: `eventiq/src/lib/pipeline-helpers.ts`
- Milestone tracker currently uses:
  - milestones: `$3M/$1M` and `$9M/$3M`
  - stage probabilities in `revenue-milestone-tracker.tsx`

## 8) RICP and Enrichment

- Taxonomy logic: `eventiq/src/lib/ricp-taxonomy.ts`
- Live gap API: `eventiq/src/app/api/ricp-gaps/route.ts`
- Enrichment scripts:
  - `eventiq/scripts/merge-enrichment.js`
  - `eventiq/scripts/enrich-contacts.js`
  - additional merge/refresh orchestration scripts in `eventiq/scripts/`

## 9) Integrations

- Supabase (canonical app DB)
- HubSpot sync scripts/routes exist
- Sheets sync exists
- Outplay route exists
- PhantomBuster research doc exists:
  - `eventiq/phantom-buster.md`
  - referenced conditionally in `eventiq/CLAUDE.md`

## 10) Known Operating Notes

1. Data-count drift has existed across local JSON vs snapshots vs live Supabase; treat live Supabase as operational source of truth.
2. Startup context policy in `eventiq/CLAUDE.md` is now quick-scan (not deep-read) for:
   - `../bugs.md`, `../improvements.md`, `../ROADMAP.md`
3. Current strategic emphasis is data enrichment for BDR/AE/marketing outcomes (meetings + SQL creation).

## 11) Practical Next Focus (if asked to execute)

1. RICP enrichment completion for top SLA buckets.
2. Enrichment QA gates (confidence/freshness/provenance).
3. Pre-pipeline signal-to-value calibration (probability + deal-size realism).
4. Pipeline milestone tracking tied to actionable weekly gap math.

## 12) Where To Change What (Fast Map)

## App shell and tab routing

1. Main page composition and tab switch:
   - `eventiq/src/app/page.tsx`
2. Sidebar tab list:
   - `eventiq/src/components/app-sidebar.tsx`
3. Mobile tab list:
   - `eventiq/src/components/mobile-nav.tsx`
4. Tab type union:
   - `eventiq/src/lib/types.ts` (`TabType`)

## Data loading and persistence

1. Companies API fetch and merge with imported companies:
   - `eventiq/src/app/page.tsx`
2. Local + Supabase synced state:
   - `eventiq/src/hooks/use-synced-storage.ts`
3. Sync queue mechanics:
   - `eventiq/src/lib/sync-queue.ts`
4. Supabase client setup:
   - `eventiq/src/lib/supabase.ts`
   - `eventiq/src/lib/supabase-server.ts`

## Auth and access control

1. App-level auth middleware:
   - `eventiq/src/middleware.ts`
2. API auth helpers (`authenticateRequest`, admin checks):
   - `eventiq/src/lib/api-helpers.ts`
3. Login/callback pages:
   - `eventiq/src/app/login/page.tsx`
   - `eventiq/src/app/auth/callback/page.tsx`

## RICP enrichment and gap logic

1. RICP ranking and UI queue:
   - `eventiq/src/components/marketing-ideas-tab.tsx`
2. Title classification:
   - `eventiq/src/lib/ricp-taxonomy.ts`
3. Live gap endpoint:
   - `eventiq/src/app/api/ricp-gaps/route.ts`
4. Enrichment quality helpers:
   - `eventiq/src/lib/enrichment-qa.ts`
5. Merge enrichment payloads into local dataset:
   - `eventiq/scripts/merge-enrichment.js`

## Revenue and pre-pipeline forecasting

1. Deal value estimation model:
   - `eventiq/src/lib/revenue-model.ts`
2. Pipeline stages and inference:
   - `eventiq/src/lib/pipeline-helpers.ts`
3. Milestone tracker UI:
   - `eventiq/src/components/revenue-milestone-tracker.tsx`
4. Pre-pipeline PRD:
   - `eventiq/docs/PRD_PRE_PIPELINE_SIGNAL_TRACKER.md`

## GTM execution modules

1. Dashboard:
   - `eventiq/src/components/dashboard-tab.tsx`
2. Pipeline board:
   - `eventiq/src/components/pipeline-tab.tsx`
3. Feed/signals view:
   - `eventiq/src/components/feed-tab.tsx`
4. Task queue:
   - `eventiq/src/components/task-queue-tab.tsx`
5. Sequence logic:
   - `eventiq/src/lib/sequence-helpers.ts`
6. Outreach scoring:
   - `eventiq/src/lib/outreach-score.ts`

## Integrations

1. HubSpot sync route:
   - `eventiq/src/app/api/hubspot/sync/route.ts`
2. HubSpot client:
   - `eventiq/src/lib/hubspot-client.ts`
3. Sheets sync:
   - `eventiq/src/lib/sheets-sync.ts`
   - `eventiq/src/app/api/sheets-proxy/route.ts`
4. Outplay sequence route:
   - `eventiq/src/app/api/outplay/add-to-sequence/route.ts`
5. PhantomBuster integration research:
   - `eventiq/phantom-buster.md`

## Data/ops scripts

1. Seed companies to Supabase:
   - `eventiq/scripts/seed-companies-to-supabase.js`
2. Refresh orchestration:
   - `eventiq/scripts/refresh.js`
   - `eventiq/scripts/refresh-orchestrate.sh`
3. Merge research outputs:
   - `eventiq/scripts/merge-research.js`
   - `eventiq/scripts/merge-deep-research.js`
   - `eventiq/scripts/merge-tam-research.js`
4. Dedup/validation helpers:
   - `eventiq/scripts/find-dupes.js`
   - `eventiq/scripts/dedup-companies.js`
   - `eventiq/scripts/verify-data.js`
