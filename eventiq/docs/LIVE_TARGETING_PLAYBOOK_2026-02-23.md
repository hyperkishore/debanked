# Live Targeting Playbook (Meetings + SQL)

Date: 2026-02-23  
Source of truth: Supabase `companies` (read-only live query)  
Total accounts: 1023

## Objective
Optimize for:
1. Meetings booked
2. SQLs generated

Secondary optimization:
- Marketing-attributed pipeline contribution
- BDR throughput without losing quality

## Account Ranking Method
Composite score blends:
- Account fit (`SQO`/`Client`/`ICP`, priority, clear/booth)
- Signal intensity (funding/facility/product/partnership/hiring/regulatory news)
- Reachability (presence of COO/CRO/chief credit/underwriting contacts)
- Research depth (leader coverage)

## Go-Now Cohort (Top 15)
1. BriteCap Financial (SQO, P1)  
2. FundKite (Client, P2)  
3. PIRS Capital (SQO, P1)  
4. Spartan Capital (ICP, P2)  
5. CFG Merchant Solutions (ICP, P2)  
6. Fundfi (Client, P2)  
7. Wing Lake Capital Partners (SQO, P1)  
8. Elevate Funding (ICP, P2)  
9. Velocity Capital Group (ICP, P2)  
10. Rapid Finance (ICP, P2)  
11. Forward Financing (ICP, P2)  
12. CapFlow Funding Group (ICP, P2)  
13. Credibly (ICP, P2)  
14. Bitty (SQO, P1)  
15. Vox Funding (ICP, P2)

Execution guidance:
- Run immediate multi-touch on top 12 (with known RICP contacts).
- For Credibly/Bitty/Vox, run quick RICP enrichment first, then launch full sequence.

## RICP Gap Queue (Highest Impact)
Accounts missing clear COO/CRO/chief credit/underwriting persona coverage:
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

Recommended enrichment sprint SLA:
- 24 hours: fill RICP for top 10
- 72 hours: fill top 25
- weekly: maintain >=85% RICP coverage in SQO/Client/ICP

RICP finder query template (per account):
- `site:linkedin.com/in "<Company>" ("COO" OR "Chief Operating Officer" OR "CRO" OR "Chief Risk Officer" OR "Chief Credit Officer" OR "Head of Underwriting")`
- `"<Company>" ("Chief Risk Officer" OR "Chief Credit Officer" OR "Head of Underwriting")`
- `"<Company>" leadership team risk underwriting operations`

## TAM Breakout (Expansion Pipeline)
Use these as parallel demand-gen targets while BDR focuses primary cohort:
1. Pursuit Lending
2. Republic Business Credit
3. Wingspire Capital
4. Financial Pacific Leasing
5. BHG Financial
6. Direct Funding Now LLC
7. National Business Capital
8. Novel Capital
9. 8FIG
10. Marco

## 30-Day Campaign Experiments

### 1) Trigger-Based Gift + Signal Sequence
- Trigger: funding, facility expansion, product launch, leadership changes
- Sequence:
  - Day 0: personalized gift + trigger-specific opener
  - Day 1: LinkedIn touch with same trigger
  - Day 3: email with benchmark insight
  - Day 6: call + role-specific CTA
- Primary KPI: meeting rate on triggered accounts

### 2) CRO/COO Underwriting Roundtable
- 8-10 invitees per cohort
- Topic: verification throughput, fraud stack design, credit-risk controls
- Primary KPI: attendee -> meeting conversion

### 3) Partner Co-Marketing Pod
- Co-run with CRM/LOS/ISO ecosystem partner
- Shared target account pod + shared recap asset
- Primary KPI: partner-sourced SQLs

### 4) Risk Benchmark Teardown
- Short benchmark note used as outbound CTA
- Personalized section by company type/sub-vertical
- Primary KPI: benchmark-assisted meetings

### 5) Event Follow-Up Sprint
- 10-day post-event cadence with role-specific prompts
- Primary KPI: event-contact SQL conversion in 30 days

## Operating Cadence
- Daily:
  - BDR works top task queue from Go-Now cohort
  - Marketing runs trigger scan and segment refresh
- Weekly:
  - Update target ranking from live DB
  - Refresh RICP gap queue
  - Review experiment KPI movement

## Handoff Notes for Claude Implementation
- Use `marketing` tab as operational cockpit for:
  - ranked go-now accounts
  - RICP gap queue
  - campaign ideas and KPIs
- Keep ranking logic centralized and reusable across dashboard/task queue later.
