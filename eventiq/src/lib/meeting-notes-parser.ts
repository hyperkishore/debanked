import { Company } from "./types";
import { PipelineStage } from "./pipeline-helpers";

export interface ParsedMeetingNotes {
  summary: string;
  actionItems: string[];
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number; // -1 to 1
  mentionedPeople: { name: string; title?: string }[];
  suggestedPipelineStage: PipelineStage | null;
  pipelineKeyword: string | null; // the keyword that triggered the suggestion
  keyTakeaways: string[];
  followUpItems: { text: string; dueInDays: number }[];
}

// --- Sentiment keyword lists ---

const POSITIVE_WORDS = [
  "great", "excited", "interested", "love", "impressive",
  "amazing", "fantastic", "excellent", "wonderful", "positive",
  "agreed", "enthusiastic", "eager", "happy", "pleased",
  "aligned", "onboard", "keen", "thrilled", "perfect",
  "productive", "promising", "strong", "solid", "good",
  "ready", "yes", "approve", "green light", "go ahead",
];

const NEGATIVE_WORDS = [
  "concerned", "issue", "problem", "expensive", "delay",
  "declined", "rejected", "no", "not interested", "budget",
  "competitor", "hesitant", "worried", "risk", "costly",
  "objection", "pushback", "difficult", "challenge", "blocker",
  "passed", "lost", "cold", "unresponsive", "ghosted",
  "stalled", "stuck", "frustrated", "disappointed", "cancel",
];

// --- Pipeline stage keyword mapping ---

const PIPELINE_KEYWORDS: { keywords: string[]; stage: PipelineStage }[] = [
  { keywords: ["closed", "won", "deal done", "signed the deal", "we won"], stage: "won" },
  { keywords: ["lost", "passed", "went with competitor", "chose another", "no longer"], stage: "lost" },
  { keywords: ["contract", "agreement", "sign", "signing", "legal review", "redline", "msa"], stage: "proposal" },
  { keywords: ["proposal", "pricing", "quote", "quotation", "cost breakdown", "commercial terms"], stage: "proposal" },
  { keywords: ["demo", "showed", "presentation", "walkthrough", "product tour", "live demo"], stage: "demo" },
  { keywords: ["replied", "responded", "engaged", "follow-up call", "second meeting", "met again"], stage: "engaged" },
  { keywords: ["reached out", "first call", "intro call", "cold call", "first meeting", "initial contact"], stage: "contacted" },
];

// --- Action item patterns ---

const ACTION_PATTERNS = [
  /^[-*]\s+(.+)/,                          // bullet points: "- do X" or "* do X"
  /(?:TODO|ACTION|NEXT STEP)[:\s]+(.+)/i,  // "TODO: do X", "ACTION: do X"
  /(?:need to|should|must|will)\s+(.+)/i,   // "need to send proposal"
  /(?:follow up|send|schedule|book|set up|arrange|prepare|draft|create|share|review)\s+(.+)/i,
];

// --- Follow-up urgency keywords ---

const URGENCY_KEYWORDS: { pattern: RegExp; days: number }[] = [
  { pattern: /today|immediately|asap|urgent/i, days: 0 },
  { pattern: /tomorrow/i, days: 1 },
  { pattern: /this week|few days/i, days: 3 },
  { pattern: /next week/i, days: 7 },
  { pattern: /next month|month/i, days: 30 },
  { pattern: /two weeks|2 weeks/i, days: 14 },
];

/**
 * Parse free-form meeting notes into structured data.
 * Purely client-side, keyword-based — no API calls.
 */
export function parseMeetingNotes(
  notes: string,
  company: Company
): ParsedMeetingNotes {
  const lines = notes.split("\n").map((l) => l.trim()).filter(Boolean);
  const lowerNotes = notes.toLowerCase();

  // --- Extract action items ---
  const actionItems: string[] = [];
  for (const line of lines) {
    for (const pattern of ACTION_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Use full line for bullet points, captured group for others
        const item = pattern === ACTION_PATTERNS[0] ? match[1].trim() : line.trim();
        if (item.length > 5 && !actionItems.includes(item)) {
          actionItems.push(item);
        }
        break;
      }
    }
  }

  // --- Sentiment analysis ---
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of POSITIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lowerNotes.match(regex);
    if (matches) positiveCount += matches.length;
  }

  for (const word of NEGATIVE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = lowerNotes.match(regex);
    if (matches) negativeCount += matches.length;
  }

  const total = positiveCount + negativeCount;
  let sentimentScore = 0;
  if (total > 0) {
    sentimentScore = (positiveCount - negativeCount) / total;
  }

  const sentiment: "positive" | "negative" | "neutral" =
    sentimentScore > 0.2 ? "positive" : sentimentScore < -0.2 ? "negative" : "neutral";

  // --- Match mentioned people against company leaders/contacts ---
  const mentionedPeople: { name: string; title?: string }[] = [];
  const allPeople = [
    ...(company.leaders || []).map((l) => ({ name: l.n, title: l.t })),
    ...(company.contacts || []).map((c) => ({ name: c.n, title: c.t })),
  ];

  for (const person of allPeople) {
    // Match full name or first name (if unique enough, 4+ chars)
    const firstName = person.name.split(" ")[0];
    if (
      lowerNotes.includes(person.name.toLowerCase()) ||
      (firstName.length >= 4 && lowerNotes.includes(firstName.toLowerCase()))
    ) {
      if (!mentionedPeople.some((p) => p.name === person.name)) {
        mentionedPeople.push({ name: person.name, title: person.title });
      }
    }
  }

  // --- Pipeline stage suggestion ---
  let suggestedPipelineStage: PipelineStage | null = null;
  let pipelineKeyword: string | null = null;

  for (const mapping of PIPELINE_KEYWORDS) {
    for (const keyword of mapping.keywords) {
      if (lowerNotes.includes(keyword)) {
        suggestedPipelineStage = mapping.stage;
        pipelineKeyword = keyword;
        break;
      }
    }
    if (suggestedPipelineStage) break;
  }

  // --- Key takeaways (sentences that feel like conclusions) ---
  const keyTakeaways: string[] = [];
  const takeawayPatterns = [
    /(?:key takeaway|takeaway|conclusion|main point|bottom line|in summary|overall)[:\s]+(.+)/i,
    /(?:they want|they need|their priority|their focus|their goal)[:\s]*(.+)/i,
    /(?:decided|agreed|committed|confirmed)[:\s]*(.+)/i,
  ];

  for (const line of lines) {
    for (const pattern of takeawayPatterns) {
      const match = line.match(pattern);
      if (match && match[1].length > 10) {
        keyTakeaways.push(match[1].trim());
        break;
      }
    }
  }

  // If no explicit takeaways, use the first few non-action-item lines as takeaways
  if (keyTakeaways.length === 0) {
    for (const line of lines) {
      if (
        line.length > 20 &&
        !line.match(/^[-*]/) &&
        !line.match(/^(TODO|ACTION|NEXT)/i) &&
        keyTakeaways.length < 3
      ) {
        keyTakeaways.push(line);
      }
    }
  }

  // --- Follow-up items with urgency ---
  const followUpItems: { text: string; dueInDays: number }[] = [];
  for (const item of actionItems) {
    let dueInDays = 3; // default: 3 days
    for (const { pattern, days } of URGENCY_KEYWORDS) {
      if (pattern.test(item)) {
        dueInDays = days;
        break;
      }
    }
    followUpItems.push({ text: item, dueInDays });
  }

  // --- Build summary ---
  const summaryParts: string[] = [];
  if (mentionedPeople.length > 0) {
    summaryParts.push(
      `Met with ${mentionedPeople.map((p) => p.name).join(", ")}`
    );
  }
  if (sentiment === "positive") {
    summaryParts.push("Positive meeting outcome");
  } else if (sentiment === "negative") {
    summaryParts.push("Some concerns raised");
  }
  if (actionItems.length > 0) {
    summaryParts.push(`${actionItems.length} action item${actionItems.length > 1 ? "s" : ""} identified`);
  }
  if (suggestedPipelineStage) {
    summaryParts.push(`Pipeline: suggests "${suggestedPipelineStage}" stage`);
  }

  const summary =
    summaryParts.length > 0
      ? summaryParts.join(". ") + "."
      : "Meeting notes processed. Review details below.";

  return {
    summary,
    actionItems,
    sentiment,
    sentimentScore,
    mentionedPeople,
    suggestedPipelineStage,
    pipelineKeyword,
    keyTakeaways,
    followUpItems,
  };
}
