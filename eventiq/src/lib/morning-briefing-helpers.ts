import { Company, EngagementEntry } from "./types";
import { getCompanyEngagements, getLastEngagement } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { computeOutreachScore, getNextBestAction, getUrgencyTier, UrgencyTier } from "./outreach-score";

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
}

export interface MorningBriefing {
  newsTriggers: NewsTrigger[];
  staleWarnings: StaleWarning[];
  quickWins: QuickWin[];
  topActions: TopAction[];
}

const ACTIVE_STAGES = new Set(['contacted', 'engaged', 'demo', 'proposal']);

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

  for (const company of companies) {
    const record = pipelineState[company.id];
    const stage = record?.stage || 'researched';
    const companyEngagements = getCompanyEngagements(engagements, company.id);
    const last = companyEngagements[0] || null;

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

    // Top Actions: computed for all non-won/lost
    if (stage !== 'won' && stage !== 'lost') {
      topActions.push({
        company,
        score: breakdown.total,
        urgencyTier: getUrgencyTier(breakdown.total),
        nextAction: getNextBestAction(company, engagements, pipelineState),
      });
    }
  }

  // Sort and limit
  staleWarnings.sort((a, b) => b.daysSince - a.daysSince);
  quickWins.sort((a, b) => b.score - a.score);
  topActions.sort((a, b) => b.score - a.score);

  return {
    newsTriggers: newsTriggers.slice(0, 5),
    staleWarnings: staleWarnings.slice(0, 5),
    quickWins: quickWins.slice(0, 5),
    topActions: topActions.slice(0, 5),
  };
}
