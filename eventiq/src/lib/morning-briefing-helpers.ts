import { Company, EngagementEntry } from "./types";
import { getCompanyEngagements, getLastEngagement } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { computeOutreachScore, getNextBestAction, getUrgencyTier, UrgencyTier } from "./outreach-score";
import { computeWhyNow, WhyNowResult } from "./why-now-engine";
import { computeAttentionScore, AttentionLabel, AttentionResult } from "./attention-score";
import { buildFeedItems } from "./feed-helpers";
import { classifyTitle, FunctionalRole } from "./ricp-taxonomy";

export interface NewsTrigger {
  company: Company;
  headline: string;
  source: string;
  suggestedMessage: string;
}

export interface StaleWarning {
  company: Company;
  daysSince: number;
  lastChannel: string;
  stage: string;
}

export interface QuickWin {
  company: Company;
  score: number;
  type: string;
}

export interface TopAction {
  company: Company;
  score: number;
  urgencyTier: UrgencyTier;
  nextAction: string;
  // New fields from Why-Now + Attention Score
  attentionScore: number;
  attentionLabel: AttentionLabel;
  whyNowAngle: string | null;
  ricpCoverage: string; // e.g. "3/4 roles — missing Risk"
}

export interface MorningBriefing {
  newsTriggers: NewsTrigger[];
  staleWarnings: StaleWarning[];
  quickWins: QuickWin[];
  topActions: TopAction[];
}

const ACTIVE_STAGES = new Set(['contacted', 'engaged', 'demo', 'proposal']);
const RICP_ROLES = new Set<FunctionalRole>(["operations", "risk", "underwriting", "finance"]);
const RICP_LABELS: Record<FunctionalRole, string> = {
  operations: "Ops",
  risk: "Risk",
  underwriting: "UW",
  finance: "Fin",
  sales: "Sales",
  technology: "Tech",
  general: "Gen",
};

function getRicpSummary(company: Company): string {
  const leaders = company.leaders || [];
  const filled = new Set<FunctionalRole>();
  for (const leader of leaders) {
    const { role, weight } = classifyTitle(leader.t);
    if (RICP_ROLES.has(role) && weight >= 4) filled.add(role);
  }
  const count = filled.size;
  if (count === 4) return "4/4 RICP roles filled";
  const missing = Array.from(RICP_ROLES)
    .filter((r) => !filled.has(r))
    .map((r) => RICP_LABELS[r])
    .join(", ");
  return `${count}/4 roles — missing ${missing}`;
}

export function buildMorningBriefing(
  companies: Company[],
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>,
  metState: Record<string, boolean>
): MorningBriefing {
  const newsTriggers: NewsTrigger[] = [];
  const staleWarnings: StaleWarning[] = [];
  const quickWins: QuickWin[] = [];
  const topActions: TopAction[] = [];

  // Build feed items once for all companies
  const feedItems = buildFeedItems(companies);

  for (const company of companies) {
    const record = pipelineState[company.id];
    const stage = record?.stage || 'researched';
    const companyEngagements = getCompanyEngagements(engagements, company.id);
    const last = companyEngagements[0] || null;

    // Why-Now + Attention Score
    const whyNow = computeWhyNow(company, feedItems, pipelineState);
    const attention = computeAttentionScore(company, whyNow, pipelineState, engagements);

    // News Triggers: pipeline companies with news
    if (ACTIVE_STAGES.has(stage) && company.news && company.news.length > 0) {
      const latest = company.news[0];
      const firstName = company.leaders?.[0]?.n.split(' ')[0] || 'there';
      newsTriggers.push({
        company,
        headline: latest.h,
        source: latest.s,
        suggestedMessage: `Hi ${firstName}, saw the news about "${latest.h}" — congrats! Would love to chat about how HyperVerge can support ${company.name}'s growth.`,
      });
    }

    // Stale Warnings: active pipeline with 5+ days no activity
    if (ACTIVE_STAGES.has(stage) && last) {
      const daysSince = Math.floor(
        (Date.now() - new Date(last.timestamp).getTime()) / 86400000
      );
      if (daysSince >= 5) {
        staleWarnings.push({
          company,
          daysSince,
          lastChannel: last.channel,
          stage,
        });
      }
    }

    // Quick Wins: high score + never contacted
    const breakdown = computeOutreachScore(company, engagements, pipelineState, metState);
    if (breakdown.total >= 100 && companyEngagements.length === 0) {
      quickWins.push({
        company,
        score: breakdown.total,
        type: company.type,
      });
    }

    // Top Actions: ranked by attention score (not outreach score)
    if (stage !== 'won' && stage !== 'lost') {
      topActions.push({
        company,
        score: breakdown.total,
        urgencyTier: getUrgencyTier(breakdown.total),
        nextAction: getNextBestAction(company, engagements, pipelineState),
        attentionScore: attention.score,
        attentionLabel: attention.label,
        whyNowAngle: whyNow.score > 0 ? whyNow.topAngle : null,
        ricpCoverage: getRicpSummary(company),
      });
    }
  }

  // Sort and limit
  staleWarnings.sort((a, b) => b.daysSince - a.daysSince);
  quickWins.sort((a, b) => b.score - a.score);
  // Sort top actions by attention score (highest first)
  topActions.sort((a, b) => b.attentionScore - a.attentionScore);

  return {
    newsTriggers: newsTriggers.slice(0, 5),
    staleWarnings: staleWarnings.slice(0, 5),
    quickWins: quickWins.slice(0, 5),
    topActions: topActions.slice(0, 5),
  };
}
