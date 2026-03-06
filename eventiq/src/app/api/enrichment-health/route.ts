import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/enrichment-health
 *
 * Returns pipeline health: last run times, event counts, freshness alerts.
 */
export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ status: "unconfigured" });
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // Fetch stats in parallel
  const [
    recentEnrichments,
    todayEnrichments,
    latestBrief,
    latestActivity,
    typeCounts,
  ] = await Promise.all([
    supabase
      .from("enrichment_log")
      .select("enrichment_type, created_at", { count: "exact" })
      .gte("created_at", twoDaysAgo)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("enrichment_log")
      .select("enrichment_type", { count: "exact" })
      .gte("created_at", `${today}T00:00:00Z`),
    supabase
      .from("kiket_daily_briefs")
      .select("brief_date, created_at")
      .order("brief_date", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("linkedin_activity")
      .select("extracted_at")
      .order("extracted_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("enrichment_log")
      .select("enrichment_type")
      .gte("created_at", twoDaysAgo),
  ]);

  // Compute type breakdown from last 48 hours
  const typeBreakdown: Record<string, number> = {};
  if (typeCounts.data) {
    for (const row of typeCounts.data) {
      typeBreakdown[row.enrichment_type] = (typeBreakdown[row.enrichment_type] || 0) + 1;
    }
  }

  // Determine alerts
  const alerts: string[] = [];
  const lastEnrichment = recentEnrichments.data?.[0]?.created_at;
  if (!lastEnrichment) {
    alerts.push("No enrichment events in the last 48 hours");
  }

  const lastBriefDate = latestBrief.data?.brief_date;
  if (!lastBriefDate || lastBriefDate < today) {
    alerts.push("No daily brief generated today yet");
  }

  const lastActivityTime = latestActivity.data?.extracted_at;
  if (lastActivityTime) {
    const hoursSince = (now.getTime() - new Date(lastActivityTime).getTime()) / 3600000;
    if (hoursSince > 48) {
      alerts.push(`No LinkedIn activity extraction in ${Math.round(hoursSince)} hours`);
    }
  }

  return NextResponse.json({
    status: alerts.length === 0 ? "healthy" : "warning",
    alerts,
    today: {
      enrichmentEvents: todayEnrichments.count || 0,
    },
    last48h: {
      enrichmentEvents: recentEnrichments.count || 0,
      byType: typeBreakdown,
    },
    lastRuns: {
      enrichment: lastEnrichment || null,
      dailyBrief: lastBriefDate || null,
      linkedinActivity: lastActivityTime || null,
    },
  });
}
