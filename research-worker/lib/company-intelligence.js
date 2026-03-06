/**
 * Weekly Company Intelligence Scraping.
 * Scrapes company data via PhantomBuster Company Scraper for P0/P1/P2 companies.
 *
 * Flow:
 * 1. Fetch P0/P1/P2 companies (max 80 per run)
 * 2. Launch PhantomBuster Company Scraper in batches of 20
 * 3. Poll for results
 * 4. Compare with existing data — flag significant changes
 * 5. Write updates via /api/tools/company-update
 * 6. Log to enrichment_log
 */

import { getSupabase } from "./supabase.js";
import { createPhantomBusterClient, isPhantomBusterConfigured } from "./phantombuster.js";

const COMPANY_SCRAPER_AGENT_ID = Number(process.env.PHANTOM_COMPANY_SCRAPER_ID || "1432983770785788");
const BATCH_SIZE = 20;
const POLL_INTERVAL_MS = 15_000;
const MAX_POLL_MINUTES = 10;

function log(msg) {
  console.log(`[CompanyIntel] ${msg}`);
}

function getToolConfig() {
  return {
    url: process.env.TOOL_API_URL || "https://us.hyperverge.space",
    key: process.env.TOOL_API_KEY,
  };
}

/**
 * Scrape company intelligence for P0/P1/P2 companies.
 * @returns {{ companiesScraped, updatesFound, errors }}
 */
export async function scrapeCompanyIntel() {
  if (!isPhantomBusterConfigured()) {
    log("PhantomBuster not configured, skipping");
    return { companiesScraped: 0, updatesFound: 0, skipped: true };
  }

  const supabase = getSupabase();
  const pb = createPhantomBusterClient();
  const { url: TOOL_API_URL, key: TOOL_API_KEY } = getToolConfig();

  // 1. Fetch P0/P1/P2 companies with LinkedIn URLs
  const { data: companies, error: fetchErr } = await supabase
    .from("companies")
    .select("id, name, linkedinUrl, website, employees, desc_text")
    .lte("priority", 3)
    .order("priority", { ascending: true })
    .limit(80);

  if (fetchErr || !companies?.length) {
    log(`No companies found: ${fetchErr?.message || "empty"}`);
    return { companiesScraped: 0, updatesFound: 0 };
  }

  // Filter to companies with LinkedIn URLs (needed for scraper)
  const targets = companies.filter((c) => c.linkedinUrl);
  if (targets.length === 0) {
    log("No companies with LinkedIn URLs found");
    return { companiesScraped: 0, updatesFound: 0 };
  }

  log(`Targeting ${targets.length} companies for intelligence scraping`);

  let totalUpdates = 0;
  const errors = [];

  // 2. Process in batches
  for (let batchIdx = 0; batchIdx < targets.length; batchIdx += BATCH_SIZE) {
    const batch = targets.slice(batchIdx, batchIdx + BATCH_SIZE);
    const batchNum = Math.floor(batchIdx / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

    log(`Batch ${batchNum}/${totalBatches}: ${batch.length} companies`);

    const linkedinUrls = batch.map((c) => c.linkedinUrl);

    let containerId;
    try {
      const launchResult = await pb.launchAgent({
        id: COMPANY_SCRAPER_AGENT_ID,
        argument: { linkedinUrls },
      });
      containerId = launchResult.containerId;
    } catch (err) {
      log(`Batch ${batchNum} launch failed: ${err.message}`);
      errors.push(`Batch ${batchNum}: ${err.message}`);
      continue;
    }

    // 3. Poll for results
    const maxPolls = Math.ceil((MAX_POLL_MINUTES * 60_000) / POLL_INTERVAL_MS);
    let results = [];

    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      try {
        const status = await pb.fetchContainer(containerId);

        if (status.status === "finished") {
          try {
            const output = await pb.fetchContainerOutput(containerId);
            results = Array.isArray(output) ? output : [];
          } catch {
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
          log(`Batch ${batchNum} agent error`);
          errors.push(`Batch ${batchNum}: agent error`);
          break;
        }
      } catch (err) {
        log(`Batch ${batchNum} poll error: ${err.message}`);
      }
    }

    // 4. Compare results with existing data and update
    for (const result of results) {
      const matchUrl = result.linkedinUrl || result.url || "";
      const company = batch.find((c) => c.linkedinUrl && matchUrl.includes(c.linkedinUrl.replace(/\/$/, "")));
      if (!company) continue;

      const changes = {};
      let changeDescriptions = [];

      // Employee count changes
      if (result.employeeCount && company.employees) {
        const newCount = parseInt(result.employeeCount);
        if (!isNaN(newCount) && Math.abs(newCount - company.employees) > company.employees * 0.1) {
          changes.employees = newCount;
          const direction = newCount > company.employees ? "grew" : "shrank";
          changeDescriptions.push(`Headcount ${direction}: ${company.employees} → ${newCount}`);
        }
      } else if (result.employeeCount && !company.employees) {
        const newCount = parseInt(result.employeeCount);
        if (!isNaN(newCount)) {
          changes.employees = newCount;
          changeDescriptions.push(`Employee count discovered: ${newCount}`);
        }
      }

      // Description update (if significantly different)
      if (result.description && result.description.length > 50) {
        const existingDesc = (company.desc_text || "").toLowerCase();
        const newDesc = result.description.toLowerCase();
        // Only update if new description has substantial new content
        if (existingDesc.length < 50 || !existingDesc.includes(newDesc.slice(0, 50))) {
          // Don't overwrite good descriptions, but note the new one
          changeDescriptions.push(`New LinkedIn description available (${result.description.length} chars)`);
        }
      }

      // Website discovery
      if (result.website && !company.website) {
        changes.website = result.website;
        changeDescriptions.push(`Website discovered: ${result.website}`);
      }

      if (changeDescriptions.length === 0) continue;

      // 5. Write updates if there are meaningful changes
      if (Object.keys(changes).length > 0 && TOOL_API_KEY) {
        try {
          await fetch(`${TOOL_API_URL}/api/tools/company-update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Tool-Key": TOOL_API_KEY,
            },
            body: JSON.stringify({
              companyId: company.id,
              updates: changes,
              mode: "merge",
            }),
          });
        } catch (err) {
          errors.push(`Update failed for ${company.name}: ${err.message}`);
        }
      }

      // 6. Log to enrichment_log
      await supabase.from("enrichment_log").insert({
        company_id: company.id,
        company_name: company.name,
        enrichment_type: "company_intel",
        summary: changeDescriptions.join("; "),
        data: {
          changes,
          scraped: {
            employeeCount: result.employeeCount,
            description: result.description?.slice(0, 500),
            industry: result.industry,
          },
        },
      }).then(() => {}, () => {});

      totalUpdates++;
    }

    // Wait between batches to respect PB rate limits
    if (batchIdx + BATCH_SIZE < targets.length) {
      log("Waiting 30s between batches...");
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }

  const summary = { companiesScraped: targets.length, updatesFound: totalUpdates, errors: errors.length };
  log(`Done: ${JSON.stringify(summary)}`);
  return summary;
}
