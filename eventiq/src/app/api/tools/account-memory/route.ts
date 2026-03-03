import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * /api/tools/account-memory
 *
 * Kiket persistent memory per account.
 * Stores strategies, interactions, insights, and preferences per company.
 *
 * GET  ?companyId=123        → all memories for account
 * POST {companyId, memoryType, content} → store new memory
 * DELETE ?id=xxx             → remove stale memory
 */

type MemoryType = "strategy" | "interaction" | "insight" | "preference";
const VALID_TYPES: MemoryType[] = ["strategy", "interaction", "insight", "preference"];

export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const companyId = parseInt(searchParams.get("companyId") || "", 10);

  if (!Number.isFinite(companyId)) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("kiket_account_memory")
    .select("id, company_id, memory_type, content, source, created_at, updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    // Table may not exist yet — return empty gracefully
    if (error.code === "42P01") {
      return NextResponse.json({ companyId, memories: [], total: 0 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    companyId,
    memories: data || [],
    total: (data || []).length,
  });
}

export async function POST(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  let body: { companyId?: number; memoryType?: string; content?: string; source?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { companyId, memoryType, content, source } = body;

  if (!companyId || !Number.isFinite(companyId)) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  if (!memoryType || !VALID_TYPES.includes(memoryType as MemoryType)) {
    return NextResponse.json(
      { error: `memoryType must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }
  if (!content || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("kiket_account_memory")
    .insert({
      company_id: companyId,
      memory_type: memoryType,
      content: content.trim(),
      source: source || "kiket",
    })
    .select("id, company_id, memory_type, content, source, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, memory: data });
}

export async function DELETE(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("kiket_account_memory")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: id });
}
