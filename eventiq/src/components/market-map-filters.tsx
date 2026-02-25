"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CompanyType } from "@/lib/types";
import { MetricSortKey } from "@/lib/company-metrics";
import {
  MarketMapFilters,
  HeatLevel,
  SubVertical,
} from "@/lib/market-map-helpers";
import { MapViewMode } from "@/components/market-map-tab";
import {
  Flame,
  Thermometer,
  Snowflake,
  Palette,
  Activity,
  Crosshair,
  LayoutGrid,
  TreePine,
  Radio,
} from "lucide-react";

interface MarketMapFiltersBarProps {
  filters: MarketMapFilters;
  onFiltersChange: (filters: MarketMapFilters) => void;
  colorBy: "type" | "heat";
  onColorByChange: (colorBy: "type" | "heat") => void;
  availableSubVerticals: SubVertical[];
  totalCount: number;
  filteredCount: number;
  viewMode?: MapViewMode;
  onViewModeChange?: (mode: MapViewMode) => void;
  xAxis?: MetricSortKey;
  yAxis?: MetricSortKey;
  onXAxisChange?: (key: MetricSortKey) => void;
  onYAxisChange?: (key: MetricSortKey) => void;
  showSignalHeat?: boolean;
  onShowSignalHeatChange?: (show: boolean) => void;
}

const typeLabels: Record<CompanyType, { label: string; color: string }> = {
  SQO: { label: "SQO", color: "var(--sqo)" },
  Client: { label: "Client", color: "var(--client)" },
  ICP: { label: "ICP", color: "var(--icp)" },
  TAM: { label: "TAM", color: "hsl(215, 15%, 50%)" },
};

const heatLabels: Record<HeatLevel, { label: string; icon: typeof Flame }> = {
  hot: { label: "Hot", icon: Flame },
  warm: { label: "Warm", icon: Thermometer },
  cool: { label: "Cool", icon: Snowflake },
};

const AXIS_OPTIONS: { key: MetricSortKey; label: string }[] = [
  { key: "fit", label: "Fit" },
  { key: "intent", label: "Intent" },
  { key: "access", label: "Access" },
  { key: "timing", label: "Timing" },
  { key: "composite", label: "Composite" },
];

export function MarketMapFiltersBar({
  filters,
  onFiltersChange,
  colorBy,
  onColorByChange,
  availableSubVerticals,
  totalCount,
  filteredCount,
  viewMode = "quadrant",
  onViewModeChange,
  xAxis = "fit",
  yAxis = "intent",
  onXAxisChange,
  onYAxisChange,
  showSignalHeat,
  onShowSignalHeatChange,
}: MarketMapFiltersBarProps) {
  const toggleType = (type: CompanyType) => {
    const types = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ ...filters, types: types.length > 0 ? types : [type] });
  };

  const toggleHeat = (heat: HeatLevel) => {
    const levels = filters.heatLevels.includes(heat)
      ? filters.heatLevels.filter((h) => h !== heat)
      : [...filters.heatLevels, heat];
    onFiltersChange({
      ...filters,
      heatLevels: levels.length > 0 ? levels : [heat],
    });
  };

  const toggleSubVertical = (sv: SubVertical) => {
    const subs = filters.subVerticals.includes(sv)
      ? filters.subVerticals.filter((s) => s !== sv)
      : [...filters.subVerticals, sv];
    onFiltersChange({ ...filters, subVerticals: subs });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 border-b border-border bg-card/50">
      {/* View mode toggle */}
      {onViewModeChange && (
        <>
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(val) => {
              if (val) onViewModeChange(val as MapViewMode);
            }}
            className="gap-0"
          >
            <ToggleGroupItem value="quadrant" className="h-7 px-2 text-xs gap-1">
              <Crosshair className="h-3 w-3" />
              Quadrant
            </ToggleGroupItem>
            <ToggleGroupItem value="cards" className="h-7 px-2 text-xs gap-1">
              <LayoutGrid className="h-3 w-3" />
              Cards
            </ToggleGroupItem>
            <ToggleGroupItem value="treemap" className="h-7 px-2 text-xs gap-1">
              <TreePine className="h-3 w-3" />
              Treemap
            </ToggleGroupItem>
          </ToggleGroup>
          <div className="w-px h-5 bg-border" />
        </>
      )}

      {/* Type filters */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Type:</span>
        {(Object.keys(typeLabels) as CompanyType[]).map((type) => (
          <Button
            key={type}
            variant={filters.types.includes(type) ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            style={
              filters.types.includes(type)
                ? { backgroundColor: typeLabels[type].color, color: "white" }
                : undefined
            }
            onClick={() => toggleType(type)}
          >
            {typeLabels[type].label}
          </Button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Heat filters */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium">Heat:</span>
        {(Object.keys(heatLabels) as HeatLevel[]).map((heat) => {
          const { label, icon: Icon } = heatLabels[heat];
          return (
            <Button
              key={heat}
              variant={filters.heatLevels.includes(heat) ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => toggleHeat(heat)}
            >
              <Icon className="h-3 w-3" />
              {label}
            </Button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-border" />

      {/* Color by toggle — only for treemap view */}
      {viewMode === "treemap" && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Color:</span>
          <ToggleGroup
            type="single"
            value={colorBy}
            onValueChange={(val) => {
              if (val) onColorByChange(val as "type" | "heat");
            }}
            className="gap-0"
          >
            <ToggleGroupItem value="type" className="h-7 px-2 text-xs gap-1">
              <Palette className="h-3 w-3" />
              Type
            </ToggleGroupItem>
            <ToggleGroupItem value="heat" className="h-7 px-2 text-xs gap-1">
              <Activity className="h-3 w-3" />
              Heat
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}

      {/* Signal heatmap toggle */}
      {onShowSignalHeatChange && (
        <>
          <div className="w-px h-5 bg-border" />
          <Button
            variant={showSignalHeat ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => onShowSignalHeatChange(!showSignalHeat)}
          >
            <Radio className="h-3 w-3" />
            Signals
          </Button>
        </>
      )}

      {/* Axis selectors — only for quadrant view */}
      {viewMode === "quadrant" && onXAxisChange && onYAxisChange && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">X:</span>
          <ToggleGroup
            type="single"
            value={xAxis}
            onValueChange={(val) => {
              if (val) onXAxisChange(val as MetricSortKey);
            }}
            className="gap-0"
          >
            {AXIS_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.key} value={opt.key} className="h-6 px-1.5 text-[10px]">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <span className="text-xs text-muted-foreground font-medium ml-1">Y:</span>
          <ToggleGroup
            type="single"
            value={yAxis}
            onValueChange={(val) => {
              if (val) onYAxisChange(val as MetricSortKey);
            }}
            className="gap-0"
          >
            {AXIS_OPTIONS.map((opt) => (
              <ToggleGroupItem key={opt.key} value={opt.key} className="h-6 px-1.5 text-[10px]">
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Count */}
      <span className="text-xs text-muted-foreground">
        {filteredCount === totalCount
          ? `${totalCount} companies`
          : `${filteredCount}/${totalCount} companies`}
      </span>

      {/* Sub-vertical pills (second row if any) */}
      {availableSubVerticals.length > 0 && (
        <div className="w-full flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted-foreground font-medium">
            Vertical:
          </span>
          {availableSubVerticals.map((sv) => (
            <Badge
              key={sv}
              variant={filters.subVerticals.includes(sv) ? "default" : "outline"}
              className="cursor-pointer text-xs h-6"
              onClick={() => toggleSubVertical(sv)}
            >
              {sv}
            </Badge>
          ))}
          {filters.subVerticals.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() =>
                onFiltersChange({ ...filters, subVerticals: [] })
              }
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
