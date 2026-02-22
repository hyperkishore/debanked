"use client";

import { useMemo, useCallback } from "react";
import { ResponsiveTreeMapHtml } from "@nivo/treemap";
import { Company } from "@/lib/types";
import {
  TreemapNode,
  buildTreemapHierarchy,
  filterCompaniesForMap,
  MarketMapFilters,
  TYPE_COLORS,
} from "@/lib/market-map-helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MarketMapTreemapProps {
  companies: Company[];
  filters: MarketMapFilters;
  colorBy: "type" | "heat";
  onSelectCompany: (companyId: number) => void;
}

export function MarketMapTreemap({
  companies,
  filters,
  colorBy,
  onSelectCompany,
}: MarketMapTreemapProps) {
  const filteredCompanies = useMemo(
    () => filterCompaniesForMap(companies, filters),
    [companies, filters]
  );

  const hierarchy = useMemo(
    () => buildTreemapHierarchy(filteredCompanies, colorBy),
    [filteredCompanies, colorBy]
  );

  const handleClick = useCallback(
    (node: { data: TreemapNode }) => {
      if (node.data.companyId) {
        onSelectCompany(node.data.companyId);
      }
    },
    [onSelectCompany]
  );

  if (filteredCompanies.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No companies match the current filters
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveTreeMapHtml
        data={hierarchy}
        identity="id"
        value="value"
        tile="squarify"
        leavesOnly={false}
        innerPadding={2}
        outerPadding={4}
        label={(node) => {
          // Only show labels for leaves with enough space
          if (node.width < 60 || node.height < 30) return "";
          return node.data.name || "";
        }}
        labelSkipSize={30}
        labelTextColor={{ from: "color", modifiers: [["brighter", 3]] }}
        parentLabel={(node) => node.data.name || ""}
        parentLabelSize={18}
        parentLabelPosition="top"
        parentLabelPadding={6}
        parentLabelTextColor={{ from: "color", modifiers: [["brighter", 2.5]] }}
        borderWidth={1}
        borderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
        colors={(node) => {
          // Use predefined colors from our hierarchy data
          if (node.data.color) return node.data.color;
          // For group nodes, use type color
          const typeId = node.pathComponents?.[1];
          if (typeId && typeId in TYPE_COLORS) {
            return TYPE_COLORS[typeId as keyof typeof TYPE_COLORS];
          }
          return "hsl(215, 15%, 40%)";
        }}
        nodeOpacity={0.85}
        animate={false}
        isInteractive={true}
        onClick={handleClick}
        tooltip={({ node }) => {
          const data = node.data as TreemapNode;
          if (!data.companyId) {
            return (
              <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs">
                <strong>{data.name}</strong>
                {node.value && (
                  <span className="text-muted-foreground ml-2">
                    {node.value.toLocaleString()} employees total
                  </span>
                )}
              </div>
            );
          }
          return (
            <div className="bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs max-w-[240px]">
              <div className="font-semibold">{data.name}</div>
              <div className="text-muted-foreground mt-0.5">
                {data.companyType} &middot; {data.subVertical}
              </div>
              {data.employees && (
                <div className="text-muted-foreground">
                  {data.employees.toLocaleString()} employees
                </div>
              )}
            </div>
          );
        }}
        theme={{
          labels: {
            text: {
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-geist-sans), sans-serif",
            },
          },
        }}
      />
    </div>
  );
}
