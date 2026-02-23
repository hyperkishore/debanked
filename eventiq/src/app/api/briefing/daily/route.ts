import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, apiError } from "@/lib/api-helpers";
import { isAIConfigured } from "@/lib/ai-client";

/**
 * GET /api/briefing/daily
 * Returns the top 10 prioritized companies for today's outreach.
 * Based on: recent signals + pipeline stage + engagement recency.
 */
export async function GET(request: NextRequest) {
  if (!isAIConfigured()) {
    return apiError("AI provider not configured", 503);
  }

  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

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

  // Boost active pipeline deals — seed entries for pipeline companies first
  const activeStages = new Set(["contacted", "engaged", "demo", "proposal"]);
  for (const p of pipeline || []) {
    if (activeStages.has(p.stage)) {
      if (!scores.has(p.company_id)) {
        // Batch-fetch company names for pipeline companies not yet in scores
        const { data: companyRow } = await supabase
          .from("companies")
          .select("name")
          .eq("id", p.company_id)
          .single();

        scores.set(p.company_id, {
          name: companyRow?.name || `Company #${p.company_id}`,
          score: 0,
          reasons: [],
        });
      }
      const existing = scores.get(p.company_id)!;
      existing.score += 5;
      existing.reasons.push(`Active in pipeline: ${p.stage}`);
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
