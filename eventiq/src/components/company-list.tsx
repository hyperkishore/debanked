"use client";

import { Company, FilterType, SortType, ViewType, RatingData, EngagementEntry } from "@/lib/types";
import { isResearched } from "@/lib/types";
import { getLastEngagement, needsFollowUp } from "@/lib/engagement-helpers";
import { CompanyCard } from "./company-card";
import { CompanyTable } from "./company-table";
import { FilterBar } from "./filter-bar";
import { useMemo, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface CompanyListProps {
  companies: Company[];
  selectedId: number | null;
  metState: Record<string, boolean>;
  ratingState: Record<string, RatingData>;
  engagements: EngagementEntry[];
  activeFilter: FilterType;
  activeSort: SortType;
  activeView: ViewType;
  searchQuery: string;
  onSelect: (id: number) => void;
  onToggleMet: (id: number) => void;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onViewChange: (view: ViewType) => void;
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

function sortCompanies(companies: Company[], sort: SortType): Company[] {
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
  activeFilter,
  activeSort,
  activeView,
  searchQuery,
  onSelect,
  onToggleMet,
  onFilterChange,
  onSortChange,
  onViewChange,
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

  const sorted = useMemo(
    () => sortCompanies(filtered, activeSort),
    [filtered, activeSort]
  );

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
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

  return (
    <div className="flex flex-col h-full min-h-0">
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
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
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
