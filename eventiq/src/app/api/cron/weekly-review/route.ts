import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import {
  renderWeeklyReviewEmail,
  type PipelineStageSummary,
  type StaleDeal,
  type WeeklySignal,
  type ThreadingGap,
  type RecommendedAction,
} from "@/lib/weekly-review-template";
import { PIPELINE_STAGES, type PipelineStage } from "@/lib/pipeline-helpers";
import type { Company, CompanyType, EngagementEntry } from "@/lib/types";

/**
 * GET /api/cron/weekly-review
 *
 * Weekly Pipeline Review Brief — runs Monday 7 AM UTC.
 * Summarises pipeline health, stale deals, new signals, threading gaps,
 * and recommended actions. Sends via Resend to WEEKLY_REVIEW_EMAIL.
 *
 * Auth: Vercel cron sends Authorization: Bearer <CRON_SECRET>
 * Manual trigger: curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/weekly-review
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Email not configured (RESEND_API_KEY)" }, { status: 503 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    // ── 1. Fetch all data in parallel ─────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    const [
      { data: companiesRaw },
      { data: pipelineRows },
      { data: engagementRows },
      { data: recentNews },
      { data: recentEnrichment },
    ] = await Promise.all([
      supabase.from("companies").select("*"),
      supabase.from("pipeline_records").select("company_id, stage, deal_value, moved_at"),
      supabase.from("engagements").select("*"),
      supabase
        .from("company_news")
        .select("company_id, headline, source, published_at")
        .gte("published_at", sevenDaysAgoISO.slice(0, 10))
        .order("published_at", { ascending: false }),
      supabase
        .from("enrichment_log")
        .select("company_id, enrichment_type, created_at")
        .gte("created_at", sevenDaysAgoISO),
    ]);

    if (!companiesRaw || companiesRaw.length === 0) {
      return NextResponse.json({ error: "No companies found" }, { status: 500 });
    }

    // ── 2. Map raw rows to typed objects ──────────────────────────
    const companies: Company[] = companiesRaw.map((row: Record<string, unknown>) => ({
      id: row.id as number,
      name: (row.name as string) || "",
      type: (row.type as CompanyType) || "TAM",
      priority: (row.priority as number) || 4,
      phase: (row.phase as number) || 0,
      booth: (row.booth as boolean) || false,
      contacts: Array.isArray(row.contacts) ? row.contacts : [],
      leaders: Array.isArray(row.leaders) ? row.leaders : [],
      desc: (row.desc as string) || "",
      notes: (row.notes as string) || "",
      news: Array.isArray(row.news) ? row.news : [],
      ice: (row.ice as string) || "",
      tp: Array.isArray(row.tp) ? row.tp : [],
      ask: (row.ask as string) || "",
      source: Array.isArray(row.source) ? row.source : [],
      location: row.location as string | undefined,
      employees: row.employees as number | undefined,
      website: row.website as string | undefined,
      linkedinUrl: row.linkedinUrl as string | undefined,
    }));

    const companyMap = new Map<number, Company>();
    for (const c of companies) companyMap.set(c.id, c);

    // Build pipeline state map
    const pipelineState: Record<number, { stage: PipelineStage; dealValue: number; movedAt: string }> = {};
    for (const p of pipelineRows || []) {
      pipelineState[p.company_id] = {
        stage: p.stage as PipelineStage,
        dealValue: (p.deal_value as number) || 0,
        movedAt: (p.moved_at as string) || "",
      };
    }

    // Build engagements list
    const engagements: EngagementEntry[] = (engagementRows || []).map(
      (e: Record<string, unknown>) => ({
        id: (e.id as string) || "",
        companyId: e.company_id as number,
        contactName: (e.contact_name as string) || "",
        channel: ((e.channel as string) || "email") as EngagementEntry["channel"],
        action: (e.action as string) || "",
        notes: (e.notes as string) || "",
        timestamp: (e.created_at as string) || "",
        source: "supabase" as EngagementEntry["source"],
      })
    );

    // ── 3. Pipeline summary ───────────────────────────────────────
    const activeStages = new Set<PipelineStage>(["contacted", "engaged", "demo", "proposal"]);
    const pipelineSummary: PipelineStageSummary[] = PIPELINE_STAGES.map((cfg) => {
      let count = 0;
      let dealValue = 0;
      for (const p of pipelineRows || []) {
        if (p.stage === cfg.id) {
          count++;
          dealValue += (p.deal_value as number) || 0;
        }
      }
      return { stage: cfg.id, label: cfg.label, count, dealValue };
    });

    const totalActiveDeals = pipelineSummary
      .filter((s) => activeStages.has(s.stage as PipelineStage))
      .reduce((sum, s) => sum + s.count, 0);

    const totalPipelineValue = pipelineSummary
      .filter((s) => activeStages.has(s.stage as PipelineStage))
      .reduce((sum, s) => sum + s.dealValue, 0);

    // ── 4. Stale deals (7+ days no engagement) ───────────────────
    const staleDeals: StaleDeal[] = [];

    for (const p of pipelineRows || []) {
      if (!activeStages.has(p.stage as PipelineStage)) continue;

      const companyEngagements = engagements
        .filter((e) => e.companyId === p.company_id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const last = companyEngagements[0];
      const daysSince = last
        ? Math.floor((Date.now() - new Date(last.timestamp).getTime()) / 86400000)
        : 999; // no engagement at all = very stale

      if (daysSince >= 7) {
        const company = companyMap.get(p.company_id);
        staleDeals.push({
          companyName: company?.name || `#${p.company_id}`,
          companyId: p.company_id,
          daysSinceEngagement: daysSince,
          stage: p.stage,
          lastChannel: last?.channel || "none",
          lastContactName: last?.contactName || "",
        });
      }
    }

    staleDeals.sort((a, b) => b.daysSinceEngagement - a.daysSinceEngagement);

    // ── 5. Hot signals (news matched to pipeline companies) ──────
    const pipelineCompanyIds = new Set(
      (pipelineRows || [])
        .filter((p: Record<string, unknown>) => activeStages.has(p.stage as PipelineStage))
        .map((p: Record<string, unknown>) => p.company_id as number)
    );

    // Also include companies with enrichment events this week
    const enrichedCompanyIds = new Set<number>();
    for (const e of recentEnrichment || []) {
      if (e.company_id) enrichedCompanyIds.add(e.company_id as number);
    }

    const signals: WeeklySignal[] = [];
    const seenSignalCompanies = new Set<number>();

    for (const n of recentNews || []) {
      const cid = n.company_id as number;
      if (seenSignalCompanies.has(cid)) continue; // one signal per company
      seenSignalCompanies.add(cid);

      const company = companyMap.get(cid);
      signals.push({
        companyName: company?.name || `#${cid}`,
        companyId: cid,
        headline: n.headline as string,
        source: n.source as string,
        publishedAt: n.published_at as string,
        inPipeline: pipelineCompanyIds.has(cid),
      });
    }

    // Sort: pipeline companies first, then by date
    signals.sort((a, b) => {
      if (a.inPipeline !== b.inPipeline) return a.inPipeline ? -1 : 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // ── 6. Threading gaps (1 engaged contact in pipeline) ────────
    const threadingGaps: ThreadingGap[] = [];

    for (const p of pipelineRows || []) {
      if (!activeStages.has(p.stage as PipelineStage)) continue;

      const company = companyMap.get(p.company_id);
      if (!company) continue;

      const totalLeaders = (company.leaders || []).length;
      if (totalLeaders <= 1) continue; // single-person company, not a gap

      // Count distinct engaged contacts
      const engagedContacts = new Set(
        engagements
          .filter((e) => e.companyId === p.company_id && e.contactName)
          .map((e) => e.contactName.toLowerCase())
      );

      if (engagedContacts.size <= 1) {
        threadingGaps.push({
          companyName: company.name,
          companyId: company.id,
          stage: p.stage,
          engagedContacts: engagedContacts.size,
          totalLeaders,
        });
      }
    }

    // Sort by stage importance (later stages = bigger risk)
    const stageOrder: Record<string, number> = {
      proposal: 4, demo: 3, engaged: 2, contacted: 1,
    };
    threadingGaps.sort((a, b) => (stageOrder[b.stage] || 0) - (stageOrder[a.stage] || 0));

    // ── 7. Recommended actions (synthesised from above) ──────────
    const recommendedActions: RecommendedAction[] = [];
    let priority = 1;

    // a) Stale deals in advanced stages — highest urgency
    for (const sd of staleDeals.slice(0, 3)) {
      if (sd.stage === "proposal" || sd.stage === "demo") {
        recommendedActions.push({
          priority: priority++,
          action: `Follow up with ${sd.lastContactName || sd.companyName}`,
          companyName: sd.companyName,
          companyId: sd.companyId,
          reason: `${sd.stage} stage, ${sd.daysSinceEngagement}d silent — deal at risk`,
        });
      }
    }

    // b) Pipeline companies with fresh signals — act on news
    for (const sig of signals.filter((s) => s.inPipeline).slice(0, 2)) {
      if (priority > 5) break;
      recommendedActions.push({
        priority: priority++,
        action: `Reach out to ${sig.companyName} about recent news`,
        companyName: sig.companyName,
        companyId: sig.companyId,
        reason: `"${sig.headline.slice(0, 60)}${sig.headline.length > 60 ? "..." : ""}"`,
      });
    }

    // c) Remaining stale deals
    for (const sd of staleDeals) {
      if (priority > 5) break;
      if (recommendedActions.some((a) => a.companyId === sd.companyId)) continue;
      recommendedActions.push({
        priority: priority++,
        action: `Follow up with ${sd.companyName}`,
        companyName: sd.companyName,
        companyId: sd.companyId,
        reason: `Stale ${sd.daysSinceEngagement}d in ${sd.stage} stage`,
      });
    }

    // d) Threading gaps — add contacts
    for (const tg of threadingGaps) {
      if (priority > 5) break;
      if (recommendedActions.some((a) => a.companyId === tg.companyId)) continue;
      recommendedActions.push({
        priority: priority++,
        action: `Multi-thread ${tg.companyName}`,
        companyName: tg.companyName,
        companyId: tg.companyId,
        reason: `Only ${tg.engagedContacts}/${tg.totalLeaders} contacts engaged — single-thread risk in ${tg.stage}`,
      });
    }

    // e) Non-pipeline companies with hot signals — new opportunities
    for (const sig of signals.filter((s) => !s.inPipeline)) {
      if (priority > 5) break;
      if (recommendedActions.some((a) => a.companyId === sig.companyId)) continue;
      recommendedActions.push({
        priority: priority++,
        action: `Investigate ${sig.companyName}`,
        companyName: sig.companyName,
        companyId: sig.companyId,
        reason: `News signal not yet in pipeline: "${sig.headline.slice(0, 50)}${sig.headline.length > 50 ? "..." : ""}"`,
      });
    }

    // ── 8. Render email ──────────────────────────────────────────
    const weekOf = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://us.hyperverge.space";

    const html = renderWeeklyReviewEmail({
      weekOf,
      pipelineSummary,
      totalPipelineValue,
      totalActiveDeals,
      signals,
      staleDeals,
      threadingGaps,
      recommendedActions,
      appUrl,
    });

    // ── 9. Send email ────────────────────────────────────────────
    const recipient = process.env.WEEKLY_REVIEW_EMAIL || process.env.RESEND_FROM_EMAIL || "";

    if (!recipient) {
      return NextResponse.json(
        { error: "No recipient configured (set WEEKLY_REVIEW_EMAIL or RESEND_FROM_EMAIL)" },
        { status: 503 }
      );
    }

    const result = await sendEmail({
      to: recipient,
      subject: `EventIQ Weekly Pipeline Review — ${weekOf}`,
      html,
    });

    console.log(
      `[Cron:WeeklyReview] ${result.success ? "Sent" : "Failed"} to ${recipient}. ` +
      `Pipeline: ${totalActiveDeals} active, ${staleDeals.length} stale, ${signals.length} signals, ${threadingGaps.length} threading gaps`
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sent: result.success,
      recipient,
      error: result.success ? undefined : result.error,
      summary: {
        totalActiveDeals,
        totalPipelineValue,
        staleDeals: staleDeals.length,
        signals: signals.length,
        threadingGaps: threadingGaps.length,
        recommendedActions: recommendedActions.length,
      },
    });
  } catch (err) {
    console.error("[Cron:WeeklyReview] Fatal error:", err);
    return NextResponse.json(
      { error: "Weekly review failed", details: String(err) },
      { status: 500 }
    );
  }
}
