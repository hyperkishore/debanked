/**
 * personal-research.js — Daily automated personal research for leaders
 *
 * Finds personal information (hobbies, origin stories, passions, side projects)
 * for P0/P1/P2 leaders who don't have a `personal` field yet.
 *
 * Uses Brave Search API for web search and Claude Haiku for synthesis.
 * Updates Supabase directly and logs to enrichment_log.
 *
 * Schedule: Daily at 5:30 AM UTC (cron: '30 5 * * *')
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BATCH_SIZE = 8; // leaders per run (5-10 range)
const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-20250414";

// ---------------------------------------------------------------------------
// Supabase client (same pattern as other worker libs)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Brave Search
// ---------------------------------------------------------------------------

async function braveSearch(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.warn("[personal-research] BRAVE_SEARCH_API_KEY not set, skipping search");
    return [];
  }

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[personal-research] Brave search failed (${res.status}): ${text.slice(0, 200)}`);
      return [];
    }

    const data = await res.json();
    const results = (data.web?.results || []).map((r) => ({
      title: r.title || "",
      description: r.description || "",
      url: r.url || "",
    }));
    return results;
  } catch (err) {
    console.warn(`[personal-research] Brave search error: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Search for personal info about a leader
// ---------------------------------------------------------------------------

async function searchLeaderPersonalInfo(leaderName, companyName) {
  const queries = [
    `"${leaderName}" "${companyName}" personal interview podcast`,
    `"${leaderName}" hobby passion volunteer charity`,
    `"${leaderName}" grew up hometown childhood family`,
  ];

  const allSnippets = [];

  for (const q of queries) {
    const results = await braveSearch(q);
    for (const r of results) {
      const snippet = `[${r.title}] ${r.description}`;
      if (snippet.length > 20) {
        allSnippets.push(snippet);
      }
    }
    // Rate limit: 1 request per second for Brave free tier
    await sleep(1200);
  }

  return allSnippets;
}

// ---------------------------------------------------------------------------
// Claude Haiku synthesis
// ---------------------------------------------------------------------------

async function synthesizePersonalInfo(leaderName, companyName, existingBg, snippets) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[personal-research] ANTHROPIC_API_KEY not set, skipping synthesis");
    return null;
  }

  if (snippets.length === 0) {
    return null;
  }

  const prompt = `You are analyzing search results about ${leaderName} (${companyName}) to find PERSONAL information — hobbies, origin story, passions, family context, side projects, volunteer work, personal interests.

Existing background: ${existingBg || "None available"}

Search result snippets:
${snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Based ONLY on facts actually present in the search results above, produce a JSON response:

{
  "personal": "1-3 sentences about their personal life, interests, hobbies, origin story, or passions. Only include facts from the search results. If nothing personal was found, set to null.",
  "hooks": ["Array of 1-3 personal conversation hooks based on the findings. Each should be a short phrase like 'Coaches youth basketball' or 'Grew up on family farm in Iowa'. Only include if real facts were found. Empty array if nothing found."]
}

IMPORTANT:
- Only include facts that are clearly about THIS specific person (not someone with a similar name)
- Do NOT make up or infer personal details
- If search results only contain professional/business info, return {"personal": null, "hooks": []}
- Return ONLY the JSON object, no other text`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`[personal-research] Claude API failed (${res.status}): ${text.slice(0, 200)}`);
      return null;
    }

    const data = await res.json();
    const content = data.content?.[0]?.text || "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`[personal-research] Could not parse JSON from Claude response for ${leaderName}`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed;
  } catch (err) {
    console.warn(`[personal-research] Claude synthesis error for ${leaderName}: ${err.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Find leaders without personal field
// ---------------------------------------------------------------------------

async function findLeadersNeedingPersonal(supabase) {
  // Fetch P0, P1, P2 companies (priority <= 3) with leaders
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, priority, leaders")
    .lte("priority", 3)
    .not("leaders", "is", null)
    .order("priority", { ascending: true });

  if (error) {
    console.error(`[personal-research] Supabase query error: ${error.message}`);
    return [];
  }

  // Collect leaders without a personal field, ordered by company priority
  const candidates = [];
  for (const company of companies || []) {
    const leaders = company.leaders || [];
    for (let i = 0; i < leaders.length; i++) {
      const leader = leaders[i];
      // Skip if leader already has personal field (non-null, non-empty)
      if (leader.personal && leader.personal.trim().length > 0) continue;
      // Skip leaders without a name
      if (!leader.n) continue;

      candidates.push({
        companyId: company.id,
        companyName: company.name,
        companyPriority: company.priority,
        leaderIndex: i,
        leaderName: leader.n,
        leaderTitle: leader.t || "",
        leaderBg: leader.bg || "",
        existingHooks: leader.hooks || [],
        allLeaders: leaders,
      });
    }
  }

  console.log(
    `[personal-research] Found ${candidates.length} leaders without personal field ` +
    `(P0: ${candidates.filter((c) => c.companyPriority === 1).length}, ` +
    `P1: ${candidates.filter((c) => c.companyPriority === 2).length}, ` +
    `P2: ${candidates.filter((c) => c.companyPriority === 3).length})`
  );

  // Return top BATCH_SIZE, already sorted by priority (ascending)
  return candidates.slice(0, BATCH_SIZE);
}

// ---------------------------------------------------------------------------
// Update leader in Supabase
// ---------------------------------------------------------------------------

async function updateLeaderPersonal(supabase, companyId, leaders, leaderIndex, personal, newHooks) {
  const leader = leaders[leaderIndex];

  // Set personal field
  leader.personal = personal;

  // Merge hooks — personal hooks first, deduplicated
  if (newHooks && newHooks.length > 0) {
    const existingHooksLower = new Set((leader.hooks || []).map((h) => h.toLowerCase()));
    const uniqueNewHooks = newHooks.filter((h) => !existingHooksLower.has(h.toLowerCase()));
    leader.hooks = [...uniqueNewHooks, ...(leader.hooks || [])];
  }

  leaders[leaderIndex] = leader;

  const { error } = await supabase
    .from("companies")
    .update({ leaders })
    .eq("id", companyId);

  if (error) {
    throw new Error(`Failed to update company ${companyId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Log to enrichment_log
// ---------------------------------------------------------------------------

async function logEnrichment(supabase, companyId, companyName, leaderName, summary, data) {
  try {
    await supabase.from("enrichment_log").insert({
      company_id: companyId,
      company_name: companyName,
      leader_name: leaderName,
      enrichment_type: "personal_research",
      summary,
      data: data || {},
    });
  } catch (err) {
    // Non-fatal — don't crash if logging fails
    console.warn(`[personal-research] Failed to log enrichment: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export async function runPersonalResearch() {
  const startTime = Date.now();
  console.log(`\n[personal-research] Starting personal research run at ${new Date().toISOString()}`);

  const supabase = getSupabase();

  // Check required API keys
  if (!process.env.BRAVE_SEARCH_API_KEY) {
    console.error("[personal-research] BRAVE_SEARCH_API_KEY not set — aborting");
    return { researched: 0, updated: 0, skipped: 0, errors: 0 };
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("[personal-research] ANTHROPIC_API_KEY not set — aborting");
    return { researched: 0, updated: 0, skipped: 0, errors: 0 };
  }

  // Find leaders needing personal research
  const candidates = await findLeadersNeedingPersonal(supabase);

  if (candidates.length === 0) {
    console.log("[personal-research] No leaders need personal research. All done!");
    return { researched: 0, updated: 0, skipped: 0, errors: 0 };
  }

  console.log(`[personal-research] Processing ${candidates.length} leaders this run`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const candidate of candidates) {
    const { companyId, companyName, leaderName, leaderBg, leaderIndex } = candidate;

    try {
      console.log(`\n[personal-research] Researching: ${leaderName} (${companyName}, P${candidate.companyPriority})`);

      // Step 1: Search for personal info
      const snippets = await searchLeaderPersonalInfo(leaderName, companyName);
      console.log(`[personal-research]   Found ${snippets.length} search snippets`);

      if (snippets.length === 0) {
        console.log(`[personal-research]   No search results — skipping`);
        await logEnrichment(supabase, companyId, companyName, leaderName, "No search results found", {
          status: "no_results",
        });
        skipped++;
        continue;
      }

      // Step 2: Synthesize with Claude Haiku
      const synthesis = await synthesizePersonalInfo(leaderName, companyName, leaderBg, snippets);

      if (!synthesis || !synthesis.personal) {
        console.log(`[personal-research]   No personal info found in results — skipping`);
        await logEnrichment(supabase, companyId, companyName, leaderName, "No personal info in search results", {
          status: "no_personal_info",
          snippets_count: snippets.length,
        });
        skipped++;
        continue;
      }

      console.log(`[personal-research]   Personal: "${synthesis.personal.slice(0, 80)}..."`);
      console.log(`[personal-research]   New hooks: ${(synthesis.hooks || []).length}`);

      // Step 3: Re-fetch the company to get the latest leaders array (avoid stale writes)
      const { data: freshCompany, error: fetchError } = await supabase
        .from("companies")
        .select("leaders")
        .eq("id", companyId)
        .single();

      if (fetchError || !freshCompany) {
        throw new Error(`Failed to re-fetch company ${companyId}: ${fetchError?.message}`);
      }

      const freshLeaders = freshCompany.leaders || [];

      // Re-find the leader by name (index may have shifted)
      const freshIndex = freshLeaders.findIndex(
        (l) => l.n && l.n.toLowerCase() === leaderName.toLowerCase()
      );

      if (freshIndex === -1) {
        throw new Error(`Leader ${leaderName} no longer found in company ${companyName}`);
      }

      // Step 4: Update Supabase
      await updateLeaderPersonal(
        supabase,
        companyId,
        freshLeaders,
        freshIndex,
        synthesis.personal,
        synthesis.hooks || []
      );

      // Step 5: Log enrichment
      await logEnrichment(supabase, companyId, companyName, leaderName, synthesis.personal, {
        status: "updated",
        personal: synthesis.personal,
        hooks_added: (synthesis.hooks || []).length,
        snippets_count: snippets.length,
      });

      updated++;
      console.log(`[personal-research]   Updated successfully`);

      // Rate limit between leaders (be gentle on APIs)
      await sleep(2000);
    } catch (err) {
      console.error(`[personal-research]   ERROR for ${leaderName} (${companyName}): ${err.message}`);
      await logEnrichment(supabase, companyId, companyName, leaderName, `Error: ${err.message}`, {
        status: "error",
        error: err.message,
      });
      errors++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `\n[personal-research] Done in ${elapsed}s. ` +
    `Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`
  );

  return { researched: candidates.length, updated, skipped, errors };
}

// ---------------------------------------------------------------------------
// CLI entry point (for manual testing)
// ---------------------------------------------------------------------------

if (process.argv[1] && process.argv[1].includes("personal-research")) {
  runPersonalResearch()
    .then((stats) => {
      console.log("\n[personal-research] Final stats:", JSON.stringify(stats));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[personal-research] Fatal error:", err);
      process.exit(1);
    });
}
