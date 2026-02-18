import { Company, EngagementEntry, getResearchScore } from "./types";
import { getLastEngagement, getCompanyEngagements } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";

export interface OutreachScoreBreakdown {
  total: number;
  priorityWeight: number;    // SQO=100, Client=80, ICP=60, TAM=20
  recencyDecay: number;      // 0-1d=0, 2-3d=10, 4-7d=30, 7-14d=50, 14d+=70, never=70
  pipelineMomentum: number;  // contacted/engaged=20, demo=30, proposal=40
  dataQualityBonus: number;  // getResearchScore()/5 → 0-20
  urgencyPenalty: number;    // +50 for SQO/Client with 0 touches
}

const PRIORITY_WEIGHTS: Record<string, number> = {
  SQO: 100,
  Client: 80,
  ICP: 60,
  TAM: 20,
};

function getRecencyDecay(engagements: EngagementEntry[], companyId: number): number {
  const last = getLastEngagement(engagements, companyId);
  if (!last) return 70; // never contacted = high urgency

  const daysSince = Math.floor(
    (Date.now() - new Date(last.timestamp).getTime()) / 86400000
  );

  if (daysSince <= 1) return 0;
  if (daysSince <= 3) return 10;
  if (daysSince <= 7) return 30;
  if (daysSince <= 14) return 50;
  return 70;
}

function getPipelineMomentum(pipelineState: Record<string, PipelineRecord>, companyId: number): number {
  const record = pipelineState[companyId];
  if (!record) return 0;

  switch (record.stage) {
    case "proposal": return 40;
    case "demo": return 30;
    case "engaged":
    case "contacted": return 20;
    default: return 0;
  }
}

export function computeOutreachScore(
  company: Company,
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>,
  metState: Record<string, boolean>
): OutreachScoreBreakdown {
  const priorityWeight = PRIORITY_WEIGHTS[company.type] ?? 20;
  const recencyDecay = getRecencyDecay(engagements, company.id);
  const pipelineMomentum = getPipelineMomentum(pipelineState, company.id);
  const dataQualityBonus = Math.round(getResearchScore(company) / 5); // 0-20

  // Urgency penalty: SQO/Client with zero touches get +50
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const isMet = metState[company.id];
  const urgencyPenalty =
    (company.type === "SQO" || company.type === "Client") &&
    companyEngagements.length === 0 &&
    !isMet
      ? 50
      : 0;

  const total = priorityWeight + recencyDecay + pipelineMomentum + dataQualityBonus + urgencyPenalty;

  return {
    total,
    priorityWeight,
    recencyDecay,
    pipelineMomentum,
    dataQualityBonus,
    urgencyPenalty,
  };
}

export type UrgencyTier = "critical" | "high" | "medium" | "low";

export function getUrgencyTier(score: number): UrgencyTier {
  if (score >= 200) return "critical";
  if (score >= 150) return "high";
  if (score >= 100) return "medium";
  return "low";
}

export function getNextBestAction(
  company: Company,
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>
): string {
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const record = pipelineState[company.id];
  const stage = record?.stage || "researched";

  // No engagements yet
  if (companyEngagements.length === 0) {
    if (company.leaders?.some((l) => l.li)) return "Send LinkedIn connection";
    return "Send intro email";
  }

  // Based on pipeline stage
  switch (stage) {
    case "proposal":
      return "Follow up on proposal";
    case "demo":
      return "Send post-demo recap";
    case "engaged": {
      const last = companyEngagements[0];
      if (last?.channel === "linkedin") return "Send follow-up email";
      if (last?.channel === "email") return "Schedule call";
      return "Send follow-up";
    }
    case "contacted": {
      const last = companyEngagements[0];
      const daysSince = last
        ? Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000)
        : 999;
      if (daysSince >= 3) return "Send follow-up";
      return "Wait for response";
    }
    default:
      return "Research & reach out";
  }
}
