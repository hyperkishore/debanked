import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * POST /api/tools/set-reminder
 *
 * Sets a follow-up reminder for a company.
 * Body: { companyId, contactName, dueDate, notes, userId }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { companyId, contactName, dueDate, notes, userId } = body;

    if (!companyId || !dueDate) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, dueDate" },
        { status: 400 }
      );
    }

    const effectiveUserId = userId || "mission_iq_agent";

    const { data, error } = await supabase
      .from("follow_ups")
      .insert({
        company_id: companyId,
        user_id: effectiveUserId,
        contact_name: contactName || "Unknown",
        due_date: dueDate,
        notes: notes || "",
        completed: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error setting reminder:", error);
      return NextResponse.json(
        { error: "Failed to set reminder", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reminder: data,
      message: `Reminder set for ${dueDate}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
