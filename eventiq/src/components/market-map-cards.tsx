"use client";

import { useMemo, useState } from "react";
import { Company, CompanyMetrics } from "@/lib/types";
import { computeCompanyMetrics, MetricSortKey } from "@/lib/company-metrics";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

interface MarketMapCardsProps {
  companies: Company[];
  sortBy: MetricSortKey;
  onSortByChange: (key: MetricSortKey) => void;
  onSelectCompany: (id: number) => void;
}

const METRIC_LABELS: Record<MetricSortKey, string> = {
  fit: "Fit",
  intent: "Intent",
  access: "Access",
  timing: "Timing",
  composite: "Score",
};

const METRIC_COLORS: Record<MetricSortKey, string> = {
  fit: "hsl(142, 55%, 45%)",
  intent: "hsl(38, 85%, 55%)",
  access: "hsl(215, 70%, 55%)",
  timing: "hsl(0, 75%, 55%)",
  composite: "hsl(270, 55%, 55%)",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  SQO: "bg-red-500/20 text-red-400 border-red-500/30",
  Client: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ICP: "bg-green-500/20 text-green-400 border-green-500/30",
  TAM: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const OUTREACH_BADGE: Record<string, { label: string; className: string }> = {
  engaged: { label: "Engaged", className: "bg-green-500/20 text-green-400 border-green-500/30" },
  contacted: { label: "Contacted", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  responded: { label: "Responded", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
};

function MetricBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">{value}</span>
    </div>
  );
}

function CompanyScoreCard({
  company,
  metrics,
  onSelect,
}: {
  company: Company;
  metrics: CompanyMetrics;
  onSelect: () => void;
}) {
  const outreach = company.outreachHistory;
  const outreachBadge = outreach?.status && outreach.status !== "no_history"
    ? OUTREACH_BADGE[outreach.status]
    : null;

  return (
    <Card
      className="p-3 shadow-none hover:border-brand/30 transition-colors cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{company.name}</div>
          <div className="flex items-center gap-1 mt-0.5">
            <Badge
              variant="outline"
              className={`text-[10px] h-4 px-1 ${TYPE_BADGE_COLORS[company.type] || ""}`}
            >
              {company.type}
            </Badge>
            {outreachBadge && (
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1 ${outreachBadge.className}`}
              >
                {outreachBadge.label}
              </Badge>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold leading-tight" style={{ color: METRIC_COLORS.composite }}>
            {metrics.composite}
          </div>
          <div className="text-[10px] text-muted-foreground">composite</div>
        </div>
      </div>

      <div className="space-y-1">
        <MetricBar value={metrics.fitScore} color={METRIC_COLORS.fit} label="Fit" />
        <MetricBar value={metrics.intentScore} color={METRIC_COLORS.intent} label="Intent" />
        <MetricBar value={metrics.accessScore} color={METRIC_COLORS.access} label="Access" />
        <MetricBar value={metrics.timingScore} color={METRIC_COLORS.timing} label="Timing" />
      </div>
    </Card>
  );
}

export function MarketMapCards({
  companies,
  sortBy,
  onSortByChange,
  onSelectCompany,
}: MarketMapCardsProps) {
  const sortedCompanies = useMemo(() => {
    return [...companies]
      .map((c) => ({ company: c, metrics: computeCompanyMetrics(c) }))
      .sort((a, b) => {
        const getVal = (m: CompanyMetrics) => {
          switch (sortBy) {
            case "fit": return m.fitScore;
            case "intent": return m.intentScore;
            case "access": return m.accessScore;
            case "timing": return m.timingScore;
            default: return m.composite;
          }
        };
        return getVal(b.metrics) - getVal(a.metrics);
      });
  }, [companies, sortBy]);

  const sortKeys: MetricSortKey[] = ["composite", "fit", "intent", "access", "timing"];

  if (companies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No companies match the current filters
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sort bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Sort:</span>
        {sortKeys.map((key) => (
          <Button
            key={key}
            variant={sortBy === key ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-xs"
            style={sortBy === key ? { backgroundColor: METRIC_COLORS[key] } : undefined}
            onClick={() => onSortByChange(key)}
          >
            {METRIC_LABELS[key]}
          </Button>
        ))}
      </div>

      {/* Card grid */}
      <ScrollArea className="flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
          {sortedCompanies.map(({ company, metrics }) => (
            <CompanyScoreCard
              key={company.id}
              company={company}
              metrics={metrics}
              onSelect={() => onSelectCompany(company.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
