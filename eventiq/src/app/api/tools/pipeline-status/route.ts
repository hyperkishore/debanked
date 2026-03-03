import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/pipeline-status
 *
 * Returns pipeline health metrics for the coaching agent.
 * Provides: total pipeline value, deals by stage, stale deals, velocity.
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  // Fetch pipeline records
  const { data: pipelineRaw, error: pipelineErr } = await supabase
    .from("pipeline_records")
    .select("company_id, stage, deal_value, moved_at, close_date")
    .order("moved_at", { ascending: false });

  // Table may not exist — return empty
  if (pipelineErr) {
    return NextResponse.json({
      totalPipelineValue: 0,
      stages: {},
      staleDealCount: 0,
      staleDeals: [],
      recentMoves: [],
      summary: "Pipeline data not available yet.",
    });
  }

  const pipeline = pipelineRaw || [];

  // Dedupe to latest record per company
  const latestByCompany = new Map<number, typeof pipeline[0]>();
  for (const record of pipeline) {
    if (!latestByCompany.has(record.company_id)) {
      latestByCompany.set(record.company_id, record);
    }
  }

  // Stage breakdown
  const stages: Record<string, { count: number; value: number; companies: string[] }> = {};
  let totalValue = 0;
  const staleDeals: Array<{ companyId: number; stage: string; daysSinceMove: number; value: number }> = [];

  const now = Date.now();
  const STALE_THRESHOLD_MS = 7 * 86400000; // 7 days

  // Fetch company names for enrichment
  const companyIds = Array.from(latestByCompany.keys());
  const { data: companies } = await supabase
    .from("companies")
    .select("id, name")
    .in("id", companyIds.length > 0 ? companyIds : [0]);

  const nameMap = new Map<number, string>();
  for (const c of companies || []) {
    nameMap.set(c.id, c.name);
  }

  for (const [companyId, record] of latestByCompany) {
    const stage = record.stage || "researched";
    const value = record.deal_value || 0;
    const companyName = nameMap.get(companyId) || `Company #${companyId}`;

    if (!stages[stage]) {
      stages[stage] = { count: 0, value: 0, companies: [] };
    }
    stages[stage].count++;
    stages[stage].value += value;
    stages[stage].companies.push(companyName);

    if (value > 0) totalValue += value;

    // Check if stale (active stages only)
    const activeStages = new Set(["contacted", "engaged", "demo", "proposal"]);
    if (activeStages.has(stage) && record.moved_at) {
      const daysSinceMove = Math.floor(
        (now - new Date(record.moved_at).getTime()) / 86400000
      );
      if (daysSinceMove >= 7) {
        staleDeals.push({
          companyId,
          stage,
          daysSinceMove,
          value,
        });
      }
    }
  }

  // Sort stale deals by staleness
  staleDeals.sort((a, b) => b.daysSinceMove - a.daysSinceMove);

  // Recent pipeline moves (last 7 days)
  const recentMoves = pipeline
    .filter((r) => {
      if (!r.moved_at) return false;
      return now - new Date(r.moved_at).getTime() < STALE_THRESHOLD_MS;
    })
    .slice(0, 10)
    .map((r) => ({
      company: nameMap.get(r.company_id) || `Company #${r.company_id}`,
      stage: r.stage,
      movedAt: r.moved_at,
      value: r.deal_value || 0,
    }));

  // Generate summary text
  const activeCount = (stages["contacted"]?.count || 0) +
    (stages["engaged"]?.count || 0) +
    (stages["demo"]?.count || 0) +
    (stages["proposal"]?.count || 0);
  const wonCount = stages["won"]?.count || 0;

  const summary = totalValue > 0
    ? `Pipeline: $${(totalValue / 1000).toFixed(0)}K total, ${activeCount} active deals, ${wonCount} won, ${staleDeals.length} stale.`
    : `Pipeline: ${activeCount} active deals, ${wonCount} won, ${staleDeals.length} stale. No deal values set yet.`;

  return NextResponse.json({
    totalPipelineValue: totalValue,
    stages,
    staleDealCount: staleDeals.length,
    staleDeals: staleDeals.slice(0, 10),
    recentMoves,
    totalDeals: latestByCompany.size,
    summary,
  });
}
