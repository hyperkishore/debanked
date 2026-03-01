import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/team-notes/[companyId]
 * Chat notes and engagements for a company.
 * Reads from miq_notes and miq_engagements tables.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { companyId } = await params;
  const cid = parseInt(companyId, 10);
  if (!Number.isFinite(cid)) {
    return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
  }

  // Fetch notes and engagements in parallel
  const [notesResult, engagementsResult] = await Promise.all([
    supabase
      .from("miq_notes")
      .select("id, user_id, content, created_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("miq_engagements")
      .select("id, user_id, leader_name, channel, action, summary, created_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // Tables may not exist yet — return empty arrays gracefully
  const notes = notesResult.error ? [] : notesResult.data || [];
  const engagements = engagementsResult.error ? [] : engagementsResult.data || [];

  return NextResponse.json({
    companyId: cid,
    notes,
    engagements,
    totalNotes: notes.length,
    totalEngagements: engagements.length,
  });
}
