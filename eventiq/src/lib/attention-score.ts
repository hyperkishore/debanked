import { Company, EngagementEntry, Leader } from "./types";
import { PipelineRecord } from "./pipeline-helpers";
import { WhyNowResult } from "./why-now-engine";
import { classifyTitle, FunctionalRole } from "./ricp-taxonomy";
import { getCompanyEngagements } from "./engagement-helpers";

/**
 * ATTENTION SCORE
 *
 * Single composite "who to call first" ranking that replaces
 * separate readiness + outreach scores for prioritization.
 *
 * 6 dimensions (sum to 100):
 *  1. ICP Fit        (20 pts) — priority tier
 *  2. RICP Coverage  (15 pts) — decision-maker role coverage
 *  3. Why-Now Urgency(25 pts) — from WhyNowResult
 *  4. Contactability (15 pts) — email, phone, LinkedIn, address
 *  5. Engagement Mem  (15 pts) — recency + frequency
 *  6. Channel Ready  (10 pts) — has drafts, sequences, messages
 */

export type AttentionLabel = "fire" | "hot" | "warm" | "monitor";

export interface AttentionBreakdown {
  icpFit: number;           // 0-20
  ricpCoverage: number;     // 0-15
  whyNowUrgency: number;    // 0-25
  contactability: number;    // 0-15
  engagementMemory: number;  // 0-15
  channelReadiness: number;  // 0-10
}

export interface AttentionResult {
  score: number;              // 0-100
  label: AttentionLabel;
  breakdown: AttentionBreakdown;
}

// --- Dimension 1: ICP Fit (20 pts) ---
function scoreIcpFit(company: Company): number {
  // P0/SQO = 20, P1/ICP = 15, P2 = 10, TAM = 5
  if (company.type === "SQO" || company.priority === 1) return 20;
  if (company.type === "Client") return 18;
  if (company.type === "ICP" || company.priority === 2) return 15;
  if (company.priority === 3) return 10;
  return 5;
}

// --- Dimension 2: RICP Coverage (15 pts) ---
const RICP_ROLES_SET = new Set<FunctionalRole>(["operations", "risk", "underwriting", "finance"]);

function scoreRicpCoverage(company: Company): number {
  const leaders = company.leaders || [];
  const filledRoles = new Set<FunctionalRole>();

  for (const leader of leaders) {
    const { role, weight } = classifyTitle(leader.t);
    if (RICP_ROLES_SET.has(role) && weight >= 4) {
      filledRoles.add(role);
    }
  }

  // 0 roles = 0, 1 = 4, 2 = 8, 3 = 12, 4 = 15
  const count = filledRoles.size;
  if (count === 0) return 0;
  if (count === 1) return 4;
  if (count === 2) return 8;
  if (count === 3) return 12;
  return 15;
}

/** Exported for use in command center RICP coverage display */
export function getRicpRolesFilled(leaders: Leader[]): Set<FunctionalRole> {
  const filled = new Set<FunctionalRole>();
  for (const leader of leaders) {
    const { role, weight } = classifyTitle(leader.t);
    if (RICP_ROLES_SET.has(role) && weight >= 4) {
      filled.add(role);
    }
  }
  return filled;
}

// --- Dimension 3: Why-Now Urgency (25 pts) ---
function scoreWhyNow(whyNow: WhyNowResult): number {
  // Scale 0-10 score to 0-25
  return Math.round((whyNow.score / 10) * 25);
}

// --- Dimension 4: Contactability (15 pts) ---
function scoreContactability(company: Company): number {
  const leaders = company.leaders || [];
  if (leaders.length === 0) return 0;

  // Score the best-reachable leader
  let best = 0;
  for (const leader of leaders) {
    let s = 0;
    if (leader.email) s += 6;
    if (leader.phone) s += 4;
    if (leader.li) s += 3;
    if (leader.mailing_address || company.full_address) s += 2;
    best = Math.max(best, s);
  }

  return Math.min(best, 15);
}

// --- Dimension 5: Engagement Memory (15 pts) ---
function scoreEngagementMemory(
  company: Company,
  engagements: EngagementEntry[]
): number {
  const companyEngs = getCompanyEngagements(engagements, company.id);
  if (companyEngs.length === 0) return 0;

  // Recency points (0-8)
  const last = companyEngs[0];
  const daysSince = Math.floor(
    (Date.now() - new Date(last.timestamp).getTime()) / 86400000
  );
  let recency = 0;
  if (daysSince <= 3) recency = 8;
  else if (daysSince <= 7) recency = 6;
  else if (daysSince <= 14) recency = 4;
  else if (daysSince <= 30) recency = 2;
  else recency = 1;

  // Frequency points (0-7)
  const count = companyEngs.length;
  let frequency = 0;
  if (count >= 10) frequency = 7;
  else if (count >= 5) frequency = 5;
  else if (count >= 3) frequency = 3;
  else if (count >= 1) frequency = 2;

  return Math.min(recency + frequency, 15);
}

// --- Dimension 6: Channel Readiness (10 pts) ---
function scoreChannelReadiness(company: Company): number {
  let score = 0;

  // Has email draft potential (talking points + leaders with email)
  const hasTalkingPoints = (company.tp || []).length > 0;
  const hasLeaderEmail = (company.leaders || []).some((l) => l.email);
  if (hasTalkingPoints && hasLeaderEmail) score += 4;
  else if (hasTalkingPoints) score += 2;

  // Has ask/CTA ready
  if (company.ask && company.ask.length > 10) score += 3;

  // Has LinkedIn reach (for LinkedIn outreach)
  const hasLinkedIn = (company.leaders || []).some((l) => l.li);
  if (hasLinkedIn) score += 3;

  return Math.min(score, 10);
}

// --- Label from score ---
export function getAttentionLabel(score: number): AttentionLabel {
  if (score >= 75) return "fire";
  if (score >= 50) return "hot";
  if (score >= 25) return "warm";
  return "monitor";
}

export function getAttentionColor(label: AttentionLabel): string {
  switch (label) {
    case "fire": return "text-red-400";
    case "hot": return "text-orange-400";
    case "warm": return "text-yellow-400";
    case "monitor": return "text-zinc-400";
  }
}

export function getAttentionBgColor(label: AttentionLabel): string {
  switch (label) {
    case "fire": return "bg-red-500/15 border-red-500/30";
    case "hot": return "bg-orange-500/15 border-orange-500/30";
    case "warm": return "bg-yellow-500/15 border-yellow-500/30";
    case "monitor": return "bg-zinc-500/15 border-zinc-500/30";
  }
}

export function getAttentionEmoji(label: AttentionLabel): string {
  switch (label) {
    case "fire": return "🔥";
    case "hot": return "🟠";
    case "warm": return "🟡";
    case "monitor": return "⚪";
  }
}

/**
 * Compute composite attention score for a company.
 */
export function computeAttentionScore(
  company: Company,
  whyNow: WhyNowResult,
  _pipelineState: Record<string, PipelineRecord>,
  engagements: EngagementEntry[],
  _leaders?: Leader[]
): AttentionResult {
  const icpFit = scoreIcpFit(company);
  const ricpCoverage = scoreRicpCoverage(company);
  const whyNowUrgency = scoreWhyNow(whyNow);
  const contactability = scoreContactability(company);
  const engagementMemory = scoreEngagementMemory(company, engagements);
  const channelReadiness = scoreChannelReadiness(company);

  const score = icpFit + ricpCoverage + whyNowUrgency + contactability + engagementMemory + channelReadiness;
  const label = getAttentionLabel(score);

  return {
    score,
    label,
    breakdown: {
      icpFit,
      ricpCoverage,
      whyNowUrgency,
      contactability,
      engagementMemory,
      channelReadiness,
    },
  };
}
