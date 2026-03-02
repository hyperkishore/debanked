# EventIQ Improvement Plan

This document defines implementation-grade improvements derived from the current codebase. Each item includes evidence paths, rationale, implementation guidance, and acceptance criteria.

## Priority Legend
- `P0`: urgent risk/security or user-visible failure.
- `P1`: high-value structural improvement.
- `P2`: medium-term optimization.

## IMP-001: Centralize API Auth + Supabase Client Initialization
- Priority: `P1`
- Category: Architecture, Security, DX
- Evidence:
  - `eventiq/src/app/api/companies/route.ts:12`
  - `eventiq/src/app/api/documents/route.ts:18`
  - `eventiq/src/app/api/enrich/route.ts:12`
  - `eventiq/src/app/api/briefing/daily/route.ts:19`
  - `eventiq/src/app/api/briefing/company/[id]/route.ts:30`
  - `eventiq/src/app/api/hubspot/sync/route.ts:27`
  - `eventiq/src/app/api/signals/ingest/route.ts:28`
- Problem:
  - Auth/session/client bootstrap is duplicated in almost every route, increasing inconsistency and maintenance cost.
- Improvement:
  - Design a shared helper that returns `{ user, supabaseAuth, supabaseAdmin }` with consistent error mapping.
  - Standardize unauthorized, misconfigured, and internal failure responses.
- Acceptance criteria:
  - API route duplication reduced materially.
  - Route handlers become focused on business logic.
  - Error shape and status behavior is consistent across endpoints.

## IMP-002: Introduce Strict Input Validation Layer for APIs
- Priority: `P0`
- Category: Reliability, Security
- Evidence:
  - `eventiq/src/app/api/documents/route.ts:48`
  - `eventiq/src/app/api/documents/route.ts:143`
- Problem:
  - Query/body values are parsed without strict numeric checks; malformed input can silently degrade behavior.
- Improvement:
  - Add schema validation strategy (e.g., route-level validator) for query params and JSON bodies.
  - Reject invalid values with explicit `400` and machine-readable error codes.
- Acceptance criteria:
  - Invalid IDs never reach Supabase query builder.
  - API validation failures are deterministic and well-structured.

## IMP-003: Define and Enforce Document Access Policy
- Priority: `P0`
- Category: Security
- Evidence:
  - `eventiq/src/app/api/documents/route.ts:46`
  - `eventiq/src/app/api/documents/route.ts:92`
  - `eventiq/src/app/api/documents/route.ts:95`
- Problem:
  - Document read/upload paths are not explicitly scoped beyond authenticated user presence.
- Improvement:
  - Define policy: user-owned, team-owned, or global-per-company.
  - Enforce policy in route filters and (if available) DB-level RLS/policy checks.
- Acceptance criteria:
  - Unauthorized cross-scope document operations are blocked.
  - Audit trail includes actor and target company/doc IDs.

## IMP-004: Upgrade Client Fetch Resilience and UX Error States
- Priority: `P1`
- Category: Reliability, UX
- Evidence:
  - `eventiq/src/app/page.tsx:72`
  - `eventiq/src/app/page.tsx:80`
- Problem:
  - `/api/companies` failure only logs to console; UI can degrade to empty state without actionable feedback.
- Improvement:
  - Add explicit error state, user-visible retry action, and telemetry event for failed load.
  - Differentiate empty-data vs failed-fetch.
- Acceptance criteria:
  - Users see a clear error and retry option on load failure.
  - Failure events are trackable in logs/analytics.

## IMP-005: Stop Returning Success-like Responses on Misconfiguration
- Priority: `P0`
- Category: Reliability, Operability
- Evidence:
  - `eventiq/src/app/api/companies/route.ts:31`
  - `eventiq/src/app/api/companies/route.ts:32`
- Problem:
  - DB misconfiguration currently returns `200` with empty array, masking infrastructure issues.
- Improvement:
  - Return explicit service-unavailable status and diagnostic message.
  - Align behavior with other routes that already use `503`.
- Acceptance criteria:
  - Misconfigured backend never appears as valid empty business data.

## IMP-006: Redesign Sync Conflict Resolution for Deterministic Merge
- Priority: `P0`
- Category: Data Integrity
- Evidence:
  - `eventiq/src/hooks/use-synced-storage.ts:364`
  - `eventiq/src/hooks/use-synced-storage.ts:380`
- Problem:
  - Current merge strategy lets remote values override local records without explicit conflict/version logic, risking lost writes.
- Improvement:
  - Introduce per-record version/timestamp strategy and deterministic conflict resolution.
  - Preserve local unsynced edits until server acknowledgement.
- Acceptance criteria:
  - No local edit loss during reconnect/hydration.
  - Conflict outcomes are predictable and test-covered.

## IMP-007: Add Sync Queue Correctness and Observability
- Priority: `P1`
- Category: Reliability, Observability
- Evidence:
  - `eventiq/src/lib/sync-queue.ts:110`
  - `eventiq/src/lib/sync-queue.ts:121`
- Problem:
  - Queue success accounting can report sent operations even when delete ops are malformed.
- Improvement:
  - Harden operation validation pre-execution.
  - Emit per-op result stats and expose queue depth/status to UI/admin tools.
- Acceptance criteria:
  - Queue sent/failed counts accurately reflect DB writes.
  - Status transitions are consistent and test-verified.

## IMP-008: Hardening for Third-Party Sync Semantics (`sheets-sync`)
- Priority: `P1`
- Category: Reliability, Integrations
- Evidence:
  - `eventiq/src/lib/sheets-sync.ts:46`
  - `eventiq/src/lib/sheets-sync.ts:52`
  - `eventiq/src/lib/sheets-sync.ts:115`
- Problem:
  - `no-cors` mode means transport success is treated as delivery success; failures remain invisible.
- Improvement:
  - Use a verifiable endpoint/proxy or response-signaling strategy.
  - Add retry policy, dead-letter handling, and operator visibility.
- Acceptance criteria:
  - Delivery status is measurable (not inferred from non-throwing fetch).
  - Retries are bounded and observable.

## IMP-009: Make Enrichment API Error Semantics Explicit
- Priority: `P1`
- Category: Reliability, UX
- Evidence:
  - `eventiq/src/app/api/enrich/route.ts:68`
  - `eventiq/src/app/api/enrich/route.ts:103`
  - `eventiq/src/lib/enrichment/apollo.ts:24`
- Problem:
  - Enrichment failures collapse into `enriched: false` with HTTP 200, obscuring operational issues (missing key/quota/network).
- Improvement:
  - Differentiate “no data found” from “integration failure”.
  - Return partial success with explicit per-company error reasons and top-level status.
- Acceptance criteria:
  - Client can distinguish transient errors vs true no-enrichment outcomes.
  - Operational alerts can be based on explicit failure signals.

## IMP-010: Ingestion Throughput and Reliability Improvements
- Priority: `P1`
- Category: Performance, Reliability
- Evidence:
  - `eventiq/src/lib/signal-ingest.ts:90`
  - `eventiq/src/lib/signal-ingest.ts:94`
  - `eventiq/src/lib/signal-ingest.ts:107`
  - `eventiq/src/lib/signal-ingest.ts:110`
- Problem:
  - Ingestion is strictly sequential with fixed sleeps, creating avoidable latency and brittle throughput scaling.
- Improvement:
  - Introduce bounded concurrency and per-source retry/backoff.
  - Track source-level runtime and error counts.
- Acceptance criteria:
  - Total ingestion runtime drops materially.
  - Source failures are isolated and observable.

## IMP-011: Restrict Ingestion Trigger Permissions
- Priority: `P0`
- Category: Security, Cost Control
- Evidence:
  - `eventiq/src/app/api/signals/ingest/route.ts:27`
  - `eventiq/src/app/api/signals/ingest/route.ts:37`
- Problem:
  - Any authenticated user can trigger a potentially expensive ingestion path if bearer secret is absent or not used.
- Improvement:
  - Enforce role-based authorization for manual triggers.
  - Require signed service token for scheduled jobs; add rate limits.
- Acceptance criteria:
  - Unauthorized users cannot initiate ingestion.
  - Trigger usage is auditable with actor identity.

## IMP-012: Fix Pipeline Initialization Timing Defect
- Priority: `P1`
- Category: Correctness
- Evidence:
  - `eventiq/src/app/page.tsx:209`
  - `eventiq/src/app/page.tsx:220`
- Problem:
  - Pipeline auto-inference runs once with intentionally disabled dependency tracking, risking incorrect initial state.
- Improvement:
  - Rework initialization to run when source data is ready and only once per meaningful dataset.
- Acceptance criteria:
  - Initial pipeline state is deterministic and reproducible.
  - No stale/empty initialization in normal load conditions.

## IMP-013: Ensure Briefing Scoring Includes Pipeline-only Candidates
- Priority: `P2`
- Category: Product Logic
- Evidence:
  - `eventiq/src/app/api/briefing/daily/route.ts:41`
  - `eventiq/src/app/api/briefing/daily/route.ts:77`
  - `eventiq/src/app/api/briefing/daily/route.ts:78`
- Problem:
  - Active pipeline records only receive boost if already present in score map from recent news, excluding valid candidates.
- Improvement:
  - Initialize score entries for active pipeline companies even without recent signals.
- Acceptance criteria:
  - Daily briefing can rank active pipeline companies with no recent news.

## IMP-014: Portable Tooling Paths for Data Integration Scripts
- Priority: `P1`
- Category: Developer Experience
- Evidence:
  - `integrate_research.py:14`
- Problem:
  - Script depends on a machine-specific absolute path, preventing portability and CI usage.
- Improvement:
  - Switch to CLI argument with default repo-relative path.
  - Document invocation in project docs.
- Acceptance criteria:
  - Script runs on any machine with repository checkout.

## IMP-015: Build a Test + CI Baseline
- Priority: `P1`
- Category: Quality, Release Safety
- Evidence:
  - `eventiq/package.json:5`
  - `eventiq/package.json:9`
- Problem:
  - No test script exists; regressions in sync, ingest, and API behavior are unguarded.
- Improvement:
  - Add unit/integration test harness and CI workflow for lint + tests.
- Acceptance criteria:
  - Pull requests are gated by automated checks.
  - Critical modules have baseline coverage.

## IMP-016: Remove Frontend-Embedded Credentials and Secrets
- Priority: `P0`
- Category: Security
- Evidence:
  - `eventiq/src/components/resources-tab.tsx:26`
  - `eventiq/src/components/resources-tab.tsx:27`
- Problem:
  - Credentials are embedded in a client component, so secrets are distributed to every browser and can be harvested.
- Improvement:
  - Move all sensitive credentials into secure secret storage.
  - Replace in-app plaintext credentials with secure references and access workflow.
  - Rotate exposed credentials immediately.
- Acceptance criteria:
  - No plaintext secrets in client bundle.
  - Credential rotation completed and logged.

## IMP-017: Build Contact Waterfall + Deliverability Confidence
- Priority: `P0`
- Category: Top of Funnel, Data Quality
- Evidence:
  - `eventiq/src/lib/types.ts:13`
  - `eventiq/src/lib/enrichment/apollo.ts:24`
  - `eventiq/src/components/company-detail.tsx`
- Problem:
  - Outreach quality is constrained when contacts lack reliable email/phone and confidence metadata.
- Improvement:
  - Introduce contact waterfall pipeline (source priority + validation state).
  - Store confidence flags and source attribution for each contact method.
  - Expose confidence in UI to guide rep action.
- Acceptance criteria:
  - Each key contact has source + confidence metadata.
  - Reps can filter to high-confidence reachable contacts.

## IMP-018: Campaign and Attribution Data Model
- Priority: `P0`
- Category: Demand Gen, Analytics
- Evidence:
  - `eventiq/src/lib/types.ts:114`
  - `eventiq/src/lib/engagement-helpers.ts:87`
  - `eventiq/src/lib/action-feed-helpers.ts:104`
- Problem:
  - No first-class campaign object or attribution chain from campaign touch to meeting/opportunity.
- Improvement:
  - Add campaign entities and campaign-touch events for company/contact engagements.
  - Track source, channel, medium, campaign, and touch timestamps.
  - Support sourced vs influenced attribution models.
- Acceptance criteria:
  - Every meeting/opportunity can be traced to campaign touch history.
  - Dashboard exposes campaign-to-pipeline conversion by segment.

## IMP-019: Intent Scoring V2 (Fit + Intent + Engagement)
- Priority: `P1`
- Category: Scoring, Prioritization
- Evidence:
  - `eventiq/src/lib/outreach-score.ts:52`
  - `eventiq/src/lib/morning-briefing-helpers.ts:45`
  - `eventiq/src/lib/signal-ingest.ts:55`
- Problem:
  - Current scoring is useful but primarily activity/priority-driven; it should include explicit intent reasons and time-decay logic.
- Improvement:
  - Expand scoring inputs to include signal types, campaign touches, role fit, and recency decay.
  - Emit reason codes for explainability (why this account now).
- Acceptance criteria:
  - Score includes decomposed components and reason codes.
  - Task queue and briefing consume the same scoring engine.

## IMP-020: Unified Outbox for BDR Execution
- Priority: `P1`
- Category: Workflow, Productivity
- Evidence:
  - `eventiq/src/lib/task-queue-helpers.ts:64`
  - `eventiq/src/components/task-queue-tab.tsx:127`
  - `eventiq/src/lib/sequence-helpers.ts:82`
- Problem:
  - Guidance exists, but execution still requires context switching across tools/channels.
- Improvement:
  - Add an outbox layer that packages the next action with prefilled message, contact target, and channel launch link.
  - Add completion feedback loop to learning system.
- Acceptance criteria:
  - BDR can execute next best task from one queue with one action.
  - Completed actions update engagement and sequence state automatically.

## IMP-021: Message and Sequence Experimentation Framework
- Priority: `P1`
- Category: Optimization, Experimentation
- Evidence:
  - `eventiq/src/lib/message-variants.ts:9`
  - `eventiq/src/lib/linkedin-message.ts:8`
  - `eventiq/src/lib/sequence-helpers.ts:82`
- Problem:
  - Variants are generated but there is no experiment framework to learn which messages convert.
- Improvement:
  - Add experiment IDs to messages/sequences and tie outcomes to meeting conversion.
  - Ship A/B/n analytics for variant performance by persona and segment.
- Acceptance criteria:
  - Variant performance is measurable.
  - Winning variants can be promoted automatically or manually.

## IMP-022: AE Buying Committee Intelligence Layer
- Priority: `P1`
- Category: AE Productivity, Deal Quality
- Evidence:
  - `eventiq/src/lib/threading-helpers.ts:41`
  - `eventiq/src/lib/briefing-helpers.ts:78`
  - `eventiq/src/lib/battlecard-helpers.ts:25`
- Problem:
  - Contact threading exists but lacks explicit decision-role mapping and gap detection for buying committee coverage.
- Improvement:
  - Add role tags (champion, decision-maker, blocker, influencer, evaluator).
  - Show coverage gaps and recommended next persona to engage.
- Acceptance criteria:
  - Each active deal has explicit committee role coverage.
  - Briefing surfaces missing critical stakeholders.

## IMP-023: Demand Gen Segment Builder + Export Pipeline
- Priority: `P1`
- Category: Demand Gen, Ops
- Evidence:
  - `eventiq/src/components/company-list.tsx:143`
  - `eventiq/src/lib/market-map-helpers.ts:175`
  - `eventiq/src/hooks/use-synced-storage.ts:230`
- Problem:
  - Useful filters exist but not a full segment builder and repeatable campaign export workflow.
- Improvement:
  - Add saved audience segments with combinatorial filters (type, tags, heat, intent score, geography, size).
  - Add export jobs with schema presets for CRM/ad platforms.
- Acceptance criteria:
  - Demand gen can create, save, and export target audiences in minutes.
  - Exported data includes quality/confidence and campaign metadata.

## IMP-024: RevOps Dashboard and SLA Layer
- Priority: `P1`
- Category: Revenue Operations, Governance
- Evidence:
  - `eventiq/src/components/dashboard-tab.tsx`
  - `eventiq/src/lib/task-queue-helpers.ts:64`
  - `eventiq/src/lib/hubspot-client.ts:98`
- Problem:
  - No explicit SLA framework for lead response, follow-up cadence, or stage aging accountability.
- Improvement:
  - Add SLA definitions and breach alerts by team/owner.
  - Add sourced/influenced pipeline and stage velocity dashboards.
- Acceptance criteria:
  - GTM leadership can monitor SLA adherence and funnel health daily.
  - Alerts fire on lead response delay, stale opportunities, and sync failures.

## IMP-025: RICP Coverage Enrichment Loop (COO/CRO/Underwriting)
- Priority: `P0`
- Category: Data Enrichment, Top of Funnel
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx`
  - `eventiq/src/lib/types.ts:13`
  - `eventiq/src/data/all-companies.json`
- Problem:
  - High-priority accounts still lack named COO/CRO/underwriting contacts, blocking high-quality personalization and slowing meeting conversion.
- Improvement:
  - Add a recurring enrichment loop focused on RICP roles for SQO/Client/ICP accounts.
  - Prioritize by account score and signal heat.
  - Add confidence/source fields for newly added profiles.
- Acceptance criteria:
  - >=85% RICP coverage for SQO/Client/ICP accounts.
  - Every top-priority account has at least one validated RICP with source metadata.

## Recommended Execution Order
1. `P0` security/reliability core: IMP-002, IMP-003, IMP-005, IMP-006, IMP-011, IMP-016
2. `P0` top-of-funnel data foundation: IMP-017, IMP-018, IMP-025
3. `P1` reliability/UX + growth execution: IMP-004, IMP-007, IMP-008, IMP-009, IMP-010, IMP-012, IMP-019, IMP-020
4. `P1` optimization and scale: IMP-021, IMP-022, IMP-023, IMP-024, IMP-014, IMP-015
5. `P2` logic quality: IMP-013

## Tracking Template (for each improvement)
- Status: `not started` | `in progress` | `blocked` | `done`
- Owner:
- Target sprint:
- Linked bug IDs:
- Validation artifact:
- Rollback plan:

## IMP-026: Add RICP Verification Schema to Leader Records
- Priority: `P0`
- Category: Data Model, Top of Funnel
- Evidence:
  - `eventiq/src/lib/types.ts:13`
  - `eventiq/src/lib/types.ts:21`
  - `eventiq/scripts/merge-enrichment.js:75`
- Problem:
  - Leader/contact records do not carry source URL, verification date, or confidence metadata, so RICP entries cannot be reliably trusted for outbound sequencing.
- Improvement:
  - Extend leader/contact schema with verification fields (`sourceUrl[]`, `verifiedAt`, `confidence`, `functionalRole`).
  - Require these fields for newly enriched COO/CRO/underwriting records.
- Acceptance criteria:
  - Every net-new RICP record includes provenance and confidence.
  - Outbound queue can filter by confidence threshold.

## IMP-027: Live RICP Gap Reconciler (Supabase as Source of Truth)
- Priority: `P0`
- Category: GTM Operations, Reliability
- Evidence:
  - `eventiq/docs/live-targeting-snapshot-2026-02-23.json:3`
  - `eventiq/src/data/all-companies.json`
  - `eventiq/scripts/merge-enrichment.js:143`
- Problem:
  - GTM prioritization currently relies on mixed snapshots and local files, causing drift in who gets worked first.
- Improvement:
  - Add a scheduled reconciler that computes RICP coverage from live Supabase and emits a canonical top-gap queue for BDR/marketing.
  - Persist each run with timestamped metrics and queue output.
- Acceptance criteria:
  - One canonical ranked RICP gap list exists per day.
  - Daily coverage metric is trackable and comparable week-over-week.

## IMP-028: RICP Enrichment SLA + Sequence Gating
- Priority: `P0`
- Category: Process, Conversion
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx:202`
  - `eventiq/src/components/marketing-ideas-tab.tsx:307`
  - `ROADMAP.md`
- Problem:
  - High-signal accounts can move into sequences without required RICP depth, weakening personalization and lowering meeting/SQL conversion.
- Improvement:
  - Define enrichment SLA for top cohorts: top 10 in 24h, top 25 in 72h.
  - Enforce sequence launch gate: at least one validated RICP profile required for top-priority accounts.
- Acceptance criteria:
  - No top-priority account enters full sequence without validated RICP.
  - Meeting and SQL rates can be sliced by `ricp_coverage_state` (`missing`, `partial`, `validated`).

## IMP-029: RICP Title Taxonomy and Normalization Layer
- Priority: `P1`
- Category: Data Quality
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx:26`
  - `eventiq/src/components/marketing-ideas-tab.tsx:94`
- Problem:
  - Current regex-driven matching is narrow and can miss role-adjacent titles, creating false gap flags and queue noise.
- Improvement:
  - Build a controlled taxonomy for role equivalents (COO, risk, credit, underwriting families) and normalize incoming titles before coverage checks.
  - Store both raw and normalized title values.
- Acceptance criteria:
  - False-negative RICP classification rate decreases measurably.
  - Coverage reports are stable despite title variation.

## IMP-030: Company Canonicalization + Duplicate Identity Resolution
- Priority: `P0`
- Category: Data Quality, GTM Accuracy
- Evidence:
  - `eventiq/src/data/all-companies.json`
  - `eventiq/scripts/merge-research.js:74`
  - `eventiq/scripts/merge-enrichment.js:71`
- Problem:
  - Name normalization is lightweight and can still allow duplicate or fragmented account identities across local files and live data.
- Improvement:
  - Introduce canonical company identity keys and deterministic dedupe rules.
  - Track alias names and merged-record lineage.
- Acceptance criteria:
  - Duplicate account rate drops materially.
  - Ranking and enrichment queues operate on one canonical record per account.

## IMP-031: Contactability Waterfall with Verification Confidence
- Priority: `P0`
- Category: Data Enrichment, Conversion
- Evidence:
  - `eventiq/src/lib/types.ts:19`
  - `eventiq/src/lib/types.ts:20`
  - `eventiq/src/components/marketing-ideas-tab.tsx`
- Problem:
  - Contact records lack structured deliverability confidence and channel preference, causing wasted outreach attempts.
- Improvement:
  - Implement channel waterfall (`email -> linkedin -> phone -> event intro`) with confidence scores and last-verified dates.
  - Mark risky records to prevent low-quality sequence entry.
- Acceptance criteria:
  - Top-priority accounts have at least one high-confidence reachable channel.
  - Bounce/invalid outreach rates trend down.

## IMP-032: Signal Freshness and Persona-Relevance Layer
- Priority: `P0`
- Category: Intent Intelligence
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx:107`
  - `eventiq/src/components/marketing-ideas-tab.tsx:114`
  - `eventiq/src/components/marketing-ideas-tab.tsx:117`
- Problem:
  - Signal scoring uses text heuristics but does not persist freshness buckets and role relevance for downstream campaign/action logic.
- Improvement:
  - Add structured signal metadata (`signal_type`, `freshness_bucket`, `persona_relevance`).
  - Use metadata in ranking and sequence routing.
- Acceptance criteria:
  - Every high-priority account has structured signal recency and persona mapping.
  - Daily queue decisions are explainable by signal metadata.

## IMP-033: Sub-Vertical + Segment Taxonomy for Demand Gen Precision
- Priority: `P1`
- Category: Segmentation, Demand Gen
- Evidence:
  - `eventiq/src/lib/types.ts:112`
  - `eventiq/src/components/company-list.tsx:143`
  - `ROADMAP.md`
- Problem:
  - `SQO/Client/ICP/TAM` is useful but insufficient for precise demand-gen campaigns across the 1,000-account universe.
- Improvement:
  - Add sub-vertical tags (for example MCA, factoring, equipment finance, embedded lending, CDFI).
  - Add segment-level messaging and offer mappings.
- Acceptance criteria:
  - Marketing can pull campaign-ready segments with persona and signal filters.
  - Segment-level meeting/SQL performance is measurable.

## IMP-034: Enrichment QA Scorecard + Blocker Rules
- Priority: `P0`
- Category: Governance, Data Quality
- Evidence:
  - `ROADMAP.md`
  - `bugs.md`
  - `eventiq/scripts/merge-enrichment.js:103`
- Problem:
  - Enrichment merges can add records with minimal structural checks, which allows low-quality personas into execution flows.
- Improvement:
  - Create QA scorecard per account (coverage, confidence, freshness, channel quality).
  - Add blocker rules that prevent sequence launch when score is below threshold.
- Acceptance criteria:
  - Every top-priority account has QA score and state (`blocked`, `ready`, `review`).
  - Sequence launches honor blocker rules.

## IMP-035: Enrichment Ops Queue with Owner and SLA Tracking
- Priority: `P1`
- Category: RevOps, Execution
- Evidence:
  - `ROADMAP.md:497`
  - `ROADMAP.md`
  - `eventiq/src/components/marketing-ideas-tab.tsx:202`
- Problem:
  - Prioritized gap queues exist, but ownership/SLA execution is not consistently captured for operational accountability.
- Improvement:
  - Add enrichment task queue with owner, due date, SLA bucket, and completion status.
  - Track throughput and aging by owner/team.
- Acceptance criteria:
  - Every gap account has an assigned owner and SLA status.
  - Weekly review can identify bottlenecks by queue aging.

## IMP-036: Top-44 Account Enrichment Playbook Artifact
- Priority: `P0`
- Category: Execution, GTM Operations
- Evidence:
  - `ROADMAP.md:497`
  - `ROADMAP.md:572`
  - `bugs.md:313`
- Problem:
  - The ranked gap queue exists, but there is no single execution artifact that captures per-account ownership, role gaps, and QA completion state.
- Improvement:
  - Create and maintain a structured playbook for all 44 no-RICP accounts with required fields: missing role(s), owner, SLA bucket, source targets, validation state, and unblock date.
- Acceptance criteria:
  - 100% of no-RICP accounts appear in playbook with owner + SLA.
  - Daily standup can track progress directly from one artifact.

## IMP-037: Enrichment Schema Contract + Validation Gate
- Priority: `P0`
- Category: Data Governance
- Evidence:
  - `eventiq/src/lib/types.ts:13`
  - `eventiq/scripts/merge-enrichment.js:103`
  - `bugs.md:460`
- Problem:
  - Enrichment records can be appended without strict required-field checks, allowing low-trust or incomplete persona data.
- Improvement:
  - Define a schema contract for enriched personas and enforce pre-merge validation.
  - Reject or quarantine records missing required provenance/freshness fields.
- Acceptance criteria:
  - Invalid enrichment payloads cannot enter canonical data.
  - Validation errors are explicit and reviewable.

## IMP-038: Deterministic Confidence Scoring Model
- Priority: `P0`
- Category: Data Quality, Conversion
- Evidence:
  - `ROADMAP.md:622`
  - `bugs.md:330`
  - `bugs.md:418`
- Problem:
  - Confidence is conceptually required but not consistently modeled, making sequence quality controls inconsistent.
- Improvement:
  - Define confidence score rubric using source trust, recency, and cross-source match.
  - Map numeric score to `high`/`medium`/`low` and make routing decisions depend on it.
- Acceptance criteria:
  - Every enriched persona has reproducible confidence level.
  - Sequence gating uses confidence thresholds consistently.

## IMP-039: Freshness Policy and Auto Re-Verification Queue
- Priority: `P0`
- Category: Data Hygiene
- Evidence:
  - `ROADMAP.md:632`
  - `bugs.md:418`
- Problem:
  - No automatic re-verification cycle exists, so records can decay silently.
- Improvement:
  - Define freshness windows by account tier and generate re-verification tasks automatically for stale records.
- Acceptance criteria:
  - Stale persona rate declines week-over-week.
  - Re-verification queue is generated and owned weekly.

## IMP-040: Company and Person Entity Resolution Layer
- Priority: `P1`
- Category: Data Integrity
- Evidence:
  - `eventiq/scripts/merge-research.js:74`
  - `eventiq/scripts/merge-enrichment.js:71`
  - `bugs.md:371`
- Problem:
  - Lightweight normalization can leave account aliases and person duplicates unresolved.
- Improvement:
  - Introduce canonical IDs, alias tables, and person identity matching rules.
- Acceptance criteria:
  - Duplicate entities are reduced and explicitly traceable.
  - Coverage and ranking outputs stabilize across refreshes.

## IMP-041: Role-Specific Messaging Asset Generator
- Priority: `P1`
- Category: BDR/AE Enablement
- Evidence:
  - `ROADMAP.md:612`
  - `eventiq/src/lib/types.ts:23`
- Problem:
  - Enriched data is not consistently converted into role-targeted outreach assets.
- Improvement:
  - Generate role + signal-aware hooks, CTAs, and objection-safe openers per account.
- Acceptance criteria:
  - Each top-priority account has minimum messaging asset set per target role.
  - First-touch prep time decreases materially.

## IMP-042: Enrichment Ops KPI Dashboard Spec
- Priority: `P1`
- Category: RevOps, Observability
- Evidence:
  - `ROADMAP.md:676`
  - `ROADMAP.md:678`
- Problem:
  - Enrichment outcomes are not centrally measured with operational and revenue-linked metrics.
- Improvement:
  - Define dashboard spec with leading/lagging enrichment KPIs and weekly review cadence.
- Acceptance criteria:
  - Dashboard exposes coverage, freshness, reachability, blocked sequences, and conversion splits.
  - Leadership can evaluate enrichment ROI weekly.

## IMP-043: Enrichment Uplift Measurement Framework
- Priority: `P0`
- Category: Analytics, Decision Science
- Evidence:
  - `ROADMAP.md:685`
  - `ROADMAP.md:686`
- Problem:
  - Current planning assumes enrichment impact without a rigorous measurement framework.
- Improvement:
  - Define enriched vs control cohorts and measure meeting/SQL lift with clear attribution windows.
- Acceptance criteria:
  - Uplift is measurable and statistically interpretable.
  - Budget and prioritization decisions use measured impact, not intuition.

## IMP-044: Claude Handoff Pack for Enrichment Implementation
- Priority: `P1`
- Category: Delivery, Collaboration
- Evidence:
  - `ROADMAP.md:392`
  - `ROADMAP.md:572`
- Problem:
  - Parallel implementation can drift without a tightly scoped handoff document.
- Improvement:
  - Create implementation pack with prioritized tickets, dependency order, data contracts, and test acceptance criteria.
- Acceptance criteria:
  - Claude implementation starts with minimal ambiguity.
  - Delivered work maps directly back to roadmap and bug IDs.

## IMP-045: 30-Day Enrichment Execution Calendar
- Priority: `P1`
- Category: Program Management
- Evidence:
  - `ROADMAP.md:636`
  - `ROADMAP.md:638`
- Problem:
  - Weekly goals exist but daily execution cadence is not fully operationalized.
- Improvement:
  - Build a day-by-day 30-day plan with owners, deliverables, and checkpoint reviews.
- Acceptance criteria:
  - Daily execution status is transparent and auditable.
  - Weekly targets are achieved with predictable throughput.

---

## Kiket UX Improvements (v3.1.83+)

## IMP-046: Kiket User Attribution in Memory
- Priority: `P0`
- Status: `not started`
- Category: Kiket, Memory, Multi-User
- Problem:
  - Kiket does not track WHO shared specific information. When 5 team members chat with Kiket, it should know "Kishore told me X" and "Sanjay told me Y" so users can ask "who shared this info?"
- Improvement:
  - Extend Kiket's memory protocol to tag every stored insight with the user who provided it.
  - When users ask "who told you about X?", Kiket should cite the source user and conversation.
  - Memory files should include attribution metadata: `{user, timestamp, sessionKey}`.
- Acceptance criteria:
  - Kiket can answer "who told you about company X?" with the correct user name.
  - Memory entries include user attribution tags.
  - Works across all 5 team members' sessions.

## IMP-047: Auto-Collapse Sidebar When Kiket Chat Opens
- Priority: `P1`
- Status: `not started`
- Category: Kiket, Layout, UX
- Evidence:
  - `eventiq/src/app/page.tsx` (chat panel state management)
  - `eventiq/src/components/app-sidebar.tsx`
- Problem:
  - With sidebar + company list + detail + Kiket panel, only 3 panels fit comfortably. When Kiket opens, the sidebar should auto-collapse to icon mode.
- Improvement:
  - When `isChatOpen` becomes true, call `sidebar.setOpen(false)` to collapse to icon mode.
  - When Kiket closes, optionally restore sidebar to previous state.
- Acceptance criteria:
  - Opening Kiket automatically collapses sidebar to icon mode.
  - All 4 panels fit without horizontal overflow.

## IMP-048: Kiket Avatar Image
- Priority: `P1`
- Status: `not started`
- Category: Kiket, Branding
- Evidence:
  - `/Users/kishore/Downloads/kiket.jpg` (1024x1024 red panda character)
  - `eventiq/src/components/missioniq-chat.tsx:168` (current "K" text avatar)
  - `eventiq/src/components/app-sidebar.tsx:178` (sidebar Kiket button)
  - `eventiq/src/components/chat-message.tsx` (message avatar)
- Problem:
  - Kiket currently uses a plain "K" text avatar. The user has a designed red panda mascot image that should be used instead.
- Improvement:
  - Copy `kiket.jpg` to `public/kiket-avatar.jpg` (optimized/resized for web).
  - Replace all "K" text avatars with the image: sidebar button, chat header, chat messages, empty state.
- Acceptance criteria:
  - Kiket's red panda avatar appears in sidebar, chat header, assistant messages, and empty state.
  - Image is optimized for web (compressed, appropriate size).

## IMP-049: Deal Value Field in Company Detail
- Priority: `P1`
- Status: `not started`
- Category: Pipeline, Data Model
- Evidence:
  - `eventiq/src/components/company-detail.tsx`
  - `eventiq/src/lib/types.ts`
- Problem:
  - Companies in pipeline have no deal value field. Users need to track expected revenue per deal.
- Improvement:
  - Add `dealValue?: number` to Company type or pipeline record.
  - Add editable deal value field in company detail panel (pipeline section).
  - Display deal value in pipeline board cards.
  - Persist via localStorage + Supabase sync.
- Acceptance criteria:
  - Users can set/edit deal value per company.
  - Deal value displays on pipeline board.
  - Values persist across sessions.

## IMP-050: Make Companies the Default Tab
- Priority: `P1`
- Status: `done` (v3.1.84)
- Category: Navigation, UX
- Evidence:
  - `eventiq/src/components/app-sidebar.tsx:58` (Mission Control is first nav item)
  - `eventiq/src/app/page.tsx` (initial tab state)
- Problem:
  - Mission Control is the default first tab, but Companies is the most frequently used view and should be the default.
- Improvement:
  - Reorder `coreNavItems` to put Companies first (shortcut "1").
  - Change default `activeTab` state to `"companies"`.
- Acceptance criteria:
  - App opens to Companies tab by default.
  - Companies has keyboard shortcut "1".

## IMP-051: Combine Mission Control and Today into Single Page
- Priority: `P2`
- Status: `not started`
- Category: Navigation, UX, Architecture
- Evidence:
  - `eventiq/src/components/app-sidebar.tsx:58-62` (separate Mission Control and Today tabs)
  - `eventiq/src/components/mission-control-tab.tsx`
  - `eventiq/src/components/schedule-tab.tsx`
- Problem:
  - Mission Control and Today (schedule/checklist) are separate tabs but conceptually related. Combining them reduces navigation friction and creates a more useful daily command center.
- Improvement:
  - Design a unified "Command Center" view that integrates morning briefing, today's schedule, and active tasks.
  - Remove redundant navigation entry.
- Acceptance criteria:
  - Single unified page replaces two separate tabs.
  - All functionality from both views is preserved.
  - Navigation is simplified.

## IMP-052: Persistent Kiket Across All Tabs
- Priority: `P1`
- Status: `not started`
- Category: Kiket, Layout, Architecture
- Evidence:
  - `eventiq/src/app/page.tsx` (Kiket panel lives inside main page conditional rendering)
- Problem:
  - Kiket chat panel is currently only visible when on the Companies tab. It should be accessible from any tab (Pipeline, Map, Resources, etc.).
- Improvement:
  - Move Kiket panel rendering to the top-level layout, outside of tab-specific content.
  - Maintain WebSocket connection across tab switches.
  - Chat state (messages, conversation) persists when switching tabs.
- Acceptance criteria:
  - Kiket panel stays open when switching between any tabs.
  - WebSocket connection is not interrupted by tab changes.
  - Chat history is preserved across navigation.

## IMP-054: Expose HubSpot APIs to Kiket
- Priority: `P1`
- Status: `not started`
- Category: Kiket, Integrations, CRM
- Problem:
  - Kiket cannot access HubSpot CRM data (deals, contacts, activities, pipeline). Team members need to switch between EventIQ and HubSpot for a complete picture.
- Improvement:
  - Add HubSpot API tool endpoints (search contacts, get deals, list activities, update deal stage).
  - Register HubSpot tools in OpenClaw's skill config so Kiket can query CRM data.
  - Enable queries like "what's the deal status with X?" or "show me recent HubSpot activity for Y."
- Acceptance criteria:
  - Kiket can search HubSpot contacts and companies.
  - Kiket can read deal pipeline and stage information.
  - Kiket can report on recent CRM activities for an account.

## IMP-053: Deep-Linking from Kiket Responses
- Priority: `P2`
- Status: `not started`
- Category: Kiket, Navigation, UX
- Evidence:
  - `eventiq/src/components/chat-message.tsx` (markdown renderer)
  - `eventiq/src/app/page.tsx` (tab/company selection state)
- Problem:
  - When Kiket mentions a company or leader (e.g., "The leaders at Fortun Advance are..."), users should be able to click to navigate directly to that company's detail view.
- Improvement:
  - Kiket should emit structured entity references in responses (company names, leader names).
  - Chat message renderer should detect company/leader mentions and make them clickable.
  - Clicking navigates to the Companies tab with that company selected and detail panel open.
- Acceptance criteria:
  - Company names in Kiket responses are clickable links.
  - Clicking navigates to company detail view.
  - Works for both company names and leader names (navigates to parent company).
