"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { PipelineRecord, PIPELINE_STAGES } from "@/lib/pipeline-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PipelineSnapshotProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  onSelectCompany: (id: number) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

export function PipelineSnapshot({
  companies,
  pipelineState,
  onSelectCompany,
}: PipelineSnapshotProps) {
  const snapshot = useMemo(() => {
    const stages: Record<string, { count: number; value: number }> = {};
    let totalValue = 0;
    let activeDeals = 0;

    for (const company of companies) {
      const record = pipelineState[company.id];
      const stage = record?.stage || "researched";
      const value = record?.dealValue || 0;

      if (!stages[stage]) stages[stage] = { count: 0, value: 0 };
      stages[stage].count++;
      stages[stage].value += value;

      if (["contacted", "engaged", "demo", "proposal"].includes(stage)) {
        activeDeals++;
        totalValue += value;
      }
    }

    return { stages, totalValue, activeDeals };
  }, [companies, pipelineState]);

  const activeStages = PIPELINE_STAGES.filter(
    (s) => !["researched", "won", "lost"].includes(s.id)
  );

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Active Pipeline</p>
          <p className="text-lg font-bold">
            {snapshot.totalValue > 0
              ? formatCurrency(snapshot.totalValue)
              : `${snapshot.activeDeals} deals`}
          </p>
        </div>
        {snapshot.stages["won"] && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Won</p>
            <p className="text-lg font-bold text-[var(--icp)]">
              {snapshot.stages["won"].count}
            </p>
          </div>
        )}
      </div>

      {/* Stage bars */}
      <div className="space-y-2">
        {activeStages.map((stageConfig) => {
          const data = snapshot.stages[stageConfig.id];
          if (!data || data.count === 0) return null;

          return (
            <div key={stageConfig.id} className="flex items-center gap-2">
              <div className="w-20 shrink-0">
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-5 w-full justify-center"
                  style={{ borderColor: `${stageConfig.color}40`, color: stageConfig.color }}
                >
                  {stageConfig.label}
                </Badge>
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 bg-muted/20 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((data.count / Math.max(snapshot.activeDeals, 1)) * 100, 100)}%`,
                      backgroundColor: stageConfig.color,
                    }}
                  />
                </div>
                <span className="text-xs font-medium tabular-nums shrink-0 w-6 text-right">
                  {data.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
