import Parser from "rss-parser";

const parser = new Parser();

export interface RawSignal {
  headline: string;
  description: string;
  source: string;
  sourceUrl: string;
  publishedAt: string | null;
  matchedCompanyName?: string;
}

/**
 * Fetch Google News RSS for a company name or keyword query.
 * Google News RSS is free and unlimited.
 *
 * When companyName is provided, results are validated — only articles
 * that actually mention the company name in headline/description are kept.
 * This prevents false positives from short/ambiguous names like "Marco", "Nav", "Cardiff".
 */
export async function fetchGoogleNews(
  query: string,
  companyName?: string
): Promise<RawSignal[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).slice(0, 10).map((item) => ({
      headline: item.title || "",
      description: item.contentSnippet || item.content || "",
      source: extractSource(item.title || ""),
      sourceUrl: item.link || "",
      publishedAt: item.isoDate || item.pubDate || null,
      matchedCompanyName: companyName || query,
    }));

    // If searching for a specific company, validate relevance
    if (companyName) {
      const nameLower = companyName.toLowerCase();
      return items.filter((item) => {
        const text = `${item.headline} ${item.description}`.toLowerCase();
        return text.includes(nameLower);
      });
    }

    return items;
  } catch (err) {
    console.error(`[GoogleNews] Failed for "${query}":`, err);
    return [];
  }
}

/**
 * Google News titles often end with " - SourceName"
 */
function extractSource(title: string): string {
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0 && dashIdx > title.length - 60) {
    return title.slice(dashIdx + 3).trim();
  }
  return "Google News";
}
