import { NextResponse, type NextRequest } from "next/server";
import { authenticateToolRequest } from "@/lib/tool-auth";

/**
 * GET /api/tools/morning-briefing
 *
 * Returns today's prioritized action items for the coaching agent.
 * Provides: follow-ups due, stale accounts, hot signals, suggested actions.
 */
export async function GET(request: NextRequest) {
  const auth = authenticateToolRequest(request);
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  // Fetch follow-ups due today or overdue
  const { data: followUps } = await supabase
    .from("follow_ups")
    .select("id, company_id, contact_name, due_date, notes, completed")
    .eq("completed", false)
    .lte("due_date", todayStr)
    .order("due_date", { ascending: true })
    .limit(20);

  // Fetch recent news (last 3 days)
  const threeDaysAgo = new Date(now - 3 * 86400000).toISOString().slice(0, 10);
  const { data: recentNews } = await supabase
    .from("company_news")
    .select("company_id, company_name, headline, source, heat, published_at")
    .gte("published_at", threeDaysAgo)
    .order("published_at", { ascending: false })
    .limit(15);

  // Fetch pipeline to find stale deals
  const { data: pipelineRaw } = await supabase
    .from("pipeline_records")
    .select("company_id, stage, deal_value, moved_at")
    .in("stage", ["contacted", "engaged", "demo", "proposal"])
    .order("moved_at", { ascending: true })
    .limit(100);

  // Fetch recent LinkedIn activity (last 7 days)
  const weekAgo = new Date(now - 7 * 86400000).toISOString();
  const { data: linkedinActivity } = await supabase
    .from("linkedin_activity")
    .select("leader_name, company_id, activity_type, content_summary, extracted_at")
    .gte("extracted_at", weekAgo)
    .order("extracted_at", { ascending: false })
    .limit(10);

  // Get company names for enrichment
  const companyIds = new Set<number>();
  for (const f of followUps || []) companyIds.add(f.company_id);
  for (const p of pipelineRaw || []) companyIds.add(p.company_id);
  for (const a of linkedinActivity || []) if (a.company_id) companyIds.add(a.company_id);

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, priority")
    .in("id", companyIds.size > 0 ? Array.from(companyIds) : [0]);

  const nameMap = new Map<number, string>();
  const priorityMap = new Map<number, number>();
  for (const c of companies || []) {
    nameMap.set(c.id, c.name);
    priorityMap.set(c.id, c.priority);
  }

  // Process follow-ups
  const followUpActions = (followUps || []).map((f) => ({
    type: "follow_up" as const,
    priority: "high" as const,
    company: nameMap.get(f.company_id) || `Company #${f.company_id}`,
    companyId: f.company_id,
    contact: f.contact_name,
    dueDate: f.due_date,
    notes: f.notes,
    action: `Follow up with ${f.contact_name || "contact"} at ${nameMap.get(f.company_id) || "company"}`,
  }));

  // Process stale deals (no movement in 7+ days)
  const staleDealActions = (pipelineRaw || [])
    .filter((p) => {
      if (!p.moved_at) return false;
      const daysSince = Math.floor((now - new Date(p.moved_at).getTime()) / 86400000);
      return daysSince >= 7;
    })
    .map((p) => {
      const daysSince = Math.floor((now - new Date(p.moved_at).getTime()) / 86400000);
      const company = nameMap.get(p.company_id) || `Company #${p.company_id}`;
      return {
        type: "stale_deal" as const,
        priority: (priorityMap.get(p.company_id) || 4) <= 2 ? "high" as const : "medium" as const,
        company,
        companyId: p.company_id,
        stage: p.stage,
        daysSinceMove: daysSince,
        value: p.deal_value || 0,
        action: `${company} has been in "${p.stage}" for ${daysSince} days — time to re-engage`,
      };
    })
    .sort((a, b) => b.daysSinceMove - a.daysSinceMove)
    .slice(0, 5);

  // Process hot news signals
  const newsActions = (recentNews || [])
    .filter((n) => n.heat === "hot")
    .map((n) => ({
      type: "news_signal" as const,
      priority: "medium" as const,
      company: n.company_name,
      headline: n.headline,
      source: n.source,
      action: `${n.company_name} in the news: "${n.headline}" — reach out with a comment`,
    }))
    .slice(0, 5);

  // Process LinkedIn activity
  const linkedinActions = (linkedinActivity || []).map((a) => ({
    type: "linkedin_activity" as const,
    priority: "low" as const,
    company: nameMap.get(a.company_id!) || "Unknown",
    companyId: a.company_id,
    leader: a.leader_name,
    activityType: a.activity_type,
    summary: (a.content_summary || "").slice(0, 200),
    action: `${a.leader_name} posted on LinkedIn — engage with their content`,
  }));

  // Combine and sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const allActions = [
    ...followUpActions,
    ...staleDealActions,
    ...newsActions,
    ...linkedinActions,
  ].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Generate summary
  const hour = new Date().getUTCHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const summary = allActions.length > 0
    ? `Good ${timeOfDay}! You have ${followUpActions.length} follow-up${followUpActions.length !== 1 ? "s" : ""} due, ${staleDealActions.length} stale deal${staleDealActions.length !== 1 ? "s" : ""}, and ${newsActions.length} hot signal${newsActions.length !== 1 ? "s" : ""}.`
    : `Good ${timeOfDay}! No urgent actions today. Great time for prospecting or content creation.`;

  return NextResponse.json({
    summary,
    timeOfDay,
    totalActions: allActions.length,
    actions: allActions.slice(0, 15),
    breakdown: {
      followUps: followUpActions.length,
      staleDeals: staleDealActions.length,
      newsSignals: newsActions.length,
      linkedinActivity: linkedinActions.length,
    },
  });
}
