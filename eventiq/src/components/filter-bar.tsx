"use client";

import { FilterType, SortType, ViewType } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { LayoutGrid, Table2, ArrowUpDown } from "lucide-react";

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  activeSort: SortType;
  onSortChange: (sort: SortType) => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  totalCount: number;
  filteredCount: number;
  metCount: number;
}

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "SQO", label: "SQO" },
  { value: "Client", label: "Client" },
  { value: "ICP", label: "ICP" },
  { value: "TAM", label: "TAM" },
  { value: "Met", label: "Met" },
  { value: "CLEAR", label: "CLEAR" },
  { value: "FollowUp", label: "Follow-up" },
  { value: "Researched", label: "Researched" },
  { value: "Unresearched", label: "Unresearched" },
];

export function FilterBar({
  activeFilter,
  onFilterChange,
  activeSort,
  onSortChange,
  activeView,
  onViewChange,
  totalCount,
  filteredCount,
  metCount,
}: FilterBarProps) {
  const sortOptions: { value: SortType; label: string }[] = [
    { value: "priority", label: "Priority" },
    { value: "name", label: "Name" },
    { value: "type", label: "Type" },
    { value: "phase", label: "Phase" },
    { value: "employees", label: "Employees" },
    { value: "quality", label: "Quality" },
  ];

  const currentSortIdx = sortOptions.findIndex((s) => s.value === activeSort);
  const nextSort = sortOptions[(currentSortIdx + 1) % sortOptions.length];

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-border">
      {/* Filter pills - horizontally scrollable */}
      <div className="overflow-x-auto scrollbar-none">
        <ToggleGroup
          type="single"
          value={activeFilter}
          onValueChange={(v) => v && onFilterChange(v as FilterType)}
          className="gap-1 w-max"
        >
          {filters.map((f) => (
            <ToggleGroupItem
              key={f.value}
              value={f.value}
              className="h-6 px-2 text-[11px] data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
            >
              {f.label}
              {f.value === "Met" && metCount > 0 && (
                <span className="ml-1 text-[10px] opacity-60">{metCount}</span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {/* Count + sort + view */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {filteredCount} of {totalCount}
          {metCount > 0 && ` · ${metCount} met`}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[11px] text-muted-foreground"
            onClick={() => onSortChange(nextSort.value)}
            title={`Sort: ${activeSort}`}
          >
            <ArrowUpDown className="h-3 w-3 mr-0.5" />
            {activeSort}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => onViewChange(activeView === "cards" ? "table" : "cards")}
            title={activeView === "cards" ? "Switch to table" : "Switch to cards"}
          >
            {activeView === "cards" ? (
              <Table2 className="h-3.5 w-3.5" />
            ) : (
              <LayoutGrid className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
