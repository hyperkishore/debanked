"use client";

import { Company, CompanyCategory, OutreachStatus, getResearchScore, getResearchTier } from "@/lib/types";
import { UrgencyTier } from "@/lib/outreach-score";
import { ReadinessLabel, getReadinessColor, getReadinessBgColor } from "@/lib/readiness-score";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatEngagementTime } from "@/lib/engagement-helpers";
import { Tag, Mail, Phone } from "lucide-react";

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

const tierBadgeColors: Record<string, string> = {
  complete: "text-muted-foreground",
  good: "text-muted-foreground",
  partial: "text-muted-foreground/60",
  minimal: "text-muted-foreground/40",
};

const categoryBadgeMap: Record<CompanyCategory, { label: string; className: string }> = {
  funder: { label: "Funder", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  broker: { label: "Broker", className: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  bank: { label: "Bank", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  technology: { label: "Technology", className: "bg-violet-500/10 text-violet-400 border-violet-500/30" },
  marketplace: { label: "Marketplace", className: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" },
  service_provider: { label: "Service", className: "bg-pink-500/10 text-pink-400 border-pink-500/30" },
};

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
  const score = getResearchScore(company);
  const tier = getResearchTier(score);

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
      <div className="flex items-start gap-3">
        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold truncate">
              {highlightText(company.name, query)}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0", typeBadgeMap[company.type] || "")}
            >
              {company.type}
            </Badge>
            {company.category && categoryBadgeMap[company.category] && (
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0", categoryBadgeMap[company.category].className)}
              >
                {categoryBadgeMap[company.category].label}
              </Badge>
            )}
            {company.clear && (
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 font-semibold text-brand border-brand/30">
                CLEAR
              </Badge>
            )}
            {urgencyTier && (
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0", urgencyBadgeStyles[urgencyTier])}
              >
                {outreachScore}
              </Badge>
            )}
            {company.outreachHistory && company.outreachHistory.status !== "no_history" && outreachBadgeStyles[company.outreachHistory.status] && (
              <Badge
                variant="outline"
                className={cn("text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0", outreachBadgeStyles[company.outreachHistory.status].className)}
              >
                {outreachBadgeStyles[company.outreachHistory.status].label}
              </Badge>
            )}
            {(company.hubspotDeals || []).length > 0 && (() => {
              const deals = company.hubspotDeals!;
              const activeDeals = deals.filter(d => {
                const s = (d.stageLabel || "").toLowerCase();
                return !s.includes("closed won") && !s.includes("closed lost");
              });
              const bestDeal = activeDeals.length > 0 ? activeDeals[0] : deals[0];
              return (
                <Badge
                  variant="outline"
                  className="text-xs px-1.5 py-0.5 h-5 font-semibold shrink-0 bg-orange-500/10 text-orange-400 border-orange-500/30"
                  title={`HubSpot: ${bestDeal.stageLabel}${bestDeal.amount ? ` · $${bestDeal.amount.toLocaleString()}` : ''}`}
                >
                  HS:{(bestDeal.stageLabel || "New").split(' ').map(w => w[0]).join('').toUpperCase()}
                </Badge>
              );
            })()}
            {company.booth && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand/50 shrink-0" title="Has booth" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highlightText(subtitle, query)}
          </p>

          {metaLine && (
            <span className="text-xs text-muted-foreground/60">
              {metaLine}
            </span>
          )}

          {company.ice && !nextBestAction && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">
              {company.ice}
            </p>
          )}

          {nextBestAction && (
            <p className="text-xs text-brand/80 mt-1 font-medium">
              Next: {nextBestAction}
            </p>
          )}

          {lastEngagementTime && (
            <p className="text-xs text-brand/60 mt-0.5">
              Last contact: {formatEngagementTime(lastEngagementTime)}
            </p>
          )}

          {/* Enrichment status icons + Tags */}
          <div className="flex flex-wrap items-center gap-1 mt-1">
            {(() => {
              const hasEmail = (company.leaders || []).some(l => l.email);
              const hasPhone = (company.leaders || []).some(l => l.phone);
              return (
                <>
                  <Mail className={cn("h-3 w-3", hasEmail ? "text-blue-400" : "text-muted-foreground/30")} />
                  <Phone className={cn("h-3 w-3", hasPhone ? "text-green-400" : "text-muted-foreground/30")} />
                </>
              );
            })()}
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
        </div>

        {/* Scores */}
        <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
          <span className={cn("text-xs font-medium tabular-nums", tierBadgeColors[tier])}>
            {score}%
          </span>
          {readinessLabel && readinessScore !== undefined && (
            <Badge
              variant="outline"
              className={cn("text-xs px-1 py-0 h-4 font-bold tabular-nums", getReadinessBgColor(readinessLabel), getReadinessColor(readinessLabel))}
              title={`Outreach readiness: ${readinessScore}/10`}
            >
              {readinessScore.toFixed(1)}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
