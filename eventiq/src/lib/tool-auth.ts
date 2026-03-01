import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { apiError } from "@/lib/api-helpers";

/**
 * Tool API authentication — validates X-Tool-Key header.
 * Used by /api/tools/* endpoints that OpenClaw calls.
 * Separate from user auth — this is machine-to-machine auth.
 */

const TOOL_API_KEY = process.env.TOOL_API_KEY ?? "";

/** Validate X-Tool-Key header against TOOL_API_KEY env var. */
export function validateToolKey(request: NextRequest): boolean {
  if (!TOOL_API_KEY) return false;
  const key = request.headers.get("x-tool-key");
  return key === TOOL_API_KEY;
}

/**
 * Authenticate a tool API request.
 * Returns { supabase } on success, or { error: NextResponse } on failure.
 */
export function authenticateToolRequest(request: NextRequest) {
  if (!validateToolKey(request)) {
    return { error: apiError("Invalid or missing API key", 401) } as const;
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return { error: apiError("Database not configured", 503) } as const;
  }

  return { supabase } as const;
}
