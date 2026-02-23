/**
 * Buying committee detection and gap analysis.
 * Maps leaders to committee roles and identifies missing coverage.
 */

import type { Leader, Company } from "./types";
import { classifyTitle } from "./ricp-taxonomy";

export type CommitteeRole =
  | "economic_buyer"
  | "technical_buyer"
  | "champion"
  | "influencer"
  | "end_user"
  | "blocker";

export interface CommitteeMember {
  leader: Leader;
  role: CommitteeRole;
  confidence: number; // 0-100
}

export interface CommitteeGap {
  role: CommitteeRole;
  label: string;
  description: string;
  priority: "critical" | "high" | "medium";
}

const ROLE_LABELS: Record<CommitteeRole, string> = {
  economic_buyer: "Economic Buyer",
  technical_buyer: "Technical Buyer",
  champion: "Champion",
  influencer: "Influencer",
  end_user: "End User",
  blocker: "Blocker",
};

const ROLE_DESCRIPTIONS: Record<CommitteeRole, string> = {
  economic_buyer: "Final budget authority (CEO, CFO, COO)",
  technical_buyer: "Evaluates technical fit (CTO, VP Engineering, Head of IT)",
  champion: "Internal advocate who drives the deal forward",
  influencer: "Shapes requirements and opinion (SVP, Director)",
  end_user: "Day-to-day user of the product (Underwriter, Analyst, Ops Manager)",
  blocker: "Potential objector (Compliance, Legal, Risk)",
};

const ROLE_PRIORITY: Record<CommitteeRole, "critical" | "high" | "medium"> = {
  economic_buyer: "critical",
  technical_buyer: "high",
  champion: "high",
  influencer: "medium",
  end_user: "medium",
  blocker: "medium",
};

/** Title patterns → committee role mapping. */
const COMMITTEE_PATTERNS: Array<{ pattern: RegExp; role: CommitteeRole; weight: number }> = [
  // Economic buyers
  { pattern: /\b(ceo|chief executive|president|owner|founder|managing partner)\b/i, role: "economic_buyer", weight: 90 },
  { pattern: /\b(cfo|chief financial|vp finance|svp finance)\b/i, role: "economic_buyer", weight: 85 },
  { pattern: /\b(coo|chief operating)\b/i, role: "economic_buyer", weight: 80 },

  // Technical buyers
  { pattern: /\b(cto|chief technology|vp engineering|head of (engineering|tech|it))\b/i, role: "technical_buyer", weight: 90 },
  { pattern: /\b(vp (of )?technology|director.*(engineering|technology|it))\b/i, role: "technical_buyer", weight: 80 },
  { pattern: /\b(head of (data|analytics|automation))\b/i, role: "technical_buyer", weight: 75 },

  // Champions (operations/underwriting leaders — our product users)
  { pattern: /\b(chief (underwriting|credit|risk)|head of underwriting)\b/i, role: "champion", weight: 90 },
  { pattern: /\b(vp (of )?(underwriting|credit|operations|originations))\b/i, role: "champion", weight: 85 },
  { pattern: /\b(director.*(underwriting|credit|operations|originations))\b/i, role: "champion", weight: 80 },

  // Influencers
  { pattern: /\b(svp|senior vice president|evp|executive vice president)\b/i, role: "influencer", weight: 70 },
  { pattern: /\b(vp (of )?(sales|business development|growth|strategy|partnerships))\b/i, role: "influencer", weight: 65 },
  { pattern: /\b(director.*(sales|business|growth|strategy))\b/i, role: "influencer", weight: 60 },

  // End users
  { pattern: /\b(underwriter|credit analyst|loan officer|origination|portfolio manager)\b/i, role: "end_user", weight: 75 },
  { pattern: /\b(operations manager|ops manager|processing manager)\b/i, role: "end_user", weight: 70 },

  // Blockers
  { pattern: /\b(chief (compliance|legal|risk)|general counsel)\b/i, role: "blocker", weight: 80 },
  { pattern: /\b(compliance officer|head of (compliance|legal|risk))\b/i, role: "blocker", weight: 75 },
  { pattern: /\b(vp (of )?(compliance|legal|risk))\b/i, role: "blocker", weight: 70 },
];

/**
 * Map a leader to a buying committee role based on title.
 */
export function classifyCommitteeRole(leader: Leader): CommitteeMember | null {
  const title = (leader.t || "").toLowerCase();
  if (!title) return null;

  let bestRole: CommitteeRole | null = null;
  let bestWeight = 0;

  for (const { pattern, role, weight } of COMMITTEE_PATTERNS) {
    if (pattern.test(title) && weight > bestWeight) {
      bestRole = role;
      bestWeight = weight;
    }
  }

  if (!bestRole) {
    // Fallback: use RICP taxonomy role for broader classification
    const { role: ricpRole } = classifyTitle(leader.t || "");
    if (ricpRole === "operations" || ricpRole === "underwriting") {
      bestRole = "champion";
      bestWeight = 50;
    } else if (ricpRole === "finance") {
      bestRole = "economic_buyer";
      bestWeight = 50;
    } else if (ricpRole === "risk") {
      bestRole = "blocker";
      bestWeight = 50;
    } else if (ricpRole === "sales") {
      bestRole = "influencer";
      bestWeight = 40;
    } else {
      return null;
    }
  }

  return {
    leader,
    role: bestRole,
    confidence: bestWeight,
  };
}

/**
 * Detect buying committee gaps for a company.
 * Returns mapped members and missing roles.
 */
export function detectCommitteeGaps(company: Company): {
  members: CommitteeMember[];
  gaps: CommitteeGap[];
  coverage: number; // 0-100
} {
  const leaders = company.leaders || [];
  const members: CommitteeMember[] = [];
  const foundRoles = new Set<CommitteeRole>();

  for (const leader of leaders) {
    const member = classifyCommitteeRole(leader);
    if (member) {
      members.push(member);
      foundRoles.add(member.role);
    }
  }

  // Required roles for a complete buying committee
  const requiredRoles: CommitteeRole[] = [
    "economic_buyer",
    "technical_buyer",
    "champion",
    "influencer",
    "end_user",
  ];

  const gaps: CommitteeGap[] = [];
  for (const role of requiredRoles) {
    if (!foundRoles.has(role)) {
      gaps.push({
        role,
        label: ROLE_LABELS[role],
        description: ROLE_DESCRIPTIONS[role],
        priority: ROLE_PRIORITY[role],
      });
    }
  }

  const coverage = requiredRoles.length > 0
    ? Math.round((requiredRoles.filter((r) => foundRoles.has(r)).length / requiredRoles.length) * 100)
    : 0;

  // Sort members by confidence desc
  members.sort((a, b) => b.confidence - a.confidence);

  // Sort gaps by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2 };
  gaps.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return { members, gaps, coverage };
}
