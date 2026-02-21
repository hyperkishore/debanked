"use client";

import { useMemo, useCallback } from "react";
import { Company, EngagementEntry, EngagementChannel } from "@/lib/types";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { SequenceProgress } from "@/lib/sequence-helpers";
import {
  TaskQueueItem,
  TaskQueueState,
  TaskPriority,
  buildTaskQueue,
  maybeResetDaily,
  DEFAULT_TASK_QUEUE_STATE,
} from "@/lib/task-queue-helpers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Check,
  Clock,
  X,
  Bell,
  AlertTriangle,
  Zap,
  Newspaper,
  Target,
  ChevronDown,
  ChevronUp,
  ListChecks,
} from "lucide-react";
import { useState } from "react";

interface TaskQueueTabProps {
  companies: Company[];
  engagements: EngagementEntry[];
  pipelineState: Record<string, PipelineRecord>;
  metState: Record<string, boolean>;
  followUps: FollowUpReminder[];
  sequences: Record<number, SequenceProgress>;
  queueState: TaskQueueState;
  onUpdateQueueState: (state: TaskQueueState) => void;
  onOpenCompany: (id: number) => void;
  onCompleteFollowUp: (followUpId: string) => void;
  onSequenceStep?: (companyId: number, stepId: string, channel: EngagementChannel, action: string) => void;
  onOpenEngagement: (companyId: number) => void;
}

const typeTaskIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  "follow-up": Bell,
  "stale-deal": AlertTriangle,
  "sequence-step": Zap,
  "news-trigger": Newspaper,
  "quick-win": Target,
};

const priorityStyles: Record<TaskPriority, { label: string; colorClass: string; bgClass: string }> = {
  critical: {
    label: "Critical",
    colorClass: "text-red-400",
    bgClass: "bg-red-500/10 border-red-500/20",
  },
  high: {
    label: "High",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10 border-amber-500/20",
  },
  medium: {
    label: "Medium",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10 border-blue-500/20",
  },
};

const typeBadgeColors: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  Client: "bg-[var(--client)]/15 text-[var(--client)]",
  ICP: "bg-[var(--icp)]/15 text-[var(--icp)]",
  TAM: "bg-[var(--tam)]/15 text-[var(--tam)]",
};

function getSnoozePresets(): { label: string; days: number }[] {
  return [
    { label: "Tomorrow", days: 1 },
    { label: "3 days", days: 3 },
    { label: "1 week", days: 7 },
  ];
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TaskQueueTab({
  companies,
  engagements,
  pipelineState,
  metState,
  followUps,
  sequences,
  queueState: rawQueueState,
  onUpdateQueueState,
  onOpenCompany,
  onCompleteFollowUp,
  onSequenceStep,
  onOpenEngagement,
}: TaskQueueTabProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [snoozeTaskId, setSnoozeTaskId] = useState<string | null>(null);

  // Daily reset
  const queueState = useMemo(() => {
    const reset = maybeResetDaily(rawQueueState);
    if (reset !== rawQueueState) {
      onUpdateQueueState(reset);
    }
    return reset;
  }, [rawQueueState]);

  // Build task queue
  const tasks = useMemo(
    () => buildTaskQueue(companies, engagements, pipelineState, metState, followUps, sequences, queueState),
    [companies, engagements, pipelineState, metState, followUps, sequences, queueState]
  );

  // Group by priority
  const grouped = useMemo(() => {
    const groups: Record<TaskPriority, TaskQueueItem[]> = {
      critical: [],
      high: [],
      medium: [],
    };
    for (const task of tasks) {
      groups[task.priority].push(task);
    }
    return groups;
  }, [tasks]);

  const completedCount = queueState.completedTasks.length;

  const handleComplete = useCallback(
    (task: TaskQueueItem) => {
      // Mark task completed in queue state
      const newState = {
        ...queueState,
        completedTasks: [...queueState.completedTasks, task.id],
      };
      onUpdateQueueState(newState);

      // Type-specific actions
      if (task.type === "follow-up" && task.followUpId) {
        onCompleteFollowUp(task.followUpId);
      } else if (task.type === "sequence-step" && task.stepId && task.channel && task.engagementAction && onSequenceStep) {
        onSequenceStep(task.companyId, task.stepId, task.channel as EngagementChannel, task.engagementAction);
      } else {
        // For stale-deal, news-trigger, quick-win — open engagement log
        onOpenEngagement(task.companyId);
      }
    },
    [queueState, onUpdateQueueState, onCompleteFollowUp, onSequenceStep, onOpenEngagement]
  );

  const handleSnooze = useCallback(
    (taskId: string, days: number) => {
      const snoozeDate = addDays(days);
      const newState = {
        ...queueState,
        snoozedTasks: { ...queueState.snoozedTasks, [taskId]: snoozeDate },
      };
      onUpdateQueueState(newState);
      setSnoozeTaskId(null);
    },
    [queueState, onUpdateQueueState]
  );

  const handleDismiss = useCallback(
    (taskId: string) => {
      const newState = {
        ...queueState,
        dismissedTasks: [...queueState.dismissedTasks, taskId],
      };
      onUpdateQueueState(newState);
    },
    [queueState, onUpdateQueueState]
  );

  const canDismiss = (task: TaskQueueItem) =>
    task.type === "news-trigger" || task.type === "quick-win";

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-brand" />
            <h2 className="text-lg font-bold">Today</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tasks.length === 0
              ? "All caught up! No tasks for today."
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"} to work through`}
          </p>
        </div>

        {tasks.length === 0 && (
          <Card className="p-8 text-center shadow-none border-dashed">
            <Check className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No follow-ups due, no stale deals, no pending steps.
            </p>
          </Card>
        )}

        {/* Task groups by priority */}
        {(["critical", "high", "medium"] as TaskPriority[]).map((priority) => {
          const group = grouped[priority];
          if (group.length === 0) return null;
          const style = priorityStyles[priority];

          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("text-xs font-semibold uppercase tracking-wider", style.colorClass)}>
                  {style.label}
                </span>
                <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5", style.colorClass)}>
                  {group.length}
                </Badge>
              </div>

              <div className="space-y-1.5">
                {group.map((task) => {
                  const Icon = typeTaskIcon[task.type] || Bell;
                  const isSnoozing = snoozeTaskId === task.id;

                  return (
                    <Card
                      key={task.id}
                      className={cn(
                        "p-3 shadow-none border transition-colors",
                        style.bgClass
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", style.colorClass)} />

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => onOpenCompany(task.companyId)}
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium">{task.companyName}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-xs px-1 py-0.5 h-4 font-semibold", typeBadgeColors[task.companyType])}
                            >
                              {task.companyType}
                            </Badge>
                          </div>
                          <p className="text-xs font-medium text-foreground/90 mt-0.5">{task.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.subtitle}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-400 hover:bg-green-500/10"
                            onClick={() => handleComplete(task)}
                            title="Complete"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-secondary/50"
                            onClick={() => setSnoozeTaskId(isSnoozing ? null : task.id)}
                            title="Snooze"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </Button>
                          {canDismiss(task) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:bg-secondary/50"
                              onClick={() => handleDismiss(task.id)}
                              title="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Snooze picker */}
                      {isSnoozing && (
                        <div className="flex items-center gap-1.5 mt-2 pl-7">
                          <span className="text-xs text-muted-foreground">Snooze:</span>
                          {getSnoozePresets().map((preset) => (
                            <Button
                              key={preset.label}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => handleSnooze(task.id, preset.days)}
                            >
                              {preset.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Completed section */}
        {completedCount > 0 && (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between h-auto py-2 px-0 hover:bg-transparent"
              onClick={() => setShowCompleted(!showCompleted)}
            >
              <span className="text-xs text-muted-foreground">
                {completedCount} completed today
              </span>
              {showCompleted ? (
                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            {showCompleted && (
              <div className="space-y-1">
                {queueState.completedTasks.map((taskId) => (
                  <div
                    key={taskId}
                    className="flex items-center gap-2 text-xs text-muted-foreground/60 py-1"
                  >
                    <Check className="h-3 w-3 text-green-400/50" />
                    <span className="line-through">{taskId.replace(/^(follow-up-|stale-deal-|sequence-\d+-|news-|quick-win-)/, "")}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
