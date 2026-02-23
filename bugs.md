# EventIQ Bug Register

This file tracks confirmed and high-confidence bugs/gaps observed in the current codebase. Each entry includes evidence, impact, reproduction, and multiple fix options.

## Severity Scale
- `Critical`: security/data-loss/high-cost execution risk.
- `High`: significant reliability or correctness issue.
- `Medium`: degraded behavior or maintainability risk.
- `Low`: minor issue.

---

## BUG-001: `companyId` in documents GET is not strictly validated
- Severity: `High`
- Evidence:
  - `eventiq/src/app/api/documents/route.ts:48`
- Why this is a bug:
  - `parseInt(companyId)` is used without strict numeric validation. Invalid values can produce unintended query input.
- Impact:
  - Inconsistent results for malformed requests and unclear client error behavior.
- Reproduction:
  1. Call `GET /api/documents?companyId=abc`.
  2. Observe non-deterministic behavior instead of clean `400`.
- Fix options:
  1. Strict-parse and reject non-integer values before query execution.
  2. Add route schema validation for query params.
  3. Add shared helper for numeric param parsing across API routes.
- Recommended fix:
  - Option 2 with reusable validator and explicit error code.

## BUG-002: `docId` delete path can accept malformed IDs
- Severity: `High`
- Evidence:
  - `eventiq/src/app/api/documents/route.ts:143`
  - `eventiq/src/app/api/documents/route.ts:144`
- Why this is a bug:
  - Delete uses `parseInt(docId)` without strict validation, which can accept malformed strings and create ambiguous behavior.
- Impact:
  - Deletion attempts may silently fail or target unexpected parsed values.
- Reproduction:
  1. Call `DELETE /api/documents?id=12abc`.
  2. Observe request proceeds to query instead of immediate `400`.
- Fix options:
  1. Require `/^\d+$/` before parsing.
  2. Convert to typed route validation with coercion + bounds checks.
  3. Use UUID/opaque IDs to avoid permissive integer parsing.
- Recommended fix:
  - Option 2 for consistency with other route validations.

## BUG-003: Document access scope is not explicitly enforced
- Severity: `Critical`
- Evidence:
  - `eventiq/src/app/api/documents/route.ts:46`
  - `eventiq/src/app/api/documents/route.ts:92`
  - `eventiq/src/app/api/documents/route.ts:95`
- Why this is a bug:
  - Read and insert operations use company ID and authenticated user but do not demonstrate explicit tenant/team ownership policy enforcement.
- Impact:
  - Potential cross-scope data exposure depending on expected tenancy model.
- Reproduction:
  1. Authenticate as user A.
  2. Query docs for another company ID not intended for user A.
  3. If data returns, scope policy is violated.
- Fix options:
  1. Add user/team/company ownership joins in route queries.
  2. Enforce DB-level RLS policies for `company_documents`.
  3. Introduce access-control middleware helper used by document routes.
- Recommended fix:
  - Option 2 plus Option 3 for defense in depth.
- Note:
  - If documents are intentionally global-per-company, convert this into a documented policy and explicit allow-list decision.

## BUG-004: Companies API masks backend misconfiguration as successful empty data
- Severity: `High`
- Evidence:
  - `eventiq/src/app/api/companies/route.ts:31`
  - `eventiq/src/app/api/companies/route.ts:32`
- Why this is a bug:
  - Missing Supabase server client returns `200 []`, hiding infrastructure issues as valid business result.
- Impact:
  - Silent outage and debugging confusion.
- Reproduction:
  1. Remove/invalid `SUPABASE_SERVICE_KEY`.
  2. Call `/api/companies`.
  3. Observe empty array instead of operational error.
- Fix options:
  1. Return `503` with explicit error payload.
  2. Add health indicator payload and degrade UI gracefully.
  3. Emit structured error log with environment diagnostics.
- Recommended fix:
  - Option 1 + Option 3.

## BUG-005: Home page hides company-load failures behind console warning
- Severity: `High`
- Evidence:
  - `eventiq/src/app/page.tsx:72`
  - `eventiq/src/app/page.tsx:80`
- Why this is a bug:
  - User receives no visible failure state when `/api/companies` fails.
- Impact:
  - Empty/partial UI with no recovery guidance.
- Reproduction:
  1. Force `/api/companies` to return 500.
  2. Load home page.
  3. Observe no user-facing error state.
- Fix options:
  1. Add visible error banner with retry control.
  2. Add fallback cached dataset indication.
  3. Add telemetry for failed startup fetch.
- Recommended fix:
  - Option 1 + Option 3.

## BUG-006: Sync merge strategy can overwrite newer local edits
- Severity: `Critical`
- Evidence:
  - `eventiq/src/hooks/use-synced-storage.ts:364`
  - `eventiq/src/hooks/use-synced-storage.ts:380`
- Why this is a bug:
  - Remote data is favored in record/scalar shapes without explicit version comparison; local writes may be lost during hydration/reconnect.
- Impact:
  - Data loss risk in offline-first workflow.
- Reproduction:
  1. Edit local state offline.
  2. Reconnect with stale remote snapshot.
  3. Observe local edits overwritten by merge outcome.
- Fix options:
  1. Add per-record timestamps/version vectors and merge by recency.
  2. Track local pending writes and protect them from remote overwrite until ack.
  3. Implement conflict queue requiring explicit resolution for collisions.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-007: Pipeline auto-inference effect can initialize with stale/empty inputs
- Severity: `Medium`
- Evidence:
  - `eventiq/src/app/page.tsx:209`
  - `eventiq/src/app/page.tsx:220`
- Why this is a bug:
  - Effect intentionally suppresses dependencies and runs once, which can execute before companies/hydrated state are ready.
- Impact:
  - Pipeline initialization may not reflect available company data.
- Reproduction:
  1. Fresh session with async company fetch latency.
  2. Observe inference runs once with incomplete inputs.
- Fix options:
  1. Gate inference on data readiness and explicit one-time flag.
  2. Include required dependencies with guards to prevent repeated resets.
  3. Move inference to a deterministic initialization function invoked after hydrate/load completion.
- Recommended fix:
  - Option 1.

## BUG-008: Sheets sync treats transport attempt as delivery success
- Severity: `High`
- Evidence:
  - `eventiq/src/lib/sheets-sync.ts:46`
  - `eventiq/src/lib/sheets-sync.ts:52`
  - `eventiq/src/lib/sheets-sync.ts:115`
- Why this is a bug:
  - `no-cors` mode prevents reading response status; current logic returns `true` on non-throwing fetch, masking server-side failures.
- Impact:
  - Data sync failures become silent and unrecoverable from UX perspective.
- Reproduction:
  1. Point config URL to endpoint returning 500.
  2. Trigger sync.
  3. Observe function still reports success if fetch does not throw.
- Fix options:
  1. Use CORS-enabled proxy endpoint with verifiable response.
  2. Add webhook acknowledgement pattern for delivery confirmation.
  3. Treat no-cors sends as unverified and queue until confirmation channel succeeds.
- Recommended fix:
  - Option 1.

## BUG-009: Sync queue delete op can increment success without executing delete
- Severity: `Medium`
- Evidence:
  - `eventiq/src/lib/sync-queue.ts:110`
  - `eventiq/src/lib/sync-queue.ts:112`
  - `eventiq/src/lib/sync-queue.ts:121`
- Why this is a bug:
  - If delete op lacks `id`, no query is executed but `sent++` still occurs.
- Impact:
  - False-positive sync success metrics and hidden queue data integrity issues.
- Reproduction:
  1. Enqueue delete op with missing `id`.
  2. Flush queue.
  3. Observe success count increments.
- Fix options:
  1. Validate op payload before execution and fail fast.
  2. Count success only when DB response confirms execution.
  3. Add typed delete filter schema that cannot be empty.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-010: Enrichment endpoint hides integration failures under HTTP 200
- Severity: `High`
- Evidence:
  - `eventiq/src/app/api/enrich/route.ts:68`
  - `eventiq/src/app/api/enrich/route.ts:69`
  - `eventiq/src/app/api/enrich/route.ts:103`
  - `eventiq/src/lib/enrichment/apollo.ts:24`
- Why this is a bug:
  - External API failure and missing API key are flattened into `enriched: false` outcomes without clear error semantics.
- Impact:
  - UI and operators cannot distinguish expected no-data vs integration outage.
- Reproduction:
  1. Remove `APOLLO_API_KEY`.
  2. Call `/api/enrich`.
  3. Observe HTTP 200 with silent false-enrichment outcomes.
- Fix options:
  1. Return per-company error objects with status categories.
  2. Return partial-success response with top-level warning/error code.
  3. Fail request when integration is globally unavailable.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-011: Ingestion trigger lacks strict privilege boundary
- Severity: `High`
- Evidence:
  - `eventiq/src/app/api/signals/ingest/route.ts:27`
  - `eventiq/src/app/api/signals/ingest/route.ts:37`
  - `eventiq/src/app/api/signals/ingest/route.ts:53`
- Why this is a bug:
  - Any authenticated user can trigger ingestion when bearer secret path is not used, enabling potentially expensive or abusive job execution.
- Impact:
  - Cost/performance risk and ungoverned operational execution.
- Reproduction:
  1. Login as standard user.
  2. Invoke POST `/api/signals/ingest`.
  3. Observe ingestion runs.
- Fix options:
  1. Restrict to service token only.
  2. Add role-based check for privileged human triggers.
  3. Add rate limits and audit log for every trigger event.
- Recommended fix:
  - Option 2 + Option 3 (or Option 1 for strictest posture).

## BUG-012: Research integration script is tied to one machine path
- Severity: `Medium`
- Evidence:
  - `integrate_research.py:14`
- Why this is a bug:
  - Hard-coded absolute path blocks portability and automation.
- Impact:
  - Script fails on other dev environments and CI.
- Reproduction:
  1. Run script on a different machine/username path layout.
  2. Observe input file not found.
- Fix options:
  1. Use command-line arg for input path.
  2. Default to repository-relative `index.html`.
  3. Add environment variable override with fallback order.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-013: Daily briefing excludes active pipeline companies without recent news
- Severity: `Medium`
- Evidence:
  - `eventiq/src/app/api/briefing/daily/route.ts:41`
  - `eventiq/src/app/api/briefing/daily/route.ts:77`
  - `eventiq/src/app/api/briefing/daily/route.ts:78`
- Why this is a bug:
  - Pipeline boost applies only when company already exists in score map from recent news.
- Impact:
  - Outreach prioritization can miss active deals with no recent news signal.
- Reproduction:
  1. Set company to active pipeline stage.
  2. Ensure no recent `company_news` entries.
  3. Request daily briefing; company absent from results.
- Fix options:
  1. Seed score entries from active pipeline first.
  2. Merge candidate pools from both signals and pipeline before scoring.
  3. Add fallback minimum score for active stages.
- Recommended fix:
  - Option 2.

## BUG-014: Plaintext GTM Credentials Are Shipped in Client Bundle
- Severity: `Critical`
- Status: **FIXED** (v3.1.04, 2026-02-23)
- Evidence:
  - `eventiq/src/components/resources-tab.tsx:26`
  - `eventiq/src/components/resources-tab.tsx:27`
  - `eventiq/src/components/resources-tab.tsx:117`
- Why this is a bug:
  - Credentials are embedded in a `"use client"` component and rendered in the browser, meaning anyone with app access (or frontend artifact access) can retrieve secrets.
- Impact:
  - Credential compromise for third-party systems, unauthorized API usage, data exposure, and potential account takeover risk.
- Fix applied:
  - Removed all hardcoded credentials from `resources-tab.tsx` (client component)
  - Created server-side API route `/api/credentials` that returns credentials only to authenticated @hyperverge.co users
  - Credentials now stored in environment variables (`APOLLO_USERNAME`, `APOLLO_PASSWORD`, `LUSHA_USERNAME`, `LUSHA_PASSWORD`)
  - Client fetches credentials on demand via API — never shipped in JS bundle
  - **TODO:** Rotate exposed credentials after deployment, audit downstream access logs

## BUG-015: High-Priority Accounts Missing RICP Contacts (COO/CRO/Underwriting)
- Severity: `High`
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx`
  - Live Supabase snapshot (2026-02-23): 1023 accounts total; 973 missing RICP role coverage.
- Why this is a bug:
  - BDR and demand-gen execution depends on role-specific outreach to operational/risk buyers. Missing RICP contacts sharply reduces personalization quality and meeting conversion.
- Impact:
  - Slower top-of-funnel velocity, lower meeting rates, and weaker SQL quality due to non-targeted outreach.
- Reproduction:
  1. Pull account set from `companies` table.
  2. Filter high-priority cohorts (SQO/Client/ICP).
  3. Check for COO/CRO/Chief Credit/underwriting titles; many target accounts have no match.
- Fix options:
  1. Run weekly RICP enrichment sprints for top-ranked account cohorts.
  2. Add automated role-discovery pipeline with confidence and source fields.
  3. Gate sequence launch on minimum RICP coverage for high-priority accounts.
- Recommended fix:
  - Option 1 immediately, then Option 2 and Option 3.
- Baseline update (February 23, 2026, 13:18 UTC live read):
  - Current live `companies`: 1000
  - Priority cohort (`SQO`/`Client`/`ICP`, `priority <= 3`): 68
  - Missing RICP in priority cohort: 44
  - Coverage in priority cohort: 35.3%

---

## Immediate Attention Set
- `Critical`: BUG-003, BUG-006, BUG-014
- `High`: BUG-001, BUG-002, BUG-004, BUG-005, BUG-008, BUG-010, BUG-011, BUG-015

## Suggested Triage Sequence
1. Security boundaries and data loss risks.
2. User-visible reliability and truthfulness of API/sync outcomes.
3. Performance and logic-quality fixes.

## BUG-016: Leader Records Lack Verification Provenance for RICP Usage
- Severity: `High`
- Evidence:
  - `eventiq/src/lib/types.ts:13`
  - `eventiq/src/lib/types.ts:21`
  - `eventiq/scripts/merge-enrichment.js:99`
- Why this is a bug:
  - RICP records are used for outbound targeting but do not require source URL, verification timestamp, or confidence, making it hard to separate validated contacts from stale/unverified entries.
- Impact:
  - Lower personalization quality and avoidable meeting loss from role/title inaccuracies.
- Reproduction:
  1. Inspect `Leader` type and merged leader records.
  2. Observe absence of required provenance fields.
  3. Attempt confidence-filtered outreach; data model cannot support it.
- Fix options:
  1. Add provenance fields to leader/contact schema and enforce on write.
  2. Add a validation script that rejects incomplete RICP entries.
  3. Mark legacy entries as `unverified` until backfilled.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-017: RICP Detection Uses Narrow Title Regex and Can Miss Valid Personas
- Severity: `Medium`
- Evidence:
  - `eventiq/src/components/marketing-ideas-tab.tsx:26`
  - `eventiq/src/components/marketing-ideas-tab.tsx:94`
- Why this is a bug:
  - Coverage checks rely on a single regex and can miss role-adjacent titles, causing false “missing RICP” classification.
- Impact:
  - Research queue noise and mis-prioritized enrichment work.
- Reproduction:
  1. Add valid risk/credit persona with non-matching title variant.
  2. Run coverage calculation in marketing tab.
  3. Observe account still flagged as missing RICP.
- Fix options:
  1. Introduce a normalized title taxonomy for operations/risk/credit/underwriting.
  2. Store mapped `functionalRole` on each leader/contact.
  3. Use taxonomy + keyword fallback instead of regex-only matching.
- Recommended fix:
  - Option 1 + Option 2.

## BUG-018: Source-of-Truth Drift Between Local Files, Snapshots, and Live Supabase
- Severity: `High`
- Evidence:
  - `eventiq/src/data/all-companies.json`
  - `eventiq/docs/live-targeting-snapshot-2026-02-23.json:3`
  - Live read-only Supabase query on **February 23, 2026** returned `1000` companies.
- Why this is a bug:
  - GTM prioritization and RICP gap decisions can be made on inconsistent datasets (local: 1021, saved snapshot: 1023, live DB: 1000).
- Impact:
  - Account ranking drift, duplicate/outdated targeting, and distorted meeting/SQL tracking.
- Reproduction:
  1. Count entries in local `all-companies.json`.
  2. Read snapshot total in `live-targeting-snapshot-2026-02-23.json`.
  3. Query live `companies` table in Supabase.
  4. Compare totals and coverage outputs; mismatch observed.
- Fix options:
  1. Declare live Supabase as canonical source for daily targeting.
  2. Add nightly reconciliation job that reports drift and blocks stale exports.
  3. Version snapshots with source + timestamp metadata and expiry policy.
- Recommended fix:
  - Option 1 immediately, then Option 2.

## BUG-019: Enrichment Merge Prefers Longer Background Text, Not Newer/More Trustworthy Data
- Severity: `Medium`
- Evidence:
  - `eventiq/scripts/merge-enrichment.js:93`
  - `eventiq/scripts/merge-enrichment.js:95`
- Why this is a bug:
  - Merge logic updates leader background by string length only, which can keep stale but longer text over newer concise verified updates.
- Impact:
  - RICP context can degrade over time, reducing message quality and trustworthiness.
- Reproduction:
  1. Prepare enrichment with newer but shorter corrected background.
  2. Run merge script.
  3. Observe older longer background remains.
- Fix options:
  1. Compare by `verifiedAt` instead of text length.
  2. Add source-trust scoring and prefer higher-trust source on conflict.
  3. Keep revision history and allow explicit “authoritative overwrite” flag.
- Recommended fix:
  - Option 1 + Option 2.

## Immediate Attention Update (2026-02-23)
- Add to immediate high-priority queue:
  - `BUG-016` (missing RICP verification provenance)
  - `BUG-018` (source-of-truth drift)
