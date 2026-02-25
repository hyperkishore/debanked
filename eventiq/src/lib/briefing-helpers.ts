import { Company, Leader, EngagementEntry } from "./types";
import { getCompanyEngagements, formatEngagementTime, formatActionLabel } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { detectPersona, getPersonaConfig } from "./persona-helpers";
import { detectCompetitors } from "./competitive-intel-helpers";

export interface PersonHook {
  hook: string;
  sourceType: "background" | "news" | "achievement" | "role";
  suggestedMention: string;
}

export interface TriggerContext {
  trigger: string;
  hvRelevance: string;
  urgencyLevel: "immediate" | "near_term" | "strategic";
}

export interface ObjectionPreempt {
  objection: string;
  preempt: string;
}

export interface PersonalizedAsks {
  openingAsk: string;
  closingAsk: string;
  fallbackAsk: string;
}

export interface PreCallBriefing {
  who: {
    leader: Leader;
    oneLiner: string;
    topHooks: string[];
    persona: ReturnType<typeof getPersonaConfig>;
  };
  lastTouch: {
    channel: string;
    action: string;
    when: string;
    contactName: string;
    notes: string;
  } | null;
  yourAngle: {
    talkingPoint: string;
    cta: string;
  };
  newsHook: {
    headline: string;
    source: string;
    suggestedOpener: string;
  } | null;
  landMines: string[];
  personHooks: PersonHook[];
  triggerContext: TriggerContext | null;
  objectionPreempts: ObjectionPreempt[];
  personalizedAsks: PersonalizedAsks;
}

function detectLandMines(company: Company, pipelineState: Record<string, PipelineRecord>, engagements: EngagementEntry[]): string[] {
  const mines: string[] = [];
  const desc = (company.desc || '').toLowerCase();
  const record = pipelineState[company.id];
  const stage = record?.stage || 'researched';
  const companyEngagements = getCompanyEngagements(engagements, company.id);

  if (desc.includes('proprietary') || desc.includes('in-house') || desc.includes('own platform')) {
    mines.push("Don't lead with replacement — they have proprietary tech");
  }
  if (desc.includes('regulatory') || desc.includes('compliance') || desc.includes('regulated')) {
    mines.push("Lead with compliance & SOC 2 — they're in a regulated space");
  }
  if (company.type === 'Client') {
    mines.push("Focus on expansion, not intro pitch — they're already a customer");
  }
  if (stage === 'lost') {
    mines.push("Re-engage with new angle — previously lost");
  }
  if (companyEngagements.some((e) => e.action === 'no_show')) {
    mines.push("Confirm attendance — they've no-showed before");
  }
  if (companyEngagements.some((e) => e.action === 'voicemail')) {
    mines.push("They may not pick up — try email/LinkedIn first");
  }

  return mines;
}

function selectAngle(company: Company, leader: Leader): { talkingPoint: string; cta: string } {
  const persona = detectPersona(leader.t);
  const config = getPersonaConfig(persona);
  const tps = company.tp || [];

  // Try to match a talking point to the persona angle
  const angleKeywords = config.talkingPointAngle.toLowerCase().split(' ');
  const matched = tps.find((tp) =>
    angleKeywords.some((kw) => tp.toLowerCase().includes(kw))
  );

  const talkingPoint = matched || tps[0] || "We help lenders automate underwriting with AI — 450+ companies on the platform.";
  const cta = company.ask || `Would love to show you how we can help ${company.name}. Open to a quick chat?`;

  return { talkingPoint, cta };
}

function extractPersonHooks(leader: Leader, company: Company): PersonHook[] {
  const hooks: PersonHook[] = [];
  const firstName = leader.n.split(" ")[0];

  // From leader hooks (highest quality — researched facts)
  for (const hook of leader.hooks || []) {
    const clean = hook.replace(/^\*/, "").trim();
    if (!clean) continue;
    const isStarred = hook.startsWith("*");
    hooks.push({
      hook: clean,
      sourceType: "achievement",
      suggestedMention: isStarred
        ? `Lead with this — it's memorable: "${clean}"`
        : `Natural conversation starter: "${clean}"`,
    });
  }

  // From leader background — extract specific facts
  if (leader.bg && leader.bg.length > 30) {
    const bg = leader.bg;

    // University mentions
    const uniMatch = bg.match(/\b(University|College|MIT|Stanford|Harvard|Wharton|Duke|Yale|Princeton|Columbia|NYU|UCLA|Berkeley|MBA)\b/i);
    if (uniMatch && !hooks.some(h => h.hook.toLowerCase().includes(uniMatch[0].toLowerCase()))) {
      hooks.push({
        hook: `Attended ${uniMatch[0]}`,
        sourceType: "background",
        suggestedMention: `"I saw you went to ${uniMatch[0]} — great program."`,
      });
    }

    // Previous company / role transitions
    const prevCompanyMatch = bg.match(/(?:former|previously|ex-|came from|worked at|joined from)\s+([A-Z][A-Za-z\s&]+)/i);
    if (prevCompanyMatch) {
      hooks.push({
        hook: `Previously at ${prevCompanyMatch[1].trim()}`,
        sourceType: "background",
        suggestedMention: `"Your experience at ${prevCompanyMatch[1].trim()} is relevant — you've seen this problem before."`,
      });
    }
  }

  // From company news mentioning the leader
  for (const news of company.news || []) {
    const text = `${news.h} ${news.d}`.toLowerCase();
    if (text.includes(firstName.toLowerCase()) || text.includes(leader.n.toLowerCase())) {
      hooks.push({
        hook: news.h,
        sourceType: "news",
        suggestedMention: `"Saw you were mentioned in '${news.h}' — congrats."`,
      });
      break; // One news mention is enough
    }
  }

  return hooks.slice(0, 5);
}

function buildTriggerContext(company: Company): TriggerContext | null {
  const news = company.news || [];
  if (news.length === 0) return null;

  const latest = news[0];
  const text = `${latest.h} ${latest.d}`.toLowerCase();

  if (/securitiz|raise|series|funding|capital|million|billion/.test(text)) {
    return {
      trigger: latest.h,
      hvRelevance: "Capital injection = scaling operations = need for automated underwriting to handle volume growth.",
      urgencyLevel: "immediate",
    };
  }
  if (/hire|appoint|new.*chief|new.*head|new.*vp/.test(text)) {
    return {
      trigger: latest.h,
      hvRelevance: "New leadership = vendor re-evaluation window. First 90 days are when new tech decisions get made.",
      urgencyLevel: "immediate",
    };
  }
  if (/regulat|compliance|law|bill|enforcement/.test(text)) {
    return {
      trigger: latest.h,
      hvRelevance: "Regulatory pressure = need for auditable, compliant verification processes.",
      urgencyLevel: "near_term",
    };
  }
  if (/launch|new product|expand|partner/.test(text)) {
    return {
      trigger: latest.h,
      hvRelevance: "New products/partnerships = new document types and volume spikes to handle.",
      urgencyLevel: "near_term",
    };
  }
  if (/milestone|record|surpass|award|growth/.test(text)) {
    return {
      trigger: latest.h,
      hvRelevance: "Growth milestones precede infrastructure investments — scale demands automation.",
      urgencyLevel: "strategic",
    };
  }

  return {
    trigger: latest.h,
    hvRelevance: "Market activity signal — validates they're an active player worth engaging.",
    urgencyLevel: "strategic",
  };
}

function buildObjectionPreempts(company: Company, pipelineState: Record<string, PipelineRecord>): ObjectionPreempt[] {
  const preempts: ObjectionPreempt[] = [];
  const desc = (company.desc || "").toLowerCase();
  const record = pipelineState[company.id];
  const stage = record?.stage || "researched";

  // Competitive preempts from detected competitors
  const competitors = detectCompetitors(company);
  for (const ctx of competitors.slice(0, 2)) {
    preempts.push({
      objection: `"We already use ${ctx.competitor.name}."`,
      preempt: ctx.battlecard.response,
    });
  }

  // Size-based preempts
  if (company.employees && company.employees < 30) {
    preempts.push({
      objection: `"We're too small for enterprise verification tools."`,
      preempt: "Usage-based pricing means you only pay for what you process. Teams as small as 5 people use HyperVerge. Start small, scale as you grow.",
    });
  }

  // In-house tech preempt
  if (desc.includes("proprietary") || desc.includes("in-house")) {
    preempts.push({
      objection: `"We've built our own system."`,
      preempt: "Great — we complement in-house systems via API. You keep your scoring models; we handle document extraction, verification, and fraud detection. Best of both worlds.",
    });
  }

  // Stage-based preempts
  if (stage === "contacted" || stage === "researched") {
    preempts.push({
      objection: `"Now isn't the right time."`,
      preempt: "Totally understand. Happy to share a case study from a similar lender so you have it when timing is right. 60% of our customers started conversations months before buying.",
    });
  }

  return preempts.slice(0, 4);
}

function buildPersonalizedAsks(leader: Leader, company: Company, triggerContext: TriggerContext | null): PersonalizedAsks {
  const firstName = leader.n.split(" ")[0];
  const companyName = company.name;

  // Opening ask — low commitment, tied to trigger
  let openingAsk: string;
  if (triggerContext && triggerContext.urgencyLevel === "immediate") {
    openingAsk = `${firstName}, given the recent news, would a quick 15-minute call make sense to see how we help lenders like ${companyName} handle the growth?`;
  } else if (company.ask) {
    openingAsk = company.ask;
  } else {
    openingAsk = `${firstName}, would you be open to a brief call to see how we help MCA lenders automate underwriting? Happy to share what we've learned from 450+ similar companies.`;
  }

  // Closing ask — bigger commitment if conversation goes well
  const closingAsk = `${firstName}, based on what we discussed — would it make sense to set up a technical demo with your underwriting team? I can prepare it around ${companyName}'s specific document types.`;

  // Fallback — if they're not interested
  const fallbackAsk = `No worries at all, ${firstName}. Mind if I send over a brief case study from a similar company? Happy to stay in touch for when timing is better.`;

  return { openingAsk, closingAsk, fallbackAsk };
}

export function generateBriefing(
  company: Company,
  leader: Leader,
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>
): PreCallBriefing {
  const persona = detectPersona(leader.t);
  const personaConfig = getPersonaConfig(persona);

  // One-liner from bg
  const bgSentence = leader.bg ? leader.bg.split('.')[0] + '.' : leader.t;
  const topHooks = (leader.hooks || []).slice(0, 3).map((h) => h.replace(/^\*/, ''));

  // Last touch
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const lastEntry = companyEngagements[0] || null;
  const lastTouch = lastEntry
    ? {
        channel: lastEntry.channel,
        action: formatActionLabel(lastEntry.action),
        when: formatEngagementTime(lastEntry.timestamp),
        contactName: lastEntry.contactName,
        notes: lastEntry.notes || '',
      }
    : null;

  // Angle
  const yourAngle = selectAngle(company, leader);

  // News hook
  const latestNews = company.news?.[0];
  const newsHook = latestNews
    ? {
        headline: latestNews.h,
        source: latestNews.s,
        suggestedOpener: `I saw the news about "${latestNews.h}" — excited to chat about how that impacts your underwriting needs.`,
      }
    : null;

  // Land mines
  const landMines = detectLandMines(company, pipelineState, engagements);

  // Enhanced briefing fields
  const personHooks = extractPersonHooks(leader, company);
  const triggerContext = buildTriggerContext(company);
  const objectionPreempts = buildObjectionPreempts(company, pipelineState);
  const personalizedAsks = buildPersonalizedAsks(leader, company, triggerContext);

  return {
    who: {
      leader,
      oneLiner: bgSentence,
      topHooks,
      persona: personaConfig,
    },
    lastTouch,
    yourAngle,
    newsHook,
    landMines,
    personHooks,
    triggerContext,
    objectionPreempts,
    personalizedAsks,
  };
}

export function briefingToText(briefing: PreCallBriefing, companyName: string): string {
  const lines: string[] = [];
  lines.push(`PRE-CALL BRIEFING: ${companyName}`);
  lines.push('='.repeat(40));
  lines.push('');

  // WHO
  lines.push(`WHO: ${briefing.who.leader.n} — ${briefing.who.leader.t}`);
  lines.push(`Persona: ${briefing.who.persona.label} (${briefing.who.persona.strategy})`);
  lines.push(briefing.who.oneLiner);
  if (briefing.who.topHooks.length > 0) {
    lines.push(`Hooks: ${briefing.who.topHooks.join(' | ')}`);
  }
  lines.push('');

  // LAST TOUCH
  if (briefing.lastTouch) {
    lines.push(`LAST TOUCH: ${briefing.lastTouch.action} via ${briefing.lastTouch.channel} (${briefing.lastTouch.when})`);
    lines.push(`With: ${briefing.lastTouch.contactName}`);
    if (briefing.lastTouch.notes) lines.push(`Notes: ${briefing.lastTouch.notes}`);
  } else {
    lines.push('LAST TOUCH: None — first contact');
  }
  lines.push('');

  // YOUR ANGLE
  lines.push('YOUR ANGLE:');
  lines.push(briefing.yourAngle.talkingPoint);
  lines.push(`CTA: ${briefing.yourAngle.cta}`);
  lines.push('');

  // NEWS HOOK
  if (briefing.newsHook) {
    lines.push(`NEWS HOOK: ${briefing.newsHook.headline}`);
    lines.push(`Source: ${briefing.newsHook.source}`);
    lines.push(`Opener: ${briefing.newsHook.suggestedOpener}`);
    lines.push('');
  }

  // PERSON-SPECIFIC HOOKS
  if (briefing.personHooks.length > 0) {
    lines.push('PERSON HOOKS:');
    briefing.personHooks.forEach((h) => lines.push(`  - ${h.hook} → ${h.suggestedMention}`));
    lines.push('');
  }

  // TRIGGER CONTEXT
  if (briefing.triggerContext) {
    lines.push(`TRIGGER: ${briefing.triggerContext.trigger}`);
    lines.push(`  Why it matters: ${briefing.triggerContext.hvRelevance}`);
    lines.push(`  Urgency: ${briefing.triggerContext.urgencyLevel}`);
    lines.push('');
  }

  // OBJECTION PREEMPTS
  if (briefing.objectionPreempts.length > 0) {
    lines.push('OBJECTION PREEMPTS:');
    briefing.objectionPreempts.forEach((o) => {
      lines.push(`  If they say: ${o.objection}`);
      lines.push(`  You say: ${o.preempt}`);
      lines.push('');
    });
  }

  // THE ASKS
  lines.push('THE ASKS:');
  lines.push(`  Opening: ${briefing.personalizedAsks.openingAsk}`);
  lines.push(`  If going well: ${briefing.personalizedAsks.closingAsk}`);
  lines.push(`  If not interested: ${briefing.personalizedAsks.fallbackAsk}`);
  lines.push('');

  // LAND MINES
  if (briefing.landMines.length > 0) {
    lines.push('LAND MINES:');
    briefing.landMines.forEach((m) => lines.push(`  - ${m}`));
  }

  return lines.join('\n');
}
