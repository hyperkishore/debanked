import { Company, EngagementEntry } from "./types";
import { PipelineRecord } from "./pipeline-helpers";
import { FollowUpReminder } from "./follow-up-helpers";
import { SequenceProgress, generateSequence, autoSelectSequence } from "./sequence-helpers";
import { getLastEngagement, getCompanyEngagements } from "./engagement-helpers";
import { computeOutreachScore, getUrgencyTier } from "./outreach-score";

export type TaskType = "follow-up" | "stale-deal" | "sequence-step" | "news-trigger" | "quick-win";
export type TaskPriority = "critical" | "high" | "medium";

export interface TaskQueueItem {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  companyId: number;
  companyName: string;
  companyType: string;
  title: string;
  subtitle: string;
  /** For follow-ups and sequence steps */
  contactName?: string;
  /** For sequence steps */
  stepId?: string;
  channel?: string;
  engagementAction?: string;
  /** Days overdue (negative = not yet due) */
  daysOverdue?: number;
  /** Original follow-up id for complete action */
  followUpId?: string;
}

export interface TaskQueueState {
  completedTasks: string[];
  dismissedTasks: string[];
  snoozedTasks: Record<string, string>; // taskId → snooze date (YYYY-MM-DD)
  lastResetDate: string; // YYYY-MM-DD — for daily reset
}

export const DEFAULT_TASK_QUEUE_STATE: TaskQueueState = {
  completedTasks: [],
  dismissedTasks: [],
  snoozedTasks: {},
  lastResetDate: new Date().toISOString().slice(0, 10),
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Reset completed/dismissed if the date has changed. Snoozed tasks persist. */
export function maybeResetDaily(state: TaskQueueState): TaskQueueState {
  const today = todayStr();
  if (state.lastResetDate === today) return state;
  return {
    completedTasks: [],
    dismissedTasks: [],
    snoozedTasks: state.snoozedTasks,
    lastResetDate: today,
  };
}

const ACTIVE_STAGES = new Set(["contacted", "engaged", "demo", "proposal"]);

export function buildTaskQueue(
  companies: Company[],
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>,
  metState: Record<string, boolean>,
  followUps: FollowUpReminder[],
  sequences: Record<number, SequenceProgress>,
  queueState: TaskQueueState
): TaskQueueItem[] {
  const today = todayStr();
  const tasks: TaskQueueItem[] = [];
  const companyMap = new Map(companies.map((c) => [c.id, c]));

  // Filter helper: skip completed, dismissed, or snoozed-for-later
  const isHidden = (taskId: string) => {
    if (queueState.completedTasks.includes(taskId)) return true;
    if (queueState.dismissedTasks.includes(taskId)) return true;
    const snoozeDate = queueState.snoozedTasks[taskId];
    if (snoozeDate && snoozeDate > today) return true;
    return false;
  };

  // 1. Follow-up reminders due
  for (const fu of followUps) {
    if (fu.completed) continue;
    const taskId = `follow-up-${fu.id}`;
    if (isHidden(taskId)) continue;

    const company = companyMap.get(fu.companyId);
    if (!company) continue;

    const daysOverdue = Math.floor(
      (new Date(today).getTime() - new Date(fu.dueDate).getTime()) / 86400000
    );
    // Only show if due today or overdue
    if (daysOverdue < 0) continue;

    const priority: TaskPriority = daysOverdue > 0 ? "critical" : "high";

    tasks.push({
      id: taskId,
      type: "follow-up",
      priority,
      companyId: company.id,
      companyName: company.name,
      companyType: company.type,
      title: daysOverdue > 0
        ? `Overdue follow-up (${daysOverdue}d)`
        : "Follow-up due today",
      subtitle: fu.notes || `Contact: ${fu.contactName}`,
      contactName: fu.contactName,
      daysOverdue,
      followUpId: fu.id,
    });
  }

  // 2. Stale pipeline deals
  for (const company of companies) {
    const record = pipelineState[company.id];
    if (!record) continue;
    if (!ACTIVE_STAGES.has(record.stage)) continue;

    const last = getLastEngagement(engagements, company.id);
    if (!last) continue;

    const daysSince = Math.floor(
      (Date.now() - new Date(last.timestamp).getTime()) / 86400000
    );

    if (daysSince < 7) continue;

    const taskId = `stale-deal-${company.id}`;
    if (isHidden(taskId)) continue;

    const priority: TaskPriority = daysSince >= 10 ? "critical" : "high";

    tasks.push({
      id: taskId,
      type: "stale-deal",
      priority,
      companyId: company.id,
      companyName: company.name,
      companyType: company.type,
      title: `Deal going cold (${daysSince}d silent)`,
      subtitle: `${record.stage} stage — last: ${last.channel}`,
      contactName: last.contactName,
      daysOverdue: daysSince,
    });
  }

  // 3. Sequence steps due
  for (const [companyIdStr, progress] of Object.entries(sequences)) {
    const companyId = Number(companyIdStr);
    const company = companyMap.get(companyId);
    if (!company) continue;

    const leader = company.leaders?.[0];
    const sequence = generateSequence(progress.sequenceType, company, leader);
    const startDate = new Date(progress.startedAt);

    for (const step of sequence.steps) {
      if (progress.completedSteps.includes(step.id)) continue;

      const stepDueDate = new Date(startDate);
      stepDueDate.setDate(stepDueDate.getDate() + step.dayOffset);
      const stepDueDateStr = stepDueDate.toISOString().slice(0, 10);

      const daysOverdue = Math.floor(
        (new Date(today).getTime() - stepDueDate.getTime()) / 86400000
      );

      // Only show if due today or overdue
      if (daysOverdue < 0) continue;

      const taskId = `sequence-${companyId}-${step.id}`;
      if (isHidden(taskId)) continue;

      const priority: TaskPriority = daysOverdue > 0 ? "high" : "medium";

      tasks.push({
        id: taskId,
        type: "sequence-step",
        priority,
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        title: step.description,
        subtitle: `${progress.sequenceType} sequence — ${step.channel}`,
        contactName: leader?.n,
        stepId: step.id,
        channel: step.channel,
        engagementAction: step.engagementAction,
        daysOverdue,
      });

      // Only show the next uncompleted step per company
      break;
    }
  }

  // 4. News triggers — active pipeline companies with fresh news
  for (const company of companies) {
    const record = pipelineState[company.id];
    if (!record) continue;
    if (!ACTIVE_STAGES.has(record.stage)) continue;
    if (!company.news || company.news.length === 0) continue;

    const taskId = `news-${company.id}`;
    if (isHidden(taskId)) continue;

    // Don't duplicate if already has a follow-up or stale-deal task
    if (tasks.some((t) => t.companyId === company.id && (t.type === "follow-up" || t.type === "stale-deal"))) continue;

    const latest = company.news[0];
    tasks.push({
      id: taskId,
      type: "news-trigger",
      priority: "medium",
      companyId: company.id,
      companyName: company.name,
      companyType: company.type,
      title: `News: ${latest.h.substring(0, 60)}`,
      subtitle: latest.s,
    });
  }

  // 5. Quick wins — high-score never-contacted companies
  for (const company of companies) {
    const companyEngagements = getCompanyEngagements(engagements, company.id);
    if (companyEngagements.length > 0) continue;

    const breakdown = computeOutreachScore(company, engagements, pipelineState, metState);
    if (breakdown.total < 100) continue;

    const taskId = `quick-win-${company.id}`;
    if (isHidden(taskId)) continue;

    tasks.push({
      id: taskId,
      type: "quick-win",
      priority: "medium",
      companyId: company.id,
      companyName: company.name,
      companyType: company.type,
      title: `High-score prospect (${breakdown.total})`,
      subtitle: `${company.type} — never contacted`,
    });
  }

  // Sort by priority: critical → high → medium
  const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2 };
  tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tasks;
}
