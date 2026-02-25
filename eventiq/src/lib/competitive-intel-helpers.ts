import { Company, Leader } from "./types";

/**
 * COMPETITIVE INTELLIGENCE HELPERS
 *
 * Auto-detect competitor mentions in company data and generate
 * contextual battlecards. This is intelligence HubSpot can't provide —
 * it tells reps "they use Ocrolus" and what to say about it.
 */

export type CompetitorCategory =
  | "ocr_extraction"
  | "identity_verification"
  | "decisioning"
  | "bank_verification"
  | "fraud"
  | "lending_platform";

export interface Competitor {
  name: string;
  aliases: string[];
  category: CompetitorCategory;
  strengths: string[];
  weaknesses: string[];
  hvDifferentiator: string;
}

export interface CompetitiveContext {
  competitor: Competitor;
  mentionSource: "description" | "news" | "leader_background" | "leader_hooks";
  mentionText: string;
  confidence: "confirmed" | "likely" | "possible";
  battlecard: {
    situation: string;
    response: string;
    proofPoint: string;
    avoidSaying: string;
  };
}

const COMPETITORS: Competitor[] = [
  {
    name: "Ocrolus",
    aliases: ["ocrolus"],
    category: "ocr_extraction",
    strengths: ["Strong bank statement parsing", "Well-known in MCA", "Good API docs"],
    weaknesses: ["OCR-only — no identity verification", "No fraud detection layer", "Slow for high-volume batches"],
    hvDifferentiator: "HyperVerge does OCR + identity + fraud in a single API. Ocrolus requires stitching together multiple vendors for a complete solution.",
  },
  {
    name: "Plaid",
    aliases: ["plaid"],
    category: "bank_verification",
    strengths: ["Bank connectivity market leader", "Trusted brand", "Great developer experience"],
    weaknesses: ["Doesn't handle document verification", "No identity or fraud detection", "High per-connection cost at scale"],
    hvDifferentiator: "Plaid connects to banks; HyperVerge verifies the documents. We're complementary — use Plaid for live bank data, HyperVerge for document-based underwriting.",
  },
  {
    name: "Alloy",
    aliases: ["alloy"],
    category: "identity_verification",
    strengths: ["Strong identity orchestration", "Good compliance tools", "Multiple data sources"],
    weaknesses: ["Primarily identity/KYC — limited document extraction", "Less focus on lending-specific workflows", "Complex pricing model"],
    hvDifferentiator: "HyperVerge handles the full document-to-decision pipeline. Alloy is identity-focused. For lenders processing bank statements, tax returns, and business docs, HyperVerge is purpose-built.",
  },
  {
    name: "Socure",
    aliases: ["socure"],
    category: "identity_verification",
    strengths: ["Strong ID verification accuracy", "Good fraud signals", "Well-funded"],
    weaknesses: ["Identity-only — no document extraction", "Limited lending-specific features", "Premium pricing"],
    hvDifferentiator: "Socure verifies who someone IS. HyperVerge verifies what they SUBMIT — bank statements, tax returns, business licenses. Different layers of the underwriting stack.",
  },
  {
    name: "Inscribe",
    aliases: ["inscribe"],
    category: "fraud",
    strengths: ["Good document fraud detection", "AI-native approach", "Growing in lending"],
    weaknesses: ["Narrower feature set — fraud-focused", "Smaller customer base", "Less proven at enterprise scale"],
    hvDifferentiator: "HyperVerge does fraud detection AND extraction AND identity in one platform. Inscribe solves one piece of the puzzle; we solve the whole thing.",
  },
  {
    name: "Middesk",
    aliases: ["middesk"],
    category: "identity_verification",
    strengths: ["Business identity verification leader", "Good SOS/UCC data", "Clean API"],
    weaknesses: ["Business identity only — no document processing", "No bank statement analysis", "Doesn't handle underwriting documents"],
    hvDifferentiator: "Middesk verifies the business entity. HyperVerge processes what the business submits for underwriting. Complementary — not competitive.",
  },
  {
    name: "LoanPro",
    aliases: ["loanpro", "loan pro"],
    category: "lending_platform",
    strengths: ["Full loan management system", "Servicing + origination", "Good for equipment finance"],
    weaknesses: ["Platform play — not best-of-breed at verification", "Lock-in risk", "Heavy implementation"],
    hvDifferentiator: "LoanPro manages loans after origination. HyperVerge powers the underwriting decision BEFORE origination. We plug into LoanPro — not replace it.",
  },
  {
    name: "Moody's",
    aliases: ["moody's", "moodys", "moody"],
    category: "decisioning",
    strengths: ["Trusted brand in credit", "Deep credit data", "Enterprise relationships"],
    weaknesses: ["Legacy technology", "Slow to innovate", "Not built for MCA/alternative lending"],
    hvDifferentiator: "Moody's provides credit data. HyperVerge provides document intelligence. Different input signals for underwriting — we handle the documents Moody's can't read.",
  },
  {
    name: "Equifax",
    aliases: ["equifax"],
    category: "decisioning",
    strengths: ["Bureau data market leader", "Wide coverage", "Established infrastructure"],
    weaknesses: ["Traditional credit-only", "No document processing capability", "Expensive for small lenders"],
    hvDifferentiator: "Equifax tells you credit history. HyperVerge tells you what's in the bank statements, tax returns, and business docs they submitted TODAY. Real-time vs. historical.",
  },
  {
    name: "FICO",
    aliases: ["fico"],
    category: "decisioning",
    strengths: ["Industry standard credit scoring", "Trusted by all lenders", "Deep analytics"],
    weaknesses: ["Score doesn't capture MCA-specific risk", "No document handling", "High cost for small lenders"],
    hvDifferentiator: "FICO scores don't work well for MCA — many merchants have thin credit files. HyperVerge analyzes the actual bank statements and business documents that tell the real story.",
  },
  {
    name: "Cloudsquare",
    aliases: ["cloudsquare"],
    category: "lending_platform",
    strengths: ["Built for MCA/alternative lending", "Good workflow automation", "Salesforce-based"],
    weaknesses: ["CRM/workflow — not deep on document AI", "Salesforce dependency", "Limited extraction accuracy"],
    hvDifferentiator: "Cloudsquare manages your workflow. HyperVerge powers the AI brain inside it — extraction, verification, fraud detection. We make Cloudsquare smarter.",
  },
];

function buildBattlecard(competitor: Competitor, mentionSource: string): CompetitiveContext["battlecard"] {
  return {
    situation: `When they mention ${competitor.name} or you see they use it...`,
    response: competitor.hvDifferentiator,
    proofPoint: `HyperVerge serves 450+ financial services companies with 98%+ extraction accuracy. ${competitor.weaknesses[0]} — we solve that.`,
    avoidSaying: `Don't trash ${competitor.name} directly — position as "different layer" or "complementary." They may have champions for ${competitor.name} internally.`,
  };
}

function searchText(text: string, aliases: string[]): boolean {
  const lower = text.toLowerCase();
  return aliases.some(alias => {
    // Word boundary match to avoid false positives
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return regex.test(lower);
  });
}

export function detectCompetitors(company: Company): CompetitiveContext[] {
  const results: CompetitiveContext[] = [];
  const seen = new Set<string>();

  for (const competitor of COMPETITORS) {
    // Search company description
    if (company.desc && searchText(company.desc, competitor.aliases)) {
      if (!seen.has(competitor.name)) {
        seen.add(competitor.name);
        const snippet = extractSnippet(company.desc, competitor.aliases);
        results.push({
          competitor,
          mentionSource: "description",
          mentionText: snippet,
          confidence: "confirmed",
          battlecard: buildBattlecard(competitor, "description"),
        });
      }
    }

    // Search news
    for (const news of company.news || []) {
      const newsText = `${news.h} ${news.d}`;
      if (searchText(newsText, competitor.aliases) && !seen.has(competitor.name)) {
        seen.add(competitor.name);
        const snippet = extractSnippet(newsText, competitor.aliases);
        results.push({
          competitor,
          mentionSource: "news",
          mentionText: snippet,
          confidence: "confirmed",
          battlecard: buildBattlecard(competitor, "news"),
        });
      }
    }

    // Search leader backgrounds
    for (const leader of company.leaders || []) {
      if (leader.bg && searchText(leader.bg, competitor.aliases) && !seen.has(competitor.name)) {
        seen.add(competitor.name);
        const snippet = extractSnippet(leader.bg, competitor.aliases);
        results.push({
          competitor,
          mentionSource: "leader_background",
          mentionText: `${leader.n}: ${snippet}`,
          confidence: "likely",
          battlecard: buildBattlecard(competitor, "leader_background"),
        });
      }

      // Search hooks
      for (const hook of leader.hooks || []) {
        if (searchText(hook, competitor.aliases) && !seen.has(competitor.name)) {
          seen.add(competitor.name);
          results.push({
            competitor,
            mentionSource: "leader_hooks",
            mentionText: `${leader.n}: ${hook}`,
            confidence: "likely",
            battlecard: buildBattlecard(competitor, "leader_hooks"),
          });
        }
      }
    }
  }

  return results;
}

export function getCompetitorForLeader(leader: Leader): CompetitiveContext | null {
  const text = `${leader.bg || ""} ${(leader.hooks || []).join(" ")}`;
  for (const competitor of COMPETITORS) {
    if (searchText(text, competitor.aliases)) {
      return {
        competitor,
        mentionSource: "leader_background",
        mentionText: extractSnippet(text, competitor.aliases),
        confidence: "likely",
        battlecard: buildBattlecard(competitor, "leader"),
      };
    }
  }
  return null;
}

/** Get all known competitors (for reference/display) */
export function getAllCompetitors(): Competitor[] {
  return COMPETITORS;
}

/** Get competitors by category */
export function getCompetitorsByCategory(category: CompetitorCategory): Competitor[] {
  return COMPETITORS.filter(c => c.category === category);
}

function extractSnippet(text: string, aliases: string[]): string {
  const lower = text.toLowerCase();
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + alias.length + 60);
      let snippet = text.slice(start, end).trim();
      if (start > 0) snippet = "..." + snippet;
      if (end < text.length) snippet = snippet + "...";
      return snippet;
    }
  }
  return text.slice(0, 100);
}
