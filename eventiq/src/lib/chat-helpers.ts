import { TabType } from "@/lib/types";

// --- Types ---

export type InputCategory = 'research' | 'data-enhancement' | 'feature-idea' | 'bug' | 'general';

export interface InputContext {
  tab: TabType;
  companyId?: number;
  companyName?: string;
  companyType?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  category?: InputCategory;
  context?: InputContext;
  resolved?: boolean;
}

// --- Category Detection ---

const CATEGORY_KEYWORDS: [InputCategory, string[]][] = [
  ['feature-idea', ['would be nice', 'idea', 'feature', 'could we', 'wish', 'suggestion', 'what if', 'it would be great']],
  ['research', ['research', 'look up', 'find out', 'who is', 'search for', 'dig into', 'investigate', 'check on', 'look into']],
  ['bug', ['broken', "doesn't work", 'bug', 'error', 'not working', 'crash', 'glitch']],
  ['data-enhancement', ['add', 'update', 'missing', 'wrong', 'incorrect', 'change', 'fix data', 'fix', 'enrich', 'linkedin url', 'needs']],
];

export function detectCategory(text: string): InputCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category;
    }
  }
  return 'general';
}

// --- Category Labels ---

const CATEGORY_LABELS: Record<InputCategory, string> = {
  research: 'Research Request',
  'data-enhancement': 'Data Enhancement',
  'feature-idea': 'Feature Idea',
  bug: 'Bug Report',
  general: 'Note',
};

const CATEGORY_EMOJI: Record<InputCategory, string> = {
  research: '\uD83D\uDD0D',
  'data-enhancement': '\uD83D\uDCDD',
  'feature-idea': '\uD83D\uDCA1',
  bug: '\uD83D\uDC1B',
  general: '\uD83D\uDCCC',
};

export function getCategoryLabel(category: InputCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCategoryEmoji(category: InputCategory): string {
  return CATEGORY_EMOJI[category];
}

// --- Bot Response Generation ---

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateBotResponse(
  userMessage: string,
  category: InputCategory,
  context: InputContext,
  pendingCount: number
): string {
  const label = CATEGORY_LABELS[category];
  const emoji = CATEGORY_EMOJI[category];

  const companyNote = context.companyName
    ? ` (${escapeHtml(context.companyName)}${context.companyType ? ` \u00B7 ${escapeHtml(context.companyType)}` : ''})`
    : '';

  const tabNote = context.tab !== 'companies' ? ` on ${context.tab} tab` : '';

  const summary = userMessage.length > 60
    ? userMessage.slice(0, 57) + '...'
    : userMessage;

  return `${emoji} **${label}** \u2014 ${escapeHtml(summary)}${companyNote}${tabNote}. Added to your input queue. (${pendingCount} pending)`;
}

// --- Markdown Export ---

export function exportToMarkdown(messages: ChatMessage[]): string {
  const userMessages = messages.filter((m) => m.role === 'user');
  if (userMessages.length === 0) return '# User Inputs \u2014 EventIQ\n\nNo inputs captured yet.\n';

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const grouped: Record<InputCategory, ChatMessage[]> = {
    research: [],
    'data-enhancement': [],
    'feature-idea': [],
    bug: [],
    general: [],
  };

  for (const msg of userMessages) {
    const cat = msg.category || 'general';
    grouped[cat].push(msg);
  }

  const lines: string[] = [
    `# User Inputs \u2014 EventIQ`,
    `Generated: ${now}`,
    '',
  ];

  const sectionOrder: { key: InputCategory; title: string }[] = [
    { key: 'research', title: 'Research Requests' },
    { key: 'data-enhancement', title: 'Data Enhancements' },
    { key: 'feature-idea', title: 'Feature Ideas' },
    { key: 'bug', title: 'Bug Reports' },
    { key: 'general', title: 'General Notes' },
  ];

  for (const { key, title } of sectionOrder) {
    const items = grouped[key];
    if (items.length === 0) continue;

    lines.push(`## ${title}`);
    for (const msg of items) {
      const date = new Date(msg.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const companyNote = msg.context?.companyName
        ? `Company: ${msg.context.companyName}${msg.context.companyType ? ` (${msg.context.companyType})` : ''}, `
        : '';
      const tabNote = msg.context?.tab && msg.context.tab !== 'companies'
        ? `Page: ${msg.context.tab}, `
        : '';
      const check = msg.resolved ? '[x]' : '[ ]';
      lines.push(`- ${check} ${msg.content} \u2014 *${companyNote}${tabNote}${date}*`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// --- Pending Count ---

export function getPendingCount(messages: ChatMessage[]): number {
  return messages.filter((m) => m.role === 'user' && !m.resolved).length;
}

// --- Unique ID ---

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
