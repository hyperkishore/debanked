import { Company, EngagementEntry } from "./types";
import { PipelineRecord, PipelineStage, PIPELINE_STAGES } from "./pipeline-helpers";
import { getCompanyEngagements } from "./engagement-helpers";

export type ThreadingRisk = "critical" | "warning" | "healthy";

export interface ThreadingHealth {
  companyId: number;
  companyName: string;
  pipelineStage: PipelineStage;
  totalContacts: number;
  engagedContacts: number;
  threadingScore: number; // 0.0 - 1.0
  risk: ThreadingRisk;
  suggestions: string[]; // names of leaders not yet engaged
}

/**
 * Compute threading health for a single company.
 * threadingScore = engagedContacts / min(totalContacts, 3), capped at 1.0
 */
export function getThreadingHealth(
  company: Company,
  engagements: EngagementEntry[],
  pipelineStage: PipelineStage
): ThreadingHealth {
  const leaders = company.leaders || [];
  const contacts = company.contacts || [];

  // Collect all contact names (leaders take precedence, fall back to contacts)
  const allContactNames = leaders.length > 0
    ? leaders.map((l) => l.n)
    : contacts.map((c) => c.n);

  const totalContacts = allContactNames.length;

  // Find unique engaged contacts
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const engagedNames = new Set<string>();
  for (const e of companyEngagements) {
    if (e.contactName) {
      engagedNames.add(e.contactName);
    }
  }

  const engagedContacts = allContactNames.filter((name) =>
    engagedNames.has(name)
  ).length;

  const denominator = Math.min(totalContacts, 3);
  const threadingScore = denominator > 0
    ? Math.min(engagedContacts / denominator, 1.0)
    : 0;

  const risk: ThreadingRisk =
    engagedContacts === 0
      ? "critical"
      : engagedContacts === 1
        ? "warning"
        : "healthy";

  // Suggest un-engaged leaders
  const suggestions = allContactNames.filter((name) => !engagedNames.has(name));

  return {
    companyId: company.id,
    companyName: company.name,
    pipelineStage,
    totalContacts,
    engagedContacts,
    threadingScore,
    risk,
    suggestions,
  };
}

/**
 * Get threading health for all companies currently in the pipeline.
 * Returns only companies with a pipeline stage set, sorted by stage importance
 * (later stages = more critical).
 */
export function getAllThreadingHealth(
  companies: Company[],
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>
): ThreadingHealth[] {
  const results: ThreadingHealth[] = [];

  for (const company of companies) {
    const record = pipelineState[company.id];
    if (!record) continue;

    const health = getThreadingHealth(company, engagements, record.stage);
    results.push(health);
  }

  // Sort by pipeline stage importance (later = more critical to multi-thread)
  const stageOrder: Record<string, number> = {};
  PIPELINE_STAGES.forEach((s, i) => {
    stageOrder[s.id] = i;
  });

  results.sort((a, b) => {
    // First by risk (critical > warning > healthy)
    const riskOrder: Record<ThreadingRisk, number> = {
      critical: 0,
      warning: 1,
      healthy: 2,
    };
    const riskDiff = riskOrder[a.risk] - riskOrder[b.risk];
    if (riskDiff !== 0) return riskDiff;

    // Then by stage importance (later stages first)
    return (stageOrder[b.pipelineStage] ?? 0) - (stageOrder[a.pipelineStage] ?? 0);
  });

  return results;
}

/**
 * Get the stage label for display.
 */
export function getStageLabel(stage: PipelineStage): string {
  const config = PIPELINE_STAGES.find((s) => s.id === stage);
  return config?.label ?? stage;
}

export const RISK_STYLES: Record<ThreadingRisk, { label: string; dotColor: string; textColor: string }> = {
  critical: {
    label: "No threads",
    dotColor: "bg-red-500",
    textColor: "text-red-400",
  },
  warning: {
    label: "Single thread",
    dotColor: "bg-yellow-500",
    textColor: "text-yellow-400",
  },
  healthy: {
    label: "Multi-threaded",
    dotColor: "bg-green-500",
    textColor: "text-green-400",
  },
};
