/**
 * SLA definitions and breach detection.
 * Tracks response time, follow-up cadence, and pipeline velocity expectations.
 */

import type { EngagementEntry } from "./types";

export type SLAType = "first_response" | "follow_up" | "pipeline_velocity" | "meeting_conversion";

export interface SLADefinition {
  id: string;
  type: SLAType;
  label: string;
  description: string;
  /** Maximum allowed hours before breach. */
  maxHours: number;
  /** Which pipeline stages this SLA applies to. Null = all. */
  applicableStages?: string[];
}

export interface SLABreach {
  slaId: string;
  slaLabel: string;
  companyId: number;
  companyName: string;
  hoursOverdue: number;
  lastActivity?: string;
  severity: "warning" | "breach" | "critical";
}

/** Default SLA configurations. */
export const DEFAULT_SLAS: SLADefinition[] = [
  {
    id: "first_response_24h",
    type: "first_response",
    label: "First Response",
    description: "Respond to inbound signals within 24 hours",
    maxHours: 24,
  },
  {
    id: "follow_up_72h",
    type: "follow_up",
    label: "Follow-Up Cadence",
    description: "Follow up within 72 hours of last engagement",
    maxHours: 72,
    applicableStages: ["contacted", "engaged", "demo"],
  },
  {
    id: "pipeline_velocity_7d",
    type: "pipeline_velocity",
    label: "Pipeline Velocity",
    description: "Move deals forward within 7 days",
    maxHours: 168,
    applicableStages: ["contacted", "engaged", "demo", "proposal"],
  },
  {
    id: "meeting_conversion_14d",
    type: "meeting_conversion",
    label: "Meeting Conversion",
    description: "Convert engaged accounts to meetings within 14 days",
    maxHours: 336,
    applicableStages: ["contacted", "engaged"],
  },
];

/**
 * Detect SLA breaches for a set of companies.
 */
export function detectBreaches(
  companies: Array<{ id: number; name: string }>,
  engagements: EngagementEntry[],
  pipelineState: Record<string, { stage: string; movedAt: string }>,
  slas: SLADefinition[] = DEFAULT_SLAS
): SLABreach[] {
  const breaches: SLABreach[] = [];
  const now = Date.now();

  // Index engagements by company
  const engagementsByCompany = new Map<number, EngagementEntry[]>();
  for (const e of engagements) {
    const existing = engagementsByCompany.get(e.companyId) || [];
    existing.push(e);
    engagementsByCompany.set(e.companyId, existing);
  }

  for (const company of companies) {
    const companyEngagements = engagementsByCompany.get(company.id) || [];
    const pipeline = pipelineState[company.id];
    const currentStage = pipeline?.stage || "researched";

    // Sort engagements newest first
    const sorted = [...companyEngagements].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const lastEngagement = sorted[0];
    const lastTime = lastEngagement ? new Date(lastEngagement.timestamp).getTime() : 0;

    for (const sla of slas) {
      // Check if this SLA applies to the current pipeline stage
      if (sla.applicableStages && !sla.applicableStages.includes(currentStage)) {
        continue;
      }

      let referenceTime: number;
      if (sla.type === "pipeline_velocity" && pipeline) {
        referenceTime = new Date(pipeline.movedAt).getTime();
      } else {
        referenceTime = lastTime;
      }

      if (referenceTime === 0) continue;

      const hoursElapsed = (now - referenceTime) / (1000 * 60 * 60);
      const hoursOverdue = hoursElapsed - sla.maxHours;

      if (hoursOverdue > 0) {
        let severity: SLABreach["severity"];
        if (hoursOverdue > sla.maxHours) severity = "critical";
        else if (hoursOverdue > sla.maxHours * 0.5) severity = "breach";
        else severity = "warning";

        breaches.push({
          slaId: sla.id,
          slaLabel: sla.label,
          companyId: company.id,
          companyName: company.name,
          hoursOverdue: Math.round(hoursOverdue),
          lastActivity: lastEngagement?.timestamp,
          severity,
        });
      }
    }
  }

  // Sort by severity (critical first) then hours overdue
  const severityOrder = { critical: 0, breach: 1, warning: 2 };
  breaches.sort((a, b) => {
    const sevDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.hoursOverdue - a.hoursOverdue;
  });

  return breaches;
}
