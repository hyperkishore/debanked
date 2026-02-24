# Research Repository

All research conducted by Claude agents is archived here for audit trail and future reference.

## Structure

```
research/
  companies/          # Per-company deep research reports (JSON)
                      # Named: {company-slug}-{date}.json
  audits/             # Data quality audits and systemic reviews
                      # Named: audit-{topic}-{date}.json
  batch-results/      # Batch agent results (from refresh pipeline)
                      # Named: {pipeline}-batch-{n}-{date}.json
```

## Company Research Format

Each company research file contains:
- `companyId` — ID in all-companies.json
- `companyName` — Company name at time of research
- `researchDate` — ISO date
- `claims` — Array of claims with verification status (VERIFIED/UPDATED/UNVERIFIABLE)
- `newFindings` — New data discovered
- `sources` — URLs and publication references
- `appliedToDataset` — Whether changes were merged into all-companies.json

## How to Use

When doing deep research on a company:
1. Save the full research output to `research/companies/{slug}-{date}.json`
2. Apply verified changes to `all-companies.json`
3. Reference the research file in the company's `source` array tag
