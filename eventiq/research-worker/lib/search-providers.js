/**
 * search-providers.js — Multi-provider web search with automatic rotation
 *
 * Supports multiple free-tier search APIs to maximize coverage:
 * - Serper.dev (2,500 free queries, no CC)
 * - Tavily (1,000 credits/month, no CC)
 * - Brave Search (paid, $5/month credit)
 * - Google Custom Search Engine (100 queries/day free)
 *
 * Rotates through available providers. Falls back to next provider on failure.
 */

// ---------------------------------------------------------------------------
// Provider: Serper.dev (Google results via API)
// Free: 2,500 queries (one-time). Sign up: https://serper.dev
// ---------------------------------------------------------------------------

async function serperSearch(query, apiKey) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ q: query, num: 5 }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Serper ${res.status}: ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.organic || []).slice(0, 5).map((r) => ({
    title: r.title || "",
    description: r.snippet || "",
    url: r.link || "",
  }));
}

// ---------------------------------------------------------------------------
// Provider: Tavily (AI-optimized search)
// Free: 1,000 credits/month. Sign up: https://tavily.com
// ---------------------------------------------------------------------------

async function tavilySearch(query, apiKey) {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tavily ${res.status}: ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.results || []).slice(0, 5).map((r) => ({
    title: r.title || "",
    description: r.content || "",
    url: r.url || "",
  }));
}

// ---------------------------------------------------------------------------
// Provider: Brave Search API
// Paid: $5/month credit (~1,000 queries). Sign up: https://brave.com/search/api
// ---------------------------------------------------------------------------

async function braveSearch(query, apiKey) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Brave ${res.status}: ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.web?.results || []).slice(0, 5).map((r) => ({
    title: r.title || "",
    description: r.description || "",
    url: r.url || "",
  }));
}

// ---------------------------------------------------------------------------
// Provider: Google Custom Search Engine (Programmable Search)
// Free: 100 queries/day. Setup: https://programmablesearchengine.google.com
// Needs: GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID
// ---------------------------------------------------------------------------

async function googleCSESearch(query, apiKey, cseId) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", apiKey);
  url.searchParams.set("cx", cseId);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "5");

  const res = await fetch(url.toString());

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google CSE ${res.status}: ${text.slice(0, 100)}`);
  }

  const data = await res.json();
  return (data.items || []).slice(0, 5).map((r) => ({
    title: r.title || "",
    description: r.snippet || "",
    url: r.link || "",
  }));
}

// ---------------------------------------------------------------------------
// Multi-provider search with rotation and fallback
// ---------------------------------------------------------------------------

// Track usage across providers to distribute load
const usageCounter = {};

/**
 * Build ordered list of available providers from env vars.
 * Rotates the primary provider each call to spread usage evenly.
 */
function getAvailableProviders() {
  const providers = [];

  if (process.env.SERPER_API_KEY) {
    providers.push({
      name: "serper",
      fn: (q) => serperSearch(q, process.env.SERPER_API_KEY),
    });
  }

  if (process.env.TAVILY_API_KEY) {
    providers.push({
      name: "tavily",
      fn: (q) => tavilySearch(q, process.env.TAVILY_API_KEY),
    });
  }

  if (process.env.BRAVE_SEARCH_API_KEY) {
    providers.push({
      name: "brave",
      fn: (q) => braveSearch(q, process.env.BRAVE_SEARCH_API_KEY),
    });
  }

  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) {
    providers.push({
      name: "google_cse",
      fn: (q) => googleCSESearch(q, process.env.GOOGLE_CSE_API_KEY, process.env.GOOGLE_CSE_ID),
    });
  }

  if (providers.length === 0) return providers;

  // Round-robin: rotate based on total queries issued
  const totalQueries = Object.values(usageCounter).reduce((a, b) => a + b, 0);
  const offset = totalQueries % providers.length;
  return [...providers.slice(offset), ...providers.slice(0, offset)];
}

/**
 * Search using available providers with automatic fallback.
 * Returns array of { title, description, url } results.
 */
export async function multiSearch(query) {
  const providers = getAvailableProviders();

  if (providers.length === 0) {
    console.warn("[search] No search API keys configured. Set SERPER_API_KEY, TAVILY_API_KEY, BRAVE_SEARCH_API_KEY, or GOOGLE_CSE_API_KEY+GOOGLE_CSE_ID");
    return [];
  }

  for (const provider of providers) {
    try {
      const results = await provider.fn(query);
      usageCounter[provider.name] = (usageCounter[provider.name] || 0) + 1;

      if (results.length > 0) {
        return results;
      }
      // Empty results — try next provider
    } catch (err) {
      console.warn(`[search] ${provider.name} failed: ${err.message}`);
      // Fall through to next provider
    }
  }

  return [];
}

/**
 * Get status of configured search providers.
 */
export function getSearchProviderStatus() {
  const status = [];

  if (process.env.SERPER_API_KEY) status.push("serper (2,500 free queries)");
  if (process.env.TAVILY_API_KEY) status.push("tavily (1,000/month free)");
  if (process.env.BRAVE_SEARCH_API_KEY) status.push("brave ($5/mo credit)");
  if (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID) status.push("google_cse (100/day free)");

  return {
    providers: status,
    count: status.length,
    usage: { ...usageCounter },
  };
}
