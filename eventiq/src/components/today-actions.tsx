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
import {
  buildMorningBriefing,
  MorningBriefing,
  NewsTrigger,
  StaleWarning,
  QuickWin,
  TopAction,
} from "@/lib/morning-briefing-helpers";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Newspaper,
  Zap,
  TrendingUp,
  Star,
} from "lucide-react";

interface TodayActionsProps {
  followUps: FollowUpReminder[];
  companies: Company[];
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  metState: Record<string, boolean>;
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

const URGENCY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high: "bg-amber-500/15 text-amber-400",
  medium: "bg-blue-500/15 text-blue-400",
  low: "bg-muted/50 text-muted-foreground",
};

export function TodayActions({
  followUps,
  companies,
  engagements,
  pipelineState,
  metState,
  onSnooze,
  onComplete,
  onLogEngagement,
  onSelectCompany,
}: TodayActionsProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [morningOpen, setMorningOpen] = useState(true);

  const categorized = useMemo(
    () => categorizeTodayActions(followUps, companies, engagements, pipelineState),
    [followUps, companies, engagements, pipelineState]
  );

  const morning = useMemo(
    () => buildMorningBriefing(companies, engagements, pipelineState, metState),
    [companies, engagements, pipelineState, metState]
  );

  const totalItems = categorized.length;
  const morningItems = morning.newsTriggers.length + morning.staleWarnings.length + morning.quickWins.length + morning.topActions.length;

  if (totalItems === 0 && morningItems === 0) return null;

  const overdueCount = categorized.filter((c) => c.category === "overdue").length;

  return (
    <div className="border-b border-border">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-3 py-2 h-auto rounded-none hover:bg-secondary/30"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Actions
          </span>
          <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 font-semibold">
            {totalItems + morningItems}
          </Badge>
          {overdueCount > 0 && (
            <Badge className="text-xs px-1.5 py-0.5 h-5 bg-red-500/20 text-red-400">
              {overdueCount} overdue
            </Badge>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {/* Content */}
      {!collapsed && (
        <div className="px-2 pb-2 space-y-2 max-h-64 overflow-auto">

          {/* Morning Briefing Sections */}
          {morningItems > 0 && (
            <div className="space-y-2">
              {/* News Triggers */}
              {morning.newsTriggers.length > 0 && (
                <MorningSection
                  icon={Newspaper}
                  label="News Triggers"
                  count={morning.newsTriggers.length}
                  iconColor="text-blue-400"
                >
                  {morning.newsTriggers.map((trigger, i) => (
                    <div key={i} className="rounded-md border-l-[3px] border-l-blue-500 bg-blue-500/5 p-3 flex items-start gap-2 text-xs">
                      <Newspaper className="h-3.5 w-3.5 mt-0.5 text-blue-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCompany(trigger.company.id)}
                          className="h-auto p-0 font-medium text-foreground hover:text-brand hover:bg-transparent truncate block text-left"
                        >
                          {trigger.company.name}
                        </Button>
                        <p className="text-muted-foreground truncate">{trigger.headline}</p>
                      </div>
                      <CopyButton text={trigger.suggestedMessage} size="sm" />
                    </div>
                  ))}
                </MorningSection>
              )}

              {/* Stale Warnings */}
              {morning.staleWarnings.length > 0 && (
                <MorningSection
                  icon={AlertTriangle}
                  label="Losing Momentum"
                  count={morning.staleWarnings.length}
                  iconColor="text-amber-400"
                >
                  {morning.staleWarnings.map((warning, i) => (
                    <div key={i} className="rounded-md border-l-[3px] border-l-amber-500 bg-amber-500/5 p-3 flex items-start gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 mt-0.5 text-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCompany(warning.company.id)}
                          className="h-auto p-0 font-medium text-foreground hover:text-brand hover:bg-transparent truncate block text-left"
                        >
                          {warning.company.name}
                        </Button>
                        <p className="text-muted-foreground">
                          {warning.daysSince}d since last {warning.lastChannel}
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onLogEngagement(warning.company.id)}
                            className="h-6 w-6 text-muted-foreground hover:text-brand hover:bg-brand/20"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Log engagement</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </MorningSection>
              )}

              {/* Quick Wins */}
              {morning.quickWins.length > 0 && (
                <MorningSection
                  icon={Zap}
                  label="Quick Wins"
                  count={morning.quickWins.length}
                  iconColor="text-green-400"
                >
                  {morning.quickWins.map((win, i) => (
                    <div key={i} className="rounded-md border-l-[3px] border-l-green-500 bg-green-500/5 p-3 flex items-start gap-2 text-xs">
                      <Zap className="h-3.5 w-3.5 mt-0.5 text-green-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCompany(win.company.id)}
                          className="h-auto p-0 font-medium text-foreground hover:text-brand hover:bg-transparent truncate block text-left"
                        >
                          {win.company.name}
                        </Button>
                        <p className="text-muted-foreground">
                          Score {win.score} — never contacted
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs px-1 py-0.5 h-5">
                        {win.type}
                      </Badge>
                    </div>
                  ))}
                </MorningSection>
              )}

              {/* Your Day — Top 5 */}
              {morning.topActions.length > 0 && (
                <MorningSection
                  icon={Star}
                  label="Your Day"
                  count={morning.topActions.length}
                  iconColor="text-brand"
                >
                  {morning.topActions.map((action, i) => (
                    <div key={i} className="rounded-md border-l-[3px] border-l-brand/50 bg-brand/5 p-3 flex items-start gap-2 text-xs">
                      <TrendingUp className="h-3.5 w-3.5 mt-0.5 text-brand shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onSelectCompany(action.company.id)}
                          className="h-auto p-0 font-medium text-foreground hover:text-brand hover:bg-transparent truncate block text-left"
                        >
                          {action.company.name}
                        </Button>
                        <p className="text-muted-foreground">{action.nextAction}</p>
                      </div>
                      <Badge className={cn("text-xs px-1 py-0.5 h-5", URGENCY_STYLES[action.urgencyTier])}>
                        {action.urgencyTier}
                      </Badge>
                    </div>
                  ))}
                </MorningSection>
              )}
            </div>
          )}

          {/* Follow-up items (existing) */}
          {categorized.length > 0 && (
            <div className="space-y-2">
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
      )}
    </div>
  );
}

function MorningSection({
  icon: Icon,
  label,
  count,
  iconColor,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  iconColor: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-1 h-auto px-0 hover:bg-transparent hover:opacity-80"
      >
        <Icon className={cn("h-3 w-3", iconColor)} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1">
          {label}
        </span>
        <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
          {count}
        </Badge>
        {open ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </Button>
      {open && <div className="space-y-2 mt-1">{children}</div>}
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
        "rounded-md border-l-[3px] p-3 flex items-start gap-2 text-xs",
        style.border,
        style.bg
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", style.iconColor)} />
      <div className="flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSelectCompany(item.followUp.companyId)}
          className="h-auto p-0 font-medium text-foreground hover:text-brand hover:bg-transparent truncate block text-left"
        >
          {item.companyName}
        </Button>
        <p className="text-muted-foreground truncate">
          {item.followUp.contactName}
          {item.followUp.notes && ` — ${item.followUp.notes}`}
        </p>
        {item.daysDelta < 0 && (
          <span className="text-red-400 text-xs">{Math.abs(item.daysDelta)}d overdue</span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Snooze */}
        {!isStale && (
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSnooze(!showSnooze)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                >
                  <Clock className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Snooze</TooltipContent>
            </Tooltip>
            {showSnooze && (
              <div className="absolute right-0 top-6 z-10 bg-card border border-border rounded-md shadow-lg py-1 min-w-[100px]">
                {snoozePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onSnooze(item.followUp.id, preset.date);
                      setShowSnooze(false);
                    }}
                    className="block w-full text-left px-3 py-1.5 text-xs justify-start h-auto rounded-none"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Complete */}
        {!isStale && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onComplete(item.followUp.id)}
                className="h-6 w-6 text-muted-foreground hover:text-green-400 hover:bg-green-500/20"
              >
                <Check className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Complete</TooltipContent>
          </Tooltip>
        )}
        {/* Log engagement */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onLogEngagement(item.followUp.companyId)}
              className="h-6 w-6 text-muted-foreground hover:text-brand hover:bg-brand/20"
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Log engagement</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
