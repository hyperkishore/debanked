import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { validateToolKey } from "@/lib/tool-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

/**
 * POST /api/research-requests
 * Log a research refresh request for a company.
 * Accepts user auth (UI clicks) or tool-key auth (signal-driven triggers).
 */
export async function POST(request: NextRequest) {
  let supabase;
  let userEmail = "system";

  // Try tool-key auth first (for worker/signal-driven requests)
  if (validateToolKey(request)) {
    supabase = getSupabaseServer();
    if (!supabase) return apiError("Database not configured", 503);
  } else {
    // Fall back to user auth
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    supabase = auth.supabase;
    userEmail = auth.user.email || "unknown";
  }

  const body = await request.json();
  const { companyId, triggerType, triggerDetail, priority: reqPriority } = body;

  if (!companyId) {
    return apiError("companyId is required", 400);
  }

  // Look up company name for logging
  let companyName = body.companyName;
  if (!companyName) {
    const { data: co } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();
    companyName = co?.name || `ID:${companyId}`;
  }

  const { data, error } = await supabase
    .from("research_requests")
    .upsert(
      {
        company_id: companyId,
        company_name: companyName,
        trigger_type: triggerType || "manual",
        trigger_detail: triggerDetail || null,
        status: "pending",
        priority: reqPriority ?? 5,
        user_email: userEmail,
        requested_at: new Date().toISOString(),
      },
      {
        onConflict: "company_id",
        ignoreDuplicates: true,
      }
    )
    .select("id")
    .single();

  if (error) {
    // Duplicate pending request — not an error, just return success
    if (error.code === "23505") {
      return NextResponse.json({ success: true, duplicate: true });
    }
    return apiError("Failed to save request: " + error.message, 500);
  }

  return NextResponse.json({ success: true, id: data?.id });
}

/**
 * GET /api/research-requests
 * List research requests with optional filters.
 * Query params: status, companyId, limit
 */
export async function GET(request: NextRequest) {
  let supabase;

  // Accept both user auth and tool-key auth
  if (validateToolKey(request)) {
    supabase = getSupabaseServer();
    if (!supabase) return apiError("Database not configured", 503);
  } else {
    const auth = await authenticateRequest(request);
    if ("error" in auth) return auth.error;
    supabase = auth.supabase;
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const companyId = searchParams.get("companyId");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  let query = supabase
    .from("research_requests")
    .select("*")
    .order("priority", { ascending: true })
    .order("requested_at", { ascending: true })
    .limit(Math.min(limit, 100));

  if (status) {
    query = query.eq("status", status);
  }
  if (companyId) {
    query = query.eq("company_id", parseInt(companyId, 10));
  }

  const { data, error } = await query;

  if (error) {
    return apiError("Failed to fetch requests: " + error.message, 500);
  }

  return NextResponse.json(data || []);
}

/**
 * PATCH /api/research-requests
 * Update request status (used by EC2 worker).
 * Body: { id, status, result?, error?, started_at?, completed_at? }
 */
export async function PATCH(request: NextRequest) {
  // Worker-only: tool-key auth required
  if (!validateToolKey(request)) {
    return apiError("Invalid or missing API key", 401);
  }

  const supabase = getSupabaseServer();
  if (!supabase) return apiError("Database not configured", 503);

  const body = await request.json();
  const { id, status, result, error: errorMsg, started_at, completed_at } = body;

  if (!id) return apiError("id is required", 400);
  if (!status) return apiError("status is required", 400);

  const updates: Record<string, unknown> = { status };
  if (result !== undefined) updates.result = result;
  if (errorMsg !== undefined) updates.error = errorMsg;
  if (started_at) updates.started_at = started_at;
  if (completed_at) updates.completed_at = completed_at;

  const { error } = await supabase
    .from("research_requests")
    .update(updates)
    .eq("id", id);

  if (error) {
    return apiError("Failed to update request: " + error.message, 500);
  }

  return NextResponse.json({ success: true });
}
