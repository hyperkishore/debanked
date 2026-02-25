"use client";

import { useState, useMemo } from "react";
import { Company } from "@/lib/types";
import { MetricSortKey } from "@/lib/company-metrics";
import {
  MarketMapFilters,
  DEFAULT_FILTERS,
  filterCompaniesForMap,
  getSubVerticals,
} from "@/lib/market-map-helpers";
import { computeSignalHeatmap } from "@/lib/signal-heatmap-helpers";
import { buildFeedItems } from "@/lib/feed-helpers";
import { MarketMapTreemap } from "@/components/market-map-treemap";
import { MarketMapQuadrant } from "@/components/market-map-quadrant";
import { MarketMapCards } from "@/components/market-map-cards";
import { MarketMapFiltersBar } from "@/components/market-map-filters";

export type MapViewMode = "quadrant" | "cards" | "treemap";

interface MarketMapTabProps {
  companies: Company[];
  onSelectCompany: (id: number) => void;
}

export function MarketMapTab({ companies, onSelectCompany }: MarketMapTabProps) {
  const [filters, setFilters] = useState<MarketMapFilters>(DEFAULT_FILTERS);
  const [colorBy, setColorBy] = useState<"type" | "heat">("type");
  const [viewMode, setViewMode] = useState<MapViewMode>("quadrant");
  const [xAxis, setXAxis] = useState<MetricSortKey>("fit");
  const [yAxis, setYAxis] = useState<MetricSortKey>("intent");
  const [cardSortBy, setCardSortBy] = useState<MetricSortKey>("composite");
  const [showSignalHeat, setShowSignalHeat] = useState(false);

  const filteredCompanies = useMemo(
    () => filterCompaniesForMap(companies, filters),
    [companies, filters]
  );

  const availableSubVerticals = useMemo(
    () => getSubVerticals(companies),
    [companies]
  );

  const signalHeatmap = useMemo(() => {
    if (!showSignalHeat) return undefined;
    const feedItems = buildFeedItems(companies);
    return computeSignalHeatmap(companies, feedItems);
  }, [companies, showSignalHeat]);

  return (
    <div className="flex flex-col h-full">
      <MarketMapFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        colorBy={colorBy}
        onColorByChange={setColorBy}
        availableSubVerticals={availableSubVerticals}
        totalCount={companies.length}
        filteredCount={filteredCompanies.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        xAxis={xAxis}
        yAxis={yAxis}
        onXAxisChange={setXAxis}
        onYAxisChange={setYAxis}
        showSignalHeat={showSignalHeat}
        onShowSignalHeatChange={setShowSignalHeat}
      />
      <div className="flex-1 min-h-0">
        {viewMode === "quadrant" ? (
          <MarketMapQuadrant
            companies={filteredCompanies}
            xAxis={xAxis}
            yAxis={yAxis}
            onSelectCompany={onSelectCompany}
            signalHeatmap={signalHeatmap}
          />
        ) : viewMode === "cards" ? (
          <MarketMapCards
            companies={filteredCompanies}
            sortBy={cardSortBy}
            onSortByChange={setCardSortBy}
            onSelectCompany={onSelectCompany}
          />
        ) : (
          <MarketMapTreemap
            companies={companies}
            filters={filters}
            colorBy={colorBy}
            onSelectCompany={onSelectCompany}
          />
        )}
      </div>
    </div>
  );
}
