import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * POST /api/tools/update-pipeline
 *
 * Moves a company to a new pipeline stage.
 * Body: { companyId, stage, dealValue, closeDate, userId }
 */
export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  try {
    const body = await request.json();
    const { companyId, stage, dealValue, closeDate, userId } = body;

    if (!companyId || !stage) {
      return NextResponse.json(
        { error: "Missing required fields: companyId, stage" },
        { status: 400 }
      );
    }

    const effectiveUserId = userId || "mission_iq_agent";

    // Upsert into pipeline_records
    const { data, error } = await supabase
      .from("pipeline_records")
      .upsert({
        company_id: companyId,
        user_id: effectiveUserId,
        stage: stage,
        moved_at: new Date().toISOString(),
        deal_value: dealValue,
        close_date: closeDate,
      }, {
        onConflict: "company_id,user_id"
      })
      .select()
      .single();

    if (error) {
      console.error("Error updating pipeline:", error);
      return NextResponse.json(
        { error: "Failed to update pipeline", details: error.message },
        { status: 500 }
      );
    }

    // Also update met status if moving past "contacted"
    if (["contacted", "engaged", "demo", "proposal", "won"].includes(stage)) {
      await supabase
        .from("company_met")
        .upsert({
          company_id: companyId,
          user_id: effectiveUserId,
          met: true,
        }, {
          onConflict: "company_id,user_id"
        });
    }

    return NextResponse.json({
      success: true,
      pipeline: data,
      message: `Moved company ${companyId} to ${stage}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
