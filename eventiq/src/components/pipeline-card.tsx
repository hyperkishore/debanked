"use client";

import { Company, RatingData } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PipelineCardProps {
  company: Company;
  ratingState: Record<string, RatingData>;
  daysSince: number | null;
  lastChannel: string | null;
  dealValue?: number;
  onOpen: (id: number) => void;
  onDragStart: (e: React.DragEvent, companyId: number) => void;
}

const typeAccent: Record<string, string> = {
  SQO: "border-l-[var(--sqo)]",
  Client: "border-l-[var(--client)]",
  ICP: "border-l-[var(--icp)]",
  TAM: "border-l-[var(--tam)]",
};

const typeBadge: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  Client: "bg-[var(--client)]/15 text-[var(--client)]",
  ICP: "bg-[var(--icp)]/15 text-[var(--icp)]",
  TAM: "bg-[var(--tam)]/15 text-[var(--tam)]",
};

const channelIcon: Record<string, string> = {
  email: "\u2709",
  linkedin: "\u{1F517}",
  imessage: "\u{1F4AC}",
  call: "\u{1F4DE}",
  meeting: "\u{1F4C5}",
  note: "\u{1F4DD}",
};

export function PipelineCard({
  company,
  ratingState,
  daysSince,
  lastChannel,
  dealValue,
  onOpen,
  onDragStart,
}: PipelineCardProps) {
  const rating = ratingState[company.id];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, company.id)}
      onClick={() => onOpen(company.id)}
      className={cn(
        "pipeline-card rounded-md bg-card border border-border border-l-2 p-2 cursor-grab active:cursor-grabbing",
        "hover:border-primary/30 transition-colors",
        typeAccent[company.type] || "border-l-border"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium truncate">{company.name}</span>
        <span className={cn("text-[8px] px-1 py-0.5 rounded font-semibold shrink-0", typeBadge[company.type])}>
          {company.type}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mt-1">
        {rating?.rating && (
          <span className={cn(
            "text-[8px] px-1 py-0.5 rounded font-medium",
            rating.rating === "hot" && "bg-[var(--sqo)]/20 text-[var(--sqo)]",
            rating.rating === "warm" && "bg-[var(--client)]/20 text-[var(--client)]",
            rating.rating === "cold" && "bg-primary/20 text-primary",
          )}>
            {rating.rating.toUpperCase()}
          </span>
        )}
        {daysSince !== null && (
          <span className={cn(
            "text-[9px] text-muted-foreground",
            daysSince > 7 && "text-[var(--sqo)]",
            daysSince > 3 && daysSince <= 7 && "text-[var(--client)]"
          )}>
            {daysSince}d
          </span>
        )}
        {lastChannel && (
          <span className="text-[10px]" title={lastChannel}>
            {channelIcon[lastChannel] || ""}
          </span>
        )}
        {dealValue != null && dealValue > 0 && (
          <span className="text-[9px] font-medium text-green-400 ml-auto">
            ${dealValue >= 1000 ? `${(dealValue / 1000).toFixed(0)}K` : dealValue}
          </span>
        )}
      </div>
    </div>
  );
}
