/**
 * Campaign and attribution type definitions.
 * Supports multi-touch campaign tracking and attribution modeling.
 */

export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type TouchChannel = "email" | "linkedin" | "call" | "event" | "direct_mail" | "referral";
export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: CampaignStatus;
  startDate: string;
  endDate?: string;
  targetCompanyIds: number[];
  touches: CampaignTouch[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignTouch {
  id: string;
  campaignId: string;
  channel: TouchChannel;
  subject: string;
  body?: string;
  dayOffset: number;
  order: number;
}

export interface Attribution {
  campaignId: string;
  companyId: number;
  touchId: string;
  channel: TouchChannel;
  model: AttributionModel;
  weight: number;
  outcome: "meeting" | "sql" | "opportunity" | "closed_won";
  attributedAt: string;
}

/** Default campaign templates for common GTM motions. */
export const CAMPAIGN_TEMPLATES: Array<{
  name: string;
  description: string;
  touches: Array<Omit<CampaignTouch, "id" | "campaignId">>;
}> = [
  {
    name: "Cold Outbound Sequence",
    description: "5-touch sequence for cold ICP accounts",
    touches: [
      { channel: "email", subject: "Initial outreach", dayOffset: 0, order: 1 },
      { channel: "linkedin", subject: "Connection request + note", dayOffset: 1, order: 2 },
      { channel: "email", subject: "Value prop follow-up", dayOffset: 3, order: 3 },
      { channel: "call", subject: "Phone follow-up", dayOffset: 5, order: 4 },
      { channel: "email", subject: "Breakup email", dayOffset: 10, order: 5 },
    ],
  },
  {
    name: "Event Follow-Up Sprint",
    description: "10-day post-event multi-touch",
    touches: [
      { channel: "email", subject: "Great meeting at [event]", dayOffset: 0, order: 1 },
      { channel: "linkedin", subject: "Connect post-event", dayOffset: 1, order: 2 },
      { channel: "email", subject: "Recap + resource share", dayOffset: 3, order: 3 },
      { channel: "call", subject: "Follow-up call", dayOffset: 5, order: 4 },
      { channel: "email", subject: "Meeting ask", dayOffset: 7, order: 5 },
      { channel: "email", subject: "Final follow-up", dayOffset: 10, order: 6 },
    ],
  },
  {
    name: "Trigger-Based Gifting",
    description: "Gift + 3-touch sequence on hard triggers",
    touches: [
      { channel: "direct_mail", subject: "Personalized gift on trigger event", dayOffset: 0, order: 1 },
      { channel: "email", subject: "Gift follow-up + value prop", dayOffset: 2, order: 2 },
      { channel: "linkedin", subject: "Warm LinkedIn touch", dayOffset: 3, order: 3 },
      { channel: "call", subject: "Phone to book meeting", dayOffset: 5, order: 4 },
    ],
  },
];
