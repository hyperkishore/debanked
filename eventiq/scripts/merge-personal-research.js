#!/usr/bin/env node

/**
 * Merge personal research data into Supabase companies table.
 * Updates leader.personal field and appends new hooks.
 *
 * Usage: node scripts/merge-personal-research.js scripts/imports/personal-research-2026-03-07.json
 *        node scripts/merge-personal-research.js scripts/imports/personal-research-2026-03-07.json --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load env from .env.vercel or .env.production (handle escaped \n in values)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFiles = [".env.vercel", ".env.production", ".env.local"];
for (const f of envFiles) {
  try {
    const content = readFileSync(resolve(__dirname, "..", f), "utf8");
    for (const line of content.split("\n")) {
      const m = line.match(/^([^=]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^"|"$/g, "").replace(/\\n$/, "");
      }
    }
  } catch { /* file not found, try next */ }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const inputFile = process.argv[2];
const dryRun = process.argv.includes("--dry-run");

if (!inputFile) {
  console.error("Usage: node scripts/merge-personal-research.js <file.json> [--dry-run]");
  process.exit(1);
}

const research = JSON.parse(readFileSync(inputFile, "utf8"));
console.log(`Loaded ${research.length} entries from ${inputFile}`);
if (dryRun) console.log("DRY RUN — no changes will be written\n");

let updated = 0;
let skipped = 0;
let notFound = 0;

for (const entry of research) {
  // Skip entries with no personal data
  if (!entry.personal || entry.personal.startsWith("No personal")) {
    skipped++;
    continue;
  }

  // Find the company by name
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, leaders")
    .ilike("name", entry.companyName)
    .limit(1);

  if (error || !companies || companies.length === 0) {
    // Try fuzzy match
    const { data: fuzzy } = await supabase
      .from("companies")
      .select("id, name, leaders")
      .ilike("name", `%${entry.companyName}%`)
      .limit(1);

    if (!fuzzy || fuzzy.length === 0) {
      console.log(`  NOT FOUND: ${entry.companyName}`);
      notFound++;
      continue;
    }
    companies.length = 0;
    companies.push(fuzzy[0]);
  }

  const company = companies[0];
  const leaders = company.leaders || [];

  // Find the matching leader
  const leaderIdx = leaders.findIndex(
    (l) => l.n.toLowerCase() === entry.leaderName.toLowerCase()
  );

  if (leaderIdx === -1) {
    console.log(`  LEADER NOT FOUND: ${entry.leaderName} in ${company.name}`);
    notFound++;
    continue;
  }

  const leader = leaders[leaderIdx];

  // Update personal field
  leader.personal = entry.personal;

  // Merge hooks — add new ones that don't already exist
  const existingHooks = new Set((leader.hooks || []).map((h) => h.toLowerCase()));
  const newHooks = (entry.newHooks || []).filter(
    (h) => !existingHooks.has(h.toLowerCase())
  );
  leader.hooks = [...newHooks, ...(leader.hooks || [])]; // Personal hooks first

  leaders[leaderIdx] = leader;

  console.log(
    `  ${company.name} → ${leader.n}: personal="${entry.personal.slice(0, 60)}..." +${newHooks.length} hooks`
  );

  if (!dryRun) {
    const { error: updateError } = await supabase
      .from("companies")
      .update({ leaders })
      .eq("id", company.id);

    if (updateError) {
      console.error(`    UPDATE FAILED: ${updateError.message}`);
    } else {
      updated++;
    }
  } else {
    updated++;
  }
}

console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Not found: ${notFound}`);
