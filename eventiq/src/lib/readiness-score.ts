import { Company, EngagementEntry } from "./types";
import { FeedItem } from "./feed-helpers";
import { getCompanyEngagements } from "./engagement-helpers";
import { detectPersona } from "./persona-helpers";

/**
 * OUTREACH READINESS SCORE
 *
 * Distinct from outreach-score.ts (which measures urgency/priority TO reach out).
 * Readiness measures HOW PREPARED we are to reach out WELL.
 *
 * A company can be high urgency but low readiness = "research needed before outreach."
 *
 * Dimensions (weighted):
 *  - Hook (25%): recent trigger/signal to reference
 *  - Contact (25%): right person with reachability
 *  - Research (20%): overall data completeness (desc, contacts, leaders, news, etc.)
 *  - Pain Points (15%): tailored talking points + CTA
 *  - Intel (15%): freshness of intelligence + engagement context
 */

export interface ReadinessBreakdown {
  total: number;              // 0-10 composite
  hookScore: number;          // 0-10: do we have a trigger/signal to reference?
  contactScore: number;       // 0-10: do we have the right person with reachability?
  researchScore: number;      // 0-10: overall research completeness
  painPointScore: number;     // 0-10: do we have relevant talking points?
  intelScore: number;         // 0-10: how fresh is our intelligence?
  missingPieces: string[];    // Actionable gaps: "Need verified email", etc.
  readyToSend: boolean;       // total >= 7
}

export type ReadinessLabel = "ready" | "almost" | "needs-work" | "not-ready";

export function getReadinessLabel(score: number): ReadinessLabel {
  if (score >= 7) return "ready";
  if (score >= 5) return "almost";
  if (score >= 3) return "needs-work";
  return "not-ready";
}

export function getReadinessColor(label: ReadinessLabel): string {
  switch (label) {
    case "ready": return "text-green-400";
    case "almost": return "text-yellow-400";
    case "needs-work": return "text-orange-400";
    case "not-ready": return "text-red-400";
  }
}

export function getReadinessBgColor(label: ReadinessLabel): string {
  switch (label) {
    case "ready": return "bg-green-500/15 border-green-500/30";
    case "almost": return "bg-yellow-500/15 border-yellow-500/30";
    case "needs-work": return "bg-orange-500/15 border-orange-500/30";
    case "not-ready": return "bg-red-500/15 border-red-500/30";
  }
}

function scoreHook(company: Company, feedItems: FeedItem[]): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  const companySignals = feedItems.filter(f => f.companyId === company.id);
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const ninetyDaysAgo = now - 90 * 86400000;

  const recentHot = companySignals.filter(f => f.dateEstimate > thirtyDaysAgo && f.heat === "hot");
  const recentWarm = companySignals.filter(f => f.dateEstimate > thirtyDaysAgo);
  const anyRecent = companySignals.filter(f => f.dateEstimate > ninetyDaysAgo);

  if (recentHot.length > 0) return { score: 10, gaps };
  if (recentWarm.length > 0) return { score: 8, gaps };
  if (anyRecent.length > 0) return { score: 6, gaps };

  // Fallback to icebreakers
  if (company.icebreakers && company.icebreakers.length >= 2) return { score: 5, gaps };
  if (company.ice && company.ice.length > 10) return { score: 4, gaps };

  gaps.push("No recent signals — research fresh news before outreach");
  return { score: 2, gaps };
}

function scoreContact(company: Company): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  const leaders = company.leaders || [];

  if (leaders.length === 0) {
    gaps.push("No leadership profiles — add decision-maker contacts");
    return { score: 0, gaps };
  }

  let best = 0;

  for (const leader of leaders) {
    let leaderScore = 3; // base: we have a name + title

    // Reachability
    if (leader.email) leaderScore += 2;
    if (leader.li) leaderScore += 1.5;
    if (leader.phone) leaderScore += 0.5;

    // Background depth for personalization
    if (leader.bg && leader.bg.length > 50) leaderScore += 1;
    if (leader.hooks && leader.hooks.length >= 2) leaderScore += 1;

    // Decision-maker persona
    const persona = detectPersona(leader.t);
    if (persona === "executive" || persona === "operations") leaderScore += 1;

    best = Math.max(best, leaderScore);
  }

  const score = Math.min(Math.round(best), 10);

  // Identify specific gaps
  const hasEmail = leaders.some(l => l.email);
  const hasLinkedIn = leaders.some(l => l.li);
  const hasDecisionMaker = leaders.some(l => {
    const p = detectPersona(l.t);
    return p === "executive" || p === "operations" || p === "finance";
  });

  if (!hasEmail) gaps.push("No verified email — enrich via Apollo");
  if (!hasLinkedIn) gaps.push("No LinkedIn URL for any leader");
  if (!hasDecisionMaker) gaps.push("No executive/operations decision-maker identified");

  return { score, gaps };
}

function scorePainPoint(company: Company): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  let score = 0;

  // Talking points
  const tps = company.tp || [];
  if (tps.length >= 3) score += 5;
  else if (tps.length >= 1) score += 3;
  else gaps.push("No talking points — add HyperVerge value prop angles");

  // Personalized ask
  if (company.ask && company.ask.length > 20) score += 3;
  else gaps.push("No personalized CTA — craft specific ask");

  // Icebreaker quality
  if (company.icebreakers && company.icebreakers.length >= 3) score += 2;
  else if (company.ice && company.ice.length > 20) score += 1;

  return { score: Math.min(score, 10), gaps };
}

function scoreIntel(company: Company, feedItems: FeedItem[], engagements: EngagementEntry[]): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const ninetyDaysAgo = now - 90 * 86400000;
  const sixMonthsAgo = now - 180 * 86400000;

  let score = 0;

  // News freshness
  const companySignals = feedItems.filter(f => f.companyId === company.id);
  const freshSignals = companySignals.filter(f => f.dateEstimate > thirtyDaysAgo);
  const recentSignals = companySignals.filter(f => f.dateEstimate > ninetyDaysAgo);

  if (freshSignals.length > 0) score += 5;
  else if (recentSignals.length > 0) score += 3;
  else if (companySignals.some(f => f.dateEstimate > sixMonthsAgo)) score += 1;
  else gaps.push("Intel is stale (6+ months) — refresh company research");

  // Description depth
  if (company.desc && company.desc.length > 200) score += 2;
  else if (company.desc && company.desc.length > 50) score += 1;
  else gaps.push("Company description is thin — enrich with web research");

  // Engagement context (have we talked to them before?)
  const companyEngs = getCompanyEngagements(engagements, company.id);
  if (companyEngs.length > 0) score += 2;
  else score += 1; // First contact is fine — just less context

  // Leader background depth
  const leaders = company.leaders || [];
  const deepLeaders = leaders.filter(l => l.bg && l.bg.length > 100);
  if (deepLeaders.length >= 2) score += 1;

  return { score: Math.min(score, 10), gaps };
}

function scoreResearch(company: Company): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  let score = 0;
  let total = 0;

  // Description (1.5 pts)
  total += 1.5;
  if (company.desc && company.desc.length > 100) score += 1.5;
  else if (company.desc && company.desc.length > 20) score += 0.75;
  else gaps.push("Missing or thin company description");

  // Contacts (1 pt)
  total += 1;
  if (company.contacts.length >= 2) score += 1;
  else if (company.contacts.length === 1) score += 0.5;

  // Leaders with bios (2 pts)
  total += 2;
  const leaders = company.leaders || [];
  const leadersWithBg = leaders.filter(l => l.bg && l.bg.length > 20);
  if (leadersWithBg.length >= 2) score += 2;
  else if (leadersWithBg.length === 1) score += 1;
  else if (leaders.length === 0) gaps.push("No leader profiles");
  else gaps.push("Leaders missing background research");

  // News (1.5 pts)
  total += 1.5;
  const newsCount = (company.news || []).length;
  if (newsCount >= 3) score += 1.5;
  else if (newsCount >= 1) score += 0.75;
  else gaps.push("No news articles — research recent coverage");

  // Icebreakers (1 pt)
  total += 1;
  if ((company.icebreakers || []).length >= 2) score += 1;
  else if (company.ice && company.ice.length > 10) score += 0.5;

  // Talking points (1 pt)
  total += 1;
  if ((company.tp || []).length >= 2) score += 1;
  else if ((company.tp || []).length === 1) score += 0.5;

  // LinkedIn URL (0.5 pt)
  total += 0.5;
  if (company.linkedinUrl) score += 0.5;

  // Location + employees (0.5 pt)
  total += 0.5;
  if (company.location) score += 0.25;
  if (company.employees && company.employees > 0) score += 0.25;

  // Normalize to 0-10 scale
  const normalized = Math.round((score / total) * 100) / 10;
  return { score: Math.min(normalized, 10), gaps };
}

export function computeReadinessScore(
  company: Company,
  feedItems: FeedItem[],
  engagements: EngagementEntry[]
): ReadinessBreakdown {
  const hook = scoreHook(company, feedItems);
  const contact = scoreContact(company);
  const research = scoreResearch(company);
  const painPoint = scorePainPoint(company);
  const intel = scoreIntel(company, feedItems, engagements);

  // Weighted average: hook 25%, contact 25%, research 20%, pain points 15%, intel 15%
  const total = Math.round(
    (hook.score * 0.25 + contact.score * 0.25 + research.score * 0.20 + painPoint.score * 0.15 + intel.score * 0.15) * 10
  ) / 10;

  const missingPieces = [...hook.gaps, ...contact.gaps, ...research.gaps, ...painPoint.gaps, ...intel.gaps];

  return {
    total,
    hookScore: hook.score,
    contactScore: contact.score,
    researchScore: research.score,
    painPointScore: painPoint.score,
    intelScore: intel.score,
    missingPieces,
    readyToSend: total >= 7,
  };
}
