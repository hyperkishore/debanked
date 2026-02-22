import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isAIConfigured } from "@/lib/ai-client";

/**
 * GET /api/briefing/daily
 * Returns the top 10 prioritized companies for today's outreach.
 * Based on: recent signals + pipeline stage + engagement recency.
 */
export async function GET(request: NextRequest) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      { error: "AI provider not configured" },
      { status: 503 }
    );
  }

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

  // Get companies with recent signals (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentNews } = await supabase
    .from("company_news")
    .select("company_id, company_name, heat")
    .gte("published_at", thirtyDaysAgo.toISOString().slice(0, 10))
    .order("published_at", { ascending: false });

  // Get user's pipeline
  const { data: pipeline } = await supabase
    .from("pipeline_records")
    .select("company_id, stage")
    .eq("user_id", user.id);

  // Score companies
  const scores = new Map<number, { name: string; score: number; reasons: string[] }>();

  for (const news of recentNews || []) {
    const existing = scores.get(news.company_id) || {
      name: news.company_name,
      score: 0,
      reasons: [] as string[],
    };
    existing.score += news.heat === "hot" ? 3 : news.heat === "warm" ? 2 : 1;
    if (existing.reasons.length < 2) {
      existing.reasons.push(`Recent ${news.heat} signal`);
    }
    scores.set(news.company_id, existing);
  }

  // Boost active pipeline deals
  const activeStages = new Set(["contacted", "engaged", "demo", "proposal"]);
  for (const p of pipeline || []) {
    if (activeStages.has(p.stage)) {
      const existing = scores.get(p.company_id);
      if (existing) {
        existing.score += 5;
        existing.reasons.push(`Active in pipeline: ${p.stage}`);
      }
    }
  }

  // Sort by score, take top 10
  const ranked = Array.from(scores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10)
    .map(([companyId, data]) => ({
      companyId,
      companyName: data.name,
      score: data.score,
      reasons: data.reasons,
    }));

  return NextResponse.json({ date: new Date().toISOString().slice(0, 10), companies: ranked });
}
