/**
 * RICP (Risk, Insurance, Credit, and Portfolio) taxonomy helpers.
 * Provides weighted pattern matching for operations/risk/underwriting/finance/sales roles.
 */

export type FunctionalRole =
  | "operations"
  | "risk"
  | "underwriting"
  | "finance"
  | "sales"
  | "technology"
  | "general";

interface TitlePattern {
  pattern: RegExp;
  role: FunctionalRole;
  weight: number;
}

const TITLE_PATTERNS: TitlePattern[] = [
  // Operations
  { pattern: /chief operating officer|\bcoo\b/i, role: "operations", weight: 10 },
  { pattern: /\bvp\b.*operations|head of operations|director.*operations/i, role: "operations", weight: 8 },
  { pattern: /operations manager/i, role: "operations", weight: 5 },

  // Risk
  { pattern: /chief risk officer|\bcro\b/i, role: "risk", weight: 10 },
  { pattern: /head of risk|director.*risk|vp.*risk/i, role: "risk", weight: 8 },
  { pattern: /risk manage|risk analy/i, role: "risk", weight: 5 },

  // Underwriting
  { pattern: /chief credit|chief underwrit/i, role: "underwriting", weight: 10 },
  { pattern: /head of underwrit|director.*underwrit|vp.*underwrit|credit officer/i, role: "underwriting", weight: 8 },
  { pattern: /underwrit/i, role: "underwriting", weight: 5 },
  { pattern: /credit.*manag|credit.*analy/i, role: "underwriting", weight: 4 },

  // Finance
  { pattern: /chief financial officer|\bcfo\b/i, role: "finance", weight: 10 },
  { pattern: /\bvp\b.*finance|head of finance|director.*finance|controller/i, role: "finance", weight: 8 },
  { pattern: /finance manager|accounting manager/i, role: "finance", weight: 5 },

  // Sales
  { pattern: /chief revenue officer/i, role: "sales", weight: 10 },
  { pattern: /\bvp\b.*sales|head of sales|director.*sales|director.*bd/i, role: "sales", weight: 8 },
  { pattern: /sales manager|account executive|business develop/i, role: "sales", weight: 5 },

  // Technology
  { pattern: /chief technology officer|\bcto\b|chief information officer|\bcio\b/i, role: "technology", weight: 10 },
  { pattern: /\bvp\b.*engineer|head of engineer|director.*engineer/i, role: "technology", weight: 8 },
  { pattern: /engineer.*manager|tech lead/i, role: "technology", weight: 5 },
];

/**
 * Classify a title into a functional role with confidence weight.
 * Returns the highest-weight match.
 */
export function classifyTitle(title: string): { role: FunctionalRole; weight: number } {
  let bestRole: FunctionalRole = "general";
  let bestWeight = 0;

  for (const { pattern, role, weight } of TITLE_PATTERNS) {
    if (pattern.test(title) && weight > bestWeight) {
      bestRole = role;
      bestWeight = weight;
    }
  }

  return { role: bestRole, weight: bestWeight };
}

/** RICP titles: operations, risk, underwriting, finance */
const RICP_ROLES = new Set<FunctionalRole>(["operations", "risk", "underwriting", "finance"]);

/**
 * Check if a title matches RICP (operations/risk/underwriting/finance).
 * Replaces hardcoded regex patterns with weighted taxonomy.
 */
export function isRicpTitle(title: string): boolean {
  const { role, weight } = classifyTitle(title);
  return RICP_ROLES.has(role) && weight >= 4;
}

/**
 * Normalize a person name for deduplication.
 * - Lowercases
 * - Strips common suffixes (Jr, Sr, III, PhD, etc.)
 * - Trims whitespace
 * - Collapses multiple spaces
 */
export function normalizePersonName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(jr|sr|ii|iii|iv|phd|md|esq|cpa|mba|dba)\b\.?/gi, "")
    .replace(/[,.']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface PersonLike {
  n: string;
  t: string;
  [key: string]: unknown;
}

/**
 * Deduplicate an array of people by normalized name.
 * When duplicates exist, keeps the entry with the longest `bg` or more fields.
 */
export function deduplicatePeople<T extends PersonLike>(people: T[]): T[] {
  const seen = new Map<string, T>();

  for (const person of people) {
    const key = normalizePersonName(person.n);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, person);
    } else {
      // Keep the more complete entry (longer bg field, or more fields populated)
      const existingBg = (existing as Record<string, unknown>).bg as string || "";
      const newBg = (person as Record<string, unknown>).bg as string || "";
      if (newBg.length > existingBg.length) {
        seen.set(key, person);
      }
    }
  }

  return Array.from(seen.values());
}
