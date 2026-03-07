import { NextRequest, NextResponse } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";
import { apiError } from "@/lib/api-helpers";

/**
 * GET /api/tools/chat-history?user_email=xxx&limit=20
 * Tool API for Kiket to read recent chat history for a user.
 * Auth: X-Tool-Key header.
 *
 * POST /api/tools/chat-history — Trigger summarization of a conversation
 */

export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const userEmail = request.nextUrl.searchParams.get("user_email");
  if (!userEmail) return apiError("user_email required", 400);

  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);

  // Get recent conversations for this user
  const { data: conversations, error: convError } = await supabase
    .from("kiket_conversations")
    .select("id, title, summary, updated_at")
    .eq("user_email", userEmail)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (convError) return apiError(convError.message, 500);

  // For each conversation, get the last few messages
  const results = await Promise.all(
    (conversations || []).map(async (conv: Record<string, unknown>) => {
      const { data: messages } = await supabase
        .from("kiket_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(5);

      return {
        ...conv,
        recent_messages: (messages || []).reverse(),
      };
    })
  );

  return NextResponse.json({ conversations: results });
}

export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  const { conversation_id } = body;
  if (!conversation_id) return apiError("conversation_id required", 400);

  // Get conversation
  const { data: conv } = await supabase
    .from("kiket_conversations")
    .select("id, summary, summary_through_message_id")
    .eq("id", conversation_id)
    .single();

  if (!conv) return apiError("Conversation not found", 404);

  // Get unsummarized messages
  let query = supabase
    .from("kiket_messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  if (conv.summary_through_message_id) {
    const { data: lastSummarized } = await supabase
      .from("kiket_messages")
      .select("created_at")
      .eq("id", conv.summary_through_message_id)
      .single();

    if (lastSummarized) {
      query = query.gt("created_at", lastSummarized.created_at);
    }
  }

  const { data: unsummarized } = await query;

  if (!unsummarized || unsummarized.length === 0) {
    return NextResponse.json({
      summary: conv.summary || "No conversation history",
      unsummarized_count: 0,
    });
  }

  // Build extractive summary (tool API doesn't need Claude — Kiket can summarize itself)
  const messageTexts = unsummarized.map(
    (m: { role: string; content: string }) => `${m.role}: ${m.content.slice(0, 200)}`
  );

  return NextResponse.json({
    existing_summary: conv.summary || null,
    unsummarized_count: unsummarized.length,
    unsummarized_messages: messageTexts,
  });
}
