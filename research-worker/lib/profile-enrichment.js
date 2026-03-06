/**
 * Profile Enrichment with Claude Hook Synthesis.
 * Runs after LinkedIn activity extraction — only processes leaders with NEW activity.
 *
 * Flow:
 * 1. Check which leaders had new activity since last run
 * 2. For leaders with changes: call Claude Haiku to synthesize conversation hooks
 * 3. Update leader hooks via /api/tools/company-update
 * 4. Write per-company account memory
 * 5. Log to enrichment_log
 */

import { getSupabase } from "./supabase.js";

function getToolConfig() {
  return {
    url: process.env.TOOL_API_URL || "https://us.hyperverge.space",
    key: process.env.TOOL_API_KEY,
  };
}

function log(msg) {
  console.log(`[ProfileEnrichment] ${msg}`);
}

/**
 * Call Claude via OpenClaw gateway or direct Anthropic API.
 * Reuses the same dual-API pattern from synthesizer.js.
 */
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
        max_tokens: 2000,
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
    throw new Error("No Claude API access configured. Set OPENCLAW_GATEWAY_TOKEN or ANTHROPIC_API_KEY.");
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
      max_tokens: 2000,
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
 * Enrich profiles with conversation hooks based on recent activity.
 * @param {object} activityResult - Result from extractLinkedInActivity()
 * @returns {{ leadersEnriched, hooksGenerated, errors }}
 */
export async function enrichProfiles(activityResult) {
  if (!activityResult || activityResult.activitiesStored === 0) {
    log("No new activity to process, skipping profile enrichment");
    return { leadersEnriched: 0, hooksGenerated: 0 };
  }

  const supabase = getSupabase();
  const { url: TOOL_API_URL, key: TOOL_API_KEY } = getToolConfig();

  if (!TOOL_API_KEY) {
    log("TOOL_API_KEY not configured, skipping");
    return { leadersEnriched: 0, hooksGenerated: 0, error: "TOOL_API_KEY not configured" };
  }

  // 1. Get recent LinkedIn activity (last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentActivity, error: actErr } = await supabase
    .from("linkedin_activity")
    .select("*")
    .gte("extracted_at", since)
    .order("extracted_at", { ascending: false });

  if (actErr || !recentActivity?.length) {
    log(`No recent activity found: ${actErr?.message || "empty"}`);
    return { leadersEnriched: 0, hooksGenerated: 0 };
  }

  // Group by company_id
  const byCompany = new Map();
  for (const act of recentActivity) {
    if (!act.company_id) continue;
    const existing = byCompany.get(act.company_id) || [];
    existing.push(act);
    byCompany.set(act.company_id, existing);
  }

  log(`Processing ${byCompany.size} companies with recent activity`);

  let leadersEnriched = 0;
  let hooksGenerated = 0;
  const errors = [];

  // 2. For each company with activity, fetch company data and synthesize hooks
  for (const [companyId, activities] of byCompany) {
    try {
      const { data: company, error: compErr } = await supabase
        .from("companies")
        .select("id, name, leaders")
        .eq("id", companyId)
        .single();

      if (compErr || !company) continue;

      const leaders = company.leaders || [];
      const leadersWithActivity = [];

      for (const activity of activities) {
        const leader = leaders.find(
          (l) => l.n && activity.leader_name && l.n.toLowerCase() === activity.leader_name.toLowerCase()
        );
        if (leader) {
          leadersWithActivity.push({ leader, activity });
        }
      }

      if (leadersWithActivity.length === 0) continue;

      // 3. Call Claude for hook synthesis
      const systemPrompt = `You are a sales intelligence assistant for HyperVerge, an AI underwriting platform for small business lenders.

Given a leader's existing profile and their recent LinkedIn activity, generate:
1. hooks: 2-4 fresh conversation starters based on their RECENT activity (not old background). Each hook should be 2-8 words, actionable for a sales rep.
2. whats_new: 1-sentence summary of notable changes or activity
3. talking_point: How this activity connects to HyperVerge's value prop (AI underwriting, document verification, fraud detection for lenders). Return null if no clear connection.

Only include hooks based on ACTUAL activity data. If no meaningful activity, return null.

Output valid JSON:
{
  "leaders": [
    {
      "name": "Full Name",
      "hooks": ["hook1", "hook2"],
      "whats_new": "One sentence summary",
      "talking_point": "Connection to HV value prop or null"
    }
  ]
}`;

      const activitySummary = leadersWithActivity
        .map(({ leader, activity }) =>
          `## ${leader.n} (${leader.t || "Unknown Title"})
Background: ${leader.bg || "N/A"}
Existing hooks: ${(leader.hooks || []).join(", ") || "None"}
Recent activity:
- Type: ${activity.activity_type}
- Content: ${activity.content_summary?.slice(0, 500) || "N/A"}
- URL: ${activity.original_url || "N/A"}`
        )
        .join("\n\n");

      const userPrompt = `Company: ${company.name}

${activitySummary}

Generate updated conversation hooks based on this RECENT LinkedIn activity.`;

      const responseText = await callClaude(systemPrompt, userPrompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const synthesis = JSON.parse(jsonMatch[0]);
      if (!synthesis.leaders?.length) continue;

      // 4. Update leader hooks via company-update API
      const updatedLeaders = leaders.map((l) => {
        const update = synthesis.leaders.find(
          (u) => u.name && l.n && u.name.toLowerCase() === l.n.toLowerCase()
        );
        if (!update || !update.hooks?.length) return l;
        return { ...l, hooks: update.hooks };
      });

      const res = await fetch(`${TOOL_API_URL}/api/tools/company-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tool-Key": TOOL_API_KEY,
        },
        body: JSON.stringify({
          companyId,
          updates: { leaders: updatedLeaders },
          mode: "merge",
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        errors.push(`company-update failed for ${company.name}: ${errText}`);
        continue;
      }

      // 5. Write account memory
      const memoryParts = synthesis.leaders
        .filter((l) => l.whats_new)
        .map((l) => `${l.name}: ${l.whats_new}`);

      if (memoryParts.length > 0) {
        const memoryContent = `ENRICHMENT (${new Date().toISOString().slice(0, 10)}): ${memoryParts.join(". ")}`;
        await fetch(`${TOOL_API_URL}/api/tools/account-memory`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tool-Key": TOOL_API_KEY,
          },
          body: JSON.stringify({
            companyId,
            memoryType: "insight",
            content: memoryContent,
            source: "profile-enrichment",
          }),
        }).catch(() => {});
      }

      // 6. Log to enrichment_log
      for (const leaderUpdate of synthesis.leaders) {
        if (!leaderUpdate.hooks?.length) continue;
        await supabase.from("enrichment_log").insert({
          company_id: companyId,
          company_name: company.name,
          leader_name: leaderUpdate.name,
          enrichment_type: "profile_hooks",
          summary: leaderUpdate.whats_new || `Updated hooks for ${leaderUpdate.name}`,
          data: {
            hooks: leaderUpdate.hooks,
            talking_point: leaderUpdate.talking_point,
          },
        }).then(() => {}, () => {});

        hooksGenerated += leaderUpdate.hooks.length;
      }

      leadersEnriched += synthesis.leaders.filter((l) => l.hooks?.length).length;
      log(`${company.name}: enriched ${synthesis.leaders.length} leaders`);

      // Rate limit between companies (avoid Claude rate limits)
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      errors.push(`${companyId}: ${err.message}`);
      log(`Error processing company ${companyId}: ${err.message}`);
    }
  }

  const summary = { leadersEnriched, hooksGenerated, errors: errors.length };
  log(`Done: ${JSON.stringify(summary)}`);
  return summary;
}
