import { Company, CompanyMetrics, OutreachStatus } from "./types";

/**
 * Compute evaluation metrics for a company.
 * Returns scores 0-100 on four dimensions + a weighted composite.
 */

export function computeFitScore(company: Company): number {
  let score = 0;

  // Type weighting
  const typeWeights: Record<string, number> = {
    SQO: 30,
    Client: 25,
    ICP: 20,
    TAM: 5,
  };
  score += typeWeights[company.type] || 0;

  // Employee count in target range (50-500)
  if (company.employees) {
    if (company.employees >= 50 && company.employees <= 500) score += 15;
    else if (company.employees > 500) score += 8;
    else if (company.employees >= 10) score += 5;
  }

  // Has website
  if (company.website) score += 10;

  // Has LinkedIn
  if (company.linkedinUrl) score += 10;

  // Sub-vertical is MCA/Equipment Finance (core ICP verticals)
  const text = `${company.desc} ${company.name}`;
  if (/\b(mca|merchant cash advance|cash advance|equipment\s+financ)/i.test(text)) {
    score += 10;
  }

  // Description quality
  if (company.desc && company.desc.length > 200) score += 5;

  return Math.min(score, 100);
}

export function computeIntentScore(company: Company): number {
  let score = 0;
  const now = new Date();

  const newsItems = company.news || [];

  for (const news of newsItems) {
    if (!news.p) continue;
    const pubDate = new Date(news.p);
    const daysSince = Math.floor((now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24));

    // Recency
    if (daysSince < 30) score += 30;
    else if (daysSince < 90) score += 20;
    else if (daysSince < 180) score += 10;

    // Signal type from headline
    const headline = (news.h + " " + news.d).toLowerCase();
    if (/fund(ing|raise|ed)|series [a-z]|capital|invest/i.test(headline)) score += 25;
    else if (/launch|product|platform|feature/i.test(headline)) score += 20;
    else if (/hir(ing|e)|team|talent/i.test(headline)) score += 15;
    else if (/partner|alliance|collaborat/i.test(headline)) score += 10;

    break; // Only score most recent
  }

  // Multiple recent news items
  const recentCount = newsItems.filter((n) => {
    if (!n.p) return false;
    const d = new Date(n.p);
    return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24) < 180;
  }).length;
  if (recentCount >= 2) score += 15;

  // Has icebreakers (research was done)
  if (company.icebreakers && company.icebreakers.length > 0) score += 5;

  return Math.min(score, 100);
}

export function computeAccessScore(company: Company): number {
  let score = 0;
  const leaders = company.leaders || [];

  // Leaders with LinkedIn
  const withLinkedIn = leaders.filter((l) => l.li).length;
  score += Math.min(withLinkedIn * 15, 45);

  // Leaders with hooks
  const withHooks = leaders.filter((l) => l.hooks && l.hooks.length > 0).length;
  score += Math.min(withHooks * 10, 30);

  // Has email outreach history
  const outreach = company.outreachHistory;
  if (outreach) {
    if (outreach.status === "engaged") score += 15;
    else if (outreach.status === "contacted") score += 10;
    else if (outreach.status === "responded") score += 12;
  }

  // Contact count
  if (company.contacts.length >= 2) score += 10;

  return Math.min(score, 100);
}

export function computeTimingScore(company: Company): number {
  let score = 0;
  const now = new Date();

  // Recent news
  const newsItems = company.news || [];
  for (const news of newsItems) {
    if (!news.p) continue;
    const daysSince = Math.floor(
      (now.getTime() - new Date(news.p).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSince < 30) {
      score += 30;
      break;
    } else if (daysSince < 90) {
      score += 15;
      break;
    }
  }

  // Outreach status
  const outreach = company.outreachHistory;
  if (outreach) {
    if (outreach.status === "engaged") score += 25;
    else if (outreach.status === "contacted") score += 15;
    else if (outreach.status === "responded") score += 20;

    // Recency of last activity
    if (outreach.lastActivityDate) {
      const daysSince = Math.floor(
        (now.getTime() - new Date(outreach.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSince < 30) score += 15;
      else if (daysSince < 90) score += 10;
    }
  }

  // Pipeline stage active (inferred from type)
  if (company.type === "SQO") score += 15;
  else if (company.type === "Client") score += 10;

  return Math.min(score, 100);
}

export function computeCompanyMetrics(company: Company): CompanyMetrics {
  const fitScore = computeFitScore(company);
  const intentScore = computeIntentScore(company);
  const accessScore = computeAccessScore(company);
  const timingScore = computeTimingScore(company);

  // Weighted composite: Fit 30%, Intent 25%, Access 25%, Timing 20%
  const composite = Math.round(
    fitScore * 0.3 + intentScore * 0.25 + accessScore * 0.25 + timingScore * 0.2
  );

  return { fitScore, intentScore, accessScore, timingScore, composite };
}

/**
 * Get the quadrant label based on fit and intent scores.
 */
export function getQuadrantLabel(fitScore: number, intentScore: number): string {
  const highFit = fitScore >= 50;
  const highIntent = intentScore >= 50;

  if (highFit && highIntent) return "Priority";
  if (highFit && !highIntent) return "Nurture";
  if (!highFit && highIntent) return "Monitor";
  return "Deprioritize";
}

/**
 * Sort companies by a specific metric dimension.
 */
export type MetricSortKey = "fit" | "intent" | "access" | "timing" | "composite";

export function sortByMetric(
  companies: Company[],
  key: MetricSortKey
): Company[] {
  return [...companies].sort((a, b) => {
    const ma = computeCompanyMetrics(a);
    const mb = computeCompanyMetrics(b);
    const ka = key === "fit" ? ma.fitScore
      : key === "intent" ? ma.intentScore
      : key === "access" ? ma.accessScore
      : key === "timing" ? ma.timingScore
      : ma.composite;
    const kb = key === "fit" ? mb.fitScore
      : key === "intent" ? mb.intentScore
      : key === "access" ? mb.accessScore
      : key === "timing" ? mb.timingScore
      : mb.composite;
    return kb - ka;
  });
}
