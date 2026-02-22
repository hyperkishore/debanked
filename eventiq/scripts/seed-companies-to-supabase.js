#!/usr/bin/env node
/**
 * seed-companies-to-supabase.js
 *
 * One-time script to upload all-companies.json into the Supabase `companies` table.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/seed-companies-to-supabase.js
 *
 * Or set them in .env.local and load with dotenv:
 *   node -r dotenv/config scripts/seed-companies-to-supabase.js
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables."
  );
  console.error(
    "Usage: SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/seed-companies-to-supabase.js"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load companies JSON
const dataPath = resolve(__dirname, "../src/data/all-companies.json");
const companies = JSON.parse(readFileSync(dataPath, "utf-8"));

console.log(`Loaded ${companies.length} companies from all-companies.json`);

// Transform to DB schema
function toRow(c) {
  return {
    id: c.id,
    name: c.name,
    type: c.type || "TAM",
    priority: c.priority || 4,
    phase: c.phase || 0,
    booth: !!c.booth,
    clear: !!c.clear,
    contacts: c.contacts || [],
    leaders: c.leaders || [],
    desc_text: c.desc || "",
    notes: c.notes || "",
    news: c.news || [],
    ice: c.ice || "",
    icebreakers: c.icebreakers || [],
    talking_points: c.tp || [],
    ask: c.ask || "",
    location: c.location || null,
    employees: c.employees || null,
    website: c.website || null,
    linkedin_url: c.linkedinUrl || null,
    source: c.source || [],
  };
}

// Upsert in batches of 100
const BATCH_SIZE = 100;

async function seed() {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < companies.length; i += BATCH_SIZE) {
    const batch = companies.slice(i, i + BATCH_SIZE).map(toRow);

    const { error } = await supabase
      .from("companies")
      .upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(
        `Error upserting batch ${i}-${i + batch.length}:`,
        error.message
      );
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(
        `\r  Upserted ${inserted}/${companies.length} companies...`
      );
    }
  }

  console.log("");
  console.log(`Done! Inserted/updated: ${inserted}, Errors: ${errors}`);
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
