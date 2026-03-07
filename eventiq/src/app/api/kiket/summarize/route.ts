import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";

/**
 * POST /api/kiket/summarize — Summarize unsummarized chat history for a conversation
 *
 * Takes all messages after the last summary point and produces a condensed summary.
 * Stores the summary as a special "summary" message in the conversation.
 */

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const body = await request.json().catch(() => null);
  if (!body) return apiError("Invalid JSON body", 400);

  const { conversation_id } = body;
  if (!conversation_id) return apiError("conversation_id required", 400);

  // Verify ownership
  const { data: conv } = await supabase
    .from("kiket_conversations")
    .select("id, summary, summary_through_message_id")
    .eq("id", conversation_id)
    .eq("user_id", user.id)
    .single();

  if (!conv) return apiError("Conversation not found", 404);

  // Get messages that haven't been summarized yet
  let query = supabase
    .from("kiket_messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: true });

  if (conv.summary_through_message_id) {
    // Get the timestamp of the last summarized message
    const { data: lastSummarized } = await supabase
      .from("kiket_messages")
      .select("created_at")
      .eq("id", conv.summary_through_message_id)
      .single();

    if (lastSummarized) {
      query = query.gt("created_at", lastSummarized.created_at);
    }
  }

  const { data: unsummarized, error } = await query;
  if (error) return apiError(error.message, 500);

  if (!unsummarized || unsummarized.length === 0) {
    return NextResponse.json({
      summary: conv.summary || null,
      message: "No new messages to summarize",
      unsummarized_count: 0,
    });
  }

  // Build the text to summarize
  const existingSummary = conv.summary || "";
  const messageTexts = unsummarized.map(
    (m: { role: string; content: string }) => `${m.role}: ${m.content}`
  );

  // Use Claude via Anthropic API to summarize
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    // Fallback: simple extractive summary (no LLM)
    const summary = buildExtractSummary(existingSummary, unsummarized);
    const lastMsg = unsummarized[unsummarized.length - 1];

    await supabase
      .from("kiket_conversations")
      .update({
        summary,
        summary_through_message_id: lastMsg.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    return NextResponse.json({
      summary,
      unsummarized_count: unsummarized.length,
      method: "extractive",
    });
  }

  // Claude-powered summary
  const prompt = `Summarize this conversation between a user and Kiket (a GTM intelligence assistant for HyperVerge). Focus on:
1. Key topics discussed (companies, people, strategies)
2. Decisions made or action items agreed on
3. Important information Kiket provided (data, insights, recommendations)
4. Any updates the user shared about their work

${existingSummary ? `Previous summary:\n${existingSummary}\n\nNew messages since last summary:` : "Full conversation:"}

${messageTexts.join("\n\n")}

Produce a concise summary (3-8 sentences). Focus on actionable information and context that would be useful for future conversations.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const result = await response.json();
    const summary = result.content?.[0]?.text || "";
    const lastMsg = unsummarized[unsummarized.length - 1];

    // Combine with existing summary if present
    const fullSummary = existingSummary
      ? `${existingSummary}\n\n--- Updated ${new Date().toISOString().split("T")[0]} ---\n${summary}`
      : summary;

    await supabase
      .from("kiket_conversations")
      .update({
        summary: fullSummary,
        summary_through_message_id: lastMsg.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    return NextResponse.json({
      summary: fullSummary,
      unsummarized_count: unsummarized.length,
      method: "claude",
    });
  } catch (err) {
    // Fallback to extractive
    const summary = buildExtractSummary(existingSummary, unsummarized);
    const lastMsg = unsummarized[unsummarized.length - 1];

    await supabase
      .from("kiket_conversations")
      .update({
        summary,
        summary_through_message_id: lastMsg.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversation_id);

    return NextResponse.json({
      summary,
      unsummarized_count: unsummarized.length,
      method: "extractive",
      error: err instanceof Error ? err.message : "Claude API failed",
    });
  }
}

/** Simple extractive summary without LLM — takes first sentence of each assistant message */
function buildExtractSummary(
  existing: string,
  messages: { role: string; content: string }[]
): string {
  const assistantMsgs = messages.filter((m) => m.role === "assistant");
  const userTopics = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.slice(0, 60))
    .join("; ");

  const keyPoints = assistantMsgs
    .map((m) => m.content.split(/[.!?]\s/)[0])
    .filter((s) => s.length > 10)
    .slice(0, 5)
    .join(". ");

  const newSummary = `Topics: ${userTopics}. Key points: ${keyPoints}.`;
  return existing ? `${existing}\n\n${newSummary}` : newSummary;
}
