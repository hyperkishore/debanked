# PRD: Pre-Pipeline & Signal-to-Value Tracker

## 1. Vision & Strategic Alignment
**Goal:** To transform "soft" market signals into "hard" financial forecasts. This feature bridges the gap between early-stage research and qualified HubSpot deals, providing the 3-person sales team with a real-time, aggregate view of their progress toward the **$9M Pipeline** and **$3M Revenue** targets.

## 2. Business Objectives
- **Milestone 1:** Achieve $3,000,000 in total pipeline and $1,000,000 in closed revenue.
- **Milestone 2 (Final Target):** Achieve $9,000,000 in total pipeline and $3,000,000 in closed revenue.
- **Velocity:** Increase the conversion rate from "Signal Detected" to "HubSpot Deal Opened" by quantifying the cost of inaction.

## 3. Current Implementation Status (Feb 24, 2026)
- [x] **Revenue Extrapolation Engine:** 5-method weighted model active (`revenue-model.ts`).
- [x] **Aggregate Milestone Tracker:** Dual-progress visualization live on `DashboardTab`.
- [x] **Pipeline Value Integration:** Weighted totals active on `PipelineTab`.
- [x] **Signal-to-Value Overlay:** Estimated value badges live on `FeedTab`.
- [ ] **HubSpot Bi-directional Sync:** Planned.

## 4. Feature Details

### A. The 5-Method Revenue Extrapolation Engine
The system estimates company value by learning from the 10 validated HubSpot clients and applying multipliers based on researched signals:
1.  **Size Proxy (Log-scale):** Uses employee count to scale the baseline $50k ACV.
2.  **Tiered Volume:** Scans news/descriptions for billion-dollar or national-scale keywords.
3.  **Underwriting Model:** 1.8x multiplier for "Direct Funders" vs. "Brokers."
4.  **Risk Complexity:** 1.25x multiplier for funders handling "3rd/4th position" or "Reverse Consolidations."
5.  **Compliance Triggers:** 1.15x multiplier for companies reacting to regulatory shifts (e.g., Yellowstone case, Texas law).

### B. Aggregate Milestone Tracker (UI/UX)
- **Status:** **DEPLOYED**
- **Location:** Top of the `DashboardTab`.
- **Function:** Shows real-time progress toward $9M/$3M goals with intermediate markers for Milestone 1 ($3M/$1M).

### C. Signal-to-Value Overlay
- **Status:** **DEPLOYED**
- **Location:** `FeedTab` cards.
- **Function:** Attaches a "Potential Deal Value" (e.g., "$120K EST") to every market signal, enabling high-value prioritization.

## 5. Technical Specification

### UI/UX Details
- **Tech Stack:** React (Next.js 15), Tailwind CSS, Lucide Icons, Radix UI.
- **Visual Style:** Monochromatic "War Room" aesthetic with high-contrast accents (Green for Revenue, Blue for Pipeline).

### Data Architecture
- **State Management:** Leverage `useSyncedStorage` for persistence across the 3-person team.
- **Calculations:** Centralized in `eventiq/src/lib/revenue-model.ts`.
- **Integrations:**
  - **Supabase:** Stores `deal_value` and `hubspot_deal_id`.
  - **HubSpot:** Currently manual override; automated sync is next.

## 6. Success Metrics
- **Pipeline Visibility:** 100% of "Worked" companies have an assigned or estimated deal value.
- **Engagement Speed:** Reduction in time from "Signal Logged" to "First Outreach" for high-EV companies.
- **Milestone Clarity:** Every user knows exactly how far the team is from the $3M Milestone 1 at all times.

---
**Approved By:** Gemini CLI & User
**Last Updated:** February 24, 2026
