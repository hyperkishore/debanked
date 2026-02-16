#!/usr/bin/env node
/**
 * Fuzzy company name matching library for EventIQ
 * Shared between CLI import, in-app import, and HubSpot sync
 */

// Common suffixes to strip for matching
const STRIP_SUFFIXES = /\b(llc|inc|corp|ltd|co|company|group|capital|funding|financial|holdings|partners|solutions|services|technologies|tech)\b/gi;

/**
 * Normalize a company name for exact-match lookup
 * Strips all non-alphanumeric, lowercases, removes common suffixes
 */
function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Compute similarity score between two company names (0-1, 1 = exact match)
 */
function similarityScore(name1, name2) {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);

  if (!norm1 || !norm2) return 0;

  // Exact normalized match
  if (norm1 === norm2) return 1.0;

  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return 0.8 + (0.2 * shorter / longer);
  }

  // Levenshtein-based similarity
  const dist = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Build a lookup index from an array of companies for fast matching
 * @param {Array} companies - Array of company objects with `name` and `id`
 * @returns {Map} Map of normalizedName -> company
 */
function buildCompanyIndex(companies) {
  const index = new Map();
  for (const c of companies) {
    const norm = normalizeCompanyName(c.name);
    if (norm) index.set(norm, c);
  }
  return index;
}

/**
 * Find the best matching company from an indexed set
 * @param {string} name - Company name to match
 * @param {Map} index - Company index from buildCompanyIndex()
 * @param {number} threshold - Minimum similarity score (default 0.75)
 * @returns {{ match: object|null, score: number, exact: boolean }}
 */
function findBestMatch(name, index, threshold = 0.75) {
  const norm = normalizeCompanyName(name);
  if (!norm) return { match: null, score: 0, exact: false };

  // Exact match
  if (index.has(norm)) {
    return { match: index.get(norm), score: 1.0, exact: true };
  }

  // Fuzzy match - check all entries
  let bestMatch = null;
  let bestScore = 0;

  for (const [indexNorm, company] of index) {
    const score = similarityScore(name, company.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = company;
    }
  }

  if (bestScore >= threshold) {
    return { match: bestMatch, score: bestScore, exact: false };
  }

  return { match: null, score: bestScore, exact: false };
}

/**
 * Batch match an array of incoming names against existing companies
 * @param {string[]} names - Array of company names to match
 * @param {Array} existingCompanies - Array of existing company objects
 * @param {number} threshold - Minimum similarity score
 * @returns {{ matched: Array<{input: string, existing: object, score: number}>, unmatched: string[] }}
 */
function batchMatch(names, existingCompanies, threshold = 0.75) {
  const index = buildCompanyIndex(existingCompanies);
  const matched = [];
  const unmatched = [];

  for (const name of names) {
    const result = findBestMatch(name, index, threshold);
    if (result.match) {
      matched.push({ input: name, existing: result.match, score: result.score, exact: result.exact });
    } else {
      unmatched.push(name);
    }
  }

  return { matched, unmatched };
}

module.exports = {
  normalizeCompanyName,
  similarityScore,
  buildCompanyIndex,
  findBestMatch,
  batchMatch,
  levenshtein,
};
