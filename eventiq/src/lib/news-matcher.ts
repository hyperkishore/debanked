/**
 * Fuzzy company name matching for news articles.
 * Used by the Google Alert RSS cron to match article text against our company dataset.
 */

interface CompanyRef {
  id: number;
  name: string;
  type: string;
  priority: number;
}

/** Normalize a company name for matching: lowercase, strip common suffixes, trim. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|corp|ltd|co|group|holdings|capital|financial|services|lending|funding|solutions)\b\.?/g, "")
    .replace(/[.,'"!?()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common industry phrases that appear frequently in articles.
 * If a company name normalizes to one of these, skip the normalized match
 * and only match on the full original name to avoid false positives.
 * e.g. "Merchant Cash Group" normalizes to "merchant cash" which matches
 * every "merchant cash advance" article.
 */
const COMMON_PHRASES = new Set([
  "merchant cash", "business", "small business", "equipment",
  "invoice", "revenue", "sba", "first", "national",
  "american", "united", "premier", "direct", "advance",
  "rapid", "fast", "express", "elite", "prime",
  "can", "launch", "trust", "creative", "gibraltar",
  "become", "shield", "ace", "thrive", "pearl",
  "eastern", "swift", "mission", "ark",
]);

/**
 * Full original company names (lowercased) that are ambiguous — they match
 * unrelated entities or common phrases in article text.
 * For these, we require the article to ALSO contain a lending/fintech industry
 * keyword, proving the article is about the financial industry, not just
 * mentioning "one park" (real estate) or "capital one" (different company).
 */
const AMBIGUOUS_FULL_NAMES = new Set([
  "can capital", "one park", "24 capital",
  "advance service", "small business funding",
  "national funding", "national capital", "revenue funding",
  "business capital llc", "trust capital",
  "capital crossing", "capitaland group",
  "gibraltar", "become", "merchant cash group",
  "launch financial group", "creative capital solutions",
  "expansion capital group", "capital solutions, inc",
]);

/**
 * Industry keywords that indicate an article is about lending/fintech.
 * Used as a secondary filter for ambiguous company names.
 */
const INDUSTRY_KEYWORDS = /\b(lend|loan|fintech|mca|merchant cash|underwriting|origination|credit facilit|securitiz|funding round|advance|financing|funder|borrower|small business loan|sba\b|factoring|receivable|broker|iso\b|revenue.based)\b/i;

/** Check if a company name appears in article text with word boundary awareness. */
function nameAppearsInText(companyName: string, text: string): boolean {
  const normalized = normalize(companyName);

  // Skip very short names (too many false positives)
  if (normalized.length < 4) return false;

  // If normalized name is a common phrase, skip normalized matching entirely
  // and only use the full original name match below
  if (!COMMON_PHRASES.has(normalized)) {
    const normalizedText = normalize(text);
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundaryRegex = new RegExp(`(?:^|\\s|[^a-z])${escaped}(?:\\s|[^a-z]|$)`);
    if (boundaryRegex.test(` ${normalizedText} `)) return true;
  }

  // Try original name (case-insensitive) for proper nouns like "Kapitus"
  // and for companies whose normalized name is a common phrase
  const lowerName = companyName.toLowerCase().trim();
  const lowerText = text.toLowerCase();

  if (lowerName.length >= 5) {
    const escapedOrig = lowerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const origRegex = new RegExp(`(?:^|\\s|[^a-z])${escapedOrig}(?:\\s|[^a-z]|$)`);
    if (origRegex.test(` ${lowerText} `)) {
      // For ambiguous names, require an industry keyword somewhere in the text
      if (AMBIGUOUS_FULL_NAMES.has(lowerName)) {
        return INDUSTRY_KEYWORDS.test(text);
      }
      return true;
    }
  }

  return false;
}

export interface NewsMatchResult {
  companyId: number;
  companyName: string;
  companyType: string;
  companyPriority: number;
}

/**
 * Match article text against a list of companies.
 * Returns all companies whose name appears in the text.
 * Prioritizes higher-priority matches (lower priority number = more important).
 */
export function matchCompanies(
  articleText: string,
  companies: CompanyRef[]
): NewsMatchResult[] {
  const matches: NewsMatchResult[] = [];

  for (const company of companies) {
    if (nameAppearsInText(company.name, articleText)) {
      matches.push({
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        companyPriority: company.priority,
      });
    }
  }

  // Sort by priority (lower = more important)
  matches.sort((a, b) => a.companyPriority - b.companyPriority);

  return matches;
}

/**
 * Match a single article against companies and return the best match.
 * Prefers higher-priority companies.
 */
export function bestMatch(
  articleText: string,
  companies: CompanyRef[]
): NewsMatchResult | null {
  const matches = matchCompanies(articleText, companies);
  return matches[0] || null;
}
