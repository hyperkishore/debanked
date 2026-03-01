# Decision Log

## Format
Each entry: [Date] [Domain] Decision — Rationale — Who decided

## Decisions

### 2026-03-01 — Agent Isolation: Shared Gateway, No Process Separation
- **Domain**: Infrastructure
- **Decision**: Keep Kiket (missioniq) and kkbot (main) on the same OpenClaw gateway. Fix cross-agent event bleed via client-side sessionKey filtering instead of running separate gateway processes.
- **Rationale**: Two gateway processes means double memory, dual configs, second Tailscale funnel. Client-side filtering achieves functional isolation with zero infrastructure overhead. The agents already have separate AGENT.md, memory, workspace, and conversation history.
- **What was shared**: API key, WebSocket port (18789), event bus (operator sees ALL events), Tailscale funnel
- **What was isolated**: AGENT.md, memory directory, workspace, conversation history, agent identity
- **Bug fixed**: Operator WebSocket delivered kkbot WhatsApp responses to EventIQ webchat. Fix: sessionKey filter in openclaw-client.ts + agentId in connect handshake.
- **Revisit if**: Fault isolation needed or billing separation required.
- **Who**: Kishore

### 2026-03-01 — Memory Architecture Setup
- **Domain**: Infrastructure
- **Decision**: Implemented domain-separated memory for Kiket (Sales, Marketing, Product, Solutions, Decisions, People)
- **Rationale**: Enable persistent context across conversations without overloading context window. Three-layer loading: always-on index (~2K tokens) + domain-activated (5-15K per domain) + on-demand deep dive.
- **Who**: Kishore

### 2026-03-01 — Kiket Branding (Renamed from MissionIQ)
- **Domain**: Product
- **Decision**: Renamed agent identity from MissionIQ to Kiket across UI, agent config, and openclaw.json
- **Rationale**: Consistent naming. Kiket is the agent name used across all OpenClaw agents on this gateway.
- **Who**: Kishore
