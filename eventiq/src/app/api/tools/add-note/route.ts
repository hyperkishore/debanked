import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * POST /api/tools/add-note
 *
 * Appends a note to a company's team notes.
 * Body: { companyId, note, userId, authorName }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { companyId, note, userId, authorName } = body;

    if (!companyId || !note) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, note" },
        { status: 400 }
      );
    }

    const effectiveUserId = userId || "mission_iq_agent";
    const author = authorName || "MissionIQ";
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    const newNoteEntry = `[${timestamp}] ${author}: ${note}

`;

    // First get existing notes
    const { data: existing } = await supabase
      .from("company_notes")
      .select("notes")
      .eq("company_id", companyId)
      .eq("user_id", effectiveUserId)
      .single();

    const currentNotes = existing?.notes || "";
    const updatedNotes = currentNotes + newNoteEntry;

    // Upsert
    const { data, error } = await supabase
      .from("company_notes")
      .upsert({
        company_id: companyId,
        user_id: effectiveUserId,
        notes: updatedNotes,
      }, {
        onConflict: "company_id,user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding note:", error);
      return NextResponse.json(
        { error: "Failed to add note", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notesLength: updatedNotes.length,
      message: `Note added to company ${companyId}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
