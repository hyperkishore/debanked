import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import Parser from "rss-parser";
import { matchCompanies } from "@/lib/news-matcher";

/**
 * GET /api/cron/news-ingest
 *
 * Vercel Cron job — runs daily at 9 AM UTC.
 * Ingests news from Google Alerts RSS feed (single industry-level alert)
 * and deBanked RSS. Fuzzy-matches articles to companies in our dataset.
 *
 * Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
 */

const parser = new Parser();

// Google Alert RSS feed URL — set in Vercel env vars
// User creates a single Google Alert for the industry and provides the feed URL
const GOOGLE_ALERT_FEED_URL = process.env.GOOGLE_ALERT_RSS_URL || "";
const DEBANKED_FEED_URL = "https://debanked.com/feed/";

interface FeedArticle {
  title: string;
  description: string;
  link: string;
  publishedAt: string | null;
  source: string;
}

async function fetchGoogleAlertFeed(): Promise<FeedArticle[]> {
  if (!GOOGLE_ALERT_FEED_URL) {
    console.log("[NewsIngest] No GOOGLE_ALERT_RSS_URL configured, skipping");
    return [];
  }

  try {
    const feed = await parser.parseURL(GOOGLE_ALERT_FEED_URL);
    return (feed.items || []).slice(0, 50).map((item) => ({
      title: item.title || "",
      description: item.contentSnippet || item.content || "",
      link: item.link || "",
      publishedAt: item.isoDate || item.pubDate || null,
      source: "google_alert",
    }));
  } catch (err) {
    console.error("[NewsIngest] Google Alert RSS fetch failed:", err);
    return [];
  }
}

async function fetchDeBankedFeed(): Promise<FeedArticle[]> {
  try {
    const feed = await parser.parseURL(DEBANKED_FEED_URL);
    return (feed.items || []).slice(0, 30).map((item) => ({
      title: item.title || "",
      description: item.contentSnippet || "",
      link: item.link || "",
      publishedAt: item.isoDate || item.pubDate || null,
      source: "debanked_rss",
    }));
  } catch (err) {
    console.error("[NewsIngest] deBanked RSS fetch failed:", err);
    return [];
  }
}

function classifySignalType(headline: string, description: string): string {
  const text = `${headline} ${description}`.toLowerCase();
  if (/securitiz|abs|credit facilit|funding round|raise|series [a-f]|warehouse|capital|million|billion|\$\d/.test(text)) return "funding";
  if (/partner|integrat|collaborat|alliance|joined|embedded|api/.test(text)) return "partnership";
  if (/launch|new product|new feature|platform|tool|service|division/.test(text)) return "product";
  if (/hire|appoint|ceo|cro|ciso|cmo|chief|new leadership|new head/.test(text)) return "hiring";
  if (/regulat|compliance|law|bill|act|fda|fcc|fdic|sba|ftc|settlement/.test(text)) return "regulatory";
  if (/milestone|surpass|\d+b|\d+m|record|award|ranked|best|fastest/.test(text)) return "milestone";
  return "general";
}

function classifyHeat(companyType: string, companyPriority: number, publishedAt: string | null): string {
  const isRecent = publishedAt
    ? Date.now() - new Date(publishedAt).getTime() < 7 * 86400000
    : false;

  if (companyPriority <= 2) return "hot";
  if (companyPriority <= 4 && isRecent) return "warm";
  return "cool";
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // Fetch companies for matching
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, type, priority");

    if (!companies || companies.length === 0) {
      return NextResponse.json({ error: "No companies in database" }, { status: 500 });
    }

    // Fetch both feeds in parallel
    const [googleArticles, debankedArticles] = await Promise.all([
      fetchGoogleAlertFeed(),
      fetchDeBankedFeed(),
    ]);

    const allArticles = [...googleArticles, ...debankedArticles];
    let totalMatched = 0;
    let totalNew = 0;

    // Process each article: match to companies, store in company_news
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

    for (const article of allArticles) {
      const text = `${article.title} ${article.description}`;
      const matches = matchCompanies(text, companies);

      for (const match of matches) {
        totalMatched++;
        const signalType = classifySignalType(article.title, article.description);
        const heat = classifyHeat(match.companyType, match.companyPriority, article.publishedAt);

        rows.push({
          company_id: match.companyId,
          company_name: match.companyName,
          headline: article.title.slice(0, 500),
          source: article.source.slice(0, 200),
          description: article.description.slice(0, 1000),
          published_at: article.publishedAt
            ? new Date(article.publishedAt).toISOString().slice(0, 10)
            : null,
          signal_type: signalType,
          heat,
          source_url: article.link.slice(0, 500),
        });
      }
    }

    // Upsert (dedupe by company_id + headline)
    if (rows.length > 0) {
      const { data, error } = await supabase
        .from("company_news")
        .upsert(rows, { onConflict: "company_id,headline", ignoreDuplicates: true })
        .select("id");

      if (error) {
        console.error("[NewsIngest] Upsert error:", error.message);
      } else {
        totalNew = data?.length || 0;
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      articlesProcessed: allArticles.length,
      googleAlertArticles: googleArticles.length,
      debankedArticles: debankedArticles.length,
      totalMatched,
      totalNew,
    };

    console.log("[Cron:NewsIngest]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:NewsIngest] Fatal error:", err);
    return NextResponse.json(
      { error: "Ingestion failed", details: String(err) },
      { status: 500 }
    );
  }
}
