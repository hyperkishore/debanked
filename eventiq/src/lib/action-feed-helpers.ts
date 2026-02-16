import { Company, RatingData, EngagementEntry } from "./types";
import { getLastEngagement } from "./engagement-helpers";

export interface SuggestedAction {
  companyId: number;
  companyName: string;
  companyType: string;
  type: "follow-up" | "hot-lead" | "suggested";
  priority: "urgent" | "high" | "normal";
  reason: string;
  suggestedAction: string;
  cta: string;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function getFollowUpsDue(
  companies: Company[],
  metState: Record<string, boolean>,
  engagements: EngagementEntry[]
): SuggestedAction[] {
  const now = Date.now();
  const results: SuggestedAction[] = [];

  for (const c of companies) {
    if (!metState[c.id]) continue;
    const last = getLastEngagement(engagements, c.id);
    if (!last) {
      // Met but no engagement logged — urgent
      results.push({
        companyId: c.id,
        companyName: c.name,
        companyType: c.type,
        type: "follow-up",
        priority: "urgent",
        reason: "Met but no follow-up logged",
        suggestedAction: "Send initial follow-up",
        cta: "Log Follow-up",
      });
      continue;
    }
    const gapMs = now - new Date(last.timestamp).getTime();
    if (gapMs > THREE_DAYS_MS) {
      const days = Math.floor(gapMs / 86400000);
      results.push({
        companyId: c.id,
        companyName: c.name,
        companyType: c.type,
        type: "follow-up",
        priority: days > 7 ? "urgent" : "high",
        reason: `Last touch ${days}d ago`,
        suggestedAction: `Follow up via ${last.channel}`,
        cta: "Log Follow-up",
      });
    }
  }

  // Sort by staleness (longest gap first)
  return results.sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, normal: 2 };
    return pOrder[a.priority] - pOrder[b.priority];
  });
}

export function getHotLeadsNeedingAction(
  companies: Company[],
  ratingState: Record<string, RatingData>,
  engagements: EngagementEntry[]
): SuggestedAction[] {
  const results: SuggestedAction[] = [];

  for (const c of companies) {
    const rd = ratingState[c.id];
    if (!rd || rd.rating !== "hot") continue;

    const pendingFollowUps = (rd.followUps || []).filter((f) => f !== "none");
    if (pendingFollowUps.length === 0) continue;

    // Check if any of the pending follow-ups have been done
    const companyEngagements = engagements.filter((e) => e.companyId === c.id);
    const doneActions = new Set(companyEngagements.map((e) => e.action));

    for (const fu of pendingFollowUps) {
      const actionKey =
        fu === "demo" ? "demo" : fu === "email" ? "sent_followup" : "sent_connection";
      if (!doneActions.has(actionKey) && !doneActions.has(`scheduled`)) {
        results.push({
          companyId: c.id,
          companyName: c.name,
          companyType: c.type,
          type: "hot-lead",
          priority: "high",
          reason: `Hot lead — ${fu} pending`,
          suggestedAction: fu === "demo" ? "Schedule demo" : fu === "email" ? "Send follow-up email" : "Send warm intro request",
          cta: fu === "demo" ? "Schedule Demo" : "Send Message",
        });
      }
    }
  }

  return results;
}

export function getSuggestedActions(
  companies: Company[],
  metState: Record<string, boolean>,
  ratingState: Record<string, RatingData>,
  engagements: EngagementEntry[]
): SuggestedAction[] {
  const followUps = getFollowUpsDue(companies, metState, engagements);
  const hotLeads = getHotLeadsNeedingAction(companies, ratingState, engagements);

  // Merge and sort: urgent → high → normal
  const all = [...followUps, ...hotLeads];
  const pOrder = { urgent: 0, high: 1, normal: 2 };
  all.sort((a, b) => pOrder[a.priority] - pOrder[b.priority]);

  // Deduplicate by companyId (keep highest priority)
  const seen = new Set<number>();
  const deduped: SuggestedAction[] = [];
  for (const a of all) {
    if (!seen.has(a.companyId)) {
      seen.add(a.companyId);
      deduped.push(a);
    }
  }

  return deduped;
}
