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

export function generateOutreachMessage(leader: Leader, company: Company): string {
  const firstName = leader.n.split(' ')[0];
  const companyName = company.name;

  // Pick the best hook (prefer starred ones)
  const starredHook = leader.hooks?.find(h => h.startsWith('*'));
  const hookText = starredHook
    ? starredHook.slice(1).trim()
    : leader.hooks?.[0] || '';

  // Build personalized opener from hook
  let opener = '';
  if (hookText) {
    opener = `I came across your background — ${hookText.toLowerCase()} caught my eye.`;
  } else if (leader.bg && leader.bg.length > 20) {
    // Extract first meaningful detail from bg
    const bgFirst = leader.bg.split('.')[0];
    opener = `I came across your work at ${companyName} — impressive background.`;
    if (bgFirst.length < 100) {
      opener = `I noticed your profile — ${bgFirst.toLowerCase().includes(firstName.toLowerCase()) ? 'impressive trajectory' : bgFirst}.`;
    }
  }

  // Company-relevant value prop
  let valueProp = '';
  if (company.tp && company.tp.length > 0) {
    // Use the shortest talking point
    const shortest = company.tp.reduce((a, b) => a.length < b.length ? a : b);
    valueProp = shortest;
  } else {
    valueProp = `We help companies like ${companyName} automate underwriting decisions — currently powering 450+ lenders.`;
  }

  // CTA
  const cta = company.ask
    ? company.ask
    : `Would love to show you how we can help ${companyName}. Open to a quick chat?`;

  return `Hi ${firstName},

${opener}

${valueProp}

${cta}

Best,
[Your Name]
HyperVerge`;
}

export function generateQuickLinks(company: Company): { label: string; url: string; icon: 'globe' | 'linkedin' | 'search' | 'news' }[] {
  const links: { label: string; url: string; icon: 'globe' | 'linkedin' | 'search' | 'news' }[] = [];
  const encodedName = encodeURIComponent(company.name);

  if (company.website) {
    links.push({ label: 'Website', url: company.website, icon: 'globe' });
  }
  if (company.linkedinUrl) {
    links.push({ label: 'LinkedIn', url: company.linkedinUrl, icon: 'linkedin' });
  }
  // Google search
  links.push({
    label: 'Google',
    url: `https://www.google.com/search?q=${encodedName}+small+business+lending`,
    icon: 'search',
  });
  // LinkedIn search
  links.push({
    label: 'LinkedIn Search',
    url: `https://www.linkedin.com/search/results/companies/?keywords=${encodedName}`,
    icon: 'linkedin',
  });
  // deBanked search
  links.push({
    label: 'deBanked',
    url: `https://debanked.com/?s=${encodedName}`,
    icon: 'news',
  });
  // Crunchbase search
  links.push({
    label: 'Crunchbase',
    url: `https://www.crunchbase.com/textsearch?q=${encodedName}`,
    icon: 'search',
  });

  return links;
}

export type CompanyType = 'SQO' | 'Client' | 'ICP' | 'TAM';

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
  location?: string;
  employees?: number;
  website?: string;
  linkedinUrl?: string;
  source: string[];
}

export function isResearched(c: Company): boolean {
  return c.desc.length > 0 && c.contacts.length > 0;
}

/**
 * Research completeness score (0-100).
 * Weights: desc 15, contacts 10, leaders 15, news 10, ice 10, icebreakers 5,
 *          tp 10, ask 5, location 5, website 5, linkedinUrl 5, employees 5
 */
export function getResearchScore(c: Company): number {
  let score = 0;
  if (c.desc && c.desc.length > 20) score += 15;
  else if (c.desc && c.desc.length > 0) score += 7;
  if (c.contacts.length >= 2) score += 10;
  else if (c.contacts.length === 1) score += 5;
  const leaders = c.leaders || [];
  if (leaders.length >= 2 && leaders.some(l => l.bg && l.bg.length > 20)) score += 15;
  else if (leaders.length >= 1) score += 7;
  if ((c.news || []).length >= 2) score += 10;
  else if ((c.news || []).length === 1) score += 5;
  if (c.ice && c.ice.length > 10) score += 10;
  if ((c.icebreakers || []).length >= 2) score += 5;
  if ((c.tp || []).length >= 2) score += 10;
  else if ((c.tp || []).length === 1) score += 5;
  if (c.ask && c.ask.length > 10) score += 5;
  if (c.location) score += 5;
  if (c.website) score += 5;
  if (c.linkedinUrl) score += 5;
  if (c.employees && c.employees > 0) score += 5; // extra partial point for employees
  return Math.min(score, 100);
}

export type ResearchTier = 'complete' | 'good' | 'partial' | 'minimal';

export function getResearchTier(score: number): ResearchTier {
  if (score >= 80) return 'complete';
  if (score >= 50) return 'good';
  if (score >= 25) return 'partial';
  return 'minimal';
}

export type FilterType = 'all' | 'SQO' | 'Client' | 'ICP' | 'TAM' | 'Met' | 'CLEAR' | 'FollowUp' | 'Researched' | 'Unresearched';
export type SortType = 'name' | 'type' | 'priority' | 'phase' | 'employees' | 'quality';
export type ViewType = 'cards' | 'table';
export type TabType = 'companies' | 'schedule' | 'pitch' | 'checklist' | 'dashboard';

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
export type EngagementSource = 'manual' | 'gmail' | 'linkedin-ext' | 'chrome-ext' | 'hubspot' | 'import';

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
