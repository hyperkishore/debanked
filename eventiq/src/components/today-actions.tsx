"use client";

import { useMemo, useState } from "react";
import { Company, EngagementEntry } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import {
  FollowUpReminder,
  CategorizedFollowUp,
  categorizeTodayActions,
  getSnoozePresets,
} from "@/lib/follow-up-helpers";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  MessageSquare,
} from "lucide-react";

interface TodayActionsProps {
  followUps: FollowUpReminder[];
  companies: Company[];
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  onSnooze: (id: string, newDate: string) => void;
  onComplete: (id: string) => void;
  onLogEngagement: (companyId: number) => void;
  onSelectCompany: (companyId: number) => void;
}

const categoryStyles = {
  overdue: {
    border: "border-l-red-500",
    bg: "bg-red-500/5",
    label: "Overdue",
    icon: AlertTriangle,
    iconColor: "text-red-400",
  },
  today: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    label: "Due Today",
    icon: Clock,
    iconColor: "text-amber-400",
  },
  stale: {
    border: "border-l-muted-foreground/30",
    bg: "bg-muted/5",
    label: "Stale Pipeline",
    icon: Calendar,
    iconColor: "text-muted-foreground",
  },
};

export function TodayActions({
  followUps,
  companies,
  engagements,
  pipelineState,
  onSnooze,
  onComplete,
  onLogEngagement,
  onSelectCompany,
}: TodayActionsProps) {
  const [collapsed, setCollapsed] = useState(false);

  const categorized = useMemo(
    () => categorizeTodayActions(followUps, companies, engagements, pipelineState),
    [followUps, companies, engagements, pipelineState]
  );

  if (categorized.length === 0) return null;

  const overdueCount = categorized.filter((c) => c.category === "overdue").length;
  const todayCount = categorized.filter((c) => c.category === "today").length;
  const staleCount = categorized.filter((c) => c.category === "stale").length;

  return (
    <div className="border-b border-border">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Actions
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-semibold">
            {categorized.length}
          </Badge>
          {overdueCount > 0 && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400">
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Items */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-1 max-h-48 overflow-auto">
          {categorized.map((item) => (
            <ActionItem
              key={item.followUp.id}
              item={item}
              onSnooze={onSnooze}
              onComplete={onComplete}
              onLogEngagement={onLogEngagement}
              onSelectCompany={onSelectCompany}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionItem({
  item,
  onSnooze,
  onComplete,
  onLogEngagement,
  onSelectCompany,
}: {
  item: CategorizedFollowUp;
  onSnooze: (id: string, newDate: string) => void;
  onComplete: (id: string) => void;
  onLogEngagement: (companyId: number) => void;
  onSelectCompany: (companyId: number) => void;
}) {
  const [showSnooze, setShowSnooze] = useState(false);
  const style = categoryStyles[item.category];
  const Icon = style.icon;
  const snoozePresets = getSnoozePresets();
  const isStale = item.category === "stale";

  return (
    <div
      className={cn(
        "rounded-md border-l-[3px] p-2 flex items-start gap-2 text-xs",
        style.border,
        style.bg
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", style.iconColor)} />
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onSelectCompany(item.followUp.companyId)}
          className="font-medium text-foreground hover:text-primary transition-colors truncate block text-left"
        >
          {item.companyName}
        </button>
        <p className="text-muted-foreground truncate">
          {item.followUp.contactName}
          {item.followUp.notes && ` — ${item.followUp.notes}`}
        </p>
        {item.daysDelta < 0 && (
          <span className="text-red-400 text-[10px]">{Math.abs(item.daysDelta)}d overdue</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Snooze */}
        {!isStale && (
          <div className="relative">
            <button
              onClick={() => setShowSnooze(!showSnooze)}
              className="p-1 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
              title="Snooze"
            >
              <Clock className="h-3 w-3" />
            </button>
            {showSnooze && (
              <div className="absolute right-0 top-6 z-10 bg-card border border-border rounded-md shadow-lg py-1 min-w-[100px]">
                {snoozePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      onSnooze(item.followUp.id, preset.date);
                      setShowSnooze(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-[11px] hover:bg-secondary/50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Complete */}
        {!isStale && (
          <button
            onClick={() => onComplete(item.followUp.id)}
            className="p-1 rounded hover:bg-green-500/20 text-muted-foreground hover:text-green-400 transition-colors"
            title="Complete"
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        {/* Log engagement */}
        <button
          onClick={() => onLogEngagement(item.followUp.companyId)}
          className="p-1 rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
          title="Log engagement"
        >
          <MessageSquare className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
