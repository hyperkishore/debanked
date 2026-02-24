# Research Repository

All research conducted by Claude agents is archived here for audit trail and future reference.

## Structure

```
research/
  companies/          # Per-company deep research reports (JSON)
                      # Named: {company-slug}-{date}.json
  audits/             # Data quality audits and systemic reviews
                      # Named: {topic}-{date}.json
  batch-results/      # Batch agent results (from enrichment pipelines)
    p0/               # P0/SQO company research (4 strategic accounts)
    p1-deep/          # P1/ICP deep research (198 companies, 5 parallel agents)
    p2-deep/          # P2 deep research (41 companies, 2 agents)
    tam/              # TAM company research (895 companies, 5 agents)
    enrich/           # Enrichment pipeline (hooks, LinkedIn, news)
    hooks/            # Standalone hooks generation (476 leaders)
    linkedin/         # LinkedIn URL research
    refresh/          # Latest news refresh pipeline
    cross-ref/        # Email outreach cross-referencing
    ricp/             # RICP enrichment
```

## Pipeline History

| Pipeline | Date | Batches | Results | Companies | Description |
|----------|------|---------|---------|-----------|-------------|
| p0 | 2026-02 | 5 | — | 4 | P0/SQO strategic account research inputs |
| p1-deep | 2026-02 | 5 | 5 | 198 | ICP deep research — leaders, news, hooks, LinkedIn |
| p2-deep | 2026-02 | 2 | 2 | 41 | P2 deep research |
| tam | 2026-02 | 5 | 5 | 895 | TAM market expansion |
| enrich | 2026-02 | 5 | 3 | ~243 | Enrichment — hooks + LinkedIn + news |
| hooks | 2026-02 | 5 | 5 | 476 leaders | Conversation hooks from web research |
| linkedin | 2026-02 | 5 | 5 | ~300 | LinkedIn profile URL discovery |
| refresh | 2026-02 | 5 | 5 | ~200 | Latest news refresh |
| cross-ref | 2026-02 | — | 1 | all | Email outreach cross-referencing |
| ricp | 2026-02-23 | — | 1 | — | RICP enrichment |

## Company Research Format

Each company research file contains:
- `companyId` — ID in all-companies.json
- `companyName` — Company name at time of research
- `researchDate` — ISO date
- `claims` — Array of claims with verification status (VERIFIED/UPDATED/UNVERIFIABLE)
- `newFindings` — New data discovered
- `sources` — URLs and publication references
- `appliedToDataset` — Whether changes were merged into all-companies.json

## Audit Format

Each audit file contains:
- `auditDate` — ISO date
- `totalCompanies` — Dataset size at time of audit
- `findings` — Categorized issues with counts, descriptions, fixes, and root causes
- `top20WorstOffenders` — Companies with the most data quality issues
- `highPriorityGaps` — ICP companies missing critical data
- `recommendations` — Actionable next steps

## How to Use

When doing deep research on a company:
1. Save the full research output to `research/companies/{slug}-{date}.json`
2. Apply verified changes to `all-companies.json`
3. Reference the research file in the company's `source` array tag

When running batch pipelines:
1. Generate batches with `scripts/refresh.js`
2. Agent results go to `research/batch-results/{pipeline}/`
3. Merge with the appropriate merge script (e.g. `merge-enrichment.js`)
