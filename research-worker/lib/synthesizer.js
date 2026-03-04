/**
 * Synthesize research findings via Claude Haiku API.
 * Compares existing company data with fresh research,
 * outputs structured JSON with updated fields only.
 */
export async function synthesizeResearch(existing, freshData) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");

  const systemPrompt = `You are a research analyst for a B2B sales intelligence platform focused on small business lending (MCA, SBA, equipment finance, factoring, RBF).

Your job: Compare existing company data with freshly gathered research. Output ONLY the fields that should be updated — new information, corrections, or additions.

Output valid JSON matching this schema (include only fields with actual updates):
{
  "desc": "Updated description if significantly new info found (1-2 paragraphs with real metrics)",
  "news": [{"h": "headline", "s": "source name", "d": "1-2 sentence description", "p": "YYYY-MM-DD", "u": "https://..."}],
  "leaders": [{"n": "Full Name", "t": "Title", "bg": "Updated background", "li": "https://linkedin.com/in/..."}],
  "contacts": [{"n": "Name", "t": "Title"}],
  "notes_append": "NEW FINDINGS (date): Key insights worth noting...",
  "summary": "1-2 sentence summary of what changed for the research log"
}

Rules:
- Only include fields where you have ACTUAL new information
- For news: only include items not already in existing data
- For leaders: include if there are title changes, new people, or updated backgrounds
- For desc: only rewrite if there's materially new info (funding, acquisition, product launch)
- notes_append should highlight the most actionable findings for sales team
- If nothing meaningful has changed, return {"summary": "No significant updates found"}
- Be specific with metrics: funding amounts, employee counts, origination volumes
- Do NOT fabricate information — only use what's in the provided research data`;

  const userPrompt = `## Existing Company Data
${JSON.stringify(existing, null, 2)}

## Fresh Research Findings

### Recent News
${formatNews(freshData.news)}

### Website Content
${freshData.websiteText || "Not available"}

### HubSpot CRM Context
${freshData.hubspot ? JSON.stringify(freshData.hubspot, null, 2) : "Not available"}

Compare existing data with fresh research and output updated fields as JSON.`;

  try {
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
    const text = data.content?.[0]?.text || "{}";

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn("[Synthesizer] No JSON found in response");
      return { summary: "Failed to parse synthesis response" };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[Synthesizer] Failed:", err.message);
    throw err;
  }
}

function formatNews(newsItems) {
  if (!newsItems || newsItems.length === 0) return "No recent news found";

  return newsItems
    .map(
      (n, i) =>
        `${i + 1}. ${n.headline}\n   Source: ${n.source}\n   Date: ${n.publishedAt || "Unknown"}\n   ${n.description || ""}`
    )
    .join("\n\n");
}
