"use client";

import { useMemo, useState } from "react";
import { Company } from "@/lib/types";
import { PipelineRecord, PIPELINE_STAGES } from "@/lib/pipeline-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, ExternalLink, DollarSign } from "lucide-react";

interface PipelineDealsProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  onSelectCompany: (id: number) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

export function PipelineDeals({
  companies,
  pipelineState,
  onSelectCompany,
}: PipelineDealsProps) {
  const [expanded, setExpanded] = useState(false);

  const snapshot = useMemo(() => {
    const activeDeals: Array<{
      company: Company;
      deal: NonNullable<Company["hubspotDeals"]>[0];
      stageLabel: string;
    }> = [];
    let totalPipeline = 0;
    let totalClosed = 0;

    // Group deals by stage for the expanded view
    const stageGroups: Record<string, Array<{ company: Company; deal: NonNullable<Company["hubspotDeals"]>[0] }>> = {};

    for (const c of companies) {
      for (const deal of c.hubspotDeals || []) {
        const stage = (deal.stageLabel || deal.stage || "").toLowerCase();
        const isWon = stage.includes("closed won");
        const isLost = stage.includes("closed lost");

        if (isWon) {
          totalClosed += deal.amount || 0;
          continue;
        }
        if (isLost) continue;

        // Active deal
        totalPipeline += deal.amount || 0;
        const label = deal.stageLabel || deal.stage || "Unknown";
        activeDeals.push({ company: c, deal, stageLabel: label });

        if (!stageGroups[label]) stageGroups[label] = [];
        stageGroups[label].push({ company: c, deal });
      }
    }

    // Count most common stage
    let topStage = "";
    let topStageCount = 0;
    for (const [stage, deals] of Object.entries(stageGroups)) {
      if (deals.length > topStageCount) {
        topStage = stage;
        topStageCount = deals.length;
      }
    }

    return {
      activeDeals,
      totalPipeline,
      totalClosed,
      stageGroups,
      topStage,
      topStageCount,
    };
  }, [companies]);

  const summaryText = snapshot.activeDeals.length > 0
    ? `${snapshot.activeDeals.length} active deals | ${formatCurrency(snapshot.totalPipeline)} pipeline${snapshot.topStageCount > 0 ? ` | ${snapshot.topStageCount} in ${snapshot.topStage}` : ""}`
    : "No active HubSpot deals";

  return (
    <section>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 p-0 h-auto hover:bg-transparent"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 w-full py-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <DollarSign className="h-4 w-4 text-brand shrink-0" />
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Active Deals</h2>
          <span className="text-xs text-muted-foreground/70 ml-2 font-normal normal-case tracking-normal">
            {summaryText}
          </span>
        </div>
      </Button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Stage summary bar */}
          {Object.keys(snapshot.stageGroups).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(snapshot.stageGroups).map(([stage, deals]) => {
                const stageConfig = PIPELINE_STAGES.find(
                  s => s.label.toLowerCase() === stage.toLowerCase()
                );
                return (
                  <Badge
                    key={stage}
                    variant="outline"
                    className="text-xs px-2 py-0.5 h-6"
                    style={stageConfig ? {
                      borderColor: `${stageConfig.color}40`,
                      color: stageConfig.color,
                    } : undefined}
                  >
                    {stage}: {deals.length}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Deal cards grouped by stage */}
          {Object.entries(snapshot.stageGroups).map(([stage, deals]) => (
            <div key={stage} className="space-y-1.5">
              {deals
                .sort((a, b) => (b.deal.amount || 0) - (a.deal.amount || 0))
                .map(({ company, deal }) => (
                  <div
                    key={deal.dealId}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCompany(company.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{company.name}</span>
                        <Badge
                          variant="outline"
                          className="text-xs px-1 py-0 h-4 bg-orange-500/10 text-orange-400 border-orange-500/30 shrink-0"
                        >
                          {deal.stageLabel || deal.stage}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{deal.dealName}</p>
                    </div>
                    {deal.amount && deal.amount > 0 && (
                      <span className="text-sm font-bold tabular-nums shrink-0">
                        {formatCurrency(deal.amount)}
                      </span>
                    )}
                    <a
                      href={`https://app.hubspot.com/contacts/3800237/deal/${deal.dealId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-brand shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
            </div>
          ))}

          {snapshot.activeDeals.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">No active HubSpot deals.</p>
          )}
        </div>
      )}
    </section>
  );
}
