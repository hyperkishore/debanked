"use client";

import { useState, useMemo } from "react";
import { Company } from "@/lib/types";
import {
  MarketMapFilters,
  DEFAULT_FILTERS,
  filterCompaniesForMap,
  getSubVerticals,
} from "@/lib/market-map-helpers";
import { MarketMapTreemap } from "@/components/market-map-treemap";
import { MarketMapFiltersBar } from "@/components/market-map-filters";

interface MarketMapTabProps {
  companies: Company[];
  onSelectCompany: (id: number) => void;
}

export function MarketMapTab({ companies, onSelectCompany }: MarketMapTabProps) {
  const [filters, setFilters] = useState<MarketMapFilters>(DEFAULT_FILTERS);
  const [colorBy, setColorBy] = useState<"type" | "heat">("type");

  const filteredCompanies = useMemo(
    () => filterCompaniesForMap(companies, filters),
    [companies, filters]
  );

  const availableSubVerticals = useMemo(
    () => getSubVerticals(companies),
    [companies]
  );

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
      />
      <div className="flex-1 min-h-0">
        <MarketMapTreemap
          companies={companies}
          filters={filters}
          colorBy={colorBy}
          onSelectCompany={onSelectCompany}
        />
      </div>
    </div>
  );
}
