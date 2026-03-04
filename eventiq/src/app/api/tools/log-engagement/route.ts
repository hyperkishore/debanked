import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * POST /api/tools/log-engagement
 *
 * Logs a new engagement for a company.
 * Body: { companyId, contactName, channel, action, notes, userId }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { companyId, contactName, channel, action, notes, userId } = body;

    if (!companyId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, action" },
        { status: 400 }
      );
    }

    // Default to 'unknown' user if not provided (MissionIQ agent)
    const effectiveUserId = userId || "mission_iq_agent";

    const { data, error } = await supabase
      .from("engagements")
      .insert({
        company_id: companyId,
        contact_name: contactName || "Unknown",
        channel: channel || "other",
        action: action,
        notes: notes || "",
        source: "mission_iq",
        user_id: effectiveUserId,
        timestamp: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging engagement:", error);
      return NextResponse.json(
        { error: "Failed to log engagement", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      engagement: data,
      message: `Logged ${action} for company ${companyId}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
