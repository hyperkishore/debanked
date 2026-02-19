"use client";

import { Company, getResearchScore, getResearchTier } from "@/lib/types";
import { UrgencyTier } from "@/lib/outreach-score";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatEngagementTime } from "@/lib/engagement-helpers";
import { Check, Circle } from "lucide-react";

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  isMet: boolean;
  rating?: string;
  lastEngagementTime?: string | null;
  onSelect: (id: number) => void;
  onToggleMet: (id: number) => void;
  query?: string;
  outreachScore?: number;
  urgencyTier?: UrgencyTier;
  nextBestAction?: string;
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

const qualityIndicatorColors: Record<string, string> = {
  complete: "[&>[data-slot=progress-indicator]]:bg-green-500",
  good: "[&>[data-slot=progress-indicator]]:bg-blue-500",
  partial: "[&>[data-slot=progress-indicator]]:bg-amber-500",
  minimal: "[&>[data-slot=progress-indicator]]:bg-red-500/60",
};

const typeIndicatorColor: Record<string, string> = {
  SQO: "bg-[var(--sqo)]",
  Client: "bg-[var(--client)]",
  ICP: "bg-[var(--icp)]",
  TAM: "bg-[var(--tam)]",
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

export function CompanyCard({
  company,
  isSelected,
  isMet,
  rating,
  lastEngagementTime,
  onSelect,
  onToggleMet,
  query = "",
  outreachScore,
  urgencyTier,
  nextBestAction,
}: CompanyCardProps) {
  const contactNames = company.contacts.map((c) => c.n).join(", ");
  const subtitle = contactNames || company.location || "";
  const score = getResearchScore(company);
  const tier = getResearchTier(score);

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
        {/* Type color indicator */}
        <div
          className={cn(
            "mt-1.5 w-2 h-2 rounded-full shrink-0",
            typeIndicatorColor[company.type] || "bg-muted"
          )}
        />

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
            {company.booth && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand/50 shrink-0" title="Has booth" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highlightText(subtitle, query)}
          </p>

          {company.employees && company.employees > 0 && (
            <span className="text-xs text-muted-foreground/60">
              {company.employees.toLocaleString()} employees
            </span>
          )}

          {company.ice && !nextBestAction && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
              {company.ice.substring(0, 80)}...
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

          {/* Research quality */}
          <div className="mt-2 flex items-center gap-2">
            <Progress
              value={score}
              className={cn("h-1 flex-1", qualityIndicatorColors[tier])}
            />
            <span className="text-xs text-muted-foreground/60 tabular-nums shrink-0">{score}%</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          {isMet && (
            <Badge className={cn(
              "text-xs px-1.5 py-0.5 h-5",
              rating === "hot" && "bg-[var(--sqo)]/20 text-[var(--sqo)]",
              rating === "warm" && "bg-[var(--client)]/20 text-[var(--client)]",
              rating === "cold" && "bg-brand/20 text-brand",
              !rating && "bg-muted text-muted-foreground"
            )}>
              {rating ? `MET·${rating.toUpperCase()}` : "MET"}
            </Badge>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMet(company.id);
                }}
                className={cn(
                  "w-6 h-6 rounded-full transition-all opacity-0 group-hover:opacity-100",
                  isMet
                    ? "bg-brand/20 text-brand opacity-100"
                    : "bg-muted/50 text-muted-foreground hover:bg-brand/20 hover:text-brand"
                )}
              >
                {isMet ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isMet ? "Unmark met" : "Mark as met"}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}
