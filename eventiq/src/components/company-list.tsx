"use client";

import { Company, FilterType, SortType, ViewType, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched, getResearchScore } from "@/lib/types";
import { getLastEngagement, needsFollowUp } from "@/lib/engagement-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { computeOutreachScore, getNextBestAction, getUrgencyTier } from "@/lib/outreach-score";
import { CompanyCard } from "./company-card";
import { CompanyTable } from "./company-table";
import { FilterBar } from "./filter-bar";
import { TodayActions } from "./today-actions";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { useMemo, useRef, useEffect, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";

interface CompanyListProps {
  companies: Company[];
  selectedId: number | null;
  metState: Record<string, boolean>;
  ratingState: Record<string, RatingData>;
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  activeFilter: FilterType;
  activeSort: SortType;
  activeView: ViewType;
  searchQuery: string;
  onSelect: (id: number) => void;
  onToggleMet: (id: number) => void;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onViewChange: (view: ViewType) => void;
  followUps?: FollowUpReminder[];
  onSnooze?: (id: string, newDate: string) => void;
  onCompleteFollowUp?: (id: string) => void;
  onQuickLog?: (companyId: number) => void;
}

function filterCompanies(
  companies: Company[],
  filter: FilterType,
  metState: Record<string, boolean>,
  searchQuery: string,
  engagements: EngagementEntry[]
): Company[] {
  let filtered = companies;

  if (filter === "SQO") filtered = filtered.filter((c) => c.type === "SQO");
  else if (filter === "Client") filtered = filtered.filter((c) => c.type === "Client");
  else if (filter === "ICP") filtered = filtered.filter((c) => c.type === "ICP");
  else if (filter === "TAM") filtered = filtered.filter((c) => c.type === "TAM");
  else if (filter === "Met") filtered = filtered.filter((c) => metState[c.id]);
  else if (filter === "CLEAR") filtered = filtered.filter((c) => c.clear);
  else if (filter === "FollowUp") filtered = filtered.filter((c) => metState[c.id] && needsFollowUp(engagements, c.id));
  else if (filter === "Researched") filtered = filtered.filter((c) => isResearched(c));
  else if (filter === "Unresearched") filtered = filtered.filter((c) => !isResearched(c));

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contacts.some((ct) => ct.n.toLowerCase().includes(q)) ||
        (c.leaders || []).some((l) => l.n.toLowerCase().includes(q)) ||
        (c.location || "").toLowerCase().includes(q)
    );
  }

  return filtered;
}

function sortCompanies(
  companies: Company[],
  sort: SortType,
  outreachScores?: Map<number, number>
): Company[] {
  return [...companies].sort((a, b) => {
    switch (sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "type": {
        const typeOrder: Record<string, number> = { SQO: 0, Client: 1, ICP: 2, TAM: 3 };
        return (typeOrder[a.type] ?? 4) - (typeOrder[b.type] ?? 4) || a.priority - b.priority;
      }
      case "priority":
        return a.priority - b.priority || a.phase - b.phase;
      case "phase":
        return a.phase - b.phase || a.priority - b.priority;
      case "employees":
        return (b.employees || 0) - (a.employees || 0);
      case "quality":
        return getResearchScore(b) - getResearchScore(a);
      case "outreach": {
        const scoreA = outreachScores?.get(a.id) ?? 0;
        const scoreB = outreachScores?.get(b.id) ?? 0;
        return scoreB - scoreA;
      }
      default:
        return 0;
    }
  });
}

export function CompanyList({
  companies,
  selectedId,
  metState,
  ratingState,
  engagements,
  pipelineState,
  activeFilter,
  activeSort,
  activeView,
  searchQuery,
  onSelect,
  onToggleMet,
  onFilterChange,
  onSortChange,
  onViewChange,
  followUps,
  onSnooze,
  onCompleteFollowUp,
  onQuickLog,
}: CompanyListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const metCount = useMemo(
    () => Object.values(metState).filter(Boolean).length,
    [metState]
  );

  const filtered = useMemo(
    () => filterCompanies(companies, activeFilter, metState, searchQuery, engagements),
    [companies, activeFilter, metState, searchQuery, engagements]
  );

  // Compute outreach scores (only when sorting by outreach or always for badge display)
  const outreachData = useMemo(() => {
    const scores = new Map<number, number>();
    const actions = new Map<number, string>();
    const tiers = new Map<number, string>();
    for (const c of filtered) {
      const breakdown = computeOutreachScore(c, engagements, pipelineState, metState);
      scores.set(c.id, breakdown.total);
      actions.set(c.id, getNextBestAction(c, engagements, pipelineState));
      tiers.set(c.id, getUrgencyTier(breakdown.total));
    }
    return { scores, actions, tiers };
  }, [filtered, engagements, pipelineState, metState]);

  const sorted = useMemo(
    () => sortCompanies(filtered, activeSort, outreachData.scores),
    [filtered, activeSort, outreachData.scores]
  );

  // Active follow-ups for TodayActions
  const activeFollowUps = useMemo(() => {
    if (!followUps) return [];
    return followUps.filter((f) => !f.completed);
  }, [followUps]);

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140,
    overscan: 5,
  });

  // Scroll to selected item when selectedId changes
  useEffect(() => {
    if (selectedId !== null && activeView === "cards") {
      const idx = sorted.findIndex((c) => c.id === selectedId);
      if (idx >= 0) {
        virtualizer.scrollToIndex(idx, { align: "auto" });
      }
    }
  }, [selectedId, sorted, activeView, virtualizer]);

  const showOutreachBadges = activeSort === "outreach";

  const handleExportCsv = useCallback(() => {
    const headers = ["Name", "Type", "Priority", "Employees", "Location", "Website", "LinkedIn", "Contacts", "Leaders", "Leader LinkedIn URLs", "Score"];
    const rows = sorted.map((c) => {
      const contacts = c.contacts.map((ct) => `${ct.n} (${ct.t})`).join("; ");
      const leaders = (c.leaders || []).map((l) => `${l.n} (${l.t})`).join("; ");
      const leaderLinkedIns = (c.leaders || []).filter((l) => l.li).map((l) => `${l.n}: ${l.li}`).join("; ");
      const score = outreachData.scores.get(c.id) || 0;
      return [c.name, c.type, c.priority, c.employees || "", c.location || "", c.website || "", c.linkedinUrl || "", contacts, leaders, leaderLinkedIns, score];
    });
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eventiq-${activeFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sorted.length} companies`);
  }, [sorted, activeFilter, outreachData.scores]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Today's Actions */}
      <TodayActions
        followUps={activeFollowUps}
        companies={companies}
        engagements={engagements}
        pipelineState={pipelineState}
        metState={metState}
        onSnooze={onSnooze || (() => {})}
        onComplete={onCompleteFollowUp || (() => {})}
        onLogEngagement={onQuickLog || (() => {})}
        onSelectCompany={onSelect}
      />
      <FilterBar
        activeFilter={activeFilter}
        onFilterChange={onFilterChange}
        activeSort={activeSort}
        onSortChange={onSortChange}
        activeView={activeView}
        onViewChange={onViewChange}
        totalCount={companies.length}
        filteredCount={sorted.length}
        metCount={metCount}
        onExportCsv={handleExportCsv}
      />
      {activeView === "cards" ? (
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const company = sorted[virtualRow.index];
              return (
                <div
                  key={company.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="px-2 py-0.5"
                >
                  <CompanyCard
                    company={company}
                    isSelected={selectedId === company.id}
                    isMet={!!metState[company.id]}
                    rating={ratingState[company.id]?.rating}
                    lastEngagementTime={getLastEngagement(engagements, company.id)?.timestamp ?? null}
                    onSelect={onSelect}
                    onToggleMet={onToggleMet}
                    query={searchQuery}
                    outreachScore={showOutreachBadges ? outreachData.scores.get(company.id) : undefined}
                    urgencyTier={showOutreachBadges ? (outreachData.tiers.get(company.id) as "critical" | "high" | "medium" | "low") : undefined}
                    nextBestAction={showOutreachBadges ? outreachData.actions.get(company.id) : undefined}
                  />
                </div>
              );
            })}
          </div>
          {sorted.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No companies match your filters
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <CompanyTable
            companies={sorted}
            selectedId={selectedId}
            metState={metState}
            ratingState={ratingState}
            onSelect={onSelect}
            onToggleMet={onToggleMet}
          />
        </div>
      )}
    </div>
  );
}
