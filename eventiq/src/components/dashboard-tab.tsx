"use client";

import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched, getResearchScore, getResearchTier } from "@/lib/types";
import { getLastEngagement, getChannelConfig, formatEngagementTime } from "@/lib/engagement-helpers";
import { StreakData } from "@/lib/streak-helpers";
import { ActionFeed } from "@/components/action-feed";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useMemo } from "react";

interface DashboardTabProps {
  companies: Company[];
  metState: Record<string, boolean>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  streakData: StreakData;
  onOpenEngagement: (companyId: number) => void;
}

// --- Reusable sub-components ---

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function HorizontalBar({ items, total }: { items: { label: string; value: number; color: string }[]; total: number }) {
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const pct = total > 0 ? (item.value / total) * 100 : 0;
        return (
          <div key={item.label} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value} <span className="text-muted-foreground/60">({pct.toFixed(0)}%)</span></span>
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
    <div className="space-y-2">
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
            <span className="font-medium">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerticalBarChart({ buckets }: { buckets: { label: string; value: number }[] }) {
  const maxVal = Math.max(...buckets.map((b) => b.value), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {buckets.map((b) => {
        const height = (b.value / maxVal) * 100;
        return (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] font-medium text-foreground">{b.value}</span>
            <div className="w-full bg-muted/30 rounded-t flex flex-col justify-end" style={{ height: "100%" }}>
              <div
                className="bg-primary/60 rounded-t transition-all w-full"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground text-center leading-tight">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRow({ label, done, total, color }: { label: string; done: number; total: number; color: string }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{done}/{total} <span className="text-muted-foreground/60">({pct.toFixed(0)}%)</span></span>
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

// --- Main component ---

export function DashboardTab({ companies, metState, engagements, ratingState, streakData, onOpenEngagement }: DashboardTabProps) {
  const stats = useMemo(() => {
    const total = companies.length;
    const p0 = companies.filter((c) => c.priority <= 2);
    const researched = companies.filter(isResearched);
    const metCount = Object.values(metState).filter(Boolean).length;
    const withEmployees = companies.filter((c) => c.employees && c.employees > 0);
    const avgEmployees = withEmployees.length > 0
      ? Math.round(withEmployees.reduce((s, c) => s + (c.employees || 0), 0) / withEmployees.length)
      : 0;

    // Priority breakdown
    const prioritySegments = [
      { label: "P0", value: companies.filter((c) => c.priority <= 2).length, color: "oklch(0.58 0.22 25)" },
      { label: "P1", value: companies.filter((c) => c.priority === 3 || c.priority === 4).length, color: "oklch(0.72 0.19 85)" },
      { label: "TBC", value: companies.filter((c) => c.priority === 5 || c.priority === 6).length, color: "oklch(0.55 0.05 250)" },
      { label: "Not Priority", value: companies.filter((c) => c.priority === 7).length, color: "oklch(0.35 0.02 270)" },
    ];

    // Source breakdown
    const sourceItems = [
      { label: "EventIQ Only", value: companies.filter((c) => c.source?.includes("eventiq") && !c.source?.includes("tam")).length, color: "oklch(0.65 0.17 145)" },
      { label: "TAM Only", value: companies.filter((c) => c.source?.includes("tam") && !c.source?.includes("eventiq")).length, color: "oklch(0.55 0.05 250)" },
      { label: "Both", value: companies.filter((c) => c.source?.includes("eventiq") && c.source?.includes("tam")).length, color: "oklch(0.65 0.15 250)" },
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
      .map(([ label, value ]) => ({ label, value, color: "oklch(0.65 0.15 250)" }));
    const locTotal = companies.filter((c) => c.location).length;

    // Research progress
    const p0Researched = p0.filter(isResearched).length;
    const p1Companies = companies.filter((c) => c.priority === 3 || c.priority === 4);
    const p1Researched = p1Companies.filter(isResearched).length;

    // Data quality distribution
    const qualitySegments = [
      { label: "Complete (80+)", value: companies.filter(c => getResearchScore(c) >= 80).length, color: "oklch(0.65 0.17 145)" },
      { label: "Good (50-79)", value: companies.filter(c => { const s = getResearchScore(c); return s >= 50 && s < 80; }).length, color: "oklch(0.65 0.15 250)" },
      { label: "Partial (25-49)", value: companies.filter(c => { const s = getResearchScore(c); return s >= 25 && s < 50; }).length, color: "oklch(0.72 0.19 85)" },
      { label: "Minimal (<25)", value: companies.filter(c => getResearchScore(c) < 25).length, color: "oklch(0.58 0.22 25)" },
    ];
    const avgQuality = total > 0
      ? Math.round(companies.reduce((s, c) => s + getResearchScore(c), 0) / total)
      : 0;

    return {
      total,
      p0Count: p0.length,
      researchedCount: researched.length,
      metCount,
      avgEmployees,
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
      avgQuality,
    };
  }, [companies, metState]);

  // Engagement analytics
  const engagementStats = useMemo(() => {
    const totalEngagements = engagements.length;

    // Unique companies engaged
    const engagedCompanyIds = new Set(engagements.map(e => e.companyId));
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

    // Hottest prospects: companies with most engagements (top 8)
    const companyEngagementCounts: Record<number, number> = {};
    for (const e of engagements) {
      companyEngagementCounts[e.companyId] = (companyEngagementCounts[e.companyId] || 0) + 1;
    }
    const hottestProspects = Object.entries(companyEngagementCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => {
        const company = companies.find(c => c.id === parseInt(id));
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

    // Needs follow-up: companies with engagements but last touch > 3 days ago
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const needsFollowUp = Object.entries(companyEngagementCounts)
      .filter(([id]) => {
        const last = getLastEngagement(engagements, parseInt(id));
        return last && (now - new Date(last.timestamp).getTime()) > threeDaysMs;
      })
      .sort((a, b) => {
        const lastA = getLastEngagement(engagements, parseInt(a[0]));
        const lastB = getLastEngagement(engagements, parseInt(b[0]));
        return (lastA ? new Date(lastA.timestamp).getTime() : 0) - (lastB ? new Date(lastB.timestamp).getTime() : 0);
      })
      .slice(0, 6)
      .map(([id, count]) => {
        const company = companies.find(c => c.id === parseInt(id));
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

    // Recent activity (last 10)
    const recentActivity = [...engagements]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)
      .map(e => {
        const company = companies.find(c => c.id === e.companyId);
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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Market intelligence overview</p>
        </div>

        {/* Action Feed */}
        <ActionFeed
          companies={companies}
          metState={metState}
          ratingState={ratingState}
          engagements={engagements}
          streakData={streakData}
          onOpenEngagement={onOpenEngagement}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Companies" value={stats.total} />
          <StatCard label="P0 (Largest)" value={stats.p0Count} sub={`${stats.p0Researched} researched`} />
          <StatCard label="Avg Quality" value={`${stats.avgQuality}%`} sub="research completeness" />
          <StatCard label="Engagements" value={engagementStats.totalEngagements} sub={`${engagementStats.companiesEngaged} companies touched`} />
        </div>

        {/* Priority breakdown */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority Breakdown</h3>
          <StackedBar segments={stats.prioritySegments} />
        </div>

        {/* Data Quality + Research Progress */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Quality</h3>
            <StackedBar segments={stats.qualitySegments} />
          </div>

          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research Progress</h3>
            <div className="space-y-2.5">
              <ProgressRow label="P0 Companies" done={stats.p0Researched} total={stats.p0Total} color="oklch(0.58 0.22 25)" />
              <ProgressRow label="P1 Companies" done={stats.p1Researched} total={stats.p1Total} color="oklch(0.72 0.19 85)" />
              <ProgressRow label="Overall" done={stats.overallResearched} total={stats.total} color="oklch(0.65 0.15 250)" />
            </div>
          </div>
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
              <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">By Channel</h3>
                <HorizontalBar items={engagementStats.channelItems} total={engagementStats.totalEngagements} />
              </div>

              {/* Hottest prospects */}
              <div className="rounded-lg bg-card border border-border p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hottest Prospects</h3>
                <div className="space-y-1.5">
                  {engagementStats.hottestProspects.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColorDot[p.type] || "bg-muted"}`} />
                        <span className="truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {p.rating && (
                          <span className={`text-[10px] font-medium ${
                            p.rating === "hot" ? "text-[var(--sqo)]" :
                            p.rating === "warm" ? "text-[var(--client)]" : "text-primary"
                          }`}>
                            {p.rating.toUpperCase()}
                          </span>
                        )}
                        <span className="font-medium">{p.count}</span>
                        <span className="text-muted-foreground/60">{p.lastTouch}</span>
                      </div>
                    </div>
                  ))}
                  {engagementStats.hottestProspects.length === 0 && (
                    <p className="text-xs text-muted-foreground">No engagements yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Needs Follow-up */}
            {engagementStats.needsFollowUp.length > 0 && (
              <div className="rounded-lg bg-card border border-amber-500/20 p-4 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-400">Needs Follow-up</h3>
                <p className="text-[11px] text-muted-foreground">Companies with no outreach in 3+ days</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {engagementStats.needsFollowUp.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-muted/20">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColorDot[c.type] || "bg-muted"}`} />
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      <span className="text-amber-400/80 shrink-0">{c.daysSince}d ago</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="rounded-lg bg-card border border-border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
              <div className="space-y-2">
                {engagementStats.recentActivity.map((e) => {
                  const config = getChannelConfig(e.channel);
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.colorClass}`}>
                        {config.label}
                      </span>
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
            </div>
          </>
        )}

        <Separator />

        {/* Source + Size charts */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Source</h3>
            <HorizontalBar items={stats.sourceItems} total={stats.total} />
          </div>

          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Size Distribution</h3>
            <VerticalBarChart buckets={stats.sizeBuckets} />
          </div>
        </div>

        {/* Top locations */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top Locations</h3>
          <HorizontalBar items={stats.topLocations} total={stats.locTotal} />
        </div>
      </div>
    </ScrollArea>
  );
}

function channelToColor(channel: string): string {
  const colors: Record<string, string> = {
    email: "oklch(0.65 0.15 250)",
    linkedin: "oklch(0.65 0.17 220)",
    imessage: "oklch(0.65 0.17 145)",
    call: "oklch(0.72 0.19 85)",
    meeting: "oklch(0.6 0.17 300)",
    note: "oklch(0.5 0.05 270)",
  };
  return colors[channel] || "oklch(0.55 0.05 250)";
}
