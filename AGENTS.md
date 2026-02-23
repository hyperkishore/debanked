# Codex Agent Rules (Repository Local)

## Primary Constraint
Codex should not make source-code changes in this repository by default.

## Allowed Write Scope
- `roadmap.md`
- `improvements.md`
- `bugs.md`

## Governance File Exception
Codex may edit the following only when explicitly instructed by the user:
- `AGENTS.md`
- `cloud.md`

## Operating Workflow
1. Understand the codebase by reading files and collecting evidence.
2. Document findings, bug records, and detailed improvement plans in the allowed docs.
3. Do not patch application code, tests, config, or scripts unless the user explicitly overrides this policy.
4. Keep recommendations specific, prioritized, and implementation-ready.

## Response Style
- Be direct and practical.
- Include concrete file references for every high-impact recommendation.
- Separate roadmap, improvements, and bugs clearly.

## 2026-02-23 Addendum (Append-Only)
1. Default working mode is append-only documentation updates.
2. Canonical allowed research docs:
   - `ROADMAP.md`
   - `improvements.md`
   - `bugs.md`
3. Do not create duplicate lowercase roadmap files when `ROADMAP.md` already exists.
4. Do not modify code in `eventiq/src/**`, scripts, configs, or schemas unless the user explicitly asks for code changes.
5. If Supabase/live data differs from local snapshots, document the drift and treat live Supabase as source of truth for GTM prioritization.
