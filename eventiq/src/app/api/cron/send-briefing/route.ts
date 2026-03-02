import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail, isEmailConfigured } from "@/lib/email";
import { renderBriefingEmail } from "@/lib/briefing-email-template";
import { computeOutreachScore, getNextBestAction, getUrgencyTier } from "@/lib/outreach-score";
import { computeWhyNow } from "@/lib/why-now-engine";
import { computeAttentionScore } from "@/lib/attention-score";
import { buildFeedItems } from "@/lib/feed-helpers";
import { classifyTitle, type FunctionalRole } from "@/lib/ricp-taxonomy";
import type { Company, CompanyType, EngagementEntry } from "@/lib/types";
import type { PipelineRecord } from "@/lib/pipeline-helpers";

const RICP_ROLES = new Set<FunctionalRole>(["operations", "risk", "underwriting", "finance"]);
const RICP_LABELS: Record<string, string> = {
  operations: "Ops", risk: "Risk", underwriting: "UW", finance: "Fin",
};

function getRicpSummary(company: Company): string {
  const leaders = company.leaders || [];
  const filled = new Set<string>();
  for (const leader of leaders) {
    const { role, weight } = classifyTitle(leader.t);
    if (RICP_ROLES.has(role) && weight >= 4) filled.add(role);
  }
  if (filled.size === 4) return "4/4 RICP roles filled";
  const missing = Array.from(RICP_ROLES)
    .filter((r) => !filled.has(r))
    .map((r) => RICP_LABELS[r] || r)
    .join(", ");
  return `${filled.size}/4 roles — missing ${missing}`;
}

/**
 * GET /api/cron/send-briefing
 *
 * Vercel Cron job — runs weekdays at 12 PM UTC (7:30 AM IST).
 * Computes morning briefing and sends via Resend to all @hyperverge.co users.
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
    // 1. Fetch companies from Supabase
    const { data: companiesRaw } = await supabase
      .from("companies")
      .select("*");

    if (!companiesRaw || companiesRaw.length === 0) {
      return NextResponse.json({ error: "No companies found" }, { status: 500 });
    }

    // Map to Company type (API returns flat rows)
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

    // 2. Fetch recent signals (last 7 days for "today's" briefing)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentNews } = await supabase
      .from("company_news")
      .select("company_id, headline, source, heat, published_at")
      .gte("published_at", sevenDaysAgo.toISOString().slice(0, 10))
      .order("published_at", { ascending: false });

    const totalSignals = recentNews?.length || 0;

    // Build a map of latest news per company
    const newsMap = new Map<number, { headline: string; source: string }>();
    for (const n of recentNews || []) {
      if (!newsMap.has(n.company_id)) {
        newsMap.set(n.company_id, { headline: n.headline, source: n.source });
      }
    }

    // 3. Get all user profiles for email delivery
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name");

    const recipients = (profiles || []).filter(
      (p: { email?: string }) => p.email?.endsWith("@hyperverge.co")
    );

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No @hyperverge.co recipients found" }, { status: 200 });
    }

    // 4. For each user, compute their briefing
    const results: { email: string; status: string; error?: string }[] = [];

    for (const recipient of recipients) {
      // Fetch user's pipeline and engagement data
      const [{ data: pipelineRows }, { data: engagementRows }] = await Promise.all([
        supabase.from("pipeline_records").select("company_id, stage").eq("user_id", recipient.id),
        supabase.from("engagements").select("*").eq("user_id", recipient.id),
      ]);

      const pipelineState: Record<string, PipelineRecord> = {};
      for (const p of pipelineRows || []) {
        pipelineState[p.company_id] = { stage: p.stage, movedAt: "" };
      }

      const engagements: EngagementEntry[] = (engagementRows || []).map(
        (e: Record<string, unknown>) => ({
          id: e.id as string,
          companyId: e.company_id as number,
          contactName: (e.contact_name as string) || "",
          channel: (e.channel || "email") as EngagementEntry["channel"],
          action: (e.action as string) || "",
          notes: (e.notes as string) || "",
          timestamp: (e.created_at as string) || "",
          source: "supabase" as EngagementEntry["source"],
        })
      );

      const metState: Record<string, boolean> = {};
      // Mark engaged/demo/proposal companies as met
      for (const p of pipelineRows || []) {
        if (["contacted", "engaged", "demo", "proposal", "won"].includes(p.stage)) {
          metState[p.company_id] = true;
        }
      }

      // Score all companies with Attention Score + Why-Now
      const feedItems = buildFeedItems(companies);
      const scored = companies.map((c) => {
        const breakdown = computeOutreachScore(c, engagements, pipelineState, metState);
        const nextAction = getNextBestAction(c, engagements, pipelineState);
        const whyNow = computeWhyNow(c, feedItems, pipelineState);
        const attention = computeAttentionScore(c, whyNow, pipelineState, engagements);
        return {
          company: c,
          score: breakdown.total,
          nextAction,
          urgency: getUrgencyTier(breakdown.total),
          attentionScore: attention.score,
          attentionLabel: attention.label,
          whyNowAngle: whyNow.score > 0 ? whyNow.topAngle : null,
          ricpCoverage: getRicpSummary(c),
        };
      });

      // Sort by attention score (primary ranking)
      scored.sort((a, b) => b.attentionScore - a.attentionScore);

      // Top 5 companies
      const topCompanies = scored.slice(0, 5).map((s) => ({
        companyId: s.company.id,
        companyName: s.company.name,
        type: s.company.type,
        score: s.score,
        reasons: [] as string[],
        nextAction: s.nextAction,
        leader: s.company.leaders?.[0]
          ? {
              name: s.company.leaders[0].n,
              title: s.company.leaders[0].t,
              linkedin: s.company.leaders[0].li,
            }
          : undefined,
        latestNews: newsMap.get(s.company.id),
        attentionScore: s.attentionScore,
        attentionLabel: s.attentionLabel,
        whyNowAngle: s.whyNowAngle,
        ricpCoverage: s.ricpCoverage,
      }));

      // Stale warnings: active pipeline, 5+ days no engagement
      const activeStages = new Set(["contacted", "engaged", "demo", "proposal"]);
      const staleWarnings: { companyName: string; daysSince: number; stage: string; lastChannel: string }[] = [];

      for (const p of pipelineRows || []) {
        if (!activeStages.has(p.stage)) continue;
        const companyEngagements = engagements.filter((e) => e.companyId === p.company_id);
        const last = companyEngagements.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        if (last) {
          const daysSince = Math.floor(
            (Date.now() - new Date(last.timestamp).getTime()) / 86400000
          );
          if (daysSince >= 5) {
            const company = companies.find((c) => c.id === p.company_id);
            staleWarnings.push({
              companyName: company?.name || `#${p.company_id}`,
              daysSince,
              stage: p.stage,
              lastChannel: last.channel,
            });
          }
        }
      }

      staleWarnings.sort((a, b) => b.daysSince - a.daysSince);

      // Quick wins: high score, never contacted
      const quickWins = scored
        .filter((s) => {
          const ce = engagements.filter((e) => e.companyId === s.company.id);
          return s.score >= 100 && ce.length === 0;
        })
        .slice(0, 3)
        .map((s) => ({
          companyId: s.company.id,
          companyName: s.company.name,
          type: s.company.type,
          score: s.score,
          reasons: [] as string[],
          nextAction: s.nextAction,
          leader: s.company.leaders?.[0]
            ? {
                name: s.company.leaders[0].n,
                title: s.company.leaders[0].t,
                linkedin: s.company.leaders[0].li,
              }
            : undefined,
          latestNews: newsMap.get(s.company.id),
        }));

      // 5. Render and send
      const today = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://eventiq.hyperverge.co";

      const html = renderBriefingEmail({
        date: today,
        userName: (recipient as { full_name?: string }).full_name?.split(" ")[0] || "",
        topCompanies,
        staleWarnings: staleWarnings.slice(0, 3),
        quickWins,
        totalSignalsToday: totalSignals,
        appUrl,
      });

      const result = await sendEmail({
        to: recipient.email,
        subject: `🎯 EventIQ Briefing — ${today}`,
        html,
      });

      results.push({
        email: recipient.email,
        status: result.success ? "sent" : "failed",
        error: result.success ? undefined : result.error,
      });
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    console.log(`[Cron:SendBriefing] Sent: ${sent}, Failed: ${failed}`);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      sent,
      failed,
      recipients: results,
    });
  } catch (err) {
    console.error("[Cron:SendBriefing] Fatal error:", err);
    return NextResponse.json(
      { error: "Briefing failed", details: String(err) },
      { status: 500 }
    );
  }
}
