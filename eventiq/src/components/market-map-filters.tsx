"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CompanyType } from "@/lib/types";
import {
  MarketMapFilters,
  HeatLevel,
  SubVertical,
} from "@/lib/market-map-helpers";
import { Flame, Thermometer, Snowflake, Palette, Activity } from "lucide-react";

interface MarketMapFiltersBarProps {
  filters: MarketMapFilters;
  onFiltersChange: (filters: MarketMapFilters) => void;
  colorBy: "type" | "heat";
  onColorByChange: (colorBy: "type" | "heat") => void;
  availableSubVerticals: SubVertical[];
  totalCount: number;
  filteredCount: number;
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

export function MarketMapFiltersBar({
  filters,
  onFiltersChange,
  colorBy,
  onColorByChange,
  availableSubVerticals,
  totalCount,
  filteredCount,
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

      {/* Color by toggle */}
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
