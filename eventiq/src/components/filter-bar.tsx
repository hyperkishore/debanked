"use client";

import { FilterType, SortType, ViewType } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Table2, ArrowUpDown, Download, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  onExportCsv?: () => void;
  availableTags?: string[];
  activeTagFilter?: string | null;
  onTagFilterChange?: (tag: string | null) => void;
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
  onExportCsv,
  availableTags = [],
  activeTagFilter,
  onTagFilterChange,
}: FilterBarProps) {
  const sortOptions: { value: SortType; label: string }[] = [
    { value: "priority", label: "Priority" },
    { value: "name", label: "Name" },
    { value: "type", label: "Type" },
    { value: "phase", label: "Phase" },
    { value: "employees", label: "Employees" },
    { value: "quality", label: "Quality" },
    { value: "outreach", label: "Outreach" },
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
              className="h-6 px-2 text-xs data-[state=on]:bg-brand/20 data-[state=on]:text-brand"
            >
              {f.label}
              {f.value === "Met" && metCount > 0 && (
                <span className="ml-1 text-xs opacity-60">{metCount}</span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {/* Tag filter pills */}
      {availableTags.length > 0 && onTagFilterChange && (
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-1 w-max">
            {activeTagFilter && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0.5 h-5 cursor-pointer bg-brand/15 text-brand border-brand/30 hover:bg-brand/25 transition-colors"
                onClick={() => onTagFilterChange(null)}
              >
                {activeTagFilter}
                <X className="h-2.5 w-2.5 ml-0.5" />
              </Badge>
            )}
            {availableTags
              .filter((t) => t !== activeTagFilter)
              .map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 h-5 cursor-pointer text-muted-foreground hover:text-brand hover:border-brand/30 transition-colors"
                  onClick={() => onTagFilterChange(tag)}
                >
                  {tag}
                </Badge>
              ))}
          </div>
        </div>
      )}
      {/* Count + sort + view */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredCount} of {totalCount}
          {metCount > 0 && ` · ${metCount} met`}
        </span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
                onClick={() => onSortChange(nextSort.value)}
              >
                <ArrowUpDown className="h-3 w-3 mr-0.5" />
                {activeSort}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{`Sort: ${activeSort}`}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onViewChange(activeView === "cards" ? "table" : "cards")}
              >
                {activeView === "cards" ? (
                  <Table2 className="h-3.5 w-3.5" />
                ) : (
                  <LayoutGrid className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{activeView === "cards" ? "Switch to table" : "Switch to cards"}</TooltipContent>
          </Tooltip>
          {onExportCsv && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onExportCsv}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export filtered list as CSV</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
