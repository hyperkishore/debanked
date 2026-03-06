import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import cron from "node-cron";
import { getSupabase } from "./lib/supabase.js";
import { researchCompany } from "./lib/researcher.js";
import { extractLinkedInActivity } from "./lib/linkedin-activity.js";
import { enrichProfiles } from "./lib/profile-enrichment.js";
import { scrapeCompanyIntel } from "./lib/company-intelligence.js";
import { generateDailyDigest } from "./lib/daily-digest.js";

// Load .env file (no external dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(join(__dirname, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn("[Worker] No .env file found, using environment variables");
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds
const TOOL_API_URL = process.env.TOOL_API_URL || "https://us.hyperverge.space";
const TOOL_API_KEY = process.env.TOOL_API_KEY;

console.log("[Worker] Research worker starting...");

// --- Poll Loop ---

async function pollAndProcess() {
  const supabase = getSupabase();

  // Fetch next pending request (lowest priority first, then oldest)
  const { data: requests, error } = await supabase
    .from("research_requests")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .order("requested_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("[Worker] Poll error:", error.message);
    return;
  }

  if (!requests || requests.length === 0) return;

  const req = requests[0];

  // Claim via optimistic lock
  const { data: claimed, error: claimErr } = await supabase
    .from("research_requests")
    .update({
      status: "processing",
      started_at: new Date().toISOString(),
    })
    .eq("id", req.id)
    .eq("status", "pending")
    .select("id")
    .single();

  if (claimErr || !claimed) {
    // Another worker claimed it, skip
    return;
  }

  console.log(
    `[Worker] Processing: ${req.company_name || req.company_id} (${req.trigger_type}, priority ${req.priority})`
  );

  try {
    const result = await researchCompany(
      req.company_id,
      req.company_name || `Company ${req.company_id}`
    );

    // Mark completed
    await supabase
      .from("research_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result,
      })
      .eq("id", req.id);

    // Also update via PATCH endpoint for UI polling
    if (TOOL_API_KEY) {
      await fetch(`${TOOL_API_URL}/api/research-requests`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Tool-Key": TOOL_API_KEY,
        },
        body: JSON.stringify({
          id: req.id,
          status: "completed",
          completed_at: new Date().toISOString(),
          result,
        }),
      }).catch(() => {});
    }

    console.log(
      `[Worker] Completed: ${req.company_name || req.company_id} — ${result.summary}`
    );
  } catch (err) {
    console.error(
      `[Worker] Failed: ${req.company_name || req.company_id}:`,
      err.message
    );

    await supabase
      .from("research_requests")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: err.message,
      })
      .eq("id", req.id);
  }
}

// Start poll loop
let polling = false;

async function poll() {
  if (polling) return;
  polling = true;
  try {
    await pollAndProcess();
  } catch (err) {
    console.error("[Worker] Unexpected poll error:", err.message);
  } finally {
    polling = false;
  }
}

setInterval(poll, POLL_INTERVAL_MS);
poll(); // Immediate first poll

// --- Weekly Scheduled Triggers ---

// Every Monday at 6 AM UTC: queue research for stale P0/P1 companies
cron.schedule("0 6 * * 1", async () => {
  console.log("[Cron] Weekly research refresh — finding stale P0/P1 companies...");

  const supabase = getSupabase();

  try {
    // Find P0/P1 companies (priority <= 2)
    const { data: companies, error } = await supabase
      .from("companies")
      .select("id, name, priority, source")
      .lte("priority", 2);

    if (error || !companies) {
      console.error("[Cron] Failed to fetch companies:", error?.message);
      return;
    }

    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 86400000);
    let queued = 0;

    for (const company of companies) {
      // Check if recently refreshed via source tags
      const source = company.source || [];
      const refreshTag = source.find((s) => s.startsWith("refreshed-"));
      if (refreshTag) {
        const match = refreshTag.match(/^refreshed-(\d{4})-(\d{2})$/);
        if (match) {
          const refreshDate = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            15
          );
          if (refreshDate > fourteenDaysAgo) continue; // Still fresh
        }
      }

      // Queue research request
      const { error: insertErr } = await supabase
        .from("research_requests")
        .insert({
            company_id: company.id,
            company_name: company.name,
            trigger_type: "scheduled",
            priority: company.priority,
            status: "pending",
        }
        );

      if (!insertErr) queued++;
    }

    console.log(
      `[Cron] Queued ${queued} stale P0/P1 companies for research refresh`
    );
  } catch (err) {
    console.error("[Cron] Weekly refresh error:", err.message);
  }
});

// --- Daily: LinkedIn Activity → Profile Hooks (chained) ---
// Runs at 6 AM UTC daily
cron.schedule("0 6 * * *", async () => {
  console.log("[Cron] Daily LinkedIn activity extraction starting...");
  try {
    const activity = await extractLinkedInActivity();
    console.log(`[Cron] LinkedIn activity done: ${activity.activitiesStored || 0} stored`);

    // Chain profile enrichment (only runs if new activity found)
    const hooks = await enrichProfiles(activity);
    console.log(`[Cron] Profile enrichment done: ${hooks.leadersEnriched || 0} leaders, ${hooks.hooksGenerated || 0} hooks`);
  } catch (err) {
    console.error("[Cron] LinkedIn activity pipeline error:", err.message);
  }
});

// --- Daily: Intelligence Digest ---
// Runs at 8 AM UTC daily (after all enrichment + news-ingest completes)
cron.schedule("0 8 * * *", async () => {
  console.log("[Cron] Daily intelligence digest starting...");
  try {
    const digest = await generateDailyDigest();
    console.log(`[Cron] Daily digest done: ${digest.highlights?.length || 0} highlights`);
  } catch (err) {
    console.error("[Cron] Daily digest error:", err.message);
  }
});

// --- Weekly: Company Intelligence Scraping ---
// Runs Sunday 2 AM UTC
cron.schedule("0 2 * * 0", async () => {
  console.log("[Cron] Weekly company intelligence scraping starting...");
  try {
    const intel = await scrapeCompanyIntel();
    console.log(`[Cron] Company intel done: ${intel.companiesScraped} scraped, ${intel.updatesFound} updates`);
  } catch (err) {
    console.error("[Cron] Company intelligence error:", err.message);
  }
});

console.log("[Worker] Ready. Polling every 30s. Crons: Mon 6AM (research), Daily 6AM (LinkedIn), Daily 8AM (digest), Sun 2AM (company intel).");
