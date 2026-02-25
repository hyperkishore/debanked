"use client";

import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched, getResearchScore } from "@/lib/types";
import { getLastEngagement, getChannelConfig, formatEngagementTime } from "@/lib/engagement-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { StreakData } from "@/lib/streak-helpers";
import { detectBreaches, type SLABreach } from "@/lib/sla-helpers";
import { ActionFeed } from "@/components/action-feed";
import { RevenueMilestoneTracker } from "@/components/revenue-milestone-tracker";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface DashboardTabProps {
  companies: Company[];
  metState: Record<string, boolean>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  streakData: StreakData;
  pipelineState: Record<string, PipelineRecord>;
  onOpenEngagement: (companyId: number) => void;
}

// --- Reusable sub-components ---

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4 gap-3 shadow-none">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

function HorizontalBar({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">
                {item.value} <span className="text-muted-foreground/60">({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="w-full bg-muted/30 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StackedBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <div className="space-y-3">
      <div className="flex w-full h-6 rounded-lg overflow-hidden">
        {segments.map((seg) => {
          const pct = total > 0 ? (seg.value / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              style={{ width: `${pct}%`, backgroundColor: seg.color }}
              className="h-full transition-all"
              title={`${seg.label}: ${seg.value}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span className="text-muted-foreground">{seg.label}</span>
            <span className="font-medium tabular-nums">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerticalBarChart({ buckets }: { buckets: { label: string; value: number }[] }) {
  const maxVal = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-2 h-36">
      {buckets.map((b) => {
        const height = (b.value / maxVal) * 100;
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium tabular-nums text-foreground">{b.value}</span>
            <div className="w-full bg-muted/20 rounded-t-md flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="bg-brand/60 rounded-t-md transition-all w-full"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground text-center leading-tight">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRow({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">
          {done}/{total} <span className="text-muted-foreground/60">({pct}%)</span>
        </span>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>}
    </div>
  );
}

// --- Main component ---

export function DashboardTab({ companies, metState, engagements, ratingState, streakData, pipelineState, onOpenEngagement }: DashboardTabProps) {
  // Outreach coverage stats
  const outreachStats = useMemo(() => {
    const withHistory = companies.filter(
      (c) => c.outreachHistory && c.outreachHistory.status !== "no_history"
    );
    const engaged = companies.filter(
      (c) => c.outreachHistory?.status === "engaged"
    );
    const contacted = companies.filter(
      (c) => c.outreachHistory?.status === "contacted"
    );
    const responded = companies.filter(
      (c) => c.outreachHistory?.status === "responded"
    );
    return {
      totalWithHistory: withHistory.length,
      engaged: engaged.length,
      contacted: contacted.length,
      responded: responded.length,
    };
  }, [companies]);

  // SLA breach detection
  const slaBreaches = useMemo(() => {
    const companyList = companies.map((c) => ({ id: c.id, name: c.name }));
    return detectBreaches(companyList, engagements, pipelineState);
  }, [companies, engagements, pipelineState]);

  const stats = useMemo(() => {
    const total = companies.length;
    const p0 = companies.filter((c) => c.priority <= 2);
    const researched = companies.filter(isResearched);

    // Priority breakdown
    const prioritySegments = [
      { label: "P0", value: companies.filter((c) => c.priority <= 2).length, color: "var(--sqo)" },
      { label: "P1", value: companies.filter((c) => c.priority === 3 || c.priority === 4).length, color: "var(--client)" },
      { label: "TBC", value: companies.filter((c) => c.priority === 5 || c.priority === 6).length, color: "var(--tam)" },
      { label: "Not Priority", value: companies.filter((c) => c.priority === 7).length, color: "var(--muted-foreground)" },
    ];

    // Source breakdown
    const sourceItems = [
      { label: "EventIQ Only", value: companies.filter((c) => c.source?.includes("eventiq") && !c.source?.includes("tam")).length, color: "var(--icp)" },
      { label: "TAM Only", value: companies.filter((c) => c.source?.includes("tam") && !c.source?.includes("eventiq")).length, color: "var(--tam)" },
      { label: "Both", value: companies.filter((c) => c.source?.includes("eventiq") && c.source?.includes("tam")).length, color: "var(--brand)" },
    ];

    // Size distribution
    const sizeBuckets = [
      { label: "0", value: companies.filter((c) => !c.employees || c.employees === 0).length },
      { label: "1-10", value: companies.filter((c) => c.employees && c.employees >= 1 && c.employees <= 10).length },
      { label: "11-50", value: companies.filter((c) => c.employees && c.employees >= 11 && c.employees <= 50).length },
      { label: "51-200", value: companies.filter((c) => c.employees && c.employees >= 51 && c.employees <= 200).length },
      { label: "201-500", value: companies.filter((c) => c.employees && c.employees >= 201 && c.employees <= 500).length },
      { label: "500+", value: companies.filter((c) => c.employees && c.employees > 500).length },
    ];

    // Top locations
    const locCounts: Record<string, number> = {};
    for (const c of companies) {
      if (c.location) locCounts[c.location] = (locCounts[c.location] || 0) + 1;
    }
    const topLocations = Object.entries(locCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value, color: "var(--brand)" }));
    const locTotal = companies.filter((c) => c.location).length;

    // Research progress
    const p0Researched = p0.filter(isResearched).length;
    const p1Companies = companies.filter((c) => c.priority === 3 || c.priority === 4);
    const p1Researched = p1Companies.filter(isResearched).length;

    // Data quality distribution
    const qualitySegments = [
      { label: "Complete (80+)", value: companies.filter((c) => getResearchScore(c) >= 80).length, color: "var(--icp)" },
      { label: "Good (50-79)", value: companies.filter((c) => { const s = getResearchScore(c); return s >= 50 && s < 80; }).length, color: "var(--brand)" },
      { label: "Partial (25-49)", value: companies.filter((c) => { const s = getResearchScore(c); return s >= 25 && s < 50; }).length, color: "var(--client)" },
      { label: "Minimal (<25)", value: companies.filter((c) => getResearchScore(c) < 25).length, color: "var(--sqo)" },
    ];
    const avgQuality = total > 0
      ? Math.round(companies.reduce((s, c) => s + getResearchScore(c), 0) / total)
      : 0;

    return {
      total,
      p0Count: p0.length,
      researchedCount: researched.length,
      avgQuality,
      prioritySegments,
      sourceItems,
      sizeBuckets,
      topLocations,
      locTotal,
      p0Researched,
      p0Total: p0.length,
      p1Researched,
      p1Total: p1Companies.length,
      overallResearched: researched.length,
      qualitySegments,
    };
  }, [companies, metState]);

  // Engagement analytics
  const engagementStats = useMemo(() => {
    const totalEngagements = engagements.length;
    const engagedCompanyIds = new Set(engagements.map((e) => e.companyId));
    const companiesEngaged = engagedCompanyIds.size;

    // Channel breakdown
    const channelCounts: Record<string, number> = {};
    for (const e of engagements) {
      channelCounts[e.channel] = (channelCounts[e.channel] || 0) + 1;
    }
    const channelItems = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([channel, count]) => {
        const config = getChannelConfig(channel as EngagementEntry["channel"]);
        return { label: config.label, value: count, color: channelToColor(channel) };
      });

    // Hottest prospects
    const companyEngagementCounts: Record<number, number> = {};
    for (const e of engagements) {
      companyEngagementCounts[e.companyId] = (companyEngagementCounts[e.companyId] || 0) + 1;
    }
    const hottestProspects = Object.entries(companyEngagementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => {
        const company = companies.find((c) => c.id === parseInt(id));
        const last = getLastEngagement(engagements, parseInt(id));
        return {
          id: parseInt(id),
          name: company?.name || `Company #${id}`,
          type: company?.type || "TAM",
          count,
          lastTouch: last ? formatEngagementTime(last.timestamp) : "never",
          rating: ratingState[id]?.rating || "",
        };
      });

    // Needs follow-up
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const needsFollowUp = Object.entries(companyEngagementCounts)
      .filter(([id]) => {
        const last = getLastEngagement(engagements, parseInt(id));
        return last && now - new Date(last.timestamp).getTime() > threeDaysMs;
      })
      .sort((a, b) => {
        const lastA = getLastEngagement(engagements, parseInt(a[0]));
        const lastB = getLastEngagement(engagements, parseInt(b[0]));
        return (lastA ? new Date(lastA.timestamp).getTime() : 0) - (lastB ? new Date(lastB.timestamp).getTime() : 0);
      })
      .slice(0, 6)
      .map(([id, count]) => {
        const company = companies.find((c) => c.id === parseInt(id));
        const last = getLastEngagement(engagements, parseInt(id));
        const daysSince = last ? Math.floor((now - new Date(last.timestamp).getTime()) / 86400000) : 999;
        return {
          id: parseInt(id),
          name: company?.name || `Company #${id}`,
          type: company?.type || "TAM",
          count,
          daysSince,
          lastChannel: last?.channel || "unknown",
        };
      });

    // Recent activity
    const recentActivity = [...engagements]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map((e) => {
        const company = companies.find((c) => c.id === e.companyId);
        return {
          ...e,
          companyName: company?.name || `Company #${e.companyId}`,
          companyType: company?.type || "TAM",
        };
      });

    return {
      totalEngagements,
      companiesEngaged,
      channelItems,
      hottestProspects,
      needsFollowUp,
      recentActivity,
    };
  }, [engagements, companies, ratingState]);

  const typeColorDot: Record<string, string> = {
    SQO: "bg-[var(--sqo)]",
    Client: "bg-[var(--client)]",
    ICP: "bg-[var(--icp)]",
    TAM: "bg-[var(--tam)]",
  };

  // --- Feedback analytics (admin only) ---
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.email?.endsWith("@hyperverge.co") ?? false;

  interface FeedbackItem {
    id: string;
    user_email: string;
    section: string;
    feedback_type: string;
    notes: string;
    page: string;
    company_name: string;
    status: string;
    created_at: string;
  }

  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setFeedbackLoading(true);
    fetch("/api/feedback?limit=200")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setFeedbackItems(data))
      .catch(() => {})
      .finally(() => setFeedbackLoading(false));
  }, [isAdmin]);

  const feedbackStats = useMemo(() => {
    const total = feedbackItems.length;
    const open = feedbackItems.filter((f) => f.status === "open").length;
    const inProgress = feedbackItems.filter((f) => f.status === "in_progress").length;
    const resolved = feedbackItems.filter((f) => f.status === "resolved").length;

    const bugs = feedbackItems.filter((f) => f.feedback_type === "bug").length;
    const suggestions = feedbackItems.filter((f) => f.feedback_type === "suggestion").length;
    const questions = feedbackItems.filter((f) => f.feedback_type === "question").length;

    const sectionCounts: Record<string, number> = {};
    for (const f of feedbackItems) {
      sectionCounts[f.section] = (sectionCounts[f.section] || 0) + 1;
    }
    const topSections = Object.entries(sectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value, color: "var(--brand)" }));
    const sectionTotal = feedbackItems.length;

    // Recent 10, open-first
    const recent = [...feedbackItems]
      .sort((a, b) => {
        const statusOrder: Record<string, number> = { open: 0, in_progress: 1, resolved: 2 };
        const sd = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
        if (sd !== 0) return sd;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 10);

    return { total, open, inProgress, resolved, bugs, suggestions, questions, topSections, sectionTotal, recent };
  }, [feedbackItems]);

  const cycleFeedbackStatus = useCallback(
    async (id: string, currentStatus: string) => {
      const next =
        currentStatus === "open"
          ? "in_progress"
          : currentStatus === "in_progress"
            ? "resolved"
            : "open";
      // Optimistic update
      setFeedbackItems((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: next } : f))
      );
      try {
        await fetch("/api/feedback", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: next }),
        });
      } catch {
        // Revert on error
        setFeedbackItems((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: currentStatus } : f))
        );
      }
    },
    []
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h2 className="text-lg font-bold">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Market intelligence overview</p>
        </div>

        {/* Milestone Revenue & Pipeline Tracker */}
        <RevenueMilestoneTracker 
          companies={companies}
          pipelineState={pipelineState}
        />

        {/* Action Feed */}
        <ActionFeed
          companies={companies}
          metState={metState}
          ratingState={ratingState}
          engagements={engagements}
          streakData={streakData}
          onOpenEngagement={onOpenEngagement}
        />

        {/* SLA Breach Alerts */}
        {slaBreaches.length > 0 && (
          <Card className="p-4 gap-3 shadow-none border-[var(--sqo)]/20 space-y-3">
            <SectionHeader
              title="SLA Alerts"
              description={`${slaBreaches.length} breach${slaBreaches.length !== 1 ? "es" : ""} detected`}
            />
            <div className="space-y-2">
              {slaBreaches.slice(0, 6).map((b) => (
                <div
                  key={`${b.slaId}-${b.companyId}`}
                  className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/20"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs px-1.5 py-0 h-5 shrink-0",
                        b.severity === "critical"
                          ? "text-[var(--sqo)] border-[var(--sqo)]/30"
                          : b.severity === "breach"
                            ? "text-[var(--client)] border-[var(--client)]/30"
                            : "text-muted-foreground border-muted-foreground/30"
                      )}
                    >
                      {b.severity}
                    </Badge>
                    <span className="truncate font-medium">{b.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-muted-foreground">{b.slaLabel}</span>
                    <span className="tabular-nums font-medium text-[var(--sqo)]">
                      {b.hoursOverdue}h overdue
                    </span>
                  </div>
                </div>
              ))}
              {slaBreaches.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{slaBreaches.length - 6} more
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Companies" value={stats.total} />
          <StatCard label="P0 (Largest)" value={stats.p0Count} sub={`${stats.p0Researched} researched`} />
          <StatCard label="Avg Quality" value={`${stats.avgQuality}%`} sub="research completeness" />
          <StatCard label="Engagements" value={engagementStats.totalEngagements} sub={`${engagementStats.companiesEngaged} companies touched`} />
        </div>

        {/* Outreach coverage stats */}
        {outreachStats.totalWithHistory > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Outreach Coverage"
              value={outreachStats.totalWithHistory}
              sub={`of ${stats.total} companies contacted`}
            />
            <StatCard
              label="Engaged"
              value={outreachStats.engaged}
              sub="bidirectional comms"
            />
            <StatCard
              label="Awaiting Reply"
              value={outreachStats.contacted}
              sub="outbound, no reply"
            />
            <StatCard
              label="Responded"
              value={outreachStats.responded}
              sub="inbound received"
            />
          </div>
        )}

        {/* Priority breakdown */}
        <Card className="p-4 gap-3 shadow-none space-y-3">
          <SectionHeader title="Priority Breakdown" />
          <StackedBar segments={stats.prioritySegments} />
        </Card>

        {/* Data Quality + Research Progress */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 gap-3 shadow-none space-y-3">
            <SectionHeader title="Data Quality" />
            <StackedBar segments={stats.qualitySegments} />
          </Card>

          <Card className="p-4 gap-3 shadow-none space-y-3">
            <SectionHeader title="Research Progress" />
            <div className="space-y-3">
              <ProgressRow label="P0 Companies" done={stats.p0Researched} total={stats.p0Total} color="var(--sqo)" />
              <ProgressRow label="P1 Companies" done={stats.p1Researched} total={stats.p1Total} color="var(--client)" />
              <ProgressRow label="Overall" done={stats.overallResearched} total={stats.total} color="var(--brand)" />
            </div>
          </Card>
        </div>

        {/* Engagement Analytics Section */}
        {engagementStats.totalEngagements > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-bold">Engagement Analytics</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Outreach activity and follow-up tracking</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Channel breakdown */}
              <Card className="p-4 gap-3 shadow-none space-y-3">
                <SectionHeader title="By Channel" />
                <HorizontalBar items={engagementStats.channelItems} total={engagementStats.totalEngagements} />
              </Card>

              {/* Hottest prospects */}
              <Card className="p-4 gap-3 shadow-none space-y-3">
                <SectionHeader title="Hottest Prospects" />
                <div className="space-y-2">
                  {engagementStats.hottestProspects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", typeColorDot[p.type] || "bg-muted")} />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {p.rating && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs px-1.5 py-0 h-5",
                              p.rating === "hot" ? "text-[var(--sqo)] border-[var(--sqo)]/30" :
                              p.rating === "warm" ? "text-[var(--client)] border-[var(--client)]/30" :
                              "text-brand border-brand/30"
                            )}
                          >
                            {p.rating}
                          </Badge>
                        )}
                        <span className="font-medium tabular-nums">{p.count}</span>
                        <span className="text-muted-foreground/60">{p.lastTouch}</span>
                      </div>
                    </div>
                  ))}
                  {engagementStats.hottestProspects.length === 0 && (
                    <p className="text-xs text-muted-foreground">No engagements yet</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Needs Follow-up */}
            {engagementStats.needsFollowUp.length > 0 && (
              <Card className="p-4 gap-3 shadow-none border-[var(--client)]/20 space-y-3">
                <SectionHeader title="Needs Follow-up" description="Companies with no outreach in 3+ days" />
                <div className="grid md:grid-cols-2 gap-2">
                  {engagementStats.needsFollowUp.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/20">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full shrink-0", typeColorDot[c.type] || "bg-muted")} />
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      <span className="text-[var(--client)] shrink-0 ml-2 tabular-nums">{c.daysSince}d ago</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="p-4 gap-3 shadow-none space-y-3">
              <SectionHeader title="Recent Activity" />
              <div className="space-y-2">
                {engagementStats.recentActivity.map((e) => {
                  const config = getChannelConfig(e.channel);
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className={cn("text-xs px-1.5 py-0 h-5 shrink-0", config.colorClass)}>
                        {config.label}
                      </Badge>
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span className="font-medium truncate">{e.companyName}</span>
                        {e.contactName && (
                          <span className="text-muted-foreground truncate">with {e.contactName}</span>
                        )}
                      </div>
                      <span className="text-muted-foreground/60 shrink-0">{formatEngagementTime(e.timestamp)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          </>
        )}

        {/* User Feedback Analytics (admin only) */}
        {isAdmin && feedbackStats.total > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-bold">User Feedback</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Feedback submitted via the in-app widget
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="Total" value={feedbackStats.total} />
              <StatCard label="Open" value={feedbackStats.open} />
              <StatCard label="In Progress" value={feedbackStats.inProgress} />
              <StatCard label="Resolved" value={feedbackStats.resolved} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-4 gap-3 shadow-none space-y-3">
                <SectionHeader title="By Type" />
                <StackedBar
                  segments={[
                    { label: "Bug", value: feedbackStats.bugs, color: "var(--sqo)" },
                    { label: "Suggestion", value: feedbackStats.suggestions, color: "var(--client)" },
                    { label: "Question", value: feedbackStats.questions, color: "var(--brand)" },
                  ]}
                />
              </Card>

              <Card className="p-4 gap-3 shadow-none space-y-3">
                <SectionHeader title="By Section" />
                <HorizontalBar items={feedbackStats.topSections} total={feedbackStats.sectionTotal} />
              </Card>
            </div>

            <Card className="p-4 gap-3 shadow-none space-y-3">
              <SectionHeader title="Recent Feedback" />
              <div className="space-y-2">
                {feedbackStats.recent.map((f) => {
                  const typeIcon =
                    f.feedback_type === "bug" ? (
                      <Bug className="h-3.5 w-3.5 text-[var(--sqo)]" />
                    ) : f.feedback_type === "question" ? (
                      <HelpCircle className="h-3.5 w-3.5 text-[var(--brand)]" />
                    ) : (
                      <Lightbulb className="h-3.5 w-3.5 text-[var(--client)]" />
                    );

                  const statusIcon =
                    f.status === "open" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-[var(--sqo)]" />
                    ) : f.status === "in_progress" ? (
                      <Clock className="h-3.5 w-3.5 text-[var(--client)]" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--icp)]" />
                    );

                  const dateStr = new Date(f.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div key={f.id} className="flex items-start gap-2 text-xs p-2 rounded-md bg-muted/20">
                      <button
                        onClick={() => cycleFeedbackStatus(f.id, f.status)}
                        className="shrink-0 mt-0.5 cursor-pointer hover:opacity-70 transition-opacity"
                        title={`Status: ${f.status} (click to cycle)`}
                      >
                        {statusIcon}
                      </button>
                      <div className="shrink-0 mt-0.5">{typeIcon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 shrink-0">
                            {f.section}
                          </Badge>
                          <span className="text-muted-foreground truncate">{f.user_email}</span>
                          <span className="text-muted-foreground/60 shrink-0 ml-auto">{dateStr}</span>
                        </div>
                        <p className="text-foreground mt-0.5 line-clamp-2">{f.notes}</p>
                      </div>
                    </div>
                  );
                })}
                {feedbackStats.recent.length === 0 && !feedbackLoading && (
                  <p className="text-xs text-muted-foreground">No feedback yet</p>
                )}
              </div>
            </Card>
          </>
        )}

        <Separator />

        {/* Source + Size charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 gap-3 shadow-none space-y-3">
            <SectionHeader title="Data Source" />
            <HorizontalBar items={stats.sourceItems} total={stats.total} />
          </Card>

          <Card className="p-4 gap-3 shadow-none space-y-3">
            <SectionHeader title="Company Size Distribution" />
            <VerticalBarChart buckets={stats.sizeBuckets} />
          </Card>
        </div>

        {/* Top locations */}
        <Card className="p-4 gap-3 shadow-none space-y-3">
          <SectionHeader title="Top Locations" />
          <HorizontalBar items={stats.topLocations} total={stats.locTotal} />
        </Card>
      </div>
    </ScrollArea>
  );
}

function channelToColor(channel: string): string {
  const colors: Record<string, string> = {
    email: "var(--brand)",
    linkedin: "var(--tam)",
    imessage: "var(--icp)",
    call: "var(--client)",
    meeting: "var(--sqo)",
    note: "var(--muted-foreground)",
  };
  return colors[channel] || "var(--tam)";
}
