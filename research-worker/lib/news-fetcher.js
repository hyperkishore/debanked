import Parser from "rss-parser";

const parser = new Parser();

/**
 * Fetch recent news for a company via Google News RSS.
 * Returns top 10 relevant items.
 */
export async function fetchCompanyNews(companyName) {
  const needsContext =
    companyName.length < 8 ||
    /^(Nav|Marco|Cardiff|One Park|Direct|Express|Premier|Elite|First|Rapid|Fast|Prime|National|United|American|Arc|Bitty|Aspiria)$/i.test(
      companyName
    );

  const query = needsContext
    ? `"${companyName}" (lending OR fintech OR "merchant cash" OR financing OR "small business")`
    : `"${companyName}"`;

  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).slice(0, 10);

    const nameLower = companyName.toLowerCase();
    const relevant = items
      .map((item) => ({
        headline: item.title || "",
        description: item.contentSnippet || item.content || "",
        source: extractSource(item.title || ""),
        sourceUrl: extractDirectUrl(item.link || ""),
        publishedAt: item.isoDate || item.pubDate || null,
      }))
      .filter((item) => {
        const text = `${item.headline} ${item.description}`.toLowerCase();
        return text.includes(nameLower);
      });

    return relevant;
  } catch (err) {
    console.error(`[NewsFetcher] Failed for "${companyName}":`, err.message);
    return [];
  }
}

function extractDirectUrl(googleUrl) {
  try {
    const parsed = new URL(googleUrl);
    const direct = parsed.searchParams.get("url");
    if (direct) return direct;
  } catch {
    // Not a valid URL
  }
  return googleUrl;
}

function extractSource(title) {
  const dashIdx = title.lastIndexOf(" - ");
  if (dashIdx > 0 && dashIdx > title.length - 60) {
    return title.slice(dashIdx + 3).trim();
  }
  return "Google News";
}
