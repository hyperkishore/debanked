import { Company } from "./types";
import { FeedItem, SignalType as FeedSignalType } from "./feed-helpers";
import { PipelineRecord } from "./pipeline-helpers";

/**
 * WHY-NOW ENGINE
 *
 * Distills per-company signals into actionable outreach angles.
 * Every downstream feature (Attention Score, Campaign Playbooks,
 * Signal→Task, Morning Briefing) consumes WhyNowResult.
 *
 * Scoring: signal type weight × recency decay
 * Angle generation: template-based strings per signal type
 */

export type WhyNowSignalType =
  | "funding"
  | "product_launch"
  | "partnership"
  | "hiring_surge"
  | "leadership_change"
  | "regulatory"
  | "milestone"
  | "pain_signal";

export interface WhyNowAngle {
  type: WhyNowSignalType;
  headline: string;
  angle: string;
  age_days: number;
  weight: number;
}

export type WhyNowCategory = "hot" | "warm" | "cold";

export interface WhyNowResult {
  score: number; // 0-10
  topAngle: string;
  angles: WhyNowAngle[];
  category: WhyNowCategory;
}

// --- Signal type weights (higher = stronger buying signal) ---
const SIGNAL_WEIGHTS: Record<WhyNowSignalType, number> = {
  funding: 10,
  leadership_change: 8,
  partnership: 7,
  hiring_surge: 6,
  regulatory: 5,
  product_launch: 5,
  milestone: 4,
  pain_signal: 6,
};

// --- Recency decay ---
function recencyMultiplier(ageDays: number): number {
  if (ageDays < 7) return 1.0;
  if (ageDays < 30) return 0.7;
  if (ageDays < 90) return 0.4;
  return 0.1;
}

// --- Map FeedItem signal type to WhyNow signal type ---
function mapSignalType(feedType: FeedSignalType, headline: string): WhyNowSignalType {
  switch (feedType) {
    case "funding":
      return "funding";
    case "product":
      return "product_launch";
    case "partnership":
      return "partnership";
    case "hiring":
      // Distinguish hiring surge from leadership change
      if (/\b(ceo|cfo|coo|cto|cro|president|chief|head of|vp|vice president)\b/i.test(headline)) {
        return "leadership_change";
      }
      return "hiring_surge";
    case "regulatory":
      return "regulatory";
    case "milestone":
      return "milestone";
    case "general":
      // Try to detect pain signals from general news
      if (/\b(lawsuit|fraud|investigation|fine|penalty|loss|downturn|layoff|restructur)\b/i.test(headline)) {
        return "pain_signal";
      }
      return "milestone";
  }
}

// --- Angle templates per signal type ---
function generateAngle(type: WhyNowSignalType, headline: string, companyName: string): string {
  switch (type) {
    case "funding":
      return `Just raised capital — scaling underwriting is the next bottleneck for ${companyName}`;
    case "product_launch":
      return `${companyName} is launching new products — new document types and higher verification volumes ahead`;
    case "partnership":
      return `New partnership will drive volume surge — ${companyName} needs verification infrastructure to match`;
    case "hiring_surge":
      return `${companyName} is hiring aggressively — operational scaling creates automation demand`;
    case "leadership_change":
      return `New leadership at ${companyName} — first 90 days is when vendor decisions get made`;
    case "regulatory":
      return `Regulatory pressure on ${companyName} — compliant, auditable underwriting is now urgent`;
    case "milestone":
      return `${companyName} hit a growth milestone — what works manually starts to break at scale`;
    case "pain_signal":
      return `${companyName} facing operational challenges — automation can solve the underlying bottleneck`;
  }
}

// --- Also extract signals from company.news[] directly ---
function extractNewsSignals(company: Company): { type: WhyNowSignalType; headline: string; ageDays: number }[] {
  const results: { type: WhyNowSignalType; headline: string; ageDays: number }[] = [];
  const now = Date.now();

  for (const news of company.news || []) {
    let dateEstimate: number;
    if (news.p) {
      dateEstimate = new Date(news.p).getTime();
    } else {
      // Parse from source string (e.g. "Yahoo Finance, Dec 2025")
      const match = news.s?.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
      if (match) {
        const months: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
        dateEstimate = new Date(parseInt(match[2]), months[match[1].toLowerCase().slice(0, 3)] ?? 0, 15).getTime();
      } else {
        dateEstimate = now - 60 * 86400000; // Default: ~2 months old
      }
    }

    const ageDays = Math.max(0, (now - dateEstimate) / 86400000);
    const h = (news.h + " " + (news.d || "")).toLowerCase();

    let type: WhyNowSignalType = "milestone";
    if (/fund|rais|capital|invest|series [a-e]|round/i.test(h)) type = "funding";
    else if (/partner|alliance|integrat|collaborat/i.test(h)) type = "partnership";
    else if (/launch|new product|release|expand.*product/i.test(h)) type = "product_launch";
    else if (/hire|hiring|recruit|headcount|workforce/i.test(h)) type = "hiring_surge";
    else if (/\bceo|cfo|coo|cto|appoint|resign|new.*chief|named.*president/i.test(h)) type = "leadership_change";
    else if (/regulat|compliance|license|fine|penalty|state.*law/i.test(h)) type = "regulatory";
    else if (/lawsuit|fraud|investigation|loss|downturn|layoff|restructur/i.test(h)) type = "pain_signal";

    results.push({ type, headline: news.h, ageDays });
  }

  return results;
}

/**
 * Compute the "Why Now" score and angles for a company.
 * Consumes both FeedItem[] (from signal ingestion) and company.news[] (static research).
 */
export function computeWhyNow(
  company: Company,
  feedItems: FeedItem[],
  _pipelineState?: Record<string, PipelineRecord>
): WhyNowResult {
  const now = Date.now();
  const angles: WhyNowAngle[] = [];
  const seenHeadlines = new Set<string>();

  // 1. Process feed items (from signal ingestion cron)
  const companySignals = feedItems.filter((f) => f.companyId === company.id);
  for (const signal of companySignals) {
    const ageDays = Math.max(0, (now - signal.dateEstimate) / 86400000);
    const type = mapSignalType(signal.signalType, signal.headline);
    const rawWeight = SIGNAL_WEIGHTS[type] * recencyMultiplier(ageDays);

    if (!seenHeadlines.has(signal.headline)) {
      seenHeadlines.add(signal.headline);
      angles.push({
        type,
        headline: signal.headline,
        angle: generateAngle(type, signal.headline, company.name),
        age_days: Math.round(ageDays),
        weight: Math.round(rawWeight * 10) / 10,
      });
    }
  }

  // 2. Process company.news[] (from static research — may not be in feed)
  const newsSignals = extractNewsSignals(company);
  for (const ns of newsSignals) {
    if (seenHeadlines.has(ns.headline)) continue;
    seenHeadlines.add(ns.headline);

    const rawWeight = SIGNAL_WEIGHTS[ns.type] * recencyMultiplier(ns.ageDays);
    angles.push({
      type: ns.type,
      headline: ns.headline,
      angle: generateAngle(ns.type, ns.headline, company.name),
      age_days: Math.round(ns.ageDays),
      weight: Math.round(rawWeight * 10) / 10,
    });
  }

  // Sort by weight descending
  angles.sort((a, b) => b.weight - a.weight);

  // Composite score: top 3 angles contribute (diminishing returns)
  let score = 0;
  if (angles.length >= 1) score += angles[0].weight;
  if (angles.length >= 2) score += angles[1].weight * 0.3;
  if (angles.length >= 3) score += angles[2].weight * 0.1;

  // Normalize to 0-10
  score = Math.min(10, Math.round(score * 10) / 10);

  // Category thresholds
  const category: WhyNowCategory = score >= 7 ? "hot" : score >= 4 ? "warm" : "cold";

  // Top angle text
  const topAngle = angles.length > 0
    ? angles[0].angle
    : `No recent signals for ${company.name}`;

  return { score, topAngle, angles, category };
}
