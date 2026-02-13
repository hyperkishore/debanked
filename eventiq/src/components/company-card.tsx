"use client";

import { Company } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  isMet: boolean;
  rating?: string;
  onSelect: (id: number) => void;
  onToggleMet: (id: number) => void;
  query?: string;
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

const typeColorMap = {
  SQO: "border-l-[var(--sqo)]",
  Client: "border-l-[var(--client)]",
  ICP: "border-l-[var(--icp)]",
} as const;

const typeBadgeMap = {
  SQO: "bg-[var(--sqo)]/10 text-[var(--sqo)] hover:bg-[var(--sqo)]/20",
  Client: "bg-[var(--client)]/10 text-[var(--client)] hover:bg-[var(--client)]/20",
  ICP: "bg-[var(--icp)]/10 text-[var(--icp)] hover:bg-[var(--icp)]/20",
} as const;

export function CompanyCard({
  company,
  isSelected,
  isMet,
  rating,
  onSelect,
  onToggleMet,
  query = "",
}: CompanyCardProps) {
  const contactNames = company.contacts.map((c) => c.n).join(", ");

  return (
    <div
      className={cn(
        "group relative cursor-pointer border-l-[3px] rounded-lg bg-card p-3 transition-all hover:bg-secondary/50",
        typeColorMap[company.type],
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
              className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0", typeBadgeMap[company.type])}
            >
              {company.type}
            </Badge>
            {company.clear && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold text-primary border-primary/30">
                CLEAR
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {highlightText(contactNames, query)}
          </p>
          {company.ice && (
            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
              {company.ice.substring(0, 80)}...
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
    </div>
  );
}
