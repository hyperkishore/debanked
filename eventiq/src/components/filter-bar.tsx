"use client";

import { FilterType, SortType, ViewType } from "@/lib/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutGrid, Table2, ArrowUpDown, X, Check, Filter, Building2 } from "lucide-react";
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
  activeCategoryFilter?: string | null;
  onCategoryFilterChange?: (category: string | null) => void;
  activeHubSpotStageFilter?: string | null;
  onHubSpotStageFilterChange?: (stage: string | null) => void;
  availableHubSpotStages?: string[];
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
  { value: "revenue", label: "Revenue estimate (highest first)", shortLabel: "Revenue" },
];

const categoryOptions: { value: string; label: string }[] = [
  { value: "MCA", label: "MCA" },
  { value: "Equipment Finance", label: "Equipment Finance" },
  { value: "Factoring", label: "Factoring" },
  { value: "SBA Lending", label: "SBA Lending" },
  { value: "Revenue Based", label: "Revenue Based" },
  { value: "Funder", label: "Funder (generic)" },
  { value: "Broker", label: "Broker" },
  { value: "Bank", label: "Bank" },
  { value: "Technology", label: "Technology" },
  { value: "Marketplace", label: "Marketplace" },
  { value: "Service Provider", label: "Service Provider" },
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
  activeCategoryFilter,
  onCategoryFilterChange,
  activeHubSpotStageFilter,
  onHubSpotStageFilterChange,
  availableHubSpotStages = [],
}: FilterBarProps) {
  const currentSort = sortOptions.find((s) => s.value === activeSort);
  const currentCategory = categoryOptions.find((c) => c.value === activeCategoryFilter);
  const hasActiveFilters = activeCategoryFilter || activeHubSpotStageFilter;

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

      {/* Active dimension filters (category + HS stage) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1">
          {activeCategoryFilter && onCategoryFilterChange && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0.5 h-5 cursor-pointer bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 transition-colors"
              onClick={() => onCategoryFilterChange(null)}
            >
              {currentCategory?.label || activeCategoryFilter}
              <X className="h-2.5 w-2.5 ml-0.5" />
            </Badge>
          )}
          {activeHubSpotStageFilter && onHubSpotStageFilterChange && (
            <Badge
              variant="outline"
              className="text-xs px-1.5 py-0.5 h-5 cursor-pointer bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25 transition-colors"
              onClick={() => onHubSpotStageFilterChange(null)}
            >
              HS: {activeHubSpotStageFilter}
              <X className="h-2.5 w-2.5 ml-0.5" />
            </Badge>
          )}
        </div>
      )}

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
      {/* Count + filters + sort + view */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filteredCount} of {totalCount}
          {metCount > 0 && ` \u00b7 ${metCount} met`}
        </span>
        <div className="flex items-center gap-0.5">
          {/* Category filter dropdown */}
          {onCategoryFilterChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 px-1.5 text-xs ${activeCategoryFilter ? "text-emerald-400" : "text-muted-foreground"}`}
                >
                  <Building2 className="h-3 w-3 mr-0.5" />
                  {currentCategory?.label || "Category"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => onCategoryFilterChange(null)}
                  className="text-xs flex items-center justify-between"
                >
                  All Categories
                  {!activeCategoryFilter && <Check className="h-3 w-3 ml-2 text-brand" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {categoryOptions.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => onCategoryFilterChange(opt.value)}
                    className="text-xs flex items-center justify-between"
                  >
                    {opt.label}
                    {activeCategoryFilter === opt.value && <Check className="h-3 w-3 ml-2 text-brand" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* HubSpot stage filter dropdown */}
          {onHubSpotStageFilterChange && availableHubSpotStages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 px-1.5 text-xs ${activeHubSpotStageFilter ? "text-orange-400" : "text-muted-foreground"}`}
                >
                  <Filter className="h-3 w-3 mr-0.5" />
                  {activeHubSpotStageFilter || "HS Stage"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onHubSpotStageFilterChange(null)}
                  className="text-xs flex items-center justify-between"
                >
                  All Stages
                  {!activeHubSpotStageFilter && <Check className="h-3 w-3 ml-2 text-brand" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableHubSpotStages.map((stage) => (
                  <DropdownMenuItem
                    key={stage}
                    onClick={() => onHubSpotStageFilterChange(stage)}
                    className="text-xs flex items-center justify-between"
                  >
                    {stage}
                    {activeHubSpotStageFilter === stage && <Check className="h-3 w-3 ml-2 text-brand" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Sort dropdown */}
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
