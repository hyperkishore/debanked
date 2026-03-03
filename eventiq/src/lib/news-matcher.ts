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
    .replace(/\b(inc|llc|corp|ltd|co|group|holdings|capital|financial|services|lending)\b\.?/g, "")
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
]);

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
    if (origRegex.test(` ${lowerText} `)) return true;
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
