import { Company, RatingData, EngagementEntry } from "./types";
import { getLastEngagement } from "./engagement-helpers";

export type PipelineStage =
  | "researched"
  | "contacted"
  | "engaged"
  | "demo"
  | "proposal"
  | "won"
  | "lost";

export interface PipelineRecord {
  stage: PipelineStage;
  movedAt: string;
  dealValue?: number;
  closeDate?: string;
  hubspot_deal_id?: string;
}

export interface PipelineStageConfig {
  id: PipelineStage;
  label: string;
  color: string;
  icon: string;
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  { id: "researched", label: "Researched", color: "oklch(0.55 0.05 250)", icon: "Search" },
  { id: "contacted", label: "Contacted", color: "oklch(0.65 0.15 250)", icon: "Send" },
  { id: "engaged", label: "Engaged", color: "oklch(0.65 0.17 145)", icon: "MessageCircle" },
  { id: "demo", label: "Demo", color: "oklch(0.72 0.19 85)", icon: "Monitor" },
  { id: "proposal", label: "Proposal", color: "oklch(0.6 0.17 300)", icon: "FileText" },
  { id: "won", label: "Won", color: "oklch(0.65 0.17 145)", icon: "Trophy" },
  { id: "lost", label: "Lost", color: "oklch(0.45 0.05 270)", icon: "X" },
];

export function inferStage(
  company: Company,
  metState: Record<string, boolean>,
  ratingState: Record<string, RatingData>,
  engagements: EngagementEntry[]
): PipelineStage {
  const companyEngagements = engagements.filter((e) => e.companyId === company.id);
  const rating = ratingState[company.id];
  const isMet = metState[company.id];

  // Check for demo/proposal engagement actions
  const hasDemo = companyEngagements.some(
    (e) => e.action === "demo" || e.action === "scheduled" || e.action === "completed"
  );
  const hasProposal = companyEngagements.some((e) => e.action === "sent_proposal");

  if (hasProposal) return "proposal";
  if (hasDemo) return "demo";

  // Check follow-up types from rating
  if (rating?.followUps?.includes("demo")) return "engaged";

  // Multiple engagements = engaged
  if (companyEngagements.length >= 2) return "engaged";

  // Any engagement or met = contacted
  if (companyEngagements.length >= 1 || isMet) return "contacted";

  // Has research data
  if (company.desc && company.desc.length > 20) return "researched";

  return "researched";
}

export function getPipelineByStage(
  companies: Company[],
  pipelineState: Record<string, PipelineRecord>
): Record<PipelineStage, Company[]> {
  const result: Record<PipelineStage, Company[]> = {
    researched: [],
    contacted: [],
    engaged: [],
    demo: [],
    proposal: [],
    won: [],
    lost: [],
  };

  for (const c of companies) {
    const record = pipelineState[c.id];
    const stage = record?.stage || "researched";
    result[stage].push(c);
  }

  return result;
}

export function getDaysSinceContact(
  companyId: number,
  engagements: EngagementEntry[]
): number | null {
  const last = getLastEngagement(engagements, companyId);
  if (!last) return null;
  return Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000);
}
