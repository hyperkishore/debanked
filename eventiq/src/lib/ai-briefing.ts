import { generateCompletion } from "./ai-client";
import crypto from "crypto";

export interface BriefingData {
  trigger: string; // Why call today?
  opener: string; // Opening line
  talkingPoints: string[]; // 2 key talking points
  contact: {
    name: string;
    title: string;
    rationale: string;
  };
  recommendedAction: "email" | "call" | "linkedin" | "meeting";
  priorityScore: number; // 1-10
  generatedAt: string;
}

interface CompanyContext {
  id: number;
  name: string;
  type: string;
  desc: string;
  contacts: Array<{ n: string; t: string }>;
  leaders: Array<{ n: string; t: string; bg: string }>;
  recentSignals: Array<{
    headline: string;
    source: string;
    publishedAt: string | null;
  }>;
  engagementSummary: string;
  pipelineStage: string;
}

/**
 * Compute a hash of the input signals to detect cache staleness.
 */
export function computeSignalHash(ctx: CompanyContext): string {
  const input = JSON.stringify({
    signals: ctx.recentSignals.map((s) => s.headline),
    engagement: ctx.engagementSummary,
    pipeline: ctx.pipelineStage,
  });
  return crypto.createHash("md5").update(input).digest("hex");
}

/**
 * Generate an AI briefing for a company.
 */
export async function generateBriefing(
  ctx: CompanyContext
): Promise<BriefingData> {
  const systemPrompt = `You are a BD intelligence analyst for HyperVerge, a company that provides AI-powered underwriting verification for small business lenders (MCA, equipment finance, SBA lending).

Your job is to create a concise, actionable briefing that tells a sales rep WHY to call this company today, WHO to contact, and WHAT to say.

Respond in JSON format matching this schema exactly:
{
  "trigger": "one sentence on why now is the right time to reach out",
  "opener": "a personalized opening line referencing a specific recent event or fact",
  "talkingPoints": ["point 1", "point 2"],
  "contact": { "name": "...", "title": "...", "rationale": "why this person" },
  "recommendedAction": "email|call|linkedin|meeting",
  "priorityScore": 1-10
}`;

  const signalsList = ctx.recentSignals
    .slice(0, 5)
    .map((s) => `- ${s.headline} (${s.source}, ${s.publishedAt || "recent"})`)
    .join("\n");

  const leadersList = ctx.leaders
    .slice(0, 3)
    .map((l) => `- ${l.n}, ${l.t}: ${l.bg.slice(0, 150)}`)
    .join("\n");

  const userPrompt = `Generate a sales briefing for this company:

**Company:** ${ctx.name} (${ctx.type})
**Description:** ${ctx.desc.slice(0, 300)}
**Pipeline stage:** ${ctx.pipelineStage}
**Recent engagement:** ${ctx.engagementSummary || "None"}

**Recent signals:**
${signalsList || "No recent signals"}

**Key people:**
${leadersList || ctx.contacts.slice(0, 3).map((c) => `- ${c.n}, ${c.t}`).join("\n")}

Remember: HyperVerge helps with AI-powered identity verification, document verification, and underwriting automation for lenders. Focus on how our product addresses their specific needs based on the signals above.`;

  const response = await generateCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  // Parse the JSON response
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.content;
    const jsonMatch = jsonStr.match(/```json?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    return {
      trigger: parsed.trigger || "Review this account for outreach opportunities",
      opener: parsed.opener || "",
      talkingPoints: parsed.talkingPoints || [],
      contact: parsed.contact || { name: "", title: "", rationale: "" },
      recommendedAction: parsed.recommendedAction || "email",
      priorityScore: Math.min(10, Math.max(1, parsed.priorityScore || 5)),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback if JSON parsing fails
    return {
      trigger: "Review this account for outreach opportunities",
      opener: response.content.slice(0, 200),
      talkingPoints: [],
      contact: {
        name: ctx.leaders[0]?.n || ctx.contacts[0]?.n || "",
        title: ctx.leaders[0]?.t || ctx.contacts[0]?.t || "",
        rationale: "Primary contact",
      },
      recommendedAction: "email",
      priorityScore: 5,
      generatedAt: new Date().toISOString(),
    };
  }
}
