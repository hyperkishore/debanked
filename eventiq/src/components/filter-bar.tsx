"use client";

import { FilterType, SortType, ViewType } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Table2, ArrowUpDown, X, Check } from "lucide-react";
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
  { value: "NeedsEmail", label: "Needs Email" },
  { value: "Researched", label: "Researched" },
  { value: "Unresearched", label: "Unresearched" },
  { value: "InHubSpot", label: "In HubSpot" },
  { value: "ActivePipeline", label: "Active Pipeline" },
  { value: "ReadyToSend", label: "Ready to Send" },
];

const sortOptions: { value: SortType; label: string; shortLabel: string }[] = [
  { value: "priority", label: "Priority (highest first)", shortLabel: "Priority" },
  { value: "name", label: "Name (A \u2192 Z)", shortLabel: "Name" },
  { value: "type", label: "Type (SQO \u2192 TAM)", shortLabel: "Type" },
  { value: "phase", label: "Phase", shortLabel: "Phase" },
  { value: "employees", label: "Employees (largest first)", shortLabel: "Employees" },
  { value: "quality", label: "Research quality (best first)", shortLabel: "Quality" },
  { value: "outreach", label: "Outreach score (highest first)", shortLabel: "Outreach" },
  { value: "readiness", label: "Readiness (most ready first)", shortLabel: "Readiness" },
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
  availableTags = [],
  activeTagFilter,
  onTagFilterChange,
}: FilterBarProps) {
  const currentSort = sortOptions.find((s) => s.value === activeSort);

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 border-b border-border">
      {/* Filter pills - mobile only (desktop uses sidebar filters) */}
      <div className="overflow-x-auto scrollbar-none md:hidden">
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
          {metCount > 0 && ` \u00b7 ${metCount} met`}
        </span>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-muted-foreground"
              >
                <ArrowUpDown className="h-3 w-3 mr-0.5" />
                {currentSort?.shortLabel || activeSort}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {sortOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onSortChange(opt.value)}
                  className="text-xs flex items-center justify-between"
                >
                  {opt.label}
                  {activeSort === opt.value && <Check className="h-3 w-3 ml-2 text-brand" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
        </div>
      </div>
    </div>
  );
}
