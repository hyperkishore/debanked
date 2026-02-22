import Parser from "rss-parser";
import type { RawSignal } from "./google-news";

const parser = new Parser();

/**
 * Fetch SEC EDGAR full-text search RSS for a company name.
 * Free and unlimited. Returns filings mentioning the company.
 */
export async function fetchSECEdgar(query: string): Promise<RawSignal[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://efts.sec.gov/LATEST/search-index?q=${encoded}&dateRange=custom&startdt=${getStartDate()}&enddt=${getEndDate()}&forms=10-K,10-Q,8-K,S-1`;

  try {
    // SEC EDGAR full-text search returns JSON, not RSS
    const res = await fetch(url, {
      headers: {
        "User-Agent": "EventIQ/3.0 (kishore@hyperverge.co)",
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const hits = data.hits?.hits || [];

    return hits.slice(0, 5).map(
      (hit: {
        _source: {
          file_description?: string;
          display_date_filed?: string;
          entity_name?: string;
          file_type?: string;
          file_num?: string;
        };
        _id: string;
      }) => ({
        headline: `SEC Filing: ${hit._source.file_type || "Filing"} — ${hit._source.entity_name || query}`,
        description: hit._source.file_description || "",
        source: "SEC EDGAR",
        sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${hit._source.file_num || ""}&type=&dateb=&owner=include&count=10`,
        publishedAt: hit._source.display_date_filed || null,
        matchedCompanyName: query,
      })
    );
  } catch (err) {
    console.error(`[SEC] Failed for "${query}":`, err);
    return [];
  }
}

function getStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function getEndDate(): string {
  return new Date().toISOString().slice(0, 10);
}
