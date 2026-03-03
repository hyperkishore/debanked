/**
 * Dynamic prompt generator for Kiket chat.
 * Generates context-aware prompts based on time of day, pipeline state,
 * recent signals, and current page context.
 */

interface PromptContext {
  /** Current page: "companies", "pipeline", "command_center", "company_detail" */
  page?: string;
  /** Currently selected company name (if on company detail) */
  companyName?: string;
  /** Currently selected company ID */
  companyId?: number;
  /** Number of active pipeline deals */
  activeDealCount?: number;
  /** Number of stale deals (7+ days no movement) */
  staleDealCount?: number;
  /** Whether the user is in compact (panel) mode */
  compact?: boolean;
}

interface DynamicPrompt {
  text: string;
  category: "briefing" | "pipeline" | "prospecting" | "company" | "learning";
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** Morning prompts — start the day with momentum. */
const MORNING_PROMPTS: DynamicPrompt[] = [
  { text: "What should I focus on today?", category: "briefing" },
  { text: "What's the latest news from top accounts?", category: "briefing" },
  { text: "Which follow-ups are due today?", category: "pipeline" },
  { text: "Give me my morning briefing", category: "briefing" },
];

/** Afternoon prompts — drive action and follow-through. */
const AFTERNOON_PROMPTS: DynamicPrompt[] = [
  { text: "Which deals need attention today?", category: "pipeline" },
  { text: "Draft a follow-up email for my stale deals", category: "pipeline" },
  { text: "What can I do right now to add more pipeline?", category: "prospecting" },
  { text: "Teach me something I don't know about this market", category: "learning" },
];

/** Evening prompts — reflect and prepare. */
const EVENING_PROMPTS: DynamicPrompt[] = [
  { text: "Summarize what happened today", category: "briefing" },
  { text: "What should I prepare for tomorrow?", category: "briefing" },
  { text: "Which accounts are going cold?", category: "pipeline" },
  { text: "Help me think about our positioning", category: "learning" },
];

/** Pipeline-aware prompts — when deals are stale. */
const STALE_PIPELINE_PROMPTS: DynamicPrompt[] = [
  { text: "Which deals are going cold? How do I re-engage?", category: "pipeline" },
  { text: "Draft re-engagement messages for stale accounts", category: "pipeline" },
  { text: "What's blocking our pipeline? Help me strategize", category: "pipeline" },
];

/** Prospecting prompts — when pipeline is thin. */
const THIN_PIPELINE_PROMPTS: DynamicPrompt[] = [
  { text: "Find me 5 companies I should be talking to", category: "prospecting" },
  { text: "Who are the highest-value untouched accounts?", category: "prospecting" },
  { text: "What's the fastest path to more pipeline?", category: "prospecting" },
];

/** Company-specific prompts — when viewing a company. */
function getCompanyPrompts(companyName: string): DynamicPrompt[] {
  return [
    { text: `Tell me about ${companyName}`, category: "company" },
    { text: `Prep me for a call with ${companyName}`, category: "company" },
    { text: `Draft an email to ${companyName}`, category: "company" },
    { text: `What's our history with ${companyName}?`, category: "company" },
  ];
}

/**
 * Generate context-aware prompts for the Kiket chat panel.
 * Returns 4 prompts based on time of day, pipeline state, and page context.
 */
export function generateDynamicPrompts(context: PromptContext): string[] {
  const timeOfDay = getTimeOfDay();
  const prompts: DynamicPrompt[] = [];

  // If viewing a specific company, prioritize company prompts
  if (context.companyName && context.page === "company_detail") {
    const companyPrompts = getCompanyPrompts(context.companyName);
    prompts.push(...companyPrompts.slice(0, 2));
  }

  // Add pipeline-aware prompts
  if (context.staleDealCount && context.staleDealCount > 2) {
    prompts.push(STALE_PIPELINE_PROMPTS[Math.floor(Math.random() * STALE_PIPELINE_PROMPTS.length)]);
  } else if (context.activeDealCount !== undefined && context.activeDealCount < 3) {
    prompts.push(THIN_PIPELINE_PROMPTS[Math.floor(Math.random() * THIN_PIPELINE_PROMPTS.length)]);
  }

  // Fill with time-of-day prompts
  const timePrompts = timeOfDay === "morning"
    ? MORNING_PROMPTS
    : timeOfDay === "afternoon"
    ? AFTERNOON_PROMPTS
    : EVENING_PROMPTS;

  // Shuffle and pick enough to fill to 4
  const shuffled = [...timePrompts].sort(() => Math.random() - 0.5);
  for (const p of shuffled) {
    if (prompts.length >= 4) break;
    // Avoid duplicate categories
    if (!prompts.some((existing) => existing.text === p.text)) {
      prompts.push(p);
    }
  }

  // If still less than 4, add from other pools
  const allPools = [...MORNING_PROMPTS, ...AFTERNOON_PROMPTS, ...EVENING_PROMPTS];
  const allShuffled = allPools.sort(() => Math.random() - 0.5);
  for (const p of allShuffled) {
    if (prompts.length >= 4) break;
    if (!prompts.some((existing) => existing.text === p.text)) {
      prompts.push(p);
    }
  }

  const count = context.compact ? 2 : 4;
  return prompts.slice(0, count).map((p) => p.text);
}
