import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/daily-brief?date=YYYY-MM-DD
 *
 * Returns today's (or specified date's) intelligence brief from kiket_daily_briefs.
 * Auth: X-Tool-Key header.
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("kiket_daily_briefs")
    .select("*")
    .eq("brief_date", date)
    .single();

  if (error || !data) {
    // Try most recent brief if exact date not found
    const { data: recent } = await supabase
      .from("kiket_daily_briefs")
      .select("*")
      .order("brief_date", { ascending: false })
      .limit(1)
      .single();

    if (!recent) {
      return NextResponse.json({
        date,
        highlights: ["No intelligence brief available for this date"],
        leader_activity: [],
        company_news: [],
        hooks_updated: [],
        recommended_actions: [],
      });
    }

    return NextResponse.json({
      ...recent.full_brief,
      date: recent.brief_date,
      _note: date !== recent.brief_date ? `No brief for ${date}, showing latest (${recent.brief_date})` : undefined,
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
