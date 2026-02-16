# Import Drop Zone

Drop raw data files here for agent-driven import into EventIQ.

## Workflow

1. **Drop file** — Place your CSV, TSV, JSON, or Excel export here
2. **Tell Claude Code** — "Import the file in scripts/imports/mydata.csv"
3. **Agent maps fields** — Claude reads headers + sample data, reasons about mapping
4. **Agent produces JSON** — Saves mapped data as `import-mapped-*.json` in this directory
5. **Agent runs merge** — `node scripts/import-merge.js <mapped-file> --dry-run` then without `--dry-run`

## What's kept in git

- `README.md` — This file
- `import-mapped-*.json` — Agent-produced mapped data (clean, no PII)
- `import-log-*.json` — Merge logs (what matched, what was added)

## What's gitignored

- `*.csv`, `*.tsv`, `*.xlsx` — Raw exports (may contain PII)
- `*.tmp` — Temporary files

## Common sources

- HubSpot company/contact exports
- Google Sheets / Excel team lists
- LinkedIn Sales Navigator exports
- Conference attendee lists
