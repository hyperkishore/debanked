"use client";

import { Company, FilterType, SortType, ViewType, RatingData } from "@/lib/types";
import { CompanyCard } from "./company-card";
import { CompanyTable } from "./company-table";
import { FilterBar } from "./filter-bar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMemo } from "react";

interface CompanyListProps {
  companies: Company[];
  selectedId: number | null;
  metState: Record<string, boolean>;
  ratingState: Record<string, RatingData>;
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
  searchQuery: string
): Company[] {
  let filtered = companies;

  if (filter === "SQO") filtered = filtered.filter((c) => c.type === "SQO");
  else if (filter === "Client") filtered = filtered.filter((c) => c.type === "Client");
  else if (filter === "ICP") filtered = filtered.filter((c) => c.type === "ICP");
  else if (filter === "Met") filtered = filtered.filter((c) => metState[c.id]);
  else if (filter === "CLEAR") filtered = filtered.filter((c) => c.clear);

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contacts.some((ct) => ct.n.toLowerCase().includes(q)) ||
        (c.leaders || []).some((l) => l.n.toLowerCase().includes(q))
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
        const typeOrder = { SQO: 0, Client: 1, ICP: 2 };
        return typeOrder[a.type] - typeOrder[b.type] || a.priority - b.priority;
      }
      case "priority":
        return a.priority - b.priority || a.phase - b.phase;
      case "phase":
        return a.phase - b.phase || a.priority - b.priority;
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
  const metCount = useMemo(
    () => Object.values(metState).filter(Boolean).length,
    [metState]
  );

  const filtered = useMemo(
    () => filterCompanies(companies, activeFilter, metState, searchQuery),
    [companies, activeFilter, metState, searchQuery]
  );

  const sorted = useMemo(
    () => sortCompanies(filtered, activeSort),
    [filtered, activeSort]
  );

  return (
    <div className="flex flex-col h-full">
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
      <ScrollArea className="flex-1">
        {activeView === "cards" ? (
          <div className="p-2 space-y-1.5">
            {sorted.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                isSelected={selectedId === company.id}
                isMet={!!metState[company.id]}
                rating={ratingState[company.id]?.rating}
                onSelect={onSelect}
                onToggleMet={onToggleMet}
                query={searchQuery}
              />
            ))}
            {sorted.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No companies match your filters
              </div>
            )}
          </div>
        ) : (
          <CompanyTable
            companies={sorted}
            selectedId={selectedId}
            metState={metState}
            ratingState={ratingState}
            onSelect={onSelect}
            onToggleMet={onToggleMet}
          />
        )}
      </ScrollArea>
    </div>
  );
}
