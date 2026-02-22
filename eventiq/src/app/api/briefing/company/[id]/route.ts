import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import { generateBriefing, computeSignalHash } from "@/lib/ai-briefing";
import { isAIConfigured } from "@/lib/ai-client";

/**
 * POST /api/briefing/company/[id]
 * Generate or retrieve a cached AI briefing for a specific company.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const companyId = parseInt(id);

  if (isNaN(companyId)) {
    return NextResponse.json({ error: "Invalid company ID" }, { status: 400 });
  }

  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI provider not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  // Get user from session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  // Fetch company data
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Fetch recent signals
  const { data: signals } = await supabase
    .from("company_news")
    .select("headline, source, published_at")
    .eq("company_id", companyId)
    .order("published_at", { ascending: false })
    .limit(10);

  // Fetch user's engagement summary
  const { data: engagements } = await supabase
    .from("engagements")
    .select("channel, action, timestamp, contact_name")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .order("timestamp", { ascending: false })
    .limit(5);

  // Fetch pipeline stage
  const { data: pipeline } = await supabase
    .from("pipeline_records")
    .select("stage")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .single();

  // Build context
  const ctx = {
    id: company.id,
    name: company.name,
    type: company.type,
    desc: company.desc_text || "",
    contacts: company.contacts || [],
    leaders: company.leaders || [],
    recentSignals: (signals || []).map((s) => ({
      headline: s.headline,
      source: s.source,
      publishedAt: s.published_at,
    })),
    engagementSummary: engagements?.length
      ? `Last ${engagements.length} touches: ${engagements.map((e) => `${e.channel}/${e.action} (${new Date(e.timestamp).toLocaleDateString()})`).join(", ")}`
      : "",
    pipelineStage: pipeline?.stage || "researched",
  };

  // Check cache
  const signalHash = computeSignalHash(ctx);
  const { data: cached } = await supabase
    .from("company_briefings")
    .select("briefing_data, signal_hash, created_at")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single();

  // Return cached if signal hash matches and less than 24h old
  if (cached && cached.signal_hash === signalHash) {
    const age = Date.now() - new Date(cached.created_at).getTime();
    if (age < 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        briefing: cached.briefing_data,
        cached: true,
      });
    }
  }

  // Generate new briefing
  const briefing = await generateBriefing(ctx);

  // Cache it
  await supabase.from("company_briefings").upsert(
    {
      company_id: companyId,
      user_id: user.id,
      briefing_data: briefing,
      signal_hash: signalHash,
    },
    { onConflict: "company_id,user_id" }
  );

  return NextResponse.json({ briefing, cached: false });
}
