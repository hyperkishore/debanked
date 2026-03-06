import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/daily-brief?date=YYYY-MM-DD
 *
 * Browser-accessible version of the daily brief.
 * No auth required (read-only, public data).
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({
      date: new Date().toISOString().slice(0, 10),
      highlights: [],
      leader_activity: [],
      company_news: [],
      hooks_updated: [],
      recommended_actions: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("kiket_daily_briefs")
    .select("*")
    .eq("brief_date", date)
    .single();

  if (error || !data) {
    // Try most recent brief
    const { data: recent } = await supabase
      .from("kiket_daily_briefs")
      .select("*")
      .order("brief_date", { ascending: false })
      .limit(1)
      .single();

    if (!recent) {
      return NextResponse.json({
        date,
        highlights: [],
        leader_activity: [],
        company_news: [],
        hooks_updated: [],
        recommended_actions: [],
      });
    }

    return NextResponse.json({
      ...recent.full_brief,
      date: recent.brief_date,
    });
  }

  return NextResponse.json({
    ...data.full_brief,
    date: data.brief_date,
    highlights: data.highlights,
    leader_activity: data.leader_activity,
    company_news: data.company_news,
    hooks_updated: data.hooks_updated,
    recommended_actions: data.recommended_actions,
  });
}
