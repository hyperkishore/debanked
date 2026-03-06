/**
 * Daily Digest Generation.
 * Synthesizes all enrichment data from today into a structured daily brief.
 *
 * Flow:
 * 1. Query enrichment_log for today's entries
 * 2. Query company_news for today's news matches (Google Alerts)
 * 3. Query linkedin_activity for today's activity
 * 4. Synthesize via Claude Haiku into structured daily brief
 * 5. Write to kiket_daily_briefs table
 * 6. Write account memory for companies mentioned
 */

import { getSupabase } from "./supabase.js";

function log(msg) {
  console.log(`[DailyDigest] ${msg}`);
}

function getToolConfig() {
  return {
    url: process.env.TOOL_API_URL || "https://us.hyperverge.space",
    key: process.env.TOOL_API_KEY,
  };
}

async function callClaude(systemPrompt, userPrompt) {
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;
  const gatewayPort = process.env.OPENCLAW_GATEWAY_PORT || "18789";

  if (gatewayToken) {
    const res = await fetch(`http://localhost:${gatewayPort}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${gatewayToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenClaw gateway ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "{}";
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No Claude API access configured.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content?.[0]?.text || "{}";
}

/**
 * Generate daily intelligence digest.
 * @returns {{ date, highlights, leadersActive, newsItems, hooksUpdated }}
 */
export async function generateDailyDigest() {
  const supabase = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00Z`;

  log(`Generating digest for ${today}`);

  // 1. Gather today's enrichment data in parallel
  const [enrichmentResult, newsResult, activityResult] = await Promise.all([
    supabase
      .from("enrichment_log")
      .select("*")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("company_news")
      .select("*")
      .gte("published_at", todayStart)
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("linkedin_activity")
      .select("*")
      .gte("extracted_at", todayStart)
      .order("extracted_at", { ascending: false })
      .limit(100),
  ]);

  const enrichments = enrichmentResult.data || [];
  const news = newsResult.data || [];
  const activities = activityResult.data || [];

  log(`Data: ${enrichments.length} enrichments, ${news.length} news, ${activities.length} activities`);

  // If nothing happened today, write a minimal digest
  if (enrichments.length === 0 && news.length === 0 && activities.length === 0) {
    log("No activity today, writing minimal digest");
    const brief = {
      date: today,
      highlights: ["No significant intelligence activity today"],
      leader_activity: [],
      company_news: [],
      hooks_updated: [],
      recommended_actions: [],
    };

    await writeBrief(supabase, today, brief);
    return brief;
  }

  // 2. Synthesize via Claude Haiku
  const systemPrompt = `You are the intelligence analyst for HyperVerge's GTM team in the small business lending market.

Synthesize today's enrichment data into a concise daily intelligence brief. Output valid JSON:
{
  "highlights": ["3-5 bullet point highlights of the day"],
  "leader_activity": [{"name": "...", "company": "...", "summary": "1 sentence"}],
  "company_news": [{"company": "...", "headline": "...", "relevance": "Why this matters for HV"}],
  "hooks_updated": [{"leader": "...", "company": "...", "hook": "Best new conversation starter"}],
  "recommended_actions": ["Specific actionable recommendations for the sales team"]
}

Rules:
- Be concise — each field should be 1-2 sentences max
- Focus on what's ACTIONABLE for the sales team
- Highlight job changes, funding rounds, and strategic moves
- Connect news to HyperVerge's value prop where possible
- Maximum 5 items per array`;

  const userPrompt = `## Today's Intelligence Data (${today})

### Enrichment Events (${enrichments.length})
${enrichments.map((e) => `- [${e.enrichment_type}] ${e.company_name || "Unknown"}: ${e.summary}`).join("\n")}

### Company News (${news.length})
${news.map((n) => `- ${n.company_name}: "${n.headline}" (${n.source})`).join("\n")}

### LinkedIn Activity (${activities.length})
${activities.map((a) => `- ${a.leader_name} (${a.activity_type}): ${(a.content_summary || "").slice(0, 200)}`).join("\n")}

Synthesize into today's intelligence brief.`;

  let brief;
  try {
    const responseText = await callClaude(systemPrompt, userPrompt);
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      brief = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    log(`Claude synthesis failed: ${err.message}`);
  }

  // Fallback if synthesis failed
  if (!brief) {
    brief = {
      highlights: [
        `${activities.length} LinkedIn activities extracted`,
        `${news.length} news articles matched`,
        `${enrichments.filter((e) => e.enrichment_type === "profile_hooks").length} leader hooks updated`,
      ].filter((h) => !h.startsWith("0 ")),
      leader_activity: activities.slice(0, 5).map((a) => ({
        name: a.leader_name,
        company: "",
        summary: a.content_summary?.slice(0, 100) || a.activity_type,
      })),
      company_news: news.slice(0, 5).map((n) => ({
        company: n.company_name,
        headline: n.headline,
        relevance: n.description?.slice(0, 100) || "",
      })),
      hooks_updated: enrichments
        .filter((e) => e.enrichment_type === "profile_hooks")
        .slice(0, 5)
        .map((e) => ({
          leader: e.leader_name,
          company: e.company_name,
          hook: e.data?.hooks?.[0] || e.summary,
        })),
      recommended_actions: [],
    };
  }

  brief.date = today;

  // 3. Write to kiket_daily_briefs table
  await writeBrief(supabase, today, brief);

  // 4. Write account memory for companies mentioned in the digest
  const { key: TOOL_API_KEY, url: TOOL_API_URL } = getToolConfig();
  if (TOOL_API_KEY) {
    const companiesMentioned = new Set();

    for (const item of [...(brief.leader_activity || []), ...(brief.company_news || [])]) {
      const companyName = item.company;
      if (companyName && !companiesMentioned.has(companyName)) {
        companiesMentioned.add(companyName);

        // Find company ID
        const { data: match } = await supabase
          .from("companies")
          .select("id")
          .ilike("name", companyName)
          .limit(1)
          .single();

        if (match) {
          await fetch(`${TOOL_API_URL}/api/tools/account-memory`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tool-Key": TOOL_API_KEY,
            },
            body: JSON.stringify({
              companyId: match.id,
              memoryType: "insight",
              content: `DAILY BRIEF (${today}): Mentioned in today's intelligence digest`,
              source: "daily-digest",
            }),
          }).catch(() => {});
        }
      }
    }
  }

  log(`Digest written for ${today}: ${brief.highlights?.length || 0} highlights`);
  return brief;
}

async function writeBrief(supabase, date, brief) {
  const { error } = await supabase.from("kiket_daily_briefs").upsert(
    {
      brief_date: date,
      highlights: brief.highlights || [],
      leader_activity: brief.leader_activity || [],
      company_news: brief.company_news || [],
      hooks_updated: brief.hooks_updated || [],
      recommended_actions: brief.recommended_actions || [],
      full_brief: brief,
    },
    { onConflict: "brief_date" }
  );

  if (error) {
    log(`Failed to write brief: ${error.message}`);
  }
}
