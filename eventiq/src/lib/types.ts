export interface Contact {
  n: string;
  t: string;
}

export interface NewsItem {
  h: string;
  s: string;
  d: string;
}

export interface Leader {
  n: string;
  t: string;
  bg: string;
  hooks?: string[];
  li?: string;
}

export type CompanyType = 'SQO' | 'Client' | 'ICP';

export interface Company {
  id: number;
  name: string;
  type: CompanyType;
  priority: number;
  phase: number;
  booth: boolean;
  clear?: boolean;
  contacts: Contact[];
  desc: string;
  notes: string;
  news: NewsItem[];
  ice: string;
  icebreakers?: string[];
  tp: string[];
  leaders?: Leader[];
  ask: string;
}

export type FilterType = 'all' | 'SQO' | 'Client' | 'ICP' | 'Met' | 'CLEAR' | 'FollowUp';
export type SortType = 'name' | 'type' | 'priority' | 'phase';
export type ViewType = 'cards' | 'table';
export type TabType = 'companies' | 'schedule' | 'pitch' | 'checklist';

export type Rating = 'hot' | 'warm' | 'cold' | '';
export type FollowUp = 'demo' | 'email' | 'intro' | 'none';

export interface RatingData {
  rating: Rating;
  followUps: FollowUp[];
  careAbout: string;
  promised: string;
  personal: string;
}

export interface SchedulePhase {
  id: number;
  start: string;
  end: string;
  title: string;
  description: string;
  items: ScheduleItem[];
}

export interface ScheduleItem {
  company: string;
  contact: string;
  type?: CompanyType;
}

export interface ProgramSession {
  tag: 'keynote' | 'panel' | 'demo';
  title: string;
  speakers: ProgramSpeaker[];
}

export interface ProgramSpeaker {
  name: string;
  company: string;
  type?: CompanyType;
}

export interface Objection {
  question: string;
  answer: string;
}

export interface CollateralLink {
  title: string;
  subtitle: string;
  url: string;
  type: 'video' | 'deck';
}

export interface ReferralMap {
  fromName: string;
  fromCompany: string;
  toName: string;
  toCompany: string;
  reason: string;
}

export interface ChecklistItem {
  key: string;
  label: string;
}

// Engagement tracking types
export type EngagementChannel = 'email' | 'linkedin' | 'imessage' | 'call' | 'meeting' | 'note';
export type EngagementSource = 'manual' | 'gmail' | 'linkedin-ext' | 'chrome-ext';

export interface EngagementEntry {
  id: string;
  companyId: number;
  contactName: string;
  channel: EngagementChannel;
  action: string;
  timestamp: string;
  notes: string;
  source: EngagementSource;
  metadata?: Record<string, unknown>;
}
