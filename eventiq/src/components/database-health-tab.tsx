"use client";

import { useMemo, useEffect, useState } from "react";
import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched, getResearchScore } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface DatabaseHealthTabProps {
  companies: Company[];
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4 gap-3 shadow-none">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
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

interface EnrichmentHealth {
  status: string;
  alerts: string[];
  today: { enrichmentEvents: number };
  last48h: { enrichmentEvents: number; byType: Record<string, number> };
  lastRuns: { enrichment: string | null; dailyBrief: string | null; linkedinActivity: string | null };
}

function EnrichmentPipelineCard() {
  const [health, setHealth] = useState<EnrichmentHealth | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/enrichment-health");
        if (res.ok && mounted) setHealth(await res.json());
      } catch { /* table may not exist */ }
    })();
    return () => { mounted = false; };
  }, []);

  if (!health) return null;

  const formatTime = (ts: string | null) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    const now = Date.now();
    const hours = Math.floor((now - d.getTime()) / 3600000);
    if (hours < 1) return "< 1 hour ago";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const typeLabels: Record<string, string> = {
    linkedin_activity: "LinkedIn",
    profile_hooks: "Hooks",
    company_intel: "Company",
    email_found: "Email",
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Enrichment Pipeline</h3>
        <Badge
          variant="outline"
          className={`text-xs ${health.status === "healthy" ? "text-emerald-400 border-emerald-400/30" : "text-yellow-400 border-yellow-400/30"}`}
        >
          {health.status}
        </Badge>
      </div>

      {/* Alerts */}
      {health.alerts.length > 0 && (
        <div className="space-y-1">
          {health.alerts.map((a, i) => (
            <p key={i} className="text-xs text-yellow-400 flex items-start gap-1.5">
              <span className="shrink-0">!</span> {a}
            </p>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-lg font-bold">{health.today.enrichmentEvents}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Today</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{health.last48h.enrichmentEvents}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Last 48h</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold">{Object.keys(health.last48h.byType).length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Types Active</p>
        </div>
      </div>

      {/* Type breakdown */}
      {Object.keys(health.last48h.byType).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(health.last48h.byType).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs text-muted-foreground">
              {typeLabels[type] || type}: {count}
            </Badge>
          ))}
        </div>
      )}

      {/* Last run times */}
      <div className="space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Last enrichment</span>
          <span className="tabular-nums">{formatTime(health.lastRuns.enrichment)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Last daily brief</span>
          <span className="tabular-nums">{formatTime(health.lastRuns.dailyBrief)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Last LinkedIn extraction</span>
          <span className="tabular-nums">{formatTime(health.lastRuns.linkedinActivity)}</span>
        </div>
      </div>
    </Card>
  );
}

export function DatabaseHealthTab({ companies }: DatabaseHealthTabProps) {
  const stats = useMemo(() => {
    const total = companies.length;
    const p0 = companies.filter((c) => c.priority <= 2);
    const researched = companies.filter(isResearched);

    const prioritySegments = [
      { label: "P0", value: companies.filter((c) => c.priority <= 2).length, color: "oklch(0.6 0.25 25)" },
      { label: "P1", value: companies.filter((c) => c.priority === 3 || c.priority === 4).length, color: "oklch(0.7 0.2 40)" },
      { label: "TBC", value: companies.filter((c) => c.priority === 5 || c.priority === 6).length, color: "oklch(0.8 0.15 60)" },
      { label: "Not Priority", value: companies.filter((c) => c.priority === 7).length, color: "var(--muted-foreground)" },
    ];

    const qualitySegments = [
      { label: "Complete (80+)", value: companies.filter((c) => getResearchScore(c) >= 80).length, color: "oklch(0.65 0.17 145)" },
      { label: "Good (50-79)", value: companies.filter((c) => { const s = getResearchScore(c); return s >= 50 && s < 80; }).length, color: "var(--brand)" },
      { label: "Partial (25-49)", value: companies.filter((c) => { const s = getResearchScore(c); return s >= 25 && s < 50; }).length, color: "oklch(0.75 0.15 250)" },
      { label: "Minimal (<25)", value: companies.filter((c) => getResearchScore(c) < 25).length, color: "oklch(0.55 0.05 250)" },
    ];

    const locCounts: Record<string, number> = {};
    for (const c of companies) {
      if (c.location) locCounts[c.location] = (locCounts[c.location] || 0) + 1;
    }
    const topLocations = Object.entries(locCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value, color: "var(--brand)" }));
    
    const locTotal = companies.filter((c) => c.location).length;

    return {
      total,
      p0Count: p0.length,
      researchedCount: researched.length,
      prioritySegments,
      qualitySegments,
      topLocations,
      locTotal,
      p0Researched: p0.filter(isResearched).length,
      p1Researched: companies.filter(c => c.priority === 3 || c.priority === 4).filter(isResearched).length,
      p1Total: companies.filter(c => c.priority === 3 || c.priority === 4).length
    };
  }, [companies]);

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-xl font-bold">Database Health & Audit</h2>
          <p className="text-sm text-muted-foreground mt-1">
            System-level metrics for data quality, priority distribution, and market coverage.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Universe" value={stats.total} />
          <StatCard label="P0 Targets" value={stats.p0Count} />
          <StatCard label="Researched" value={stats.researchedCount} sub={`${Math.round((stats.researchedCount/stats.total)*100)}% coverage`} />
          <StatCard label="Data Source" value="Hybrid" sub="TAM + EventIQ" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority Breakdown</h3>
            <StackedBar segments={stats.prioritySegments} />
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Research Quality</h3>
            <StackedBar segments={stats.qualitySegments} />
          </Card>
        </div>

        <Card className="p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Regional Market Coverage</h3>
          <HorizontalBar items={stats.topLocations} total={stats.locTotal} />
        </Card>

        <EnrichmentPipelineCard />

        <Card className="p-4 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Segment Completion</h3>
          <div className="space-y-4">
            <ProgressRow label="P0 (Largest Accounts)" done={stats.p0Researched} total={stats.p0Count} color="oklch(0.6 0.25 25)" />
            <ProgressRow label="P1 (Core Market)" done={stats.p1Researched} total={stats.p1Total} color="var(--brand)" />
            <ProgressRow label="Total Universe" done={stats.researchedCount} total={stats.total} color="oklch(0.65 0.17 145)" />
          </div>
        </Card>

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Database last refreshed via scripts/refresh.js | Source: deBanked + HubSpot
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
