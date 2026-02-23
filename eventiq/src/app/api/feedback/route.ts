import { NextResponse, type NextRequest } from "next/server";
import {
  authenticateRequest,
  authenticateAdmin,
  apiError,
} from "@/lib/api-helpers";

/**
 * POST /api/feedback
 * Any authenticated user can submit feedback.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const section = String(body.section || "General / Other");
  const feedbackType = String(body.feedbackType || "suggestion");
  const notes = String(body.notes || "").trim();
  const page = String(body.page || "");
  const companyName = String(body.companyName || "");
  const userAgent = String(body.userAgent || "");

  if (!notes) {
    return apiError("Notes are required", 400);
  }

  const { data, error } = await supabase
    .from("feedback")
    .insert({
      user_id: user.id,
      user_email: user.email || "",
      section,
      feedback_type: feedbackType,
      notes,
      page,
      company_name: companyName,
      user_agent: userAgent,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[API] Error inserting feedback:", error.message);
    return apiError("Failed to save feedback", 500);
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

/**
 * GET /api/feedback
 * Admin only. Returns feedback ordered by created_at DESC.
 * Optional query params: ?status=open&limit=200
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") || "200", 10) || 200,
    500
  );

  let query = supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[API] Error fetching feedback:", error.message);
    return apiError("Failed to fetch feedback", 500);
  }

  return NextResponse.json(data || []);
}

/**
 * PATCH /api/feedback
 * Admin only. Updates status of a feedback item.
 * Body: { id: string, status: "open" | "in_progress" | "resolved" }
 */
export async function PATCH(request: NextRequest) {
  const auth = await authenticateAdmin(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const id = String(body.id || "");
  const newStatus = String(body.status || "");

  if (!id) return apiError("id is required", 400);
  if (!["open", "in_progress", "resolved"].includes(newStatus)) {
    return apiError("status must be open, in_progress, or resolved", 400);
  }

  const updates: Record<string, unknown> = { status: newStatus };

  if (newStatus === "resolved") {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = user.id;
  } else {
    updates.resolved_at = null;
    updates.resolved_by = null;
  }

  const { error } = await supabase
    .from("feedback")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[API] Error updating feedback:", error.message);
    return apiError("Failed to update feedback", 500);
  }

  return NextResponse.json({ ok: true });
}
