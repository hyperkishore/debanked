import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/api-helpers";

/**
 * GET /api/linkedin-feed?limit=10
 *
 * Returns recent LinkedIn activity for the Command Center feed panel.
 * Reads from linkedin_activity table, ordered by extracted_at desc.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

  const { data, error } = await supabase
    .from("linkedin_activity")
    .select("id, leader_name, company_id, activity_type, content_summary, original_url, extracted_at")
    .order("extracted_at", { ascending: false })
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
