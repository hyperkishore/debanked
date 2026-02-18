"use client";

import { Company, getResearchScore, getResearchTier } from "@/lib/types";
import { UrgencyTier } from "@/lib/outreach-score";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatEngagementTime } from "@/lib/engagement-helpers";

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
      <mark key={i} className="bg-primary/30 text-foreground rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

const qualityColors: Record<string, string> = {
  complete: "bg-green-500",
  good: "bg-blue-500",
  partial: "bg-amber-500",
  minimal: "bg-red-500/60",
};

function QualityBar({ company }: { company: Company }) {
  const score = getResearchScore(company);
  const tier = getResearchTier(score);
  return (
    <div className="mt-2 flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full bg-muted/30 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", qualityColors[tier])}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-[9px] text-muted-foreground/60 shrink-0 w-6 text-right">{score}%</span>
    </div>
  );
}

const typeColorMap: Record<string, string> = {
  SQO: "border-l-[var(--sqo)]",
  Client: "border-l-[var(--client)]",
  ICP: "border-l-[var(--icp)]",
  TAM: "border-l-[var(--tam)]",
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

  return (
    <div
      className={cn(
        "group relative cursor-pointer border-l-[3px] rounded-lg bg-card p-3 transition-all hover:bg-secondary/50",
        typeColorMap[company.type] || "border-l-muted",
        isSelected && "ring-1 ring-primary bg-secondary/50"
      )}
      onClick={() => onSelect(company.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(company.id);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate">
              {highlightText(company.name, query)}
            </h3>
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0", typeBadgeMap[company.type] || "")}
            >
              {company.type}
            </Badge>
            {company.clear && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-primary border-primary/30">
                CLEAR
              </Badge>
            )}
            {urgencyTier && (
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0", urgencyBadgeStyles[urgencyTier])}
              >
                {outreachScore}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highlightText(subtitle, query)}
          </p>
          {company.employees && company.employees > 0 && (
            <span className="text-[10px] text-muted-foreground/60">
              {company.employees} employees
            </span>
          )}
          {company.ice && !nextBestAction && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
              {company.ice.substring(0, 80)}...
            </p>
          )}
          {nextBestAction && (
            <p className="text-[11px] text-primary/80 mt-1 font-medium">
              Next: {nextBestAction}
            </p>
          )}
          {lastEngagementTime && (
            <p className="text-[10px] text-primary/60 mt-0.5">
              Last contact: {formatEngagementTime(lastEngagementTime)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isMet && (
            <Badge className={cn(
              "text-[10px] px-1.5 py-0 h-4",
              rating === "hot" && "bg-[var(--sqo)]/20 text-[var(--sqo)]",
              rating === "warm" && "bg-[var(--client)]/20 text-[var(--client)]",
              rating === "cold" && "bg-primary/20 text-primary",
              !rating && "bg-muted text-muted-foreground"
            )}>
              {rating ? `MET·${rating.toUpperCase()}` : "MET"}
            </Badge>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMet(company.id);
            }}
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all opacity-0 group-hover:opacity-100",
              isMet
                ? "bg-primary/20 text-primary opacity-100"
                : "bg-muted/50 text-muted-foreground hover:bg-primary/20 hover:text-primary"
            )}
            title={isMet ? "Unmark met" : "Mark as met"}
          >
            {isMet ? "✓" : "○"}
          </button>
        </div>
      </div>
      {company.booth && (
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary/40" title="Has booth" />
      )}
      {/* Research quality bar */}
      <QualityBar company={company} />
    </div>
  );
}
