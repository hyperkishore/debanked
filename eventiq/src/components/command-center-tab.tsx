"use client";

import { useMemo, useCallback, useState } from "react";
import { Company, EngagementEntry, RatingData, EngagementChannel, inferSubVertical } from "@/lib/types";
import { buildFeedItems } from "@/lib/feed-helpers";
import { PipelineRecord } from "@/lib/pipeline-helpers";
import { estimateCompanyValue } from "@/lib/revenue-model";
import { computeReadinessScore, getReadinessLabel, getReadinessColor, type ReadinessLabel } from "@/lib/readiness-score";
import { getNextBestAction } from "@/lib/outreach-score";
import { getLastEngagement, getCompanyEngagements } from "@/lib/engagement-helpers";
import { FollowUpReminder } from "@/lib/follow-up-helpers";
import { SequenceProgress } from "@/lib/sequence-helpers";
import {
  TaskQueueItem,
  TaskQueueState,
  TaskPriority,
  buildTaskQueue,
  maybeResetDaily,
} from "@/lib/task-queue-helpers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  TrendingUp,
  Zap,
  DollarSign,
  Building2,
  ExternalLink,
  Mail,
  Linkedin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Check,
  X,
  Bell,
  Newspaper,
  Target,
  ListChecks,
} from "lucide-react";

interface CommandCenterTabProps {
  companies: Company[];
  pipelineState: Record<string, PipelineRecord>;
  engagements: EngagementEntry[];
  ratingState: Record<string, RatingData>;
  metState: Record<string, boolean>;
  followUps: FollowUpReminder[];
  sequences: Record<number, SequenceProgress>;
  queueState: TaskQueueState;
  onUpdateQueueState: (state: TaskQueueState) => void;
  onSelectCompany: (id: number) => void;
  onOpenEngagement: (companyId: number) => void;
  onCompleteFollowUp: (followUpId: string) => void;
  onSequenceStep?: (companyId: number, stepId: string, channel: EngagementChannel, action: string) => void;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

function daysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function formatDaysAgo(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const typeTaskIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  "follow-up": Bell,
  "stale-deal": AlertTriangle,
  "sequence-step": Zap,
  "news-trigger": Newspaper,
  "quick-win": Target,
};

const priorityStyles: Record<TaskPriority, { label: string; colorClass: string; bgClass: string }> = {
  critical: { label: "Critical", colorClass: "text-red-400", bgClass: "bg-red-500/10 border-red-500/20" },
  high: { label: "High", colorClass: "text-amber-400", bgClass: "bg-amber-500/10 border-amber-500/20" },
  medium: { label: "Medium", colorClass: "text-blue-400", bgClass: "bg-blue-500/10 border-blue-500/20" },
};

const typeBadgeColors: Record<string, string> = {
  SQO: "bg-[var(--sqo)]/15 text-[var(--sqo)]",
  Client: "bg-[var(--client)]/15 text-[var(--client)]",
  ICP: "bg-[var(--icp)]/15 text-[var(--icp)]",
  TAM: "bg-[var(--tam)]/15 text-[var(--tam)]",
};

export function CommandCenterTab({
  companies,
  pipelineState,
  engagements,
  ratingState,
  metState,
  followUps,
  sequences,
  queueState: rawQueueState,
  onUpdateQueueState,
  onSelectCompany,
  onOpenEngagement,
  onCompleteFollowUp,
  onSequenceStep,
}: CommandCenterTabProps) {
  const [snoozeTaskId, setSnoozeTaskId] = useState<string | null>(null);

  const feedItems = useMemo(() => buildFeedItems(companies), [companies]);

  // === Task Queue (from TaskQueueTab) ===
  const queueState = useMemo(() => {
    const reset = maybeResetDaily(rawQueueState);
    if (reset !== rawQueueState) {
      onUpdateQueueState(reset);
    }
    return reset;
  }, [rawQueueState]);

  const tasks = useMemo(
    () => buildTaskQueue(companies, engagements, pipelineState, metState, followUps, sequences, queueState),
    [companies, engagements, pipelineState, metState, followUps, sequences, queueState]
  );

  const grouped = useMemo(() => {
    const groups: Record<TaskPriority, TaskQueueItem[]> = { critical: [], high: [], medium: [] };
    for (const task of tasks) groups[task.priority].push(task);
    return groups;
  }, [tasks]);

  // === Pipeline Snapshot (from MissionControlTab) ===
  const hubspotSnapshot = useMemo(() => {
    const activeDeals: Array<{ company: Company; deal: NonNullable<Company["hubspotDeals"]>[0]; isActive: boolean }> = [];
    let totalPipeline = 0;
    let totalClosed = 0;
    let activeCount = 0;

    for (const c of companies) {
      for (const deal of c.hubspotDeals || []) {
        const stage = (deal.stageLabel || deal.stage || "").toLowerCase();
        const isWon = stage.includes("closed won");
        const isLost = stage.includes("closed lost");
        const isActive = !isWon && !isLost;
        if (isWon) totalClosed += deal.amount || 0;
        if (isActive) { totalPipeline += deal.amount || 0; activeCount++; }
        activeDeals.push({ company: c, deal, isActive });
      }
    }

    activeDeals.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return (b.deal.amount || 0) - (a.deal.amount || 0);
    });

    return { activeDeals: activeDeals.filter(d => d.isActive), totalPipeline, totalClosed, activeCount };
  }, [companies]);

  // === Top Actions ===
  const actionList = useMemo(() => {
    const items: Array<{
      company: Company; readiness: number; readinessLabel: ReadinessLabel; nextAction: string;
      revenue: number; actionScore: number; lastContactDays: number | null;
      hasEmail: boolean; hasLinkedIn: boolean;
    }> = [];

    for (const c of companies) {
      if (!c.desc || c.desc.length < 10) continue;
      const breakdown = computeReadinessScore(c, feedItems, engagements);
      const label = getReadinessLabel(breakdown.total);
      const nextAction = getNextBestAction(c, engagements, pipelineState);
      const revenue = estimateCompanyValue(c);
      const lastEng = getLastEngagement(engagements, c.id);
      const lastContactDays = lastEng ? daysAgo(lastEng.timestamp) : null;
      const hasEmail = (c.leaders || []).some(l => l.email);
      const hasLinkedIn = (c.leaders || []).some(l => l.li);

      const readinessWeight = breakdown.total;
      const revenueWeight = Math.min(revenue / 25000, 4);
      const staleness = lastContactDays === null ? 3 : lastContactDays > 14 ? 2 : lastContactDays > 7 ? 1 : 0;
      const typeBoost = c.type === "SQO" ? 3 : c.type === "Client" ? 2 : c.type === "ICP" ? 1 : 0;

      items.push({
        company: c, readiness: breakdown.total, readinessLabel: label, nextAction,
        revenue, actionScore: readinessWeight + revenueWeight + staleness + typeBoost,
        lastContactDays, hasEmail, hasLinkedIn,
      });
    }

    return items.sort((a, b) => b.actionScore - a.actionScore).slice(0, 15);
  }, [companies, feedItems, engagements, pipelineState]);

  // === Recent Signals ===
  const recentSignals = useMemo(() => {
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    return feedItems
      .filter(f => f.dateEstimate > thirtyDaysAgo && f.heat !== "cool")
      .sort((a, b) => b.dateEstimate - a.dateEstimate)
      .slice(0, 10);
  }, [feedItems]);

  // === Coverage ===
  const coverage = useMemo(() => {
    const sqo = companies.filter(c => c.type === "SQO");
    const clients = companies.filter(c => c.type === "Client");
    const icp = companies.filter(c => c.type === "ICP");
    const contacted = (list: Company[]) => list.filter(c => getCompanyEngagements(engagements, c.id).length > 0).length;
    const withHubSpot = companies.filter(c => (c.hubspotDeals || []).length > 0).length;
    const readyCount = companies.filter(c => computeReadinessScore(c, feedItems, engagements).total >= 7).length;

    return {
      sqo: { total: sqo.length, contacted: contacted(sqo) },
      clients: { total: clients.length, contacted: contacted(clients) },
      icp: { total: icp.length, contacted: contacted(icp) },
      hubspotDeals: withHubSpot,
      readyToSend: readyCount,
    };
  }, [companies, engagements, feedItems]);

  // === Task actions ===
  const handleComplete = useCallback((task: TaskQueueItem) => {
    const newState = { ...queueState, completedTasks: [...queueState.completedTasks, task.id] };
    onUpdateQueueState(newState);
    if (task.type === "follow-up" && task.followUpId) {
      onCompleteFollowUp(task.followUpId);
    } else if (task.type === "sequence-step" && task.stepId && task.channel && task.engagementAction && onSequenceStep) {
      onSequenceStep(task.companyId, task.stepId, task.channel as EngagementChannel, task.engagementAction);
    } else {
      onOpenEngagement(task.companyId);
    }
  }, [queueState, onUpdateQueueState, onCompleteFollowUp, onSequenceStep, onOpenEngagement]);

  const handleSnooze = useCallback((taskId: string, days: number) => {
    const snoozeDate = addDays(days);
    onUpdateQueueState({ ...queueState, snoozedTasks: { ...queueState.snoozedTasks, [taskId]: snoozeDate } });
    setSnoozeTaskId(null);
  }, [queueState, onUpdateQueueState]);

  const handleDismiss = useCallback((taskId: string) => {
    onUpdateQueueState({ ...queueState, dismissedTasks: [...queueState.dismissedTasks, taskId] });
  }, [queueState, onUpdateQueueState]);

  const canDismiss = (task: TaskQueueItem) => task.type === "news-trigger" || task.type === "quick-win";

  return (
    <div className="h-full flex flex-col bg-background">
      <ScrollArea className="flex-1">
        <div className="max-w-5xl mx-auto p-6 space-y-8">

          {/* === 1. Pipeline Snapshot === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Pipeline</h2>
              <Badge variant="outline" className="text-xs ml-auto">{hubspotSnapshot.activeCount} active deals</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Active Pipeline</p>
                <p className="text-xl font-bold tabular-nums">{formatCurrency(hubspotSnapshot.totalPipeline)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Closed Won</p>
                <p className="text-xl font-bold tabular-nums text-green-400">{formatCurrency(hubspotSnapshot.totalClosed)}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">In HubSpot</p>
                <p className="text-xl font-bold tabular-nums">{coverage.hubspotDeals}</p>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Ready to Send</p>
                <p className="text-xl font-bold tabular-nums text-brand">{coverage.readyToSend}</p>
              </Card>
            </div>

            {hubspotSnapshot.activeDeals.length > 0 && (
              <div className="space-y-1.5">
                {hubspotSnapshot.activeDeals.slice(0, 8).map(({ company, deal }) => (
                  <div
                    key={deal.dealId}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCompany(company.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">{company.name}</span>
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-orange-500/10 text-orange-400 border-orange-500/30 shrink-0">
                          {deal.stageLabel || deal.stage}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{deal.dealName}</p>
                    </div>
                    {deal.amount && deal.amount > 0 && (
                      <span className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(deal.amount)}</span>
                    )}
                    <a
                      href={`https://app.hubspot.com/contacts/3800237/deal/${deal.dealId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-brand shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
            {hubspotSnapshot.activeDeals.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No active HubSpot deals.</p>
            )}
          </section>

          {/* === 2. Today's Tasks === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <ListChecks className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Today&apos;s Tasks</h2>
              <span className="text-xs text-muted-foreground ml-auto">
                {tasks.length === 0 ? "All caught up!" : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
              </span>
            </div>

            {tasks.length === 0 ? (
              <Card className="p-6 text-center shadow-none border-dashed">
                <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">No follow-ups due, no stale deals, no pending steps.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {(["critical", "high", "medium"] as TaskPriority[]).map((priority) => {
                  const group = grouped[priority];
                  if (group.length === 0) return null;
                  const style = priorityStyles[priority];

                  return (
                    <div key={priority}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-xs font-semibold uppercase tracking-wider", style.colorClass)}>{style.label}</span>
                        <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5 h-5", style.colorClass)}>{group.length}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        {group.map((task) => {
                          const Icon = typeTaskIcon[task.type] || Bell;
                          const isSnoozing = snoozeTaskId === task.id;

                          return (
                            <Card key={task.id} className={cn("p-3 shadow-none border transition-colors", style.bgClass)}>
                              <div className="flex items-start gap-3">
                                <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", style.colorClass)} />
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelectCompany(task.companyId)}>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-sm font-medium">{task.companyName}</span>
                                    <Badge variant="outline" className={cn("text-xs px-1 py-0.5 h-4 font-semibold", typeBadgeColors[task.companyType])}>
                                      {task.companyType}
                                    </Badge>
                                  </div>
                                  <p className="text-xs font-medium text-foreground/90 mt-0.5">{task.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.subtitle}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400 hover:bg-green-500/10" onClick={() => handleComplete(task)} title="Complete">
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-secondary/50" onClick={() => setSnoozeTaskId(isSnoozing ? null : task.id)} title="Snooze">
                                    <Clock className="h-3.5 w-3.5" />
                                  </Button>
                                  {canDismiss(task) && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-secondary/50" onClick={() => handleDismiss(task.id)} title="Dismiss">
                                      <X className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {isSnoozing && (
                                <div className="flex items-center gap-1.5 mt-2 pl-7">
                                  <span className="text-xs text-muted-foreground">Snooze:</span>
                                  {[{ label: "Tomorrow", days: 1 }, { label: "3 days", days: 3 }, { label: "1 week", days: 7 }].map((preset) => (
                                    <Button key={preset.label} variant="outline" size="sm" className="h-6 text-xs px-2" onClick={() => handleSnooze(task.id, preset.days)}>
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
              </div>
            )}

            {queueState.completedTasks.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">{queueState.completedTasks.length} completed today</p>
            )}
          </section>

          {/* === 3. Top Actions === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Top Actions</h2>
              <span className="text-xs text-muted-foreground ml-auto">Ranked by readiness + value + urgency</span>
            </div>
            <div className="space-y-1.5">
              {actionList.map(({ company, readiness, readinessLabel, nextAction, revenue, lastContactDays, hasEmail, hasLinkedIn }) => (
                <div
                  key={company.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors group"
                  onClick={() => onSelectCompany(company.id)}
                >
                  <div className="shrink-0 w-8 text-center">
                    <span className={cn("text-sm font-bold tabular-nums", getReadinessColor(readinessLabel))}>{readiness.toFixed(1)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{company.name}</span>
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4 shrink-0">{inferSubVertical(company)}</Badge>
                      {company.type === "SQO" && <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-red-500/10 text-red-400 border-red-500/30 shrink-0">SQO</Badge>}
                      {company.type === "Client" && <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-amber-500/10 text-amber-400 border-amber-500/30 shrink-0">Client</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-brand/80 font-medium">{nextAction}</span>
                      {lastContactDays !== null ? (
                        <span className="text-xs text-muted-foreground/60"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{formatDaysAgo(lastContactDays)}</span>
                      ) : (
                        <span className="text-xs text-orange-400/70">No contact yet</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {hasEmail && <Mail className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    {hasLinkedIn && <Linkedin className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  </div>
                  <span className="text-xs text-muted-foreground/60 tabular-nums shrink-0 w-12 text-right">{formatCurrency(revenue)}</span>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => { e.stopPropagation(); onOpenEngagement(company.id); }}
                  >
                    Log <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* === 4. Outreach Coverage === */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Outreach Coverage</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "SQO", ...coverage.sqo, color: "text-red-400" },
                { label: "Client", ...coverage.clients, color: "text-amber-400" },
                { label: "ICP", ...coverage.icp, color: "text-green-400" },
              ].map((tier) => {
                const pct = tier.total > 0 ? Math.round((tier.contacted / tier.total) * 100) : 0;
                return (
                  <Card key={tier.label} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("text-sm font-bold", tier.color)}>{tier.label}</span>
                      <span className="text-xs text-muted-foreground">{tier.contacted}/{tier.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : pct > 50 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {pct === 100 ? (
                        <><CheckCircle2 className="h-3 w-3 inline text-green-400 mr-0.5" />All contacted</>
                      ) : tier.total - tier.contacted > 0 ? (
                        <><AlertTriangle className="h-3 w-3 inline text-orange-400 mr-0.5" />{tier.total - tier.contacted} not yet contacted</>
                      ) : "No companies in tier"}
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* === 5. Recent Signals === */}
          {recentSignals.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Recent Signals</h2>
                <span className="text-xs text-muted-foreground ml-auto">Last 30 days</span>
              </div>
              <div className="space-y-1.5">
                {recentSignals.map((signal) => (
                  <div
                    key={signal.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-secondary/50 cursor-pointer transition-colors"
                    onClick={() => onSelectCompany(signal.companyId)}
                  >
                    <Circle className={cn("h-2 w-2 mt-1.5 shrink-0 fill-current", signal.heat === "hot" ? "text-red-400" : "text-yellow-400")} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand">{signal.companyName}</span>
                        <span className="text-xs text-muted-foreground/60">{signal.source}</span>
                      </div>
                      <p className="text-sm leading-tight mt-0.5">{signal.headline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
