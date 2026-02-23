"use client";

import { useMemo, useState } from "react";
import { Company, CompanyMetrics } from "@/lib/types";
import { computeCompanyMetrics, MetricSortKey } from "@/lib/company-metrics";
import { TYPE_COLORS } from "@/lib/market-map-helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface QuadrantProps {
  companies: Company[];
  xAxis: MetricSortKey;
  yAxis: MetricSortKey;
  onSelectCompany: (id: number) => void;
}

const AXIS_LABELS: Record<MetricSortKey, string> = {
  fit: "Fit Score",
  intent: "Intent Score",
  access: "Access Score",
  timing: "Timing Score",
  composite: "Composite Score",
};

function getMetricValue(m: CompanyMetrics, key: MetricSortKey): number {
  switch (key) {
    case "fit": return m.fitScore;
    case "intent": return m.intentScore;
    case "access": return m.accessScore;
    case "timing": return m.timingScore;
    case "composite": return m.composite;
  }
}

const OUTREACH_RING_COLORS: Record<string, string> = {
  engaged: "#22c55e",
  contacted: "#3b82f6",
  responded: "#f97316",
};

export function MarketMapQuadrant({
  companies,
  xAxis,
  yAxis,
  onSelectCompany,
}: QuadrantProps) {
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Padding for the SVG chart area
  const PADDING = { top: 28, right: 20, bottom: 40, left: 48 };

  const points = useMemo(() => {
    return companies.map((c) => {
      const metrics = computeCompanyMetrics(c);
      const x = getMetricValue(metrics, xAxis);
      const y = getMetricValue(metrics, yAxis);
      const employees = c.employees || 1;
      const radius = Math.max(4, Math.min(16, Math.sqrt(employees) * 0.5));
      const outreachStatus = c.outreachHistory?.status;

      return {
        company: c,
        x,
        y,
        radius,
        color: TYPE_COLORS[c.type] || "hsl(215, 15%, 50%)",
        ringColor: outreachStatus ? OUTREACH_RING_COLORS[outreachStatus] : undefined,
        metrics,
      };
    });
  }, [companies, xAxis, yAxis]);

  // Quadrant labels
  const quadrants = [
    { label: "Priority", x: 75, y: 25 },
    { label: "Nurture", x: 25, y: 25 },
    { label: "Monitor", x: 75, y: 75 },
    { label: "Deprioritize", x: 25, y: 75 },
  ];

  return (
    <div className="w-full h-full relative">
      <svg
        className="w-full h-full"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background quadrants */}
        <rect x={PADDING.left} y={PADDING.top} width={(600 - PADDING.left - PADDING.right) / 2} height={(400 - PADDING.top - PADDING.bottom) / 2} fill="hsl(215, 15%, 12%)" opacity={0.3} />
        <rect x={PADDING.left + (600 - PADDING.left - PADDING.right) / 2} y={PADDING.top} width={(600 - PADDING.left - PADDING.right) / 2} height={(400 - PADDING.top - PADDING.bottom) / 2} fill="hsl(142, 30%, 12%)" opacity={0.3} />
        <rect x={PADDING.left} y={PADDING.top + (400 - PADDING.top - PADDING.bottom) / 2} width={(600 - PADDING.left - PADDING.right) / 2} height={(400 - PADDING.top - PADDING.bottom) / 2} fill="hsl(0, 20%, 12%)" opacity={0.3} />
        <rect x={PADDING.left + (600 - PADDING.left - PADDING.right) / 2} y={PADDING.top + (400 - PADDING.top - PADDING.bottom) / 2} width={(600 - PADDING.left - PADDING.right) / 2} height={(400 - PADDING.top - PADDING.bottom) / 2} fill="hsl(215, 15%, 10%)" opacity={0.3} />

        {/* Quadrant divider lines */}
        <line
          x1={PADDING.left + (600 - PADDING.left - PADDING.right) / 2}
          y1={PADDING.top}
          x2={PADDING.left + (600 - PADDING.left - PADDING.right) / 2}
          y2={400 - PADDING.bottom}
          stroke="hsl(215, 15%, 30%)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          y1={PADDING.top + (400 - PADDING.top - PADDING.bottom) / 2}
          x2={600 - PADDING.right}
          y2={PADDING.top + (400 - PADDING.top - PADDING.bottom) / 2}
          stroke="hsl(215, 15%, 30%)"
          strokeDasharray="4 4"
          strokeWidth={1}
        />

        {/* Quadrant labels */}
        {quadrants.map((q) => {
          const chartW = 600 - PADDING.left - PADDING.right;
          const chartH = 400 - PADDING.top - PADDING.bottom;
          const px = PADDING.left + (q.x / 100) * chartW;
          const py = PADDING.top + (q.y / 100) * chartH;
          return (
            <text
              key={q.label}
              x={px}
              y={py}
              textAnchor="middle"
              fill="hsl(215, 15%, 35%)"
              fontSize={13}
              fontWeight={600}
            >
              {q.label}
            </text>
          );
        })}

        {/* Axis labels */}
        <text
          x={300}
          y={400 - 6}
          textAnchor="middle"
          fill="hsl(215, 15%, 50%)"
          fontSize={11}
        >
          {AXIS_LABELS[xAxis]} →
        </text>
        <text
          x={12}
          y={200}
          textAnchor="middle"
          fill="hsl(215, 15%, 50%)"
          fontSize={11}
          transform="rotate(-90, 12, 200)"
        >
          {AXIS_LABELS[yAxis]} →
        </text>

        {/* Scale labels */}
        <text x={PADDING.left} y={400 - 26} fill="hsl(215, 15%, 40%)" fontSize={9}>0</text>
        <text x={600 - PADDING.right} y={400 - 26} fill="hsl(215, 15%, 40%)" fontSize={9} textAnchor="end">100</text>
        <text x={PADDING.left - 4} y={400 - PADDING.bottom} fill="hsl(215, 15%, 40%)" fontSize={9} textAnchor="end">0</text>
        <text x={PADDING.left - 4} y={PADDING.top + 4} fill="hsl(215, 15%, 40%)" fontSize={9} textAnchor="end">100</text>

        {/* Data points */}
        {points.map((pt) => {
          const chartW = 600 - PADDING.left - PADDING.right;
          const chartH = 400 - PADDING.top - PADDING.bottom;
          const cx = PADDING.left + (pt.x / 100) * chartW;
          const cy = 400 - PADDING.bottom - (pt.y / 100) * chartH;
          const isHovered = hoveredId === pt.company.id;

          return (
            <g
              key={pt.company.id}
              onClick={() => onSelectCompany(pt.company.id)}
              onMouseEnter={() => setHoveredId(pt.company.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="cursor-pointer"
            >
              {/* Outreach ring */}
              {pt.ringColor && (
                <circle
                  cx={cx}
                  cy={cy}
                  r={pt.radius + 3}
                  fill="none"
                  stroke={pt.ringColor}
                  strokeWidth={2}
                  opacity={isHovered ? 1 : 0.7}
                />
              )}
              {/* Dot */}
              <circle
                cx={cx}
                cy={cy}
                r={isHovered ? pt.radius + 1 : pt.radius}
                fill={pt.color}
                opacity={isHovered ? 1 : 0.75}
                stroke={isHovered ? "white" : "none"}
                strokeWidth={isHovered ? 1.5 : 0}
              />
              {/* Label for hovered */}
              {isHovered && (
                <text
                  x={cx}
                  y={cy - pt.radius - 6}
                  textAnchor="middle"
                  fill="white"
                  fontSize={10}
                  fontWeight={600}
                >
                  {pt.company.name}
                </text>
              )}
            </g>
          );
        })}

        {/* Border */}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={600 - PADDING.left - PADDING.right}
          height={400 - PADDING.top - PADDING.bottom}
          fill="none"
          stroke="hsl(215, 15%, 25%)"
          strokeWidth={1}
        />
      </svg>

      {/* Tooltip overlay */}
      {hoveredId && (() => {
        const pt = points.find((p) => p.company.id === hoveredId);
        if (!pt) return null;
        return (
          <div className="absolute top-2 right-2 bg-card border border-border rounded-md px-3 py-2 shadow-lg text-xs max-w-[200px] pointer-events-none">
            <div className="font-semibold">{pt.company.name}</div>
            <div className="text-muted-foreground">{pt.company.type}</div>
            <div className="mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Fit</span>
                <span className="font-mono">{pt.metrics.fitScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Intent</span>
                <span className="font-mono">{pt.metrics.intentScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Access</span>
                <span className="font-mono">{pt.metrics.accessScore}</span>
              </div>
              <div className="flex justify-between">
                <span>Timing</span>
                <span className="font-mono">{pt.metrics.timingScore}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-0.5 mt-0.5">
                <span>Composite</span>
                <span className="font-mono">{pt.metrics.composite}</span>
              </div>
            </div>
            {pt.company.outreachHistory && pt.company.outreachHistory.status !== "no_history" && (
              <div className="mt-1 text-muted-foreground">
                Outreach: {pt.company.outreachHistory.status}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
