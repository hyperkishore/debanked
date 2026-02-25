import { Company, Leader } from "./types";
import { FeedItem, SignalType, SignalHeat } from "./feed-helpers";
import { detectPersona } from "./persona-helpers";

/**
 * "WHY NOW" TRIGGER CARD SYSTEM
 *
 * When a signal fires (funding, leadership hire, regulatory event),
 * auto-generate a ready-to-send outreach package tied to that SPECIFIC trigger.
 *
 * Not "Hi {name}, I noticed your company..." but:
 * "Hi Sarah, saw the $50M raise last week — at that growth rate
 *  your underwriting team is probably drowning. We automate that."
 */

export type TriggerType = "funding" | "leadership_hire" | "regulatory" | "product_launch" | "partnership" | "milestone";

export interface TriggerCard {
  id: string;
  companyId: number;
  companyName: string;
  triggerType: TriggerType;
  signalHeadline: string;
  signalSource: string;
  signalDate: number;
  whyNow: string;
  targetContact: {
    name: string;
    title: string;
    email?: string;
    linkedIn?: string;
    rationale: string;
  } | null;
  outreachPackage: {
    emailSubject: string;
    emailBody: string;
    linkedInMessage: string;
    talkingPoints: string[];
    objectionPreempt: string;
  };
  hookLine: string;
  urgency: number; // 0-10
  expiresInDays: number;
  heat: SignalHeat;
}

// Map signal types to trigger types
function signalToTrigger(signalType: SignalType): TriggerType | null {
  switch (signalType) {
    case "funding": return "funding";
    case "hiring": return "leadership_hire";
    case "regulatory": return "regulatory";
    case "product": return "product_launch";
    case "partnership": return "partnership";
    case "milestone": return "milestone";
    default: return null;
  }
}

// Expiration windows by trigger type
const EXPIRATION_DAYS: Record<TriggerType, number> = {
  funding: 45,
  leadership_hire: 21,
  regulatory: 60,
  product_launch: 30,
  partnership: 30,
  milestone: 30,
};

// Which persona type best matches each trigger?
const TRIGGER_PERSONA_MAP: Record<TriggerType, string[]> = {
  funding: ["executive", "finance"],
  leadership_hire: ["executive", "operations"],
  regulatory: ["finance", "operations"],
  product_launch: ["technical", "operations"],
  partnership: ["executive", "growth"],
  milestone: ["executive", "growth"],
};

function selectBestContact(
  company: Company,
  triggerType: TriggerType
): TriggerCard["targetContact"] | null {
  const leaders = company.leaders || [];
  if (leaders.length === 0) return null;

  const preferredPersonas = TRIGGER_PERSONA_MAP[triggerType];

  // Score each leader for this trigger
  const scored = leaders.map(leader => {
    const persona = detectPersona(leader.t);
    let score = 0;

    // Persona match
    const personaIdx = preferredPersonas.indexOf(persona);
    if (personaIdx === 0) score += 10;
    else if (personaIdx >= 0) score += 6;
    else if (persona !== "unknown") score += 2;

    // Reachability
    if (leader.email) score += 5;
    if (leader.li) score += 3;
    if (leader.phone) score += 1;

    // Background depth (better personalization)
    if (leader.bg && leader.bg.length > 50) score += 2;
    if (leader.hooks && leader.hooks.length >= 2) score += 1;

    return { leader, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;

  const persona = detectPersona(best.leader.t);
  const matchesPreferred = preferredPersonas.includes(persona);

  return {
    name: best.leader.n,
    title: best.leader.t,
    email: best.leader.email,
    linkedIn: best.leader.li,
    rationale: matchesPreferred
      ? `Best ${preferredPersonas[0]} contact for ${triggerType.replace("_", " ")} triggers`
      : `Most reachable contact (no ${preferredPersonas[0]} persona identified)`,
  };
}

function generateWhyNow(triggerType: TriggerType, headline: string, companyName: string): string {
  switch (triggerType) {
    case "funding":
      return `${companyName} just secured capital — they'll be scaling operations and need infrastructure to handle volume growth.`;
    case "leadership_hire":
      return `New leadership often means new vendor evaluations. The first 90 days are when decisions get made.`;
    case "regulatory":
      return `Regulatory pressure means ${companyName} needs compliant, auditable processes ASAP — manual workflows won't cut it.`;
    case "product_launch":
      return `${companyName} is expanding their product line — new products mean new underwriting requirements and higher document volumes.`;
    case "partnership":
      return `New partnerships drive volume spikes. ${companyName} will need to scale verification to meet partner SLAs.`;
    case "milestone":
      return `Growth milestones often precede infrastructure investments — ${companyName} is likely evaluating how to maintain quality at scale.`;
  }
}

function generateOutreachPackage(
  company: Company,
  signal: FeedItem,
  triggerType: TriggerType,
  contact: TriggerCard["targetContact"]
): TriggerCard["outreachPackage"] {
  const firstName = contact?.name.split(" ")[0] || "there";
  const companyName = company.name;

  // Trigger-specific email subjects
  const subjects: Record<TriggerType, string> = {
    funding: `Congrats on the news, ${firstName} — quick thought on scaling`,
    leadership_hire: `Welcome aboard at ${companyName} — quick intro`,
    regulatory: `${companyName} + compliance automation`,
    product_launch: `Saw ${companyName}'s launch — thoughts on verification at scale`,
    partnership: `${companyName}'s expansion — how we can help`,
    milestone: `Congrats on the milestone, ${firstName}`,
  };

  // Trigger-specific openers that reference the ACTUAL signal
  const openerMap: Record<TriggerType, string> = {
    funding: `Saw the news: "${signal.headline}" — congrats! With that kind of growth, your underwriting pipeline is about to get a lot busier.`,
    leadership_hire: `Noticed the leadership news at ${companyName}: "${signal.headline}." The first 90 days are all about quick wins — wanted to share one.`,
    regulatory: `"${signal.headline}" caught my eye. Regulatory shifts like this are exactly why lenders are moving to automated, auditable verification.`,
    product_launch: `"${signal.headline}" — exciting move. New products always mean new document types and higher volumes to verify.`,
    partnership: `Saw "${signal.headline}" — partnerships like this drive volume. Wanted to make sure your verification stack is ready for the surge.`,
    milestone: `"${signal.headline}" — impressive. Companies hitting this kind of scale often need to upgrade from manual to automated underwriting.`,
  };

  // Use company talking points or generate generic
  const valueProp = company.tp?.[0] || `We help lenders like ${companyName} automate document verification and underwriting — 450+ companies on the platform, cutting decision time from 40 minutes to under 5.`;
  const cta = company.ask || `Would love to show you how we can help ${companyName} — open to a 15-minute call this week?`;

  const emailBody = `Hi ${firstName},

${openerMap[triggerType]}

${valueProp}

${cta}

Best,
[Your Name]
HyperVerge`;

  // LinkedIn is shorter
  const linkedInMessage = `Hi ${firstName} — saw the news about ${companyName} ("${signal.headline.slice(0, 60)}..."). We help 450+ lenders automate underwriting verification. Would love to connect and share how we might help.`;

  // Trigger-specific talking points
  const triggerTPs = generateTriggerTalkingPoints(triggerType, company);

  // Objection preempt based on trigger
  const objectionMap: Record<TriggerType, string> = {
    funding: `They may say "we just raised, we're building in-house." Counter: "Most lenders start in-house then realize the maintenance cost. We plug in via API — you keep your models, we handle extraction."`,
    leadership_hire: `New leader may not know the landscape yet. Lead with education, not a hard sell. Offer a "landscape overview" call.`,
    regulatory: `They may be defensive about compliance. Frame as "we make compliance easier" not "you have a problem."`,
    product_launch: `They may be focused on launch, not infrastructure. Position as "make the launch successful by having verification ready."`,
    partnership: `They may already have a partner's preferred vendor. Ask "what's your current verification stack?" before positioning.`,
    milestone: `They may say "things are working fine." Counter: "That's exactly the right time to invest — before scale breaks what works today."`,
  };

  return {
    emailSubject: subjects[triggerType],
    emailBody,
    linkedInMessage,
    talkingPoints: triggerTPs,
    objectionPreempt: objectionMap[triggerType],
  };
}

function generateTriggerTalkingPoints(triggerType: TriggerType, company: Company): string[] {
  const name = company.name;
  const baseTPs = company.tp || [];

  const triggerSpecific: Record<TriggerType, string[]> = {
    funding: [
      `Growth capital means more applications — at 450+ lender clients, we've seen funding rounds drive 2-3x volume spikes.`,
      baseTPs[0] || `${name} can process applications in under 5 minutes vs. 40+ minutes manually.`,
      `Our usage-based pricing scales with your growth — no heavy upfront investment needed.`,
    ],
    leadership_hire: [
      `New leaders typically review vendor stack in their first 90 days — great timing for a fresh look at underwriting automation.`,
      baseTPs[0] || `We've helped 450+ lenders automate document verification and cut decision time by 80%.`,
      `Quick implementation: most clients go live in 2-3 weeks via REST API.`,
    ],
    regulatory: [
      `Compliance-grade verification with full audit trails — SOC 2 Type II certified, designed for regulatory scrutiny.`,
      baseTPs[0] || `${name} gets automated, explainable decisions that satisfy state-level disclosure requirements.`,
      `Every decision is auditable and traceable — critical for the regulatory environment ${name} operates in.`,
    ],
    product_launch: [
      `New products mean new document types — our AI handles bank statements, tax returns, business licenses, and more.`,
      baseTPs[0] || `${name} can launch new products faster with pre-built verification workflows.`,
      `We scale elastically — process 10 or 10,000 applications without infrastructure changes.`,
    ],
    partnership: [
      `Partner integrations drive volume surges — our API handles spikes without degradation.`,
      baseTPs[0] || `${name}'s partners get faster onboarding with automated verification.`,
      `Embedded verification APIs that plug into partner platforms with zero manual review needed.`,
    ],
    milestone: [
      `Growth milestones often expose manual bottlenecks — what worked at 100 apps/month breaks at 1,000.`,
      baseTPs[0] || `At ${name}'s scale, automation isn't optional — it's the difference between growth and burnout.`,
      `Our customers see 80%+ reduction in underwriting time, freeing teams to focus on deals, not documents.`,
    ],
  };

  return triggerSpecific[triggerType];
}

function generateHookLine(triggerType: TriggerType, signal: FeedItem, companyName: string): string {
  switch (triggerType) {
    case "funding":
      return `Congrats on "${signal.headline.slice(0, 50)}..." — let's talk about scaling underwriting to match.`;
    case "leadership_hire":
      return `Welcome aboard at ${companyName} — we help 450+ lenders automate underwriting decisions.`;
    case "regulatory":
      return `"${signal.headline.slice(0, 50)}..." — compliance-grade verification is how lenders stay ahead of this.`;
    case "product_launch":
      return `"${signal.headline.slice(0, 50)}..." — new products need new verification workflows. We can help.`;
    case "partnership":
      return `"${signal.headline.slice(0, 50)}..." — partnerships drive volume. Make sure verification keeps up.`;
    case "milestone":
      return `"${signal.headline.slice(0, 50)}..." — impressive growth. Let's make sure your underwriting scales with it.`;
  }
}

function scoreTriggerUrgency(signal: FeedItem, triggerType: TriggerType): number {
  const ageInDays = (Date.now() - signal.dateEstimate) / 86400000;
  const expirationWindow = EXPIRATION_DAYS[triggerType];

  // Base urgency from freshness (0-5)
  let urgency = 0;
  if (ageInDays < 3) urgency = 5;
  else if (ageInDays < 7) urgency = 4;
  else if (ageInDays < 14) urgency = 3;
  else if (ageInDays < 30) urgency = 2;
  else urgency = 1;

  // Boost for actionable trigger types (0-3)
  if (triggerType === "funding" || triggerType === "leadership_hire") urgency += 3;
  else if (triggerType === "regulatory") urgency += 2;
  else urgency += 1;

  // Heat boost (0-2)
  if (signal.heat === "hot") urgency += 2;
  else if (signal.heat === "warm") urgency += 1;

  return Math.min(urgency, 10);
}

export function generateTriggerCards(
  company: Company,
  feedItems: FeedItem[]
): TriggerCard[] {
  const companySignals = feedItems.filter(f => f.companyId === company.id);
  const cards: TriggerCard[] = [];
  const seenTriggerTypes = new Set<TriggerType>();

  for (const signal of companySignals) {
    const triggerType = signalToTrigger(signal.signalType);
    if (!triggerType) continue;

    // One trigger card per type per company (most recent wins)
    if (seenTriggerTypes.has(triggerType)) continue;

    // Check expiration
    const ageInDays = (Date.now() - signal.dateEstimate) / 86400000;
    if (ageInDays > EXPIRATION_DAYS[triggerType]) continue;

    seenTriggerTypes.add(triggerType);

    const contact = selectBestContact(company, triggerType);
    const outreachPackage = generateOutreachPackage(company, signal, triggerType, contact);
    const urgency = scoreTriggerUrgency(signal, triggerType);

    cards.push({
      id: `trigger-${company.id}-${triggerType}`,
      companyId: company.id,
      companyName: company.name,
      triggerType,
      signalHeadline: signal.headline,
      signalSource: signal.source,
      signalDate: signal.dateEstimate,
      whyNow: generateWhyNow(triggerType, signal.headline, company.name),
      targetContact: contact,
      outreachPackage,
      hookLine: generateHookLine(triggerType, signal, company.name),
      urgency,
      expiresInDays: Math.max(0, Math.round(EXPIRATION_DAYS[triggerType] - ageInDays)),
      heat: signal.heat,
    });
  }

  // Sort by urgency descending
  cards.sort((a, b) => b.urgency - a.urgency);
  return cards;
}

/** Get all trigger cards across all companies, sorted by urgency */
export function getAllTriggerCards(
  companies: Company[],
  feedItems: FeedItem[]
): TriggerCard[] {
  const allCards: TriggerCard[] = [];
  for (const company of companies) {
    allCards.push(...generateTriggerCards(company, feedItems));
  }
  allCards.sort((a, b) => b.urgency - a.urgency);
  return allCards;
}
