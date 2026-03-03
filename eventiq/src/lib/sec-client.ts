/**
 * SEC EDGAR API client.
 * Free government API — requires User-Agent header, rate limit 10 req/sec.
 * Docs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
 */

const SEC_USER_AGENT = "EventIQ/1.0 kishore@hyperverge.co";

// In-memory cache for the company tickers list (~10K entries)
let tickerCache: SecTicker[] | null = null;
let tickerCacheTime = 0;
const TICKER_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export interface SecTicker {
  cik: number;
  name: string;
  ticker: string;
}

export interface SecFinancials {
  revenue: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  equity: number | null;
  period: string | null;
  filingDate: string | null;
}

export interface SecCompanyResult {
  found: boolean;
  company?: {
    name: string;
    cik: number;
    ticker: string;
  };
  financials?: SecFinancials;
}

async function secFetch(url: string): Promise<Response> {
  return fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, Accept: "application/json" },
  });
}

/** Load and cache the SEC company tickers list. */
async function loadTickers(): Promise<SecTicker[]> {
  if (tickerCache && Date.now() - tickerCacheTime < TICKER_CACHE_TTL) {
    return tickerCache;
  }

  const res = await secFetch(
    "https://www.sec.gov/files/company_tickers.json"
  );
  if (!res.ok) throw new Error(`SEC tickers error: ${res.status}`);
  const data = await res.json();

  // Data is { "0": { cik_str, ticker, title }, "1": ... }
  tickerCache = Object.values(
    data as Record<
      string,
      { cik_str: number; ticker: string; title: string }
    >
  ).map((entry) => ({
    cik: entry.cik_str,
    name: entry.title,
    ticker: entry.ticker,
  }));
  tickerCacheTime = Date.now();
  return tickerCache;
}

/** Search for a company by name in the SEC tickers list. Returns best matches. */
export async function searchSecCompany(
  name: string,
  limit = 5
): Promise<SecTicker[]> {
  const tickers = await loadTickers();
  const needle = name.toLowerCase();

  // Score each ticker by match quality
  const scored = tickers
    .map((t) => {
      const haystack = t.name.toLowerCase();
      if (haystack === needle) return { ticker: t, score: 100 };
      if (haystack.startsWith(needle)) return { ticker: t, score: 80 };
      if (haystack.includes(needle)) return { ticker: t, score: 60 };
      // Check individual words
      const words = needle.split(/\s+/);
      const matchedWords = words.filter((w) => haystack.includes(w));
      if (matchedWords.length === words.length)
        return { ticker: t, score: 50 };
      if (matchedWords.length > 0)
        return { ticker: t, score: 20 + (matchedWords.length / words.length) * 20 };
      return { ticker: t, score: 0 };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => s.ticker);
}

/** Extract the most recent annual value for a given XBRL concept. */
function extractAnnualValue(
  facts: Record<string, unknown>,
  namespace: string,
  concept: string
): { value: number; period: string; filed: string } | null {
  const ns = facts[namespace] as Record<string, unknown> | undefined;
  if (!ns) return null;
  const conceptData = ns[concept] as
    | { units?: Record<string, Array<{ val: number; fp: string; end: string; filed: string }>> }
    | undefined;
  if (!conceptData?.units) return null;

  const usdUnits = conceptData.units["USD"];
  if (!usdUnits) return null;

  // Filter to full-year (FY) filings and get the most recent
  const annual = usdUnits
    .filter((u) => u.fp === "FY")
    .sort((a, b) => b.end.localeCompare(a.end));

  if (annual.length === 0) return null;
  return { value: annual[0].val, period: annual[0].end, filed: annual[0].filed };
}

/** Get financial data for a company by CIK number. */
export async function getSecFinancials(
  cik: number
): Promise<SecFinancials> {
  const paddedCik = String(cik).padStart(10, "0");
  const res = await secFetch(
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${paddedCik}.json`
  );

  if (!res.ok) {
    if (res.status === 404) {
      return {
        revenue: null,
        netIncome: null,
        totalAssets: null,
        totalLiabilities: null,
        equity: null,
        period: null,
        filingDate: null,
      };
    }
    throw new Error(`SEC EDGAR error: ${res.status}`);
  }

  const data = (await res.json()) as { facts: Record<string, unknown> };
  const facts = data.facts || {};

  // Try multiple revenue concepts (different companies use different ones)
  const revenue =
    extractAnnualValue(facts, "us-gaap", "Revenues") ??
    extractAnnualValue(facts, "us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax") ??
    extractAnnualValue(facts, "us-gaap", "SalesRevenueNet");

  const netIncome =
    extractAnnualValue(facts, "us-gaap", "NetIncomeLoss") ??
    extractAnnualValue(facts, "us-gaap", "ProfitLoss");

  const totalAssets = extractAnnualValue(facts, "us-gaap", "Assets");
  const totalLiabilities = extractAnnualValue(facts, "us-gaap", "Liabilities");
  const equity =
    extractAnnualValue(facts, "us-gaap", "StockholdersEquity") ??
    extractAnnualValue(facts, "us-gaap", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest");

  // Use the most recent period from any available metric
  const periods = [revenue, netIncome, totalAssets, totalLiabilities, equity]
    .filter(Boolean)
    .sort((a, b) => b!.period.localeCompare(a!.period));

  return {
    revenue: revenue?.value ?? null,
    netIncome: netIncome?.value ?? null,
    totalAssets: totalAssets?.value ?? null,
    totalLiabilities: totalLiabilities?.value ?? null,
    equity: equity?.value ?? null,
    period: periods[0]?.period ?? null,
    filingDate: periods[0]?.filed ?? null,
  };
}

/** Search for a company and return its financials. */
export async function searchSecCompanyWithFinancials(
  name: string
): Promise<SecCompanyResult> {
  const matches = await searchSecCompany(name, 1);
  if (matches.length === 0) {
    return { found: false };
  }

  const match = matches[0];
  const financials = await getSecFinancials(match.cik);

  return {
    found: true,
    company: {
      name: match.name,
      cik: match.cik,
      ticker: match.ticker,
    },
    financials,
  };
}
