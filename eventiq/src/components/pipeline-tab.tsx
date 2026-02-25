"use client";

import { Company, RatingData, EngagementEntry, CompanyType } from "@/lib/types";
import {
  PipelineStage,
  PipelineRecord,
  PIPELINE_STAGES,
  getPipelineByStage,
  getDaysSinceContact,
} from "@/lib/pipeline-helpers";
import { getLastEngagement } from "@/lib/engagement-helpers";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { PipelineCard } from "@/components/pipeline-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useMemo, useCallback, useRef } from "react";

const STAGE_WEIGHTS: Record<PipelineStage, number> = {
  researched: 0.05,
  contacted: 0.10,
  engaged: 0.20,
  demo: 0.40,
  proposal: 0.60,
  won: 1.00,
  lost: 0,
};

interface PipelineTabProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  ratingState: Record<string, RatingData>;
  engagements: EngagementEntry[];
  onPipelineMove: (companyId: number, newStage: PipelineStage) => void;
  onOpenCompany: (id: number) => void;
  onUpdateDeal?: (companyId: number, dealValue: number | undefined, closeDate: string | undefined) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function PipelineTab({
  companies,
  pipelineState,
  ratingState,
  engagements,
  onPipelineMove,
  onOpenCompany,
  onUpdateDeal,
}: PipelineTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CompanyType | "all">("all");
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const dragRef = useRef<number | null>(null);

  // Touch drag state
  const touchRef = useRef<{
    companyId: number;
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  // Filter companies
  const filteredCompanies = useMemo(() => {
    let filtered = companies;
    if (typeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === typeFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
    }
    return filtered;
  }, [companies, typeFilter, search]);

  // Build pipeline
  const pipeline = useMemo(
    () => getPipelineByStage(filteredCompanies, pipelineState),
    [filteredCompanies, pipelineState]
  );

  // Compute weighted pipeline totals per stage
  const stageTotals = useMemo(() => {
    const totals: Record<PipelineStage, { raw: number; weighted: number }> = {
      researched: { raw: 0, weighted: 0 },
      contacted: { raw: 0, weighted: 0 },
      engaged: { raw: 0, weighted: 0 },
      demo: { raw: 0, weighted: 0 },
      proposal: { raw: 0, weighted: 0 },
      won: { raw: 0, weighted: 0 },
      lost: { raw: 0, weighted: 0 },
    };

    for (const [stageId, stageCompanies] of Object.entries(pipeline)) {
      const stage = stageId as PipelineStage;
      for (const c of stageCompanies) {
        const record = pipelineState[c.id];
        // Use manual value if present, otherwise extrapolate from our 5-method model
        const dv = record?.dealValue || estimateCompanyValue(c);
        if (dv && dv > 0) {
          totals[stage].raw += dv;
          totals[stage].weighted += dv * STAGE_WEIGHTS[stage];
        }
      }
    }

    return totals;
  }, [pipeline, pipelineState]);

  // Grand total weighted pipeline
  const totalWeighted = useMemo(
    () => Object.values(stageTotals).reduce((sum, t) => sum + t.weighted, 0),
    [stageTotals]
  );

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, companyId: number) => {
    dragRef.current = companyId;
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).classList.add("pipeline-dragging");
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, stage: PipelineStage) => {
      e.preventDefault();
      setDragOverStage(null);
      if (dragRef.current !== null) {
        onPipelineMove(dragRef.current, stage);
        dragRef.current = null;
      }
    },
    [onPipelineMove]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove("pipeline-dragging");
    setDragOverStage(null);
    dragRef.current = null;
  }, []);

  // Touch handlers for mobile drag
  const handleTouchStart = useCallback((companyId: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchRef.current = {
      companyId,
      startX: touch.clientX,
      startY: touch.clientY,
      isDragging: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchRef.current.startX);
    const dy = Math.abs(touch.clientY - touchRef.current.startY);
    if (dx > 10 || dy > 10) {
      touchRef.current.isDragging = true;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchRef.current || !touchRef.current.isDragging) {
        touchRef.current = null;
        return;
      }

      const touch = e.changedTouches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const column = element?.closest("[data-stage]");
      if (column) {
        const stage = column.getAttribute("data-stage") as PipelineStage;
        onPipelineMove(touchRef.current.companyId, stage);
      }
      touchRef.current = null;
    },
    [onPipelineMove]
  );

  const typeFilters: { label: string; value: CompanyType | "all" }[] = [
    { label: "All", value: "all" },
    { label: "SQO", value: "SQO" },
    { label: "Client", value: "Client" },
    { label: "ICP", value: "ICP" },
    { label: "TAM", value: "TAM" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header + Filters */}
      <div className="shrink-0 p-4 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag companies between stages
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {filteredCompanies.length} companies
            </div>
            {totalWeighted > 0 && (
              <div className="text-xs font-medium text-green-400">
                Weighted: {formatCurrency(totalWeighted)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="flex-1 h-7 text-xs"
          />
          <div className="flex gap-1">
            {typeFilters.map((f) => (
              <Button
                key={f.value}
                variant={typeFilter === f.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  "text-xs px-2 py-1 h-auto font-medium",
                  typeFilter === f.value
                    ? ""
                    : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                )}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 overflow-x-auto pipeline-scroll px-4 pb-4">
        <div className="flex gap-3 h-full min-w-max">
          {PIPELINE_STAGES.map((stage) => {
            const stageCompanies = pipeline[stage.id];
            const isOver = dragOverStage === stage.id;
            const totals = stageTotals[stage.id];

            return (
              <div
                key={stage.id}
                data-stage={stage.id}
                className={cn(
                  "flex flex-col w-48 md:w-56 shrink-0 rounded-lg border transition-colors",
                  isOver
                    ? "border-primary/50 bg-primary/5 pipeline-dragover"
                    : "border-border bg-secondary/10"
                )}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column header */}
                <div className="shrink-0 px-3 py-2 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: stage.color }}>
                      {stage.label}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-1.5 py-0.5 rounded">
                      {stageCompanies.length}
                    </span>
                  </div>
                  {totals.weighted > 0 && (
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-green-400/70">
                        {formatCurrency(totals.raw)}
                      </span>
                      <span className="text-xs text-green-400 font-medium">
                        {formatCurrency(totals.weighted)}w
                      </span>
                    </div>
                  )}
                </div>

                {/* Cards */}
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-2 space-y-1.5">
                    {stageCompanies.map((company) => {
                      const daysSince = getDaysSinceContact(company.id, engagements);
                      const lastEng = getLastEngagement(engagements, company.id);
                      const record = pipelineState[company.id];

                      return (
                        <div
                          key={company.id}
                          onDragEnd={handleDragEnd}
                          onTouchStart={(e) => handleTouchStart(company.id, e)}
                          onTouchMove={handleTouchMove}
                          onTouchEnd={handleTouchEnd}
                        >
                          <PipelineCard
                            company={company}
                            ratingState={ratingState}
                            daysSince={daysSince}
                            lastChannel={lastEng?.channel || null}
                            dealValue={record?.dealValue}
                            closeDate={record?.closeDate}
                            onOpen={onOpenCompany}
                            onDragStart={handleDragStart}
                            onUpdateDeal={onUpdateDeal}
                          />
                        </div>
                      );
                    })}
                    {stageCompanies.length === 0 && (
                      <div className="text-center py-4 text-xs text-muted-foreground/50">
                        Drop here
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
