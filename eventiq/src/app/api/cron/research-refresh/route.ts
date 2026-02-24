import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { fetchGoogleNews, type RawSignal } from "@/lib/signal-sources/google-news";

/**
 * GET /api/cron/research-refresh
 *
 * Vercel Cron job — runs weekly on Monday at 6 AM UTC.
 * Identifies stale priority accounts (no recent news) and refreshes their signals.
 *
 * Strategy:
 * - Find P0/P1/P2 companies with no company_news in the last 30 days
 * - Run fresh Google News searches for each
 * - Store any new signals in company_news
 * - Limit to 50 companies per run to stay within Vercel function timeout
 */
export async function GET(request: NextRequest) {
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
    const startTime = Date.now();

    // 1. Get all priority companies (SQO, Client, ICP)
    const { data: priorityCompanies } = await supabase
      .from("companies")
      .select("id, name, type, priority")
      .lte("priority", 3)
      .order("priority", { ascending: true });

    if (!priorityCompanies || priorityCompanies.length === 0) {
      return NextResponse.json({ message: "No priority companies found" });
    }

    // 2. Find which ones have stale or no recent news (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentNewsCompanyIds } = await supabase
      .from("company_news")
      .select("company_id")
      .gte("published_at", thirtyDaysAgo.toISOString().slice(0, 10));

    const recentIds = new Set((recentNewsCompanyIds || []).map((r: { company_id: number }) => r.company_id));

    const staleCompanies = priorityCompanies.filter((c) => !recentIds.has(c.id));

    // 3. Limit to 50 per run (Vercel function timeout consideration)
    const batch = staleCompanies.slice(0, 50);

    if (batch.length === 0) {
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        message: "All priority companies have recent news",
        totalPriority: priorityCompanies.length,
        stale: 0,
      });
    }

    // 4. Search Google News for each stale company (bounded concurrency)
    let totalFound = 0;
    let totalNew = 0;
    const errors: string[] = [];

    // Process in chunks of 5 concurrent requests with delays
    for (let i = 0; i < batch.length; i += 5) {
      const chunk = batch.slice(i, i + 5);
      const results = await Promise.allSettled(
        chunk.map(async (company) => {
          try {
            const signals: RawSignal[] = await fetchGoogleNews(company.name);
            if (signals.length === 0) return { found: 0, stored: 0 };

            // Classify and store
            const rows = signals.map((s) => ({
              company_id: company.id,
              company_name: company.name,
              headline: s.headline,
              source: s.source || "Google News",
              description: s.description || "",
              published_at: s.publishedAt || new Date().toISOString().slice(0, 10),
              source_url: s.sourceUrl || null,
              signal_type: classifyType(s.headline, s.description || ""),
              heat: classifyHeat(company.type, s.headline, s.publishedAt),
            }));

            const { data, error } = await supabase
              .from("company_news")
              .upsert(rows, { onConflict: "company_id,headline", ignoreDuplicates: true })
              .select("id");

            return {
              found: signals.length,
              stored: data?.length || 0,
            };
          } catch (err) {
            errors.push(`${company.name}: ${String(err)}`);
            return { found: 0, stored: 0 };
          }
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          totalFound += r.value.found;
          totalNew += r.value.stored;
        }
      }

      // Rate limit between chunks
      if (i + 5 < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // 5. Log the run
    const durationMs = Date.now() - startTime;
    await supabase.from("signal_ingestion_log").insert({
      source: "research_refresh",
      companies_searched: batch.length,
      signals_found: totalFound,
      signals_new: totalNew,
      duration_ms: durationMs,
    });

    const summary = {
      timestamp: new Date().toISOString(),
      totalPriority: priorityCompanies.length,
      stale: staleCompanies.length,
      refreshed: batch.length,
      signalsFound: totalFound,
      signalsNew: totalNew,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
    };

    console.log("[Cron:ResearchRefresh]", JSON.stringify(summary));

    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Cron:ResearchRefresh] Fatal error:", err);
    return NextResponse.json(
      { error: "Research refresh failed", details: String(err) },
      { status: 500 }
    );
  }
}

// Simple signal classification (mirrors signal-ingest.ts)
function classifyType(headline: string, description: string): string {
  const text = `${headline} ${description}`.toLowerCase();
  if (/securitiz|abs|credit facilit|funding round|raise|series [a-f]|warehouse|capital|million|billion|\$\d/.test(text)) return "funding";
  if (/partner|integrat|collaborat|alliance|joined|embedded|api/.test(text)) return "partnership";
  if (/launch|new product|new feature|platform|tool|service|division/.test(text)) return "product";
  if (/hire|appoint|ceo|cro|ciso|cmo|chief|new leadership|new head/.test(text)) return "hiring";
  if (/regulat|compliance|law|bill|act|fda|fcc|fdic|sba|ftc|settlement/.test(text)) return "regulatory";
  if (/milestone|surpass|\d+b|\d+m|record|award|ranked|best|fastest/.test(text)) return "milestone";
  return "general";
}

function classifyHeat(companyType: string, headline: string, publishedAt: string | null): string {
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
