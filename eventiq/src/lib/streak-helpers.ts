import { EngagementEntry } from "./types";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  dailyGoal: number;
  dailyCounts: Record<string, number>;
}

export const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveDate: "",
  dailyGoal: 20,
  dailyCounts: {},
};

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function computeStreak(engagements: EngagementEntry[]): StreakData {
  if (engagements.length === 0) return { ...DEFAULT_STREAK };

  // Build daily counts
  const dailyCounts: Record<string, number> = {};
  for (const e of engagements) {
    const key = toDateKey(new Date(e.timestamp));
    dailyCounts[key] = (dailyCounts[key] || 0) + 1;
  }

  // Walk backward from today counting consecutive days
  const today = new Date();
  let currentStreak = 0;
  let d = new Date(today);

  // Check if today has activity — if not, start from yesterday
  const todayKey = toDateKey(today);
  if (!dailyCounts[todayKey]) {
    d.setDate(d.getDate() - 1);
    const yesterdayKey = toDateKey(d);
    if (!dailyCounts[yesterdayKey]) {
      // No activity today or yesterday — streak is 0
      return {
        currentStreak: 0,
        longestStreak: computeLongestStreak(dailyCounts),
        lastActiveDate: findLastActiveDate(dailyCounts),
        dailyGoal: DEFAULT_STREAK.dailyGoal,
        dailyCounts,
      };
    }
  }

  while (dailyCounts[toDateKey(d)]) {
    currentStreak++;
    d.setDate(d.getDate() - 1);
  }

  const longestStreak = Math.max(currentStreak, computeLongestStreak(dailyCounts));

  return {
    currentStreak,
    longestStreak,
    lastActiveDate: findLastActiveDate(dailyCounts),
    dailyGoal: DEFAULT_STREAK.dailyGoal,
    dailyCounts,
  };
}

function computeLongestStreak(dailyCounts: Record<string, number>): number {
  const days = Object.keys(dailyCounts).sort();
  if (days.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function findLastActiveDate(dailyCounts: Record<string, number>): string {
  const days = Object.keys(dailyCounts).sort();
  return days.length > 0 ? days[days.length - 1] : "";
}

export function getTodayProgress(engagements: EngagementEntry[], dailyGoal = 20): { done: number; goal: number; pct: number } {
  const todayKey = toDateKey(new Date());
  let done = 0;
  for (const e of engagements) {
    if (toDateKey(new Date(e.timestamp)) === todayKey) done++;
  }
  return { done, goal: dailyGoal, pct: Math.min((done / dailyGoal) * 100, 100) };
}

export function getRecentActivityCount(engagements: EngagementEntry[], hoursBack = 1): number {
  const cutoff = Date.now() - hoursBack * 3600000;
  return engagements.filter((e) => new Date(e.timestamp).getTime() > cutoff).length;
}

export type MilestoneType =
  | "first_engagement"
  | "10_total"
  | "25_total"
  | "50_total"
  | "100_total"
  | "7_day_streak"
  | "14_day_streak"
  | "30_day_streak";

export interface Milestone {
  type: MilestoneType;
  label: string;
  emoji: string;
}

const TOTAL_MILESTONES: [number, MilestoneType, string, string][] = [
  [1, "first_engagement", "First outreach logged!", "\u{1F680}"],
  [10, "10_total", "10 engagements!", "\u{1F525}"],
  [25, "25_total", "25 engagements!", "\u26A1"],
  [50, "50_total", "50 engagements!", "\u{1F3AF}"],
  [100, "100_total", "100 engagements!", "\u{1F3C6}"],
];

const STREAK_MILESTONES: [number, MilestoneType, string, string][] = [
  [7, "7_day_streak", "7-day streak!", "\u{1F525}"],
  [14, "14_day_streak", "14-day streak!", "\u{1F4AA}"],
  [30, "30_day_streak", "30-day streak!", "\u{1F451}"],
];

export function checkMilestone(prevTotal: number, newTotal: number): Milestone | null {
  for (const [threshold, type, label, emoji] of TOTAL_MILESTONES) {
    if (prevTotal < threshold && newTotal >= threshold) {
      return { type, label, emoji };
    }
  }
  return null;
}

export function checkStreakMilestone(prevStreak: number, newStreak: number): Milestone | null {
  for (const [threshold, type, label, emoji] of STREAK_MILESTONES) {
    if (prevStreak < threshold && newStreak >= threshold) {
      return { type, label, emoji };
    }
  }
  return null;
}
