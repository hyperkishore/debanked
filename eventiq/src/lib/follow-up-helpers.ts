import { Company, EngagementEntry } from "./types";
import { getLastEngagement } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";

export interface FollowUpReminder {
  id: string;
  companyId: number;
  contactName: string;
  dueDate: string;        // YYYY-MM-DD
  notes: string;
  createdAt: string;
  completed?: boolean;
}

export interface CategorizedFollowUp {
  followUp: FollowUpReminder;
  category: "overdue" | "today" | "stale";
  daysDelta: number;       // negative = overdue, 0 = today, positive = upcoming
  companyName: string;
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isFollowUpActive(followUp: FollowUpReminder): boolean {
  return !followUp.completed;
}

export function getSnoozePresets(): { label: string; date: string }[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const threeDays = new Date(now);
  threeDays.setDate(threeDays.getDate() + 3);
  const oneWeek = new Date(now);
  oneWeek.setDate(oneWeek.getDate() + 7);

  return [
    { label: "Tomorrow", date: toDateStr(tomorrow) },
    { label: "3 days", date: toDateStr(threeDays) },
    { label: "1 week", date: toDateStr(oneWeek) },
  ];
}

const STALE_THRESHOLD_DAYS = 5;

export function categorizeTodayActions(
  followUps: FollowUpReminder[],
  companies: Company[],
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>
): CategorizedFollowUp[] {
  const today = toDateStr(new Date());
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const result: CategorizedFollowUp[] = [];

  // Explicit follow-ups
  for (const fu of followUps) {
    if (fu.completed) continue;
    const company = companyMap.get(fu.companyId);
    if (!company) continue;

    const daysDelta = Math.floor(
      (new Date(fu.dueDate).getTime() - new Date(today).getTime()) / 86400000
    );

    if (daysDelta <= 0) {
      result.push({
        followUp: fu,
        category: daysDelta < 0 ? "overdue" : "today",
        daysDelta,
        companyName: company.name,
      });
    }
  }

  // Stale pipeline companies (contacted/engaged/demo with no activity in 5+ days, no explicit follow-up)
  const followUpCompanyIds = new Set(
    followUps.filter((f) => !f.completed).map((f) => f.companyId)
  );

  for (const company of companies) {
    if (followUpCompanyIds.has(company.id)) continue;

    const record = pipelineState[company.id];
    if (!record) continue;

    const activeStages = ["contacted", "engaged", "demo"];
    if (!activeStages.includes(record.stage)) continue;

    const last = getLastEngagement(engagements, company.id);
    if (!last) continue;

    const daysSince = Math.floor(
      (Date.now() - new Date(last.timestamp).getTime()) / 86400000
    );

    if (daysSince >= STALE_THRESHOLD_DAYS) {
      result.push({
        followUp: {
          id: `stale-${company.id}`,
          companyId: company.id,
          contactName: last.contactName,
          dueDate: today,
          notes: `${record.stage} — no activity in ${daysSince}d`,
          createdAt: new Date().toISOString(),
        },
        category: "stale",
        daysDelta: 0,
        companyName: company.name,
      });
    }
  }

  // Sort: overdue first (most negative), then today, then stale
  result.sort((a, b) => {
    const catOrder = { overdue: 0, today: 1, stale: 2 };
    const catDiff = catOrder[a.category] - catOrder[b.category];
    if (catDiff !== 0) return catDiff;
    return a.daysDelta - b.daysDelta;
  });

  return result;
}
