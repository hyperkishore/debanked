import type { RawSignal } from "./google-news";

const BING_API_ENDPOINT = "https://api.bing.microsoft.com/v7.0/news/search";

/**
 * Fetch news from Bing News Search API.
 * Requires BING_NEWS_API_KEY env var.
 * Free tier: 1,000 queries/month.
 */
export async function fetchBingNews(query: string, companyName?: string): Promise<RawSignal[]> {
  const apiKey = process.env.BING_NEWS_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL(BING_API_ENDPOINT);
    url.searchParams.set("q", query);
    url.searchParams.set("count", "10");
    url.searchParams.set("freshness", "Month");
    url.searchParams.set("mkt", "en-US");

    const res = await fetch(url.toString(), {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!res.ok) {
      console.error(`[BingNews] HTTP ${res.status} for "${query}"`);
      return [];
    }

    const data = await res.json();
    const items = (data.value || []).slice(0, 10).map(
      (item: {
        name: string;
        description: string;
        url: string;
        datePublished: string;
        provider: { name: string }[];
      }) => ({
        headline: item.name || "",
        description: item.description || "",
        source: item.provider?.[0]?.name || "Bing News",
        sourceUrl: item.url || "",
        publishedAt: item.datePublished || null,
        matchedCompanyName: companyName || query,
      })
    );

    // If searching for a specific company, validate relevance
    if (companyName) {
      const nameLower = companyName.toLowerCase();
      return items.filter((i: RawSignal) => {
        const text = `${i.headline} ${i.description}`.toLowerCase();
        return text.includes(nameLower);
      });
    }

    return items;
  } catch (err) {
    console.error(`[BingNews] Failed for "${query}":`, err);
    return [];
  }
}
