"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { PipelineRecord, PipelineStage } from "@/lib/pipeline-helpers";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, Trophy, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RevenueMilestoneTrackerProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
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
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function RevenueMilestoneTracker({
  companies,
  pipelineState,
}: RevenueMilestoneTrackerProps) {
  const stats = useMemo(() => {
    let totalWeightedPipe = 0;
    let totalClosedRevenue = 0;
    let prePipeCount = 0;
    let actualPipeCount = 0;

    for (const company of companies) {
      const record = pipelineState[company.id];
      const stage = record?.stage || "researched";
      
      // Use manual value if present, otherwise use our extrapolation engine
      const baseValue = record?.dealValue ?? estimateCompanyValue(company);
      const prob = STAGE_PROBABILITIES[stage] || 0;
      
      const weightedValue = baseValue * prob;
      totalWeightedPipe += weightedValue;

      if (stage === "won") {
        totalClosedRevenue += baseValue;
      }

      if (record?.dealValue) actualPipeCount++;
      else prePipeCount++;
    }

    const pipeProgress = (totalWeightedPipe / MILESTONES[1].pipe) * 100;
    const revProgress = (totalClosedRevenue / MILESTONES[1].rev) * 100;

    return {
      totalWeightedPipe,
      totalClosedRevenue,
      pipeProgress,
      revProgress,
      prePipeCount,
      actualPipeCount
    };
  }, [companies, pipelineState]);

  return (
      <Card className="p-5 border-brand/20 bg-brand/5 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target className="w-24 h-24" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          {/* Left: Pipeline Progress */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand" />
                    Aggregate Pipeline
                  </h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-muted-foreground/50" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>Weighted value of all active companies. Includes extrapolated "Pre-Pipe" estimates for {stats.prePipeCount} companies and HubSpot data for {stats.actualPipeCount} deals.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tabular-nums tracking-tighter">
                    {formatCurrency(stats.totalWeightedPipe)}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    / {formatCurrency(MILESTONES[1].pipe)}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="bg-brand/10 border-brand/30 text-brand font-bold h-6">
                {stats.pipeProgress.toFixed(1)}% TO GOAL
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="relative h-3 w-full bg-muted/30 rounded-full overflow-hidden">
                {/* Milestone Markers */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-20" 
                  style={{ left: `${(MILESTONES[0].pipe / MILESTONES[1].pipe) * 100}%` }}
                  title="Milestone 1: $3M"
                />
                
                <Progress 
                  value={stats.pipeProgress} 
                  className="h-full bg-brand/20" 
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>$0</span>
                <span className="text-brand/70">$3M Milestone</span>
                <span>$9M Goal</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block w-px h-20 bg-border/50 mx-4" />

          {/* Right: Revenue Progress */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold uppercase tracking-tight text-muted-foreground flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-emerald-500" />
                  Closed Revenue
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tabular-nums tracking-tighter text-emerald-500">
                    {formatCurrency(stats.totalClosedRevenue)}
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">
                    / {formatCurrency(MILESTONES[1].rev)}
                  </span>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold h-6">
                {stats.revProgress.toFixed(1)}% ACHIEVED
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="relative h-3 w-full bg-muted/30 rounded-full overflow-hidden">
                {/* Milestone Markers */}
                <div 
                  className="absolute top-0 bottom-0 w-0.5 bg-white/40 z-20" 
                  style={{ left: `${(MILESTONES[0].rev / MILESTONES[1].rev) * 100}%` }}
                />
                <Progress 
                  value={stats.revProgress} 
                  className="h-full bg-emerald-500/20"
                />
              </div>
              <div className="flex justify-between text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                <span>$0</span>
                <span className="text-emerald-500/70">$1M Milestone</span>
                <span>$3M Goal</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
  );
}
