/**
 * Fetch a company's website homepage and extract text content.
 * Returns first 5000 chars of visible text.
 */
export async function fetchWebsiteText(websiteUrl) {
  if (!websiteUrl) return null;

  // Normalize URL
  let url = websiteUrl;
  if (!url.startsWith("http")) url = `https://${url}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EventIQ-Research/1.0; +https://us.hyperverge.space)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const html = await res.text();
    const text = stripHtml(html);
    return text.slice(0, 5000);
  } catch (err) {
    console.error(`[WebFetcher] Failed for "${websiteUrl}":`, err.message);
    return null;
  }
}

/**
 * Strip HTML tags and extract visible text.
 */
function stripHtml(html) {
  return html
    // Remove script and style blocks
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    // Remove HTML tags
    .replace(/<[^>]+>/g, " ")
    // Decode common entities
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
