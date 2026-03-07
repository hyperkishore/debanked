import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * GET /api/kiket/conversations — List conversations for the current user
 * POST /api/kiket/conversations — Create a new conversation
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0", 10);

  const { data, error, count } = await supabase
    .from("kiket_conversations")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ conversations: data, total: count });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json().catch(() => ({}));
  const title = body.title || "New conversation";

  const { data, error } = await supabase
    .from("kiket_conversations")
    .insert({
      user_id: user.id,
      user_email: user.email,
      title,
    })
    .select()
    .single();

  if (error) return apiError(error.message, 500);

  return NextResponse.json(data, { status: 201 });
}
