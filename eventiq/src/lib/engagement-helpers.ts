import { EngagementChannel, EngagementEntry, Company } from "./types";

export interface ChannelConfig {
  id: EngagementChannel;
  label: string;
  icon: string; // lucide icon name
  colorClass: string;
  actions: { value: string; label: string }[];
}

export const CHANNELS: ChannelConfig[] = [
  {
    id: "email",
    label: "Email",
    icon: "Mail",
    colorClass: "text-blue-400 bg-blue-400/15",
    actions: [
      { value: "sent_intro", label: "Sent Intro" },
      { value: "sent_followup", label: "Sent Follow-up" },
      { value: "received_reply", label: "Received Reply" },
      { value: "sent_proposal", label: "Sent Proposal" },
    ],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icon: "Linkedin",
    colorClass: "text-sky-400 bg-sky-400/15",
    actions: [
      { value: "sent_connection", label: "Sent Connection" },
      { value: "connected", label: "Connected" },
      { value: "sent_message", label: "Sent Message" },
      { value: "received_message", label: "Received Message" },
      { value: "commented", label: "Commented" },
    ],
  },
  {
    id: "imessage",
    label: "iMessage",
    icon: "MessageCircle",
    colorClass: "text-green-400 bg-green-400/15",
    actions: [
      { value: "sent_message", label: "Sent Message" },
      { value: "received_message", label: "Received Message" },
    ],
  },
  {
    id: "call",
    label: "Call",
    icon: "Phone",
    colorClass: "text-amber-400 bg-amber-400/15",
    actions: [
      { value: "outbound_call", label: "Outbound Call" },
      { value: "inbound_call", label: "Inbound Call" },
      { value: "voicemail", label: "Voicemail" },
    ],
  },
  {
    id: "meeting",
    label: "Meeting",
    icon: "Calendar",
    colorClass: "text-purple-400 bg-purple-400/15",
    actions: [
      { value: "scheduled", label: "Scheduled" },
      { value: "completed", label: "Completed" },
      { value: "demo", label: "Demo" },
      { value: "no_show", label: "No Show" },
    ],
  },
  {
    id: "note",
    label: "Note",
    icon: "StickyNote",
    colorClass: "text-muted-foreground bg-muted/50",
    actions: [
      { value: "general", label: "General" },
      { value: "follow_up_reminder", label: "Follow-up Reminder" },
      { value: "internal", label: "Internal" },
    ],
  },
];

export function getChannelConfig(channel: EngagementChannel): ChannelConfig {
  return CHANNELS.find((c) => c.id === channel) || CHANNELS[0];
}

export function getCompanyEngagements(
  engagements: EngagementEntry[],
  companyId: number
): EngagementEntry[] {
  return engagements
    .filter((e) => e.companyId === companyId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getLastEngagement(
  engagements: EngagementEntry[],
  companyId: number
): EngagementEntry | null {
  const companyEngagements = getCompanyEngagements(engagements, companyId);
  return companyEngagements[0] || null;
}

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function needsFollowUp(
  engagements: EngagementEntry[],
  companyId: number
): boolean {
  const last = getLastEngagement(engagements, companyId);
  if (!last) return true;
  return Date.now() - new Date(last.timestamp).getTime() > THREE_DAYS_MS;
}

export function formatEngagementTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getAllContacts(company: Company): { name: string; linkedIn?: string }[] {
  const contacts: { name: string; linkedIn?: string }[] = [];
  if (company.leaders) {
    for (const l of company.leaders) {
      contacts.push({ name: l.n, linkedIn: l.li });
    }
  }
  for (const c of company.contacts) {
    if (!contacts.some((ct) => ct.name === c.n)) {
      contacts.push({ name: c.n });
    }
  }
  return contacts;
}

export function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Deduplicate engagements by id, or by companyId+contactName+channel+action+timestamp
 */
export function deduplicateEngagements(engagements: EngagementEntry[]): EngagementEntry[] {
  const seen = new Set<string>();
  const result: EngagementEntry[] = [];

  for (const e of engagements) {
    // Primary dedup key: id
    if (seen.has(e.id)) continue;
    seen.add(e.id);

    // Secondary dedup: composite key (catches imports of same data with different ids)
    const compositeKey = `${e.companyId}::${e.contactName}::${e.channel}::${e.action}::${e.timestamp}`;
    if (seen.has(compositeKey)) continue;
    seen.add(compositeKey);

    result.push(e);
  }

  return result;
}
