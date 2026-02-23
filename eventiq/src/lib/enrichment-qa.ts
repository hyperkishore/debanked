/**
 * Enrichment QA scoring — computes coverage, confidence, freshness, and channel quality.
 * Returns a composite quality state: "blocked" | "review" | "ready".
 */

import type { Company, Leader } from "./types";

export interface QAScore {
  coverage: number;      // 0-100: how many fields are populated
  confidence: number;    // 0-100: avg leader confidence
  freshness: number;     // 0-100: how recent the data is
  channelQuality: number; // 0-100: quality of outreach channels (emails, phones, LinkedIn)
  composite: number;     // weighted average
  state: "blocked" | "review" | "ready";
  gaps: string[];        // specific missing items
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Compute enrichment QA score for a company.
 */
export function computeQAScore(company: Company): QAScore {
  const gaps: string[] = [];
  const now = Date.now();

  // --- Coverage (0-100) ---
  let coveragePts = 0;
  const coverageMax = 100;

  if (company.desc && company.desc.length > 20) coveragePts += 15;
  else gaps.push("description");

  if (company.contacts.length >= 2) coveragePts += 10;
  else if (company.contacts.length === 1) coveragePts += 5;
  else gaps.push("contacts");

  const leaders = company.leaders || [];
  if (leaders.length >= 2) coveragePts += 15;
  else if (leaders.length === 1) coveragePts += 7;
  else gaps.push("leaders");

  if ((company.news || []).length >= 2) coveragePts += 10;
  else gaps.push("news");

  if (company.ice && company.ice.length > 10) coveragePts += 10;
  else gaps.push("icebreaker");

  if ((company.tp || []).length >= 2) coveragePts += 10;
  else gaps.push("talking points");

  if (company.ask && company.ask.length > 10) coveragePts += 5;
  else gaps.push("ask/CTA");

  if (company.website) coveragePts += 5;
  else gaps.push("website");

  if (company.linkedinUrl) coveragePts += 5;
  if (company.location) coveragePts += 5;
  if (company.employees && company.employees > 0) coveragePts += 5;

  // Extra points for icebreaker variants and leader hooks
  if ((company.icebreakers || []).length >= 2) coveragePts += 5;

  const coverage = Math.min(Math.round((coveragePts / coverageMax) * 100), 100);

  // --- Confidence (0-100) ---
  let confidence = 0;
  if (leaders.length > 0) {
    const leaderConfidences = leaders.map((l: Leader) => l.confidence ?? estimateLeaderConfidence(l));
    confidence = Math.round(leaderConfidences.reduce((a, b) => a + b, 0) / leaderConfidences.length);
  }

  // --- Freshness (0-100) ---
  let freshness = 0;
  const newsItems = company.news || [];
  if (newsItems.length > 0) {
    const dates = newsItems
      .filter((n) => n.p)
      .map((n) => new Date(n.p!).getTime())
      .filter((t) => !isNaN(t));

    if (dates.length > 0) {
      const newest = Math.max(...dates);
      const age = now - newest;
      if (age < THIRTY_DAYS_MS) freshness = 100;
      else if (age < NINETY_DAYS_MS) freshness = 70;
      else if (age < ONE_YEAR_MS) freshness = 40;
      else freshness = 10;
    }
  }

  // --- Channel Quality (0-100) ---
  let channelPts = 0;
  for (const leader of leaders) {
    if (leader.li) channelPts += 20;
    if (leader.email) channelPts += 15;
    if (leader.phone) channelPts += 10;
    if (leader.hooks && leader.hooks.length > 0) channelPts += 5;
  }
  const channelQuality = leaders.length > 0
    ? Math.min(Math.round(channelPts / leaders.length), 100)
    : 0;

  // --- Composite ---
  const composite = Math.round(
    coverage * 0.35 +
    confidence * 0.20 +
    freshness * 0.25 +
    channelQuality * 0.20
  );

  // --- State ---
  let state: "blocked" | "review" | "ready";
  if (composite < 30 || coverage < 25) {
    state = "blocked";
  } else if (composite < 60) {
    state = "review";
  } else {
    state = "ready";
  }

  return { coverage, confidence, freshness, channelQuality, composite, state, gaps };
}

/** Estimate leader confidence from available data (0-100). */
function estimateLeaderConfidence(leader: Leader): number {
  let score = 0;
  if (leader.n && leader.n.length > 3) score += 20;
  if (leader.t && leader.t.length > 3) score += 20;
  if (leader.bg && leader.bg.length > 30) score += 25;
  if (leader.li) score += 15;
  if (leader.hooks && leader.hooks.length > 0) score += 10;
  if (leader.email) score += 5;
  if (leader.phone) score += 5;
  return Math.min(score, 100);
}
