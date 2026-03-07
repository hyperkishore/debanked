import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * GET /api/kiket/messages?conversation_id=xxx — Load messages for a conversation
 * POST /api/kiket/messages — Save a message (user or assistant)
 */

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const conversationId = request.nextUrl.searchParams.get("conversation_id");
  if (!conversationId) return apiError("conversation_id required", 400);

  // Verify ownership
  const { data: conv } = await supabase
    .from("kiket_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) return apiError("Conversation not found", 404);

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "100", 10);
  const before = request.nextUrl.searchParams.get("before"); // cursor for pagination

  let query = supabase
    .from("kiket_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ messages: data });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  const { conversation_id, role, content, thinking, metadata } = body;
  if (!conversation_id || !role || !content) {
    return apiError("conversation_id, role, and content are required", 400);
  }
  if (!["user", "assistant"].includes(role)) {
    return apiError("role must be 'user' or 'assistant'", 400);
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from("kiket_conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!conv) return apiError("Conversation not found", 404);

  // Insert message
  const { data: msg, error: msgError } = await supabase
    .from("kiket_messages")
    .insert({
      conversation_id,
      role,
      content,
      thinking: thinking || null,
      metadata: metadata || null,
    })
    .select()
    .single();

  if (msgError) return apiError(msgError.message, 500);

  // Update conversation's updated_at and auto-title from first user message
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (role === "user") {
    // Auto-title from first user message (truncate to 80 chars)
    const { count } = await supabase
      .from("kiket_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation_id)
      .eq("role", "user");

    if (count === 1) {
      updates.title = content.length > 80 ? content.slice(0, 77) + "..." : content;
    }
  }

  await supabase
    .from("kiket_conversations")
    .update(updates)
    .eq("id", conversation_id);

  return NextResponse.json(msg, { status: 201 });
}
