/**
 * Daily LinkedIn Activity Extraction.
 * Replaces the broken Vercel cron (60s timeout) with EC2 worker (no timeout constraint).
 *
 * Flow:
 * 1. Fetch P0/P1 companies, collect leaders with LinkedIn URLs (max 50/day)
 * 2. Create PhantomBuster org list → launch LinkedIn Activity Extractor
 * 3. Poll for completion (unlimited time on EC2)
 * 4. Parse results → store in linkedin_activity + enrichment_log tables
 */

import { getSupabase } from "./supabase.js";
import { createPhantomBusterClient, isPhantomBusterConfigured } from "./phantombuster.js";

const ACTIVITY_AGENT_ID = Number(process.env.PHANTOM_ACTIVITY_AGENT_ID || "4809884505465873");
const MAX_LEADERS_PER_RUN = 50;
const POLL_INTERVAL_MS = 15_000; // 15 seconds
const MAX_POLL_MINUTES = 15; // 15 minutes max

function log(msg) {
  console.log(`[LinkedInActivity] ${msg}`);
}

/**
 * Extract LinkedIn activity for P0/P1 leaders.
 * Returns { leadersTargeted, activitiesFound, activitiesStored, errors }
 */
export async function extractLinkedInActivity() {
  if (!isPhantomBusterConfigured()) {
    log("PhantomBuster not configured, skipping");
    return { leadersTargeted: 0, activitiesFound: 0, activitiesStored: 0, skipped: true };
  }

  const supabase = getSupabase();
  const pb = createPhantomBusterClient();

  // 1. Fetch P0/P1 companies with leaders who have LinkedIn URLs
  const { data: companies, error: fetchErr } = await supabase
    .from("companies")
    .select("id, name, leaders")
    .lte("priority", 3)
    .order("priority", { ascending: true })
    .limit(100);

  if (fetchErr || !companies?.length) {
    log(`No priority companies found: ${fetchErr?.message || "empty"}`);
    return { leadersTargeted: 0, activitiesFound: 0, activitiesStored: 0 };
  }

  // Extract leaders with LinkedIn URLs
  const leadersWithUrls = [];
  for (const company of companies) {
    const leaders = company.leaders || [];
    for (const leader of leaders) {
      if (leader.li) {
        leadersWithUrls.push({
          name: leader.n,
          companyId: company.id,
          companyName: company.name,
          url: leader.li,
        });
      }
    }
  }

  const targetLeaders = leadersWithUrls.slice(0, MAX_LEADERS_PER_RUN);
  if (targetLeaders.length === 0) {
    log("No leaders with LinkedIn URLs found");
    return { leadersTargeted: 0, activitiesFound: 0, activitiesStored: 0 };
  }

  log(`Targeting ${targetLeaders.length} leaders across ${companies.length} companies`);

  // 2. Launch PhantomBuster activity extractor
  const linkedinUrls = targetLeaders.map((l) => l.url);

  let containerId;
  try {
    const launchResult = await pb.launchAgent({
      id: ACTIVITY_AGENT_ID,
      argument: { linkedinUrls },
    });
    containerId = launchResult.containerId;
    log(`Agent launched, container: ${containerId}`);
  } catch (err) {
    log(`Launch failed: ${err.message}`);
    await logEnrichment(supabase, {
      enrichment_type: "linkedin_activity",
      summary: `Launch failed: ${err.message}`,
      data: { error: err.message },
    });
    return { leadersTargeted: targetLeaders.length, activitiesFound: 0, activitiesStored: 0, error: err.message };
  }

  // 3. Poll for completion (no timeout constraint on EC2)
  const maxPolls = Math.ceil((MAX_POLL_MINUTES * 60_000) / POLL_INTERVAL_MS);
  let results = [];

  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    try {
      const status = await pb.fetchContainer(containerId);

      if (status.status === "finished") {
        log("Agent finished, fetching results...");
        try {
          const output = await pb.fetchContainerOutput(containerId);
          results = Array.isArray(output) ? output : [];
        } catch {
          // Try S3 result URLs as fallback
          if (status.orgS3Folder && status.s3Folder) {
            const urls = pb.buildResultFileUrls({ orgS3Folder: status.orgS3Folder, s3Folder: status.s3Folder });
            if (urls) {
              try {
                const res = await fetch(urls.json);
                if (res.ok) results = await res.json();
              } catch { /* ignore */ }
            }
          }
        }
        break;
      }

      if (status.status === "error") {
        log("Agent encountered an error");
        break;
      }

      if (i % 4 === 0) log(`Polling... (${Math.round((i * POLL_INTERVAL_MS) / 60000)}m elapsed)`);
    } catch (err) {
      log(`Poll error: ${err.message}`);
    }
  }

  log(`Extraction complete: ${results.length} activities found`);

  // 4. Store results in linkedin_activity table
  let stored = 0;
  if (results.length > 0) {
    const rows = results
      .map((r) => {
        // Match result back to a leader by profile URL
        const leader = targetLeaders.find(
          (l) => r.profileUrl && l.url.includes(r.profileUrl)
        );

        return {
          leader_name: leader?.name || r.fullName || "Unknown",
          company_id: leader?.companyId || null,
          activity_type: r.type || "post",
          content_summary: (r.postContent || r.text || "").slice(0, 2000),
          original_url: r.postUrl || r.url || "",
          extracted_at: new Date().toISOString(),
        };
      })
      .filter((r) => r.content_summary.length > 0);

    if (rows.length > 0) {
      const { data, error: insertErr } = await supabase
        .from("linkedin_activity")
        .insert(rows)
        .select("id");

      if (insertErr) {
        log(`Insert error: ${insertErr.message}`);
      } else {
        stored = data?.length || 0;
      }
    }

    // 5. Log to enrichment_log
    const companiesWithActivity = [...new Set(rows.map((r) => r.company_id).filter(Boolean))];
    for (const companyId of companiesWithActivity) {
      const companyRows = rows.filter((r) => r.company_id === companyId);
      const leader = targetLeaders.find((l) => l.companyId === companyId);
      const summaryParts = companyRows.map((r) => `${r.leader_name}: ${r.activity_type}`);

      await logEnrichment(supabase, {
        company_id: companyId,
        company_name: leader?.companyName,
        enrichment_type: "linkedin_activity",
        summary: `${companyRows.length} activities: ${summaryParts.join(", ")}`,
        data: { activities: companyRows.map((r) => ({ leader: r.leader_name, type: r.activity_type, content: r.content_summary.slice(0, 200) })) },
      });
    }
  }

  const summary = {
    leadersTargeted: targetLeaders.length,
    activitiesFound: results.length,
    activitiesStored: stored,
  };

  log(`Done: ${JSON.stringify(summary)}`);
  return summary;
}

async function logEnrichment(supabase, entry) {
  try {
    await supabase.from("enrichment_log").insert({
      company_id: entry.company_id || null,
      company_name: entry.company_name || null,
      leader_name: entry.leader_name || null,
      enrichment_type: entry.enrichment_type,
      summary: entry.summary,
      data: entry.data || {},
    });
  } catch (err) {
    console.error("[LinkedInActivity] enrichment_log insert failed:", err.message);
  }
}
