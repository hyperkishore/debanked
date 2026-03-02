import { Company, Leader, EngagementEntry, EngagementChannel } from "./types";
import { getCompanyEngagements, getLastEngagement } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { generateMessageVariants } from "./message-variants";
import { generateLinkedInVariants } from "./linkedin-message";
import type { AttentionLabel } from "./attention-score";
import type { WhyNowCategory } from "./why-now-engine";

export type SequenceType =
  | 'cold'
  | 'warm'
  | 're-engage'
  | 'post-demo'
  | 'event-follow-up'
  | 'referral-intro'
  | 'case-study'
  | 'pain-trigger'
  | 'executive-briefing'
  | 'renewal-upsell';

export interface SequenceStep {
  id: string;
  dayOffset: number;
  channel: EngagementChannel;
  description: string;
  preWrittenContent: string;
  engagementAction: string;
}

export interface Sequence {
  type: SequenceType;
  label: string;
  steps: SequenceStep[];
}

export interface SequenceProgress {
  companyId: number;
  sequenceType: SequenceType;
  startedAt: string;
  completedSteps: string[];
}

const SEQUENCE_LABELS: Record<SequenceType, string> = {
  cold: 'Cold Outreach',
  warm: 'Warm Follow-up',
  're-engage': 'Re-engage',
  'post-demo': 'Post-Demo',
  'event-follow-up': 'Event Follow-Up',
  'referral-intro': 'Referral Intro',
  'case-study': 'Case Study',
  'pain-trigger': 'Pain Trigger',
  'executive-briefing': 'Executive Briefing',
  'renewal-upsell': 'Renewal/Upsell',
};

const SEQUENCE_COLORS: Record<SequenceType, string> = {
  cold: 'bg-blue-500/15 text-blue-400',
  warm: 'bg-amber-500/15 text-amber-400',
  're-engage': 'bg-purple-500/15 text-purple-400',
  'post-demo': 'bg-green-500/15 text-green-400',
  'event-follow-up': 'bg-cyan-500/15 text-cyan-400',
  'referral-intro': 'bg-pink-500/15 text-pink-400',
  'case-study': 'bg-emerald-500/15 text-emerald-400',
  'pain-trigger': 'bg-red-500/15 text-red-400',
  'executive-briefing': 'bg-indigo-500/15 text-indigo-400',
  'renewal-upsell': 'bg-teal-500/15 text-teal-400',
};

export function getSequenceColor(type: SequenceType): string {
  return SEQUENCE_COLORS[type];
}

export function autoSelectSequence(
  company: Company,
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>,
  attentionLabel?: AttentionLabel,
  whyNowCategory?: WhyNowCategory
): SequenceType {
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const record = pipelineState[company.id];
  const stage = record?.stage || 'researched';

  // Post-demo
  if (stage === 'demo' || companyEngagements.some((e) => e.action === 'demo' || e.action === 'completed')) {
    return 'post-demo';
  }

  // Won/proposal — renewal/upsell
  if (stage === 'won') {
    return 'renewal-upsell';
  }

  // Fire + hot signal = pain-trigger (high urgency, signal-driven)
  if (attentionLabel === 'fire' && whyNowCategory === 'hot') {
    return 'pain-trigger';
  }

  // Hot attention + executive decision-maker = executive briefing
  if (attentionLabel === 'fire' || attentionLabel === 'hot') {
    if (companyEngagements.length === 0) {
      return 'executive-briefing';
    }
  }

  // No engagement
  if (companyEngagements.length === 0) {
    return 'cold';
  }

  // Stale (5+ days)
  const last = companyEngagements[0];
  if (last) {
    const daysSince = Math.floor(
      (Date.now() - new Date(last.timestamp).getTime()) / 86400000
    );
    if (daysSince >= 5) {
      // Hot signal on stale contact → case study re-engage
      if (whyNowCategory === 'hot') {
        return 'case-study';
      }
      return 're-engage';
    }
  }

  return 'warm';
}

export function generateSequence(
  type: SequenceType,
  company: Company,
  leader: Leader | undefined
): Sequence {
  const firstName = leader?.n.split(' ')[0] || 'there';
  const companyName = company.name;

  // Generate content from existing generators
  let emailContent = '';
  let linkedInContent = '';
  if (leader) {
    const emailVariants = generateMessageVariants(leader, company);
    const linkedInVariants = generateLinkedInVariants(leader, company);
    emailContent = emailVariants[1]?.body || emailVariants[0]?.body || ''; // casual preferred
    linkedInContent = linkedInVariants[0]?.body || '';
  }

  const shortTP = company.tp?.length
    ? company.tp.reduce((a, b) => (a.length < b.length ? a : b))
    : "We help lenders automate underwriting with AI — 450+ companies on the platform.";

  const steps: SequenceStep[] = [];

  switch (type) {
    case 'cold':
      steps.push(
        {
          id: 'cold-1',
          dayOffset: 0,
          channel: 'linkedin',
          description: 'Send LinkedIn connection request',
          preWrittenContent: linkedInContent || `Hi ${firstName}, great to come across ${companyName}. Would love to connect!`,
          engagementAction: 'sent_connection',
        },
        {
          id: 'cold-2',
          dayOffset: 2,
          channel: 'email',
          description: 'Send intro email',
          preWrittenContent: emailContent || `Hi ${firstName},\n\n${shortTP}\n\nWould love to chat. Open to a quick 15-min call?\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_intro',
        },
        {
          id: 'cold-3',
          dayOffset: 5,
          channel: 'email',
          description: 'Follow-up email',
          preWrittenContent: `Hi ${firstName},\n\nJust circling back on my note earlier this week. ${shortTP}\n\nHappy to jump on a quick call whenever works for you.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'cold-4',
          dayOffset: 8,
          channel: 'call',
          description: 'Direct call',
          preWrittenContent: `Call script: "Hi ${firstName}, this is [Name] from HyperVerge. I sent you a note about our underwriting automation platform — wanted to see if you had 2 minutes to chat about how we're helping lenders like ${companyName}."`,
          engagementAction: 'outbound_call',
        },
        {
          id: 'cold-5',
          dayOffset: 12,
          channel: 'email',
          description: 'Breakup email',
          preWrittenContent: `Hi ${firstName},\n\nI've reached out a few times and understand you're busy. I'll leave you with this: we're helping 450+ lenders cut underwriting from 40 min to under 5.\n\nIf timing works better down the road, I'm always here. No hard feelings!\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        }
      );
      break;

    case 'warm':
      steps.push(
        {
          id: 'warm-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Thank you / recap email',
          preWrittenContent: `Hi ${firstName},\n\nGreat connecting with you! As discussed, ${shortTP}\n\nAttaching a quick overview for your review. Let me know if you have any questions.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'warm-2',
          dayOffset: 2,
          channel: 'email',
          description: 'Share case study',
          preWrittenContent: `Hi ${firstName},\n\nThought you'd find this relevant — one of our customers in a similar space saw 80% reduction in underwriting time after deploying HyperVerge.\n\nWould love to walk you through the specifics if helpful.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'warm-3',
          dayOffset: 5,
          channel: 'call',
          description: 'Check-in call',
          preWrittenContent: `Call script: "Hi ${firstName}, just following up on the materials I sent. Wanted to see if you had any questions and if it makes sense to set up a deeper dive with our team."`,
          engagementAction: 'outbound_call',
        },
        {
          id: 'warm-4',
          dayOffset: 10,
          channel: 'email',
          description: 'Proposal / next steps',
          preWrittenContent: `Hi ${firstName},\n\nBased on our conversations, I've put together a proposal tailored to ${companyName}'s needs. Would love to walk you through it.\n\nAre you available for a 30-min call this week?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_proposal',
        }
      );
      break;

    case 're-engage':
      steps.push(
        {
          id: 'reengage-1',
          dayOffset: 0,
          channel: 'email',
          description: 'News-based re-engage email',
          preWrittenContent: company.news?.[0]
            ? `Hi ${firstName},\n\nSaw the news about "${company.news[0].h}" — exciting times at ${companyName}!\n\nWanted to reconnect and share some new capabilities we've launched since we last spoke. Would love to catch up.\n\nBest,\n[Your Name]`
            : `Hi ${firstName},\n\nIt's been a while since we connected. We've shipped some exciting new features I think would be relevant to ${companyName}.\n\nWould love to catch up — are you open to a quick chat?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'reengage-2',
          dayOffset: 2,
          channel: 'linkedin',
          description: 'LinkedIn message / engage with content',
          preWrittenContent: `Hi ${firstName}, hope you're doing well! Wanted to reconnect — we've been doing some exciting work with lenders in your space. Would love to catch up.`,
          engagementAction: 'sent_message',
        },
        {
          id: 'reengage-3',
          dayOffset: 5,
          channel: 'email',
          description: 'New angle email',
          preWrittenContent: `Hi ${firstName},\n\nQuick thought — since we last spoke, we've launched our AI Co-Pilot that handles end-to-end underwriting automation. Different from what we discussed before.\n\n${shortTP}\n\nWorth a fresh look?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'reengage-4',
          dayOffset: 8,
          channel: 'call',
          description: 'Direct call',
          preWrittenContent: `Call script: "Hi ${firstName}, this is [Name] from HyperVerge. We connected a while back about underwriting automation. Wanted to share some new developments and see if the timing is better now."`,
          engagementAction: 'outbound_call',
        }
      );
      break;

    case 'post-demo':
      steps.push(
        {
          id: 'postdemo-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Demo recap email',
          preWrittenContent: `Hi ${firstName},\n\nThanks for taking the time to see HyperVerge in action today. Here's a quick recap:\n\n- Document extraction: 98%+ accuracy on bank statements\n- Processing time: Under 5 minutes per application\n- Integration: REST API, works with your existing stack\n\nLet me know if you have any follow-up questions. Happy to set up a technical deep-dive with your team.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'postdemo-2',
          dayOffset: 2,
          channel: 'email',
          description: 'ROI analysis',
          preWrittenContent: `Hi ${firstName},\n\nPut together a quick ROI analysis based on what we discussed:\n\n- Current: ~40 min per underwriting decision\n- With HyperVerge: Under 5 min\n- At your volume, that's [X] hours saved per month\n\nHappy to refine these numbers with your team. What do you think?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'postdemo-3',
          dayOffset: 5,
          channel: 'email',
          description: 'Send proposal',
          preWrittenContent: `Hi ${firstName},\n\nBased on our demo and follow-up discussions, I've prepared a proposal for ${companyName}. It covers:\n\n- Implementation timeline (2-3 weeks)\n- Pricing model (usage-based)\n- Support & SLA details\n\nWould love to walk through it together. Available this week?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_proposal',
        },
        {
          id: 'postdemo-4',
          dayOffset: 10,
          channel: 'call',
          description: 'Decision check-in',
          preWrittenContent: `Call script: "Hi ${firstName}, just checking in on the proposal I sent. Want to make sure you have everything you need to make a decision. Any questions from your team?"`,
          engagementAction: 'outbound_call',
        }
      );
      break;

    case 'event-follow-up':
      steps.push(
        {
          id: 'event-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Personalized event recap',
          preWrittenContent: `Hi ${firstName},\n\nGreat meeting you at the event! Really enjoyed our conversation about ${companyName}'s approach to underwriting.\n\n${shortTP}\n\nWould love to continue the conversation — are you free for a quick call this week?\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'event-2',
          dayOffset: 2,
          channel: 'linkedin',
          description: 'LinkedIn connect + value-add',
          preWrittenContent: `Hi ${firstName}, great meeting you at the event! Wanted to connect here and share that case study I mentioned about automating underwriting for lenders like ${companyName}.`,
          engagementAction: 'sent_connection',
        },
        {
          id: 'event-3',
          dayOffset: 7,
          channel: 'email',
          description: 'Meeting request with specific value',
          preWrittenContent: `Hi ${firstName},\n\nFollowing up from our event conversation — I've put together a quick analysis of how HyperVerge could help ${companyName} specifically.\n\nWould love 20 minutes to walk through it. How does next week look?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'event-4',
          dayOffset: 14,
          channel: 'email',
          description: 'Final nudge',
          preWrittenContent: `Hi ${firstName},\n\nCircling back one more time from our event chat. I know things get busy post-conference.\n\nIf now isn't the right time, no worries — but if you're evaluating underwriting automation this quarter, I'd love to be part of the conversation.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        }
      );
      break;

    case 'referral-intro':
      steps.push(
        {
          id: 'referral-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Warm intro email',
          preWrittenContent: `Hi ${firstName},\n\n[Referrer Name] suggested I reach out — mentioned ${companyName} is looking at ways to streamline underwriting operations.\n\n${shortTP}\n\nWould love to connect and share how we might help. Open to a quick chat?\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_intro',
        },
        {
          id: 'referral-2',
          dayOffset: 3,
          channel: 'linkedin',
          description: 'LinkedIn connect',
          preWrittenContent: `Hi ${firstName}, [Referrer Name] connected us — would love to chat about how HyperVerge helps lenders like ${companyName} automate underwriting. Looking forward to connecting!`,
          engagementAction: 'sent_connection',
        },
        {
          id: 'referral-3',
          dayOffset: 7,
          channel: 'email',
          description: 'Follow-up with value',
          preWrittenContent: `Hi ${firstName},\n\nJust following up on my note earlier. I know [Referrer Name] mentioned we've been helping similar companies — happy to share specifics on a quick call.\n\nNo pressure, just want to make sure the intro doesn't go to waste!\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'referral-4',
          dayOffset: 14,
          channel: 'email',
          description: 'Direct ask',
          preWrittenContent: `Hi ${firstName},\n\nLast note from me — if the timing isn't right, I completely understand. But if underwriting automation is on your radar this quarter, I'd love 15 minutes to show what we're doing for 450+ lenders.\n\nEither way, appreciate your time.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        }
      );
      break;

    case 'case-study':
      steps.push(
        {
          id: 'casestudy-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Relevant case study share',
          preWrittenContent: `Hi ${firstName},\n\nThought you'd find this interesting — we recently helped a company similar to ${companyName} cut their underwriting time by 80% while improving accuracy.\n\nAttaching the case study. The volume and document mix looked a lot like what I'd expect at ${companyName}.\n\nWorth a quick look?\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'casestudy-2',
          dayOffset: 4,
          channel: 'email',
          description: 'ROI analysis tailored to them',
          preWrittenContent: `Hi ${firstName},\n\nBuilding on the case study I shared — I ran some quick numbers for ${companyName}:\n\n- At your scale, you're likely spending [X] hours/month on manual underwriting\n- Automation could save 80% of that while reducing error rates\n- Most clients see ROI within the first 60 days\n\nHappy to walk through the details. 15 minutes?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'casestudy-3',
          dayOffset: 10,
          channel: 'call',
          description: 'Meeting request call',
          preWrittenContent: `Call script: "Hi ${firstName}, I sent over a case study and ROI analysis for ${companyName}. Wanted to see if you had a chance to review and if it'd be worth setting up a deeper conversation."`,
          engagementAction: 'outbound_call',
        }
      );
      break;

    case 'pain-trigger':
      steps.push(
        {
          id: 'pain-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Signal-based outreach',
          preWrittenContent: `Hi ${firstName},\n\nSaw the recent news about ${companyName} — {{whyNow}}.\n\nWe've been helping 450+ lenders navigate exactly this kind of operational challenge. ${shortTP}\n\nWould love to share how we can help ${companyName} specifically.\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_intro',
        },
        {
          id: 'pain-2',
          dayOffset: 3,
          channel: 'email',
          description: 'Solution brief',
          preWrittenContent: `Hi ${firstName},\n\nFollowing up on my note — I put together a quick brief on how HyperVerge addresses the specific challenge ${companyName} is facing.\n\nThe short version: we automate document extraction, verification, and decision logic so your team focuses on deals, not paperwork.\n\nWorth 15 minutes to walk through?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'pain-3',
          dayOffset: 7,
          channel: 'email',
          description: 'Demo offer',
          preWrittenContent: `Hi ${firstName},\n\nI know timing matters when you're dealing with operational pressure. Rather than another email, would it help to see the platform in action?\n\nI can do a quick 20-minute demo showing exactly how ${companyName}'s document flow would work through our system.\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'pain-4',
          dayOffset: 14,
          channel: 'call',
          description: 'Executive escalation',
          preWrittenContent: `Call script: "Hi, I'm reaching out from HyperVerge. I've been in touch with ${firstName} about underwriting automation for ${companyName}. Given the urgency of your current situation, I wanted to connect directly — is there someone on the leadership team handling vendor evaluations right now?"`,
          engagementAction: 'outbound_call',
        }
      );
      break;

    case 'executive-briefing':
      steps.push(
        {
          id: 'execbrief-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Market intel share',
          preWrittenContent: `Hi ${firstName},\n\nI've been tracking the SMB lending automation space closely and thought you'd find this relevant:\n\n- 450+ lenders now using AI underwriting (up 3x from 2024)\n- Average decision time dropping from 40 min to <5 min\n- Leaders in your segment are investing now to build competitive moats\n\n${companyName} is well-positioned — happy to share a custom analysis if helpful.\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_intro',
        },
        {
          id: 'execbrief-2',
          dayOffset: 5,
          channel: 'email',
          description: 'Custom analysis',
          preWrittenContent: `Hi ${firstName},\n\nPut together a brief competitive analysis for ${companyName}'s segment — how your peers are approaching underwriting automation and where the market is heading.\n\nNo pitch attached, just market intelligence I think would be useful for strategic planning.\n\nWant me to send it over, or better to walk through it live?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'execbrief-3',
          dayOffset: 12,
          channel: 'call',
          description: 'Executive briefing invite',
          preWrittenContent: `Call script: "Hi ${firstName}, I've been sharing some market intel about underwriting automation trends in your segment. I'd love to set up a 30-minute executive briefing — no pitch, just competitive landscape and where ${companyName} fits in. Would that be valuable?"`,
          engagementAction: 'outbound_call',
        }
      );
      break;

    case 'renewal-upsell':
      steps.push(
        {
          id: 'renewal-1',
          dayOffset: 0,
          channel: 'email',
          description: 'Usage recap + impact',
          preWrittenContent: `Hi ${firstName},\n\nWanted to share a quick recap of ${companyName}'s results with HyperVerge:\n\n- [X] applications processed this quarter\n- [X]% reduction in processing time\n- [X]% accuracy on document extraction\n\nImpressive numbers! Would love to discuss how to build on this momentum.\n\nBest,\n[Your Name]\nHyperVerge`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'renewal-2',
          dayOffset: 7,
          channel: 'email',
          description: 'New feature introduction',
          preWrittenContent: `Hi ${firstName},\n\nQuick heads up — we've launched some new capabilities I think ${companyName} would benefit from:\n\n- AI Co-Pilot for complex underwriting decisions\n- Multi-document cross-validation\n- Custom decisioning rules engine\n\nBased on your usage patterns, these could add significant value. Want a quick walkthrough?\n\nBest,\n[Your Name]`,
          engagementAction: 'sent_followup',
        },
        {
          id: 'renewal-3',
          dayOffset: 14,
          channel: 'call',
          description: 'Expansion discussion',
          preWrittenContent: `Call script: "Hi ${firstName}, following up on the new features I shared. Given ${companyName}'s growing volume, I wanted to discuss expansion options — more document types, higher throughput, and the new AI Co-Pilot. Would love to set up a proper review."`,
          engagementAction: 'outbound_call',
        }
      );
      break;
  }

  return {
    type,
    label: SEQUENCE_LABELS[type],
    steps,
  };
}
