import type { Company, Leader } from "./types";
import { classifyTitle, isRicpTitle, normalizePersonName } from "./ricp-taxonomy";

export interface PhantomProfile {
  fullName: string;
  title: string;
  summary?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  email?: string;
  phone?: string;
}

export interface RicpGapAccount {
  company: Company;
  score: number;
  missingRoles: string[];
  existingRicpCount: number;
}

const PRIORITY_TYPE_WEIGHT: Record<string, number> = {
  SQO: 12,
  Client: 10,
  ICP: 8,
  TAM: 3,
};

const TARGET_ROLES = ["operations", "risk", "underwriting", "finance"] as const;

function getPeople(company: Company): Array<{ n: string; t: string }> {
  return [
    ...(company.leaders || []).map((p) => ({ n: p.n, t: p.t })),
    ...(company.contacts || []).map((p) => ({ n: p.n, t: p.t })),
  ];
}

export function getMissingRicpRoles(company: Company): string[] {
  const roles = new Set<string>();
  for (const person of getPeople(company)) {
    const { role } = classifyTitle(person.t || "");
    if (TARGET_ROLES.includes(role as (typeof TARGET_ROLES)[number])) {
      roles.add(role);
    }
  }
  return TARGET_ROLES.filter((r) => !roles.has(r));
}

/**
 * Find top accounts that still need RICP coverage.
 * Independent utility: no API/UI coupling.
 */
export function findRicpGapAccounts(
  companies: Company[],
  limit = 25
): RicpGapAccount[] {
  return companies
    .filter((c) => ["SQO", "Client", "ICP"].includes(c.type) && c.priority <= 3)
    .map((company) => {
      const people = getPeople(company);
      const existingRicp = people.filter((p) => isRicpTitle(p.t || ""));
      const signalWeight = Math.min((company.news || []).length, 5);
      const score =
        (PRIORITY_TYPE_WEIGHT[company.type] || 0) +
        (company.priority <= 2 ? 4 : 0) +
        signalWeight +
        Math.min((company.leaders || []).length, 4);

      return {
        company,
        score,
        missingRoles: getMissingRicpRoles(company),
        existingRicpCount: existingRicp.length,
      };
    })
    .filter((entry) => entry.existingRicpCount === 0 || entry.missingRoles.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function estimateProfileConfidence(profile: PhantomProfile): number {
  let score = 0;
  if (profile.fullName && profile.fullName.length > 3) score += 20;
  if (profile.title && profile.title.length > 3) score += 25;
  if (profile.linkedinUrl) score += 20;
  if (profile.sourceUrl) score += 15;
  if (profile.summary && profile.summary.length > 40) score += 10;
  if (profile.email) score += 5;
  if (profile.phone) score += 5;
  return Math.min(score, 100);
}

/**
 * Map a PhantomBuster-like person profile to EventIQ leader schema.
 */
export function mapPhantomProfileToLeader(
  profile: PhantomProfile,
  verifiedAt: string = new Date().toISOString()
): Leader {
  const classification = classifyTitle(profile.title || "");
  const sourceUrls = [profile.sourceUrl, profile.linkedinUrl].filter(
    (v): v is string => !!v
  );

  return {
    n: profile.fullName,
    t: profile.title,
    bg:
      profile.summary ||
      `${profile.fullName} identified for ${profile.title} role enrichment via PhantomBuster output.`,
    li: profile.linkedinUrl,
    email: profile.email,
    phone: profile.phone,
    sourceUrls,
    verifiedAt,
    confidence: estimateProfileConfidence(profile),
    functionalRole: classification.role,
    lastReviewedAt: verifiedAt,
    hooks: [
      `${profile.title} role`,
      classification.role === "general" ? "Needs role review" : `${classification.role} leader`,
    ],
  };
}

/**
 * Apply mapped Phantom profiles to a company in-memory (independent dry-run utility).
 */
export function applyPhantomEnrichment(
  company: Company,
  profiles: PhantomProfile[],
  verifiedAt: string = new Date().toISOString()
): {
  beforeMissingRoles: string[];
  afterMissingRoles: string[];
  addedLeaders: Leader[];
  enrichedCompany: Company;
} {
  const beforeMissingRoles = getMissingRicpRoles(company);
  const existing = company.leaders || [];
  const existingNames = new Set(existing.map((l) => normalizePersonName(l.n)));

  const mapped = profiles.map((p) => mapPhantomProfileToLeader(p, verifiedAt));
  const addedLeaders = mapped.filter((leader) => !existingNames.has(normalizePersonName(leader.n)));

  const enrichedCompany: Company = {
    ...company,
    leaders: [...existing, ...addedLeaders],
  };

  return {
    beforeMissingRoles,
    afterMissingRoles: getMissingRicpRoles(enrichedCompany),
    addedLeaders,
    enrichedCompany,
  };
}

/**
 * Build a generic launch argument for people-search style Phantoms.
 * This is intentionally provider-agnostic and can be adapted per Phantom.
 */
export function buildRicpSearchArgument(companyName: string) {
  return {
    company: companyName,
    roleKeywords: [
      "Chief Operating Officer",
      "COO",
      "Chief Risk Officer",
      "CRO",
      "Chief Credit Officer",
      "Head of Underwriting",
      "Director of Underwriting",
    ],
    searches: [
      `"${companyName}" COO`,
      `"${companyName}" CRO`,
      `"${companyName}" "Chief Credit Officer"`,
      `"${companyName}" underwriting`,
    ],
  };
}
