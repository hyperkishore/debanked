import { SupabaseClient } from "@supabase/supabase-js";
import { fetchGoogleNews, type RawSignal } from "./signal-sources/google-news";
import { fetchBingNews } from "./signal-sources/bing-news";
import { fetchDeBankedRSS } from "./signal-sources/debanked-rss";

// Reuse classification from feed-helpers
type SignalType = "funding" | "product" | "partnership" | "hiring" | "regulatory" | "milestone" | "general";
type SignalHeat = "hot" | "warm" | "cool";

function classifySignalType(headline: string, description: string): SignalType {
  const text = `${headline} ${description}`.toLowerCase();
  if (/securitiz|abs|credit facilit|funding round|raise|series [a-f]|warehouse|capital|million|billion|\$\d/.test(text)) return "funding";
  if (/partner|integrat|collaborat|alliance|joined|embedded|api/.test(text)) return "partnership";
  if (/launch|new product|new feature|platform|tool|service|division/.test(text)) return "product";
  if (/hire|appoint|ceo|cro|ciso|cmo|chief|new leadership|new head/.test(text)) return "hiring";
  if (/regulat|compliance|law|bill|act|fda|fcc|fdic|sba|ftc|settlement/.test(text)) return "regulatory";
  if (/milestone|surpass|\d+b|\d+m|record|award|ranked|best|fastest/.test(text)) return "milestone";
  return "general";
}

function classifySignalHeat(
  companyType: string,
  headline: string,
  publishedAt: string | null
): SignalHeat {
  const isRecent = publishedAt
    ? Date.now() - new Date(publishedAt).getTime() < 180 * 86400000
    : false;

  if (companyType === "SQO" || companyType === "Client") return "hot";
  if (companyType === "ICP" && isRecent) return "hot";

  const text = headline.toLowerCase();
  if (isRecent && /securitiz|abs|million|billion|launch|ai|patent/.test(text)) return "hot";
  if (isRecent) return "warm";
  return "cool";
}

export interface IngestionResult {
  source: string;
  companiesSearched: number;
  signalsFound: number;
  signalsNew: number;
  durationMs: number;
}

interface CompanyRef {
  id: number;
  name: string;
  type: string;
  priority: number;
}

/**
 * Run the full signal ingestion pipeline:
 * 1. Fetch companies from Supabase
 * 2. For P0/P1 companies: individual name searches
 * 3. For TAM: batch by sub-vertical keywords
 * 4. Also fetch deBanked RSS (matches against all company names)
 * 5. Dedupe, classify, store in company_news
 * 6. Log to signal_ingestion_log
 */
export async function runSignalIngestion(
  supabase: SupabaseClient
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  // Fetch companies
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, type, priority");

  if (!companies || companies.length === 0) {
    console.warn("[Ingest] No companies found in database");
    return results;
  }

  const companyMap = new Map<string, CompanyRef>();
  for (const c of companies) {
    companyMap.set(c.name.toLowerCase(), c);
  }

  // P0 + P1 companies (priority <= 2) — individual searches
  const priorityCompanies = companies.filter((c) => c.priority <= 2);
  const tamCompanies = companies.filter((c) => c.priority > 2);

  // --- Google News: P0/P1 individual searches ---
  const googleStart = Date.now();
  const googleSignals: RawSignal[] = [];
  for (const company of priorityCompanies) {
    const signals = await fetchGoogleNews(company.name);
    googleSignals.push(...signals);
    // Rate limit: small delay between requests
    await sleep(200);
  }
  results.push(
    await storeSignals(supabase, googleSignals, companyMap, "google_news", {
      companiesSearched: priorityCompanies.length,
      startTime: googleStart,
    })
  );

  // --- Bing News: P0/P1 individual searches (if API key configured) ---
  if (process.env.BING_NEWS_API_KEY) {
    const bingStart = Date.now();
    const bingSignals: RawSignal[] = [];
    for (const company of priorityCompanies) {
      const signals = await fetchBingNews(company.name);
      bingSignals.push(...signals);
      await sleep(100);
    }
    results.push(
      await storeSignals(supabase, bingSignals, companyMap, "bing_news", {
        companiesSearched: priorityCompanies.length,
        startTime: bingStart,
      })
    );
  }

  // --- Google News: TAM batch by industry keywords ---
  const batchKeywords = [
    "MCA merchant cash advance funding",
    "small business lending fintech",
    "equipment finance leasing",
    "SBA lending 7a loan",
    "factoring invoice financing",
    "revenue based financing",
  ];
  const batchStart = Date.now();
  const batchSignals: RawSignal[] = [];
  for (const keyword of batchKeywords) {
    const signals = await fetchGoogleNews(keyword);
    batchSignals.push(...signals);
    await sleep(200);
  }
  results.push(
    await storeSignals(supabase, batchSignals, companyMap, "google_news_batch", {
      companiesSearched: batchKeywords.length,
      startTime: batchStart,
    })
  );

  // --- deBanked RSS ---
  const dbStart = Date.now();
  const allNames = companies.map((c) => c.name);
  const dbSignals = await fetchDeBankedRSS(allNames);
  results.push(
    await storeSignals(supabase, dbSignals, companyMap, "debanked_rss", {
      companiesSearched: allNames.length,
      startTime: dbStart,
    })
  );

  return results;
}

/**
 * Dedupe, classify, and store signals in the company_news table.
 */
async function storeSignals(
  supabase: SupabaseClient,
  signals: RawSignal[],
  companyMap: Map<string, CompanyRef>,
  source: string,
  meta: { companiesSearched: number; startTime: number }
): Promise<IngestionResult> {
  let signalsNew = 0;

  // Match signals to companies and prepare rows
  const rows: Array<{
    company_id: number;
    company_name: string;
    headline: string;
    source: string;
    description: string;
    published_at: string | null;
    signal_type: string;
    heat: string;
    source_url: string;
  }> = [];

  for (const signal of signals) {
    const companyName = signal.matchedCompanyName || "";
    const company = companyMap.get(companyName.toLowerCase());
    if (!company) continue;

    const signalType = classifySignalType(signal.headline, signal.description);
    const heat = classifySignalHeat(company.type, signal.headline, signal.publishedAt);

    rows.push({
      company_id: company.id,
      company_name: company.name,
      headline: signal.headline.slice(0, 500),
      source: signal.source.slice(0, 200),
      description: signal.description.slice(0, 1000),
      published_at: signal.publishedAt
        ? new Date(signal.publishedAt).toISOString().slice(0, 10)
        : null,
      signal_type: signalType,
      heat,
      source_url: signal.sourceUrl.slice(0, 500),
    });
  }

  // Upsert (dedupe by company_id + headline unique constraint)
  if (rows.length > 0) {
    const { data, error } = await supabase
      .from("company_news")
      .upsert(rows, { onConflict: "company_id,headline", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error(`[Ingest/${source}] Upsert error:`, error.message);
    } else {
      signalsNew = data?.length || 0;
    }
  }

  const durationMs = Date.now() - meta.startTime;
  const result: IngestionResult = {
    source,
    companiesSearched: meta.companiesSearched,
    signalsFound: signals.length,
    signalsNew,
    durationMs,
  };

  // Log to signal_ingestion_log
  await supabase.from("signal_ingestion_log").insert({
    source,
    companies_searched: meta.companiesSearched,
    signals_found: signals.length,
    signals_new: signalsNew,
    duration_ms: durationMs,
  });

  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
