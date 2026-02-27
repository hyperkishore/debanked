"use client";

import { Company, CompanyCategory, OutreachStatus, inferSubVertical } from "@/lib/types";
import { UrgencyTier } from "@/lib/outreach-score";
import { ReadinessLabel, getReadinessColor, getReadinessBgColor } from "@/lib/readiness-score";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { parseDateFromNews } from "@/lib/feed-helpers";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEngagementTime } from "@/lib/engagement-helpers";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Tag } from "lucide-react";

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  lastEngagementTime?: string | null;
  onSelect: (id: number) => void;
  query?: string;
  outreachScore?: number;
  urgencyTier?: UrgencyTier;
  nextBestAction?: string;
  tags?: string[];
  readinessScore?: number;
  readinessLabel?: ReadinessLabel;
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-brand/30 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const categoryBadgeMap: Record<CompanyCategory, { label: string; className: string }> = {
  funder: { label: "Funder", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  broker: { label: "Broker", className: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  bank: { label: "Bank", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  technology: { label: "Technology", className: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  marketplace: { label: "Marketplace", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  service_provider: { label: "Service", className: "bg-pink-500/10 text-pink-400 border-pink-500/30" },
};

const subVerticalBadgeColors: Record<string, string> = {
  MCA: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "Equipment Finance": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Factoring: "bg-teal-500/10 text-teal-400 border-teal-500/30",
  "SBA Lending": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "Revenue Based": "bg-lime-500/10 text-lime-400 border-lime-500/30",
  Funder: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Broker: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Bank: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Technology: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  Marketplace: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  "Service Provider": "bg-pink-500/10 text-pink-400 border-pink-500/30",
};

function formatRevenue(value: number): string {
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

function getResearchFreshness(company: Company): string | null {
  if (!company.news || company.news.length === 0) return null;
  const timestamps = company.news.map((n) => parseDateFromNews(n)).filter((t) => t > 0);
  if (timestamps.length === 0) return null;
  const newest = Math.max(...timestamps);
  const now = Date.now();
  const diffMs = now - newest;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return "1y+";
}

const typeBadgeMap: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/10 text-[var(--sqo)] hover:bg-[var(--sqo)]/20",
  Client: "bg-[var(--client)]/10 text-[var(--client)] hover:bg-[var(--client)]/20",
  ICP: "bg-[var(--icp)]/10 text-[var(--icp)] hover:bg-[var(--icp)]/20",
  TAM: "bg-[var(--tam)]/10 text-[var(--tam)] hover:bg-[var(--tam)]/20",
};

const urgencyBadgeStyles: Record<UrgencyTier, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-muted/50 text-muted-foreground border-border",
};

const outreachBadgeStyles: Record<string, { label: string; className: string }> = {
  engaged: { label: "Engaged", className: "bg-green-500/15 text-green-400 border-green-500/30" },
  contacted: { label: "Contacted", className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  responded: { label: "Responded", className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
};

export function CompanyCard({
  company,
  isSelected,
  lastEngagementTime,
  onSelect,
  query = "",
  outreachScore,
  urgencyTier,
  nextBestAction,
  tags = [],
  readinessScore,
  readinessLabel,
}: CompanyCardProps) {
  const contactNames = company.contacts.map((c) => c.n).join(", ");
  const subtitle = contactNames || company.location || "";
  const subVertical = inferSubVertical(company);
  const revenue = estimateCompanyValue(company);
  const freshness = getResearchFreshness(company);

  // Build metadata line: location · N employees
  const metaParts: string[] = [];
  if (company.location) metaParts.push(company.location);
  if (company.employees && company.employees > 0) metaParts.push(`${company.employees.toLocaleString()} employees`);
  const metaLine = metaParts.join(" · ");

  return (
    <Card
      className={cn(
        "group cursor-pointer p-3 gap-2 rounded-lg shadow-none transition-all hover:bg-secondary/50",
        isSelected && "ring-1 ring-brand bg-secondary/50"
      )}
      onClick={() => onSelect(company.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(company.id);
      }}
    >
      <div className="flex flex-col gap-2">
        {/* Top: name + badges */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-semibold truncate">
              {highlightText(company.name, query)}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-xs px-1 py-0 h-4 font-medium shrink-0", subVerticalBadgeColors[subVertical] || "bg-muted/50 text-muted-foreground border-border")}
            >
              {subVertical}
            </Badge>
            {company.outreachHistory && company.outreachHistory.status !== "no_history" && outreachBadgeStyles[company.outreachHistory.status] && (
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0", outreachBadgeStyles[company.outreachHistory.status].className)}
              >
                {outreachBadgeStyles[company.outreachHistory.status].label}
              </Badge>
            )}
            {company.booth && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand/50 shrink-0" title="Has booth" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highlightText(subtitle, query)}
          </p>

          {company.ice && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
              {company.ice}
            </p>
          )}

          {lastEngagementTime && (
            <p className="text-xs text-brand/60 mt-0.5">
              Last contact: {formatEngagementTime(lastEngagementTime)}
            </p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-xs px-1 py-0.5 rounded bg-brand/10 text-brand/70"
                >
                  <Tag className="h-2 w-2" />
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground/60">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom: details row */}
        <div className="flex items-center gap-3 pt-1 border-t border-border/50">
          {metaLine && (
            <span className="text-xs text-muted-foreground/60 truncate">
              {metaLine}
            </span>
          )}
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground/60 tabular-nums cursor-default shrink-0">
                {formatRevenue(revenue)}
              </span>
            </TooltipTrigger>
            <TooltipContent>Estimated annual revenue potential</TooltipContent>
          </Tooltip>
          {readinessLabel && readinessScore !== undefined && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={cn("text-xs font-bold tabular-nums cursor-default shrink-0", getReadinessColor(readinessLabel))}>
                  {readinessScore.toFixed(1)}
                </span>
              </TooltipTrigger>
              <TooltipContent>Outreach readiness ({readinessScore.toFixed(1)}/10)</TooltipContent>
            </Tooltip>
          )}
          {freshness && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground/50 tabular-nums cursor-default shrink-0">
                  {freshness}
                </span>
              </TooltipTrigger>
              <TooltipContent>Research freshness — last updated {freshness} ago</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
}
