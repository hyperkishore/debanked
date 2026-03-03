# EventIQ — Project Summary

> **Version:** 3.1.92 | **Team:** HyperVerge GTM | **Live:** [us.hyperverge.space](https://us.hyperverge.space)

---

## What Is EventIQ?

EventIQ is a **market intelligence + GTM execution platform** for HyperVerge's expansion into the small business lending market (MCA, SBA, equipment finance, revenue-based financing). It combines a rich company database with an AI conversational agent (Kiket) to help BD reps prepare for calls, run outreach, and close deals.

**The insight:** The $18-22B small business lending market has 200+ direct funders and 10,000+ ISOs, but no single tool combines deep company research, contact intelligence, and AI-powered outreach prep. EventIQ fills that gap.

---

## What It Does

### For BD/Sales
- **Pre-call prep:** "Tell me about Kapitus" → instant brief with icebreakers, talking points, leadership bios, recent news
- **Outreach drafting:** "Draft an email to Gabriel at NY Tribeca" → personalized outreach with selling angles
- **Pipeline tracking:** HubSpot-synced deal stages with value estimation

### For Product & Leadership
- **Market landscape:** 969+ companies across 7 categories (funders, ISOs, marketplaces, banks, tech, competitors, service providers)
- **TAM sizing:** Priority-tiered accounts (P0/SQO through TAM) with financial data
- **Competitive analysis:** Feature mapping, positioning gaps, pricing intelligence

### For the AI Agent (Kiket)
- **Conversational interface:** Chat widget in the dashboard, powered by Claude via OpenClaw
- **11 tool endpoints:** Company search, leader lookup, outreach briefs, market stats, news, FDIC bank data, SEC financials, SBA lending, HubSpot CRM, team notes, similar companies
- **Per-user memory:** Domain-separated memory (sales, marketing, product, solutions, decisions, people)

---

## The Data

| Metric | Count |
|--------|-------|
| Companies tracked | 969+ |
| Leaders profiled | 1,437+ |
| With LinkedIn URLs | 327+ |
| Deep-researched | 100% of companies with leaders |
| Company categories | 7 (funder, ISO, marketplace, bank, technology, competitor, service_provider) |
| Priority tiers | P0/SQO, P1/ICP, P2, TAM |

**Every company has:** description with real metrics, 2-4 leader profiles with backgrounds, 3-4 recent news items, 4 icebreaker variants, 3 talking points tied to HyperVerge value prop, personalized ask, selling angles, and contact information.

**Financial enrichment (v3.1.92):** FDIC bank data (assets, deposits, income), SEC EDGAR public filings (revenue, net income), SBA 7(a) lending volume — all free government APIs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API routes (serverless on Vercel) |
| Database | Supabase (PostgreSQL) |
| Auth | Google OAuth (@hyperverge.co) via Supabase Auth |
| AI Agent | OpenClaw gateway + Claude (Anthropic) |
| CRM Sync | HubSpot API (bidirectional) |
| Hosting | Vercel (auto-deploy from GitHub) |
| Agent Server | AWS EC2 (us-east-2) running OpenClaw gateway |

---

## Architecture

```
[Browser]
    |
    v
[Vercel / Next.js 16]
    |
    ├── /api/companies          → Supabase (company data)
    ├── /api/tools/*            → 11 tool endpoints (Kiket agent)
    ├── /api/hubspot/*          → HubSpot CRM sync
    └── /api/enrich, /api/ricp  → Enrichment pipeline
    |
    v
[Supabase PostgreSQL]          → companies, miq_* tables (conversations, messages, notes)
    |
[OpenClaw Gateway on EC2]      → Kiket agent (Claude-powered, per-user memory)
    |
[External APIs]                → FDIC, SEC EDGAR, SBA, HubSpot, Outplay
```

---

## Key Components

### Dashboard Tabs
| Tab | Purpose |
|-----|---------|
| Companies | Searchable/filterable company list with detail panels |
| Pipeline | HubSpot-synced deal board with stage management |
| Dashboard | Analytics: engagement tracking, data quality, activity feed |
| Feed | Signal feed: news, triggers, Why-Now events |
| Marketing | RICP coverage gaps, go-after ranking, ABM lists |
| Map | Geographic view of accounts |

### Kiket (AI Agent)
- Integrated right panel in the dashboard (resizable 300-700px)
- Queries EventIQ database via tool endpoints before falling back to web search
- Drafts emails, prepares call briefs, logs engagements
- Memory persists across sessions (14 domain files on EC2)

### Enrichment Pipeline
- **Research scripts:** Batch refresh with parallel Claude agents
- **Import pipeline:** Agent-driven CSV/TSV mapping → fuzzy merge
- **Financial APIs:** FDIC BankFind, SEC EDGAR, SBA 7(a) — free government data
- **Contact enrichment:** RICP role classification, contactability scoring

---

## Deployment

| Branch | Domain | Purpose |
|--------|--------|---------|
| `main` | us.hyperverge.space | Production (auto-deploy) |
| `missioniq` | us2.hyperverge.space | Preview (manual alias) |

**To deploy:** Push to `main` → Vercel auto-deploys in ~60s.

---

## Project Documentation Map

| Document | Purpose | Location |
|----------|---------|----------|
| **PROJECT.md** | This file — project overview | Root |
| **ROADMAP.md** | 11-part product vision + engineering plan | Root |
| **MissionIQ-PRD.md** | PRD for the AI agent layer (v2.0, approved) | Root |
| **improvements.md** | Structured improvement backlog (IMP-001+) | Root |
| **bugs.md** | Bug register with severity and fix options | Root |
| **AGENTS.md** | Quick technical context for AI sessions | Root |
| **eventiq/CLAUDE.md** | Full engineering reference (schema, patterns, rules) | eventiq/ |

---

## Revenue Model

| Tier | Price | Target |
|------|-------|--------|
| Individual | $29/mo | Solo BD reps |
| Team | $79/user/mo | BD teams (5-20) |
| Business | $149/user/mo | GTM organizations |
| Enterprise | Custom | Large sales orgs |
| Event Add-On | $199/event | One-time event prep |

**Current status:** Internal tool for HyperVerge's GTM team. Revenue model designed for eventual productization.

---

## What Makes It Different

1. **Deep research, not surface scraping** — Every company has manually verified business model analysis, not just LinkedIn descriptions
2. **AI agent with memory** — Kiket remembers past conversations, not just queries
3. **Free financial data** — FDIC, SEC, SBA government APIs provide real financial depth at zero cost
4. **Offline-capable** — PWA with service worker for event use without connectivity
5. **Private company intelligence** — Covers the long tail of SMB lenders that ZoomInfo/Apollo miss entirely
