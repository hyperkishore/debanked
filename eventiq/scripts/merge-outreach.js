#!/usr/bin/env node
/**
 * merge-outreach.js
 *
 * Reads cross-ref-result.json and upserts outreach_history into Supabase companies table.
 * Also updates all-companies.json with outreach data for local backup.
 *
 * Prerequisites: Run cross-ref-email.js first to generate cross-ref-result.json.
 *
 * Usage:
 *   node --experimental-strip-types scripts/merge-outreach.js
 *   node --experimental-strip-types scripts/merge-outreach.js --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fupoylarelcwiewnvoyu.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY && !DRY_RUN) {
  console.error("Missing SUPABASE_SERVICE_KEY. Use --dry-run or set env var.");
  process.exit(1);
}

// Load cross-ref results
const crossRefPath = resolve(__dirname, "research/batch-results/cross-ref/cross-ref-result.json");
const crossRef = JSON.parse(readFileSync(crossRefPath, "utf-8"));
console.log(`Cross-ref results: ${crossRef.summary.totalCompanies} companies`);
console.log(`  Engaged: ${crossRef.summary.engaged}`);
console.log(`  Contacted: ${crossRef.summary.contacted}`);
console.log(`  Responded: ${crossRef.summary.responded}`);

// Load all-companies.json for local update
const companiesPath = resolve(__dirname, "..", "src", "data", "all-companies.json");
const companies = JSON.parse(readFileSync(companiesPath, "utf-8"));

// Build lookup
const outreachByCompanyId = {};
for (const entry of crossRef.companies) {
  outreachByCompanyId[entry.companyId] = {
    status: entry.status === "no_website" ? "no_history" : entry.status,
    totalOutbound: entry.totalOutbound,
    totalInbound: entry.totalInbound,
    lastActivityDate: entry.lastActivityDate || null,
    matchedContacts: entry.matchedContacts.map((c) => ({
      email: c.email,
      name: c.name,
      title: c.title,
      outbound: c.outbound,
      inbound: c.inbound,
    })),
  };
}

// Update local JSON
let localUpdated = 0;
for (const company of companies) {
  const outreach = outreachByCompanyId[company.id];
  if (outreach && outreach.status !== "no_history") {
    company.outreachHistory = outreach;
    localUpdated++;
  }
}

console.log(`\nLocal JSON: ${localUpdated} companies updated with outreach history`);

if (DRY_RUN) {
  console.log("\n[DRY RUN] Would update local JSON and Supabase. Skipping writes.");
  // Show top 10 engaged/contacted for preview
  const preview = crossRef.companies
    .filter((c) => c.status === "engaged" || c.status === "contacted")
    .sort((a, b) => (b.totalOutbound + b.totalInbound) - (a.totalOutbound + a.totalInbound))
    .slice(0, 10);
  console.log("\nTop engaged/contacted:");
  for (const c of preview) {
    console.log(`  ${c.status.padEnd(10)} ${c.companyName.padEnd(35)} Out:${c.totalOutbound} In:${c.totalInbound}`);
  }
  process.exit(0);
}

// Write updated local JSON
writeFileSync(companiesPath, JSON.stringify(companies, null, 2) + "\n");
console.log(`Written to ${companiesPath}`);

// Update Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateSupabase() {
  // First, check if outreach_history column exists by trying a query
  const { error: checkError } = await supabase
    .from("companies")
    .select("outreach_history")
    .limit(1);

  if (checkError && checkError.message.includes("does not exist")) {
    console.log("\nAdding outreach_history column to Supabase...");
    // Use raw SQL via RPC or just update with JSONB — Supabase auto-creates?
    // Actually, we need to add the column via SQL. Let's use the REST API.
    const { error: alterError } = await supabase.rpc("exec_sql", {
      query: "ALTER TABLE companies ADD COLUMN IF NOT EXISTS outreach_history JSONB DEFAULT NULL",
    });
    if (alterError) {
      console.log("Note: Could not auto-add column. Please run this SQL in Supabase dashboard:");
      console.log("  ALTER TABLE companies ADD COLUMN outreach_history JSONB DEFAULT NULL;");
      console.log("Then re-run this script.");
      console.log("\nLocal JSON was already updated successfully.");
      return;
    }
  }

  // Batch update
  let updated = 0;
  let errors = 0;
  const BATCH_SIZE = 50;

  const entriesToUpdate = crossRef.companies.filter(
    (c) => c.status !== "no_history" && c.status !== "no_website"
  );

  for (let i = 0; i < entriesToUpdate.length; i += BATCH_SIZE) {
    const batch = entriesToUpdate.slice(i, i + BATCH_SIZE);

    for (const entry of batch) {
      const outreach = outreachByCompanyId[entry.companyId];
      const { error } = await supabase
        .from("companies")
        .update({ outreach_history: outreach })
        .eq("id", entry.companyId);

      if (error) {
        console.error(`  Error updating ${entry.companyName}: ${error.message}`);
        errors++;
      } else {
        updated++;
      }
    }

    process.stdout.write(`\r  Updated ${updated}/${entriesToUpdate.length} in Supabase...`);
  }

  console.log("");
  console.log(`\nSupabase: ${updated} updated, ${errors} errors`);
}

updateSupabase().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
