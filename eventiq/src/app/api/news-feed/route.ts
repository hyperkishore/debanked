import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

/**
 * GET /api/news-feed?limit=15
 *
 * Returns recent company news for the Command Center feed panel.
 * Reads from company_news table, ordered by published_at desc.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);

  const { data, error } = await supabase
    .from("company_news")
    .select("id, company_id, company_name, headline, source, description, published_at, signal_type, heat, source_url")
    .order("published_at", { ascending: false })
    .limit(limit);

  // Table may not exist yet
  if (error) {
    return NextResponse.json({ items: [], total: 0 });
  }

  return NextResponse.json({
    items: data || [],
    total: (data || []).length,
  });
}
