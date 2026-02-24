import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import {
  isOutplayConfigured,
  addProspectToSequence,
  listSequences,
} from "@/lib/outplay-client";

/**
 * POST /api/outplay/add-to-sequence
 * Add a prospect to an Outplay email sequence.
 * Body: { email, name, title?, companyName?, sequenceId, talkingPoints?, icebreaker? }
 *
 * GET /api/outplay/add-to-sequence
 * List available sequences for the picker.
 */
export async function GET(request: NextRequest) {
  if (!isOutplayConfigured()) {
    return apiError("OUTPLAY_API_KEY not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  const sequences = await listSequences();
  return NextResponse.json({ sequences });
}

export async function POST(request: NextRequest) {
  if (!isOutplayConfigured()) {
    return apiError("OUTPLAY_API_KEY not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { email, name, title, companyName, sequenceId, talkingPoints, icebreaker } = body;

  if (!email || !name || !sequenceId) {
    return apiError("email, name, and sequenceId are required", 400);
  }

  const result = await addProspectToSequence(email, name, sequenceId, {
    companyName,
    title,
    talkingPoints,
    icebreaker,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to add prospect" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    prospectId: result.prospectId,
  });
}
