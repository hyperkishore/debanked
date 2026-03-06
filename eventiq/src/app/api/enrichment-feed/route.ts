import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * GET /api/enrichment-feed?limit=20&since=YYYY-MM-DD
 *
 * Returns recent enrichment events from enrichment_log for the command center feed.
 * Auth: Supabase user session (anon key) — no tool key needed for UI access.
 */
export async function GET(request: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
  const since = searchParams.get("since");

  let query = supabase
    .from("enrichment_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte("created_at", `${since}T00:00:00Z`);
  }

  const { data, error, count } = await query;

  if (error) {
    // Table might not exist yet
    return NextResponse.json({ items: [], total: 0 });
  }

  const items = (data || []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    leaderName: row.leader_name,
    type: row.enrichment_type,
    summary: row.summary,
    data: row.data,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ items, total: count || items.length });
}
