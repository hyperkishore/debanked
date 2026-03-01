# Kiket Agent — Server Backup & Migration Guide

Backup of the Kiket (missioniq) OpenClaw agent configuration, taken from `keti@ketea` on 2026-03-01.

## What's Here

```
server-backup/
├── agent/
│   ├── AGENT.md                          # Agent personality, rules, workflows
│   ├── skills/
│   │   └── eventiq.md                    # EventIQ database skill (company search, briefs, stats)
│   └── memory/
│       ├── MEMORY.md                     # Master index — loaded into every conversation
│       ├── sales/
│       │   ├── pipeline.md               # Active deals, stages, blockers
│       │   ├── accounts.md               # Key account relationships
│       │   └── playbooks.md              # Outreach patterns, objection handling
│       ├── marketing/
│       │   ├── campaigns.md              # Active campaigns
│       │   └── positioning.md            # Competitive differentiation, messaging
│       ├── product/
│       │   ├── roadmap.md                # Priorities, shipped features
│       │   ├── competitors.md            # Feature comparisons
│       │   └── feedback.md               # Customer feedback themes
│       ├── solutions/
│       │   ├── architecture.md           # Integration patterns, deployment models
│       │   └── objections.md             # Technical objections & responses
│       ├── decisions/
│       │   └── log.md                    # Cross-domain decision log
│       └── people/
│           ├── team.md                   # Internal team roles
│           └── stakeholders.md           # External stakeholder preferences
├── gateway/
│   ├── openclaw.json                     # FULL config WITH secrets (gitignored)
│   └── openclaw.template.json            # Sanitized template for migration
└── README.md                             # This file
```

## Architecture (Current)

Kiket runs as one agent inside a shared OpenClaw gateway:

```
OpenClaw Gateway (port 18789, Tailscale Funnel)
├── main (kkbot)      — Personal assistant, WhatsApp
├── missioniq (Kiket) — GTM intelligence, webchat ← THIS AGENT
├── fitty             — Fitness, WhatsApp
├── clawd             — Purva, WhatsApp
└── walassistant      — Walmart, WhatsApp
```

**Isolated per agent:** AGENT.md, memory directory, workspace, conversations
**Shared across agents:** API key, gateway port, event bus, Tailscale funnel

Cross-agent event bleed is prevented by client-side `sessionKey` filtering in `src/lib/openclaw-client.ts`.

## Migrating to a New Machine

### Prerequisites
- Node.js 20+
- OpenClaw CLI: `npm install -g openclaw` (or whatever the current install method is)
- Tailscale (for remote access via funnel)
- Anthropic API key
- Supabase project (for EventIQ database)

### Steps

1. **Install OpenClaw and initialize:**
   ```bash
   openclaw init
   ```

2. **Copy the agent directory:**
   ```bash
   cp -r server-backup/agent/ ~/.openclaw/agents/missioniq/agent/
   ```

3. **Create the gateway config from template:**
   ```bash
   cp server-backup/gateway/openclaw.template.json ~/.openclaw/openclaw.json
   ```
   Then replace all `<PLACEHOLDER>` values:
   - `<ANTHROPIC_API_KEY>` — Your Anthropic API key
   - `<SUPABASE_URL>` — EventIQ Supabase project URL
   - `<SUPABASE_SERVICE_KEY>` — Supabase service role key
   - `<EVENTIQ_TOOL_API_KEY>` — Matches `TOOL_API_KEY` in Vercel env vars
   - `<GEMINI_API_KEY>` — Google Gemini key for web search
   - `<GATEWAY_AUTH_TOKEN>` — Generate with `openssl rand -hex 24`
   - `<HOME>` — Replace with actual home directory path

4. **Create the workspace:**
   ```bash
   mkdir -p ~/clawd-missioniq
   ```

5. **Set up Tailscale funnel:**
   ```bash
   tailscale funnel 18789
   ```
   Note the funnel URL (e.g. `https://yourmachine.tail38a898.ts.net`).

6. **Update EventIQ environment variables** (in Vercel):
   - `NEXT_PUBLIC_OPENCLAW_WS_URL` → new Tailscale funnel URL
   - `NEXT_PUBLIC_OPENCLAW_TOKEN` → the `<GATEWAY_AUTH_TOKEN>` you generated

7. **Start the gateway:**
   ```bash
   openclaw gateway install
   ```

8. **Verify:**
   ```bash
   openclaw gateway status
   curl -s http://localhost:18789/__openclaw__/canvas/  # Should return 200 or 401
   ```

## Secrets

`gateway/openclaw.json` contains real API keys and tokens. It is **gitignored** — only the sanitized `openclaw.template.json` is committed.

If you need the actual secrets, they are stored in:
- Vercel env vars (EventIQ project, `hv-one` scope)
- Anthropic dashboard (API key)
- Supabase dashboard (service key)
- The running server at `keti@ketea:~/.openclaw/openclaw.json`
