import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * POST /api/research-requests
 * Log a research refresh request for a company.
 * Stores: companyId, userId, timestamp in Supabase.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json();
  const companyId = body.companyId;

  if (!companyId) {
    return apiError("companyId is required", 400);
  }

  const { error } = await supabase.from("research_requests").insert({
    company_id: companyId,
    user_id: user.id,
    user_email: user.email || "unknown",
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    // If table doesn't exist, store in signal_ingestion_log as fallback
    if (error.code === "42P01") {
      await supabase.from("signal_ingestion_log").insert({
        source: "research_refresh",
        status: "pending",
        details: {
          company_id: companyId,
          user_id: user.id,
          user_email: user.email,
          requested_at: new Date().toISOString(),
        },
      });
      return NextResponse.json({ success: true, fallback: true });
    }
    return apiError("Failed to save request: " + error.message, 500);
  }

  return NextResponse.json({ success: true });
}

/**
 * GET /api/research-requests
 * List all pending research refresh requests.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("research_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  if (error) {
    // Fallback: read from signal_ingestion_log
    if (error.code === "42P01") {
      const { data: logs } = await supabase
        .from("signal_ingestion_log")
        .select("*")
        .eq("source", "research_refresh")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      return NextResponse.json(logs || []);
    }
    return apiError("Failed to fetch requests", 500);
  }

  return NextResponse.json(data || []);
}
