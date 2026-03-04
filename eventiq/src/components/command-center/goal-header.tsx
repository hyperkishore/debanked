"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { PipelineRecord, PipelineStage } from "@/lib/pipeline-helpers";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { FeedItem } from "@/lib/feed-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Trophy, Flame, CalendarClock, Briefcase } from "lucide-react";

interface GoalHeaderProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  followUps: FollowUpReminder[];
  feedItems: FeedItem[];
}

const MILESTONES = [
  { id: 1, pipe: 3000000, rev: 1000000, label: "Milestone 1" },
  { id: 2, pipe: 9000000, rev: 3000000, label: "Milestone 2 (Goal)" },
];

const STAGE_PROBABILITIES: Record<PipelineStage, number> = {
  researched: 0.05,
  contacted: 0.10,
  engaged: 0.20,
  demo: 0.40,
  proposal: 0.60,
  won: 1.00,
  lost: 0,
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

export function GoalHeader({
  companies,
  pipelineState,
  followUps,
  feedItems,
}: GoalHeaderProps) {
  const stats = useMemo(() => {
    let totalWeightedPipe = 0;
    let totalClosedRevenue = 0;
    let activeCount = 0;

    for (const company of companies) {
      const record = pipelineState[company.id];
      const stage = record?.stage || "researched";
      const baseValue = record?.dealValue ?? estimateCompanyValue(company);
      const prob = STAGE_PROBABILITIES[stage] || 0;
      totalWeightedPipe += baseValue * prob;

      if (stage === "won") totalClosedRevenue += baseValue;

      // Count active HubSpot deals
      for (const deal of company.hubspotDeals || []) {
        const stageLabel = (deal.stageLabel || deal.stage || "").toLowerCase();
        if (!stageLabel.includes("closed won") && !stageLabel.includes("closed lost")) {
          activeCount++;
        }
      }
    }

    const pipeProgress = Math.min((totalWeightedPipe / MILESTONES[1].pipe) * 100, 100);
    const revProgress = Math.min((totalClosedRevenue / MILESTONES[1].rev) * 100, 100);

    // Follow-ups due
    const today = new Date().toISOString().slice(0, 10);
    const dueFollowUps = followUps.filter(fu => !fu.completed && fu.dueDate <= today).length;

    // Hot signals count
    const hotSignals = feedItems.filter(f => f.heat === "hot").length;

    return {
      totalWeightedPipe,
      totalClosedRevenue,
      pipeProgress,
      revProgress,
      activeCount,
      dueFollowUps,
      hotSignals,
    };
  }, [companies, pipelineState, followUps, feedItems]);

  return (
    <Card className="p-5 border-brand/20 bg-brand/5 shadow-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
        {/* Pipeline Progress */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand" />
              Pipeline
            </h3>
            <Badge variant="outline" className="bg-brand/10 border-brand/30 text-brand font-bold text-xs h-5">
              {stats.pipeProgress.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums tracking-tighter">
              {formatCurrency(stats.totalWeightedPipe)}
            </span>
            <span className="text-xs text-muted-foreground">/ {formatCurrency(MILESTONES[1].pipe)}</span>
          </div>
          <div className="relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-20"
              style={{ left: `${(MILESTONES[0].pipe / MILESTONES[1].pipe) * 100}%` }}
            />
            <Progress value={stats.pipeProgress} className="h-full bg-brand/20" />
          </div>
        </div>

        <div className="hidden md:block w-px h-16 bg-border/50" />

        {/* Revenue Progress */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-emerald-500" />
              Revenue
            </h3>
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold text-xs h-5">
              {stats.revProgress.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums tracking-tighter text-emerald-500">
              {formatCurrency(stats.totalClosedRevenue)}
            </span>
            <span className="text-xs text-muted-foreground">/ {formatCurrency(MILESTONES[1].rev)}</span>
          </div>
          <div className="relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-20"
              style={{ left: `${(MILESTONES[0].rev / MILESTONES[1].rev) * 100}%` }}
            />
            <Progress value={stats.revProgress} className="h-full bg-emerald-500/20" />
          </div>
        </div>
      </div>

      {/* Stat Pills */}
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 h-auto">
          <Briefcase className="h-3 w-3" />
          {stats.activeCount} active deals
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs gap-1.5 px-2.5 py-1 h-auto ${stats.dueFollowUps > 0 ? "text-[var(--client)] border-[var(--client)]/30" : ""}`}
        >
          <CalendarClock className="h-3 w-3" />
          {stats.dueFollowUps} follow-ups due
        </Badge>
        <Badge
          variant="outline"
          className={`text-xs gap-1.5 px-2.5 py-1 h-auto ${stats.hotSignals > 0 ? "text-[var(--sqo)] border-[var(--sqo)]/30" : ""}`}
        >
          <Flame className="h-3 w-3" />
          {stats.hotSignals} hot signals
        </Badge>
      </div>
    </Card>
  );
}
