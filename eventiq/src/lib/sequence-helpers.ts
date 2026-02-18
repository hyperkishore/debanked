import { Company, Leader, EngagementEntry, EngagementChannel } from "./types";
import { getCompanyEngagements, getLastEngagement } from "./engagement-helpers";
import { PipelineRecord } from "./pipeline-helpers";
import { generateMessageVariants } from "./message-variants";
import { generateLinkedInVariants } from "./linkedin-message";

export type SequenceType = 'cold' | 'warm' | 're-engage' | 'post-demo';

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
};

const SEQUENCE_COLORS: Record<SequenceType, string> = {
  cold: 'bg-blue-500/15 text-blue-400',
  warm: 'bg-amber-500/15 text-amber-400',
  're-engage': 'bg-purple-500/15 text-purple-400',
  'post-demo': 'bg-green-500/15 text-green-400',
};

export function getSequenceColor(type: SequenceType): string {
  return SEQUENCE_COLORS[type];
}

export function autoSelectSequence(
  company: Company,
  engagements: EngagementEntry[],
  pipelineState: Record<string, PipelineRecord>
): SequenceType {
  const companyEngagements = getCompanyEngagements(engagements, company.id);
  const record = pipelineState[company.id];
  const stage = record?.stage || 'researched';

  // Post-demo
  if (stage === 'demo' || companyEngagements.some((e) => e.action === 'demo' || e.action === 'completed')) {
    return 'post-demo';
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
  }

  return {
    type,
    label: SEQUENCE_LABELS[type],
    steps,
  };
}
