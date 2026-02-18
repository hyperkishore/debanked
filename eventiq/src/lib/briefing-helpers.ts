import { Company, Leader, EngagementEntry } from "./types";
import { getCompanyEngagements, formatEngagementTime, formatActionLabel } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { detectPersona, getPersonaConfig } from "./persona-helpers";

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

  // LAND MINES
  if (briefing.landMines.length > 0) {
    lines.push('LAND MINES:');
    briefing.landMines.forEach((m) => lines.push(`  - ${m}`));
  }

  return lines.join('\n');
}
