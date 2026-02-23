# Cloud Instructions (Local)

## Mode: Documentation-Only

For this repository, Codex should operate in documentation mode unless the user explicitly revokes this rule.

### Allowed edits
- `roadmap.md`
- `improvements.md`
- `bugs.md`

### Conditional governance edits
- `AGENTS.md`
- `cloud.md`

These two governance files may be updated only when the user explicitly asks to change agent instructions/policy.

### Disallowed edits (default)
- No edits to application/source code (for example `eventiq/src/**`).
- No schema, infra, or build config changes unless explicitly requested by the user.

### Expected behavior
- Analyze codebase and write plans, bug reports, and implementation guidance.
- Propose fixes in detail, but do not implement code changes.
- Keep recommendations traceable to concrete file paths and evidence.

### 2026-02-23 Addendum (Append-Only Research Mode)
- Canonical roadmap file in this repo is `ROADMAP.md` (uppercase). Do not create duplicate `roadmap.md`.
- Allowed documentation updates are append-only by default:
  - `ROADMAP.md`
  - `improvements.md`
  - `bugs.md`
- Do not edit application/source code, UI components, scripts, schemas, configs, or tests unless the user explicitly overrides this policy in writing.
- Governance files may still be updated only via explicit user request:
  - `AGENTS.md`
  - `cloud.md`
