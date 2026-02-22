import Parser from "rss-parser";
import type { RawSignal } from "./google-news";

const parser = new Parser();

const DEBANKED_FEED_URL = "https://debanked.com/feed/";

/**
 * Fetch the deBanked industry RSS feed.
 * This is a general MCA/small business lending industry feed.
 * We match articles to companies by checking if company names appear in the content.
 */
export async function fetchDeBankedRSS(
  companyNames: string[]
): Promise<RawSignal[]> {
  try {
    const feed = await parser.parseURL(DEBANKED_FEED_URL);
    const signals: RawSignal[] = [];

    for (const item of (feed.items || []).slice(0, 30)) {
      const text = `${item.title || ""} ${item.contentSnippet || ""}`.toLowerCase();

      // Match against company names
      for (const name of companyNames) {
        if (name.length < 3) continue;
        if (text.includes(name.toLowerCase())) {
          signals.push({
            headline: item.title || "",
            description: item.contentSnippet || "",
            source: "deBanked",
            sourceUrl: item.link || "",
            publishedAt: item.isoDate || item.pubDate || null,
            matchedCompanyName: name,
          });
          break; // One match per article
        }
      }
    }

    return signals;
  } catch (err) {
    console.error("[deBanked] Failed to fetch RSS:", err);
    return [];
  }
}
