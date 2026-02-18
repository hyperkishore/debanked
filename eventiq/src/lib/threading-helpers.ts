import { Company, Leader, EngagementEntry } from "./types";
import { getCompanyEngagements } from "./engagement-helpers";
import { PersonaType, detectPersona, getPersonaPriority, getPersonaConfig } from "./persona-helpers";

export type ThreadingStatus = 'untouched' | 'contacted' | 'warm' | 'champion';

export interface LeaderThread {
  leader: Leader;
  persona: PersonaType;
  status: ThreadingStatus;
  engagementCount: number;
  lastChannel?: string;
}

export interface ThreadingMap {
  threads: LeaderThread[];
  engagedCount: number;
  totalCount: number;
  coveragePct: number;
  suggestion: string | null;
}

const POSITIVE_ACTIONS = new Set([
  'received_reply', 'connected', 'demo', 'completed', 'received_message', 'inbound_call',
]);

function inferStatus(engagementCount: number, hasPositiveAction: boolean): ThreadingStatus {
  if (engagementCount >= 5 && hasPositiveAction) return 'champion';
  if (engagementCount >= 3) return 'warm';
  if (engagementCount >= 1) return 'contacted';
  return 'untouched';
}

export const STATUS_STYLES: Record<ThreadingStatus, { label: string; colorClass: string }> = {
  untouched: { label: 'Untouched', colorClass: 'bg-muted/50 text-muted-foreground' },
  contacted: { label: 'Contacted', colorClass: 'bg-blue-500/15 text-blue-400' },
  warm: { label: 'Warm', colorClass: 'bg-amber-500/15 text-amber-400' },
  champion: { label: 'Champion', colorClass: 'bg-green-500/15 text-green-400' },
};

export function buildThreadingMap(
  company: Company,
  engagements: EngagementEntry[]
): ThreadingMap {
  const leaders = company.leaders || [];
  if (leaders.length === 0) {
    return {
      threads: [],
      engagedCount: 0,
      totalCount: 0,
      coveragePct: 0,
      suggestion: null,
    };
  }

  const companyEngagements = getCompanyEngagements(engagements, company.id);

  const threads: LeaderThread[] = leaders.map((leader) => {
    const leaderEngagements = companyEngagements.filter(
      (e) => e.contactName === leader.n
    );
    const hasPositiveAction = leaderEngagements.some((e) => POSITIVE_ACTIONS.has(e.action));
    const lastEngagement = leaderEngagements[0]; // already sorted desc

    return {
      leader,
      persona: detectPersona(leader.t),
      status: inferStatus(leaderEngagements.length, hasPositiveAction),
      engagementCount: leaderEngagements.length,
      lastChannel: lastEngagement?.channel,
    };
  });

  const engagedCount = threads.filter((t) => t.status !== 'untouched').length;
  const totalCount = threads.length;
  const coveragePct = totalCount > 0 ? Math.round((engagedCount / totalCount) * 100) : 0;

  // Suggestion: pick highest-priority untouched persona
  const untouched = threads
    .filter((t) => t.status === 'untouched')
    .sort((a, b) => getPersonaPriority(a.persona) - getPersonaPriority(b.persona));

  let suggestion: string | null = null;
  if (untouched.length > 0) {
    const target = untouched[0];
    const config = getPersonaConfig(target.persona);
    const firstName = target.leader.n.split(' ')[0];
    suggestion = `Try reaching ${firstName} — ${config.strategy.toLowerCase()} angle`;
  }

  return { threads, engagedCount, totalCount, coveragePct, suggestion };
}
