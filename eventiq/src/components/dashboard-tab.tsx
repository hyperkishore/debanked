"use client";

import { Company } from "@/lib/types";
import { isResearched } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo } from "react";

interface DashboardTabProps {
  companies: Company[];
  metState: Record<string, boolean>;
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

export function DashboardTab({ companies, metState }: DashboardTabProps) {
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
    };
  }, [companies, metState]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h2 className="text-lg font-bold">Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">TAM overview and research progress</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Companies" value={stats.total} />
          <StatCard label="P0 (Largest)" value={stats.p0Count} sub={`${stats.p0Researched} researched`} />
          <StatCard label="Researched" value={stats.researchedCount} sub={`${((stats.researchedCount / stats.total) * 100).toFixed(0)}% coverage`} />
          <StatCard label="Avg Employees" value={stats.avgEmployees} sub="where known" />
        </div>

        {/* Priority breakdown */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority Breakdown</h3>
          <StackedBar segments={stats.prioritySegments} />
        </div>

        {/* Two column grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Source breakdown */}
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Source</h3>
            <HorizontalBar items={stats.sourceItems} total={stats.total} />
          </div>

          {/* Research progress */}
          <div className="rounded-lg bg-card border border-border p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Research Progress</h3>
            <div className="space-y-2.5">
              <ProgressRow label="P0 Companies" done={stats.p0Researched} total={stats.p0Total} color="oklch(0.58 0.22 25)" />
              <ProgressRow label="P1 Companies" done={stats.p1Researched} total={stats.p1Total} color="oklch(0.72 0.19 85)" />
              <ProgressRow label="Overall" done={stats.overallResearched} total={stats.total} color="oklch(0.65 0.15 250)" />
            </div>
          </div>
        </div>

        {/* Company size distribution */}
        <div className="rounded-lg bg-card border border-border p-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Company Size Distribution</h3>
          <VerticalBarChart buckets={stats.sizeBuckets} />
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
