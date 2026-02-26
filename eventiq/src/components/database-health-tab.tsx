"use client";

import { useMemo } from "react";
import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched, getResearchScore } from "@/lib/types";
import { Card } from "@/components/ui/card";
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
