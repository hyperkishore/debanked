"use client";

import { SuggestedAction, getSuggestedActions } from "@/lib/action-feed-helpers";
import { getTodayProgress, getRecentActivityCount, StreakData } from "@/lib/streak-helpers";
import { Company, RatingData, EngagementEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

interface ActionFeedProps {
  companies: Company[];
  metState: Record<string, boolean>;
  ratingState: Record<string, RatingData>;
  engagements: EngagementEntry[];
  streakData: StreakData;
  onOpenEngagement: (companyId: number) => void;
}

function DailyGoalRing({ done, goal, size = 48 }: { done: number; goal: number; size?: number }) {
  const pct = Math.min((done / goal) * 100, 100);
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 100 ? "var(--icp)" : pct >= 50 ? "var(--client)" : "var(--tam)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="progress-ring -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="progress-ring-circle"
        />
      </svg>
      <span className="absolute text-[10px] font-bold">{done}</span>
    </div>
  );
}

function ActivityPulse({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="activity-pulse-dot" />
      <span>{count} in last hour</span>
    </div>
  );
}

const priorityStyles = {
  urgent: "border-[var(--sqo)]/30 bg-[var(--sqo)]/5",
  high: "border-[var(--client)]/30 bg-[var(--client)]/5",
  normal: "border-border bg-card",
};

const priorityBadge = {
  urgent: "bg-[var(--sqo)]/20 text-[var(--sqo)]",
  high: "bg-[var(--client)]/20 text-[var(--client)]",
  normal: "bg-primary/20 text-primary",
};

const typeBadge: Record<string, string> = {
  "follow-up": "bg-[var(--client)]/15 text-[var(--client)]",
  "hot-lead": "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  "suggested": "bg-primary/15 text-primary",
};

export function ActionFeed({
  companies,
  metState,
  ratingState,
  engagements,
  streakData,
  onOpenEngagement,
}: ActionFeedProps) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eventiq_action_feed_collapsed") === "true";
    }
    return false;
  });

  const actions = useMemo(
    () => getSuggestedActions(companies, metState, ratingState, engagements),
    [companies, metState, ratingState, engagements]
  );

  const todayProgress = useMemo(
    () => getTodayProgress(engagements, streakData.dailyGoal),
    [engagements, streakData.dailyGoal]
  );

  const recentActivity = useMemo(
    () => getRecentActivityCount(engagements),
    [engagements]
  );

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("eventiq_action_feed_collapsed", String(next));
  };

  // Group actions by type
  const followUps = actions.filter((a) => a.type === "follow-up");
  const hotLeads = actions.filter((a) => a.type === "hot-lead");

  if (actions.length === 0 && todayProgress.done === 0) return null;

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <DailyGoalRing done={todayProgress.done} goal={todayProgress.goal} />
          <div className="text-left">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Today&apos;s Actions
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {todayProgress.done}/{todayProgress.goal} daily goal
              </span>
              <ActivityPulse count={recentActivity} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--sqo)]/20 text-[var(--sqo)]">
              {actions.length} actions
            </span>
          )}
          <span className={cn("text-muted-foreground transition-transform text-sm", !collapsed && "rotate-180")}>
            &#x25BE;
          </span>
        </div>
      </button>

      {/* Collapsible body */}
      {!collapsed && actions.length > 0 && (
        <div className="px-3 pb-3 space-y-3">
          {/* Follow-ups Due */}
          {followUps.length > 0 && (
            <ActionSection
              title="Follow-ups Due"
              color="var(--client)"
              actions={followUps}
              onAction={onOpenEngagement}
            />
          )}

          {/* Hot Leads */}
          {hotLeads.length > 0 && (
            <ActionSection
              title="Hot Leads"
              color="var(--sqo)"
              actions={hotLeads}
              onAction={onOpenEngagement}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionSection({
  title,
  color,
  actions,
  onAction,
}: {
  title: string;
  color: string;
  actions: SuggestedAction[];
  onAction: (companyId: number) => void;
}) {
  return (
    <div>
      <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color }}>
        {title}
      </h4>
      <div className="space-y-1.5">
        {actions.slice(0, 5).map((action) => (
          <div
            key={`${action.companyId}-${action.type}`}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border text-xs",
              priorityStyles[action.priority]
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="font-medium truncate">{action.companyName}</span>
                <span className={cn("text-[9px] px-1 py-0.5 rounded font-medium", typeBadge[action.type])}>
                  {action.type === "follow-up" ? "Follow-up" : "Hot"}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 truncate">{action.reason}</p>
            </div>
            <button
              onClick={() => onAction(action.companyId)}
              className={cn(
                "shrink-0 text-[10px] font-medium px-2 py-1 rounded-md transition-colors",
                priorityBadge[action.priority]
              )}
            >
              {action.cta}
            </button>
          </div>
        ))}
        {actions.length > 5 && (
          <p className="text-[10px] text-muted-foreground pl-2">+{actions.length - 5} more</p>
        )}
      </div>
    </div>
  );
}
