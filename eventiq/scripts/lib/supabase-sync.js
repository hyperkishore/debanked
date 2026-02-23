/**
 * supabase-sync.js — Shared utility for syncing all-companies.json to Supabase.
 *
 * Call `syncToSupabase(companies)` after writing to all-companies.json.
 * Reads credentials from .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY).
 * Non-blocking by design — logs errors but never throws, so merge scripts
 * always complete even if Supabase is unreachable.
 *
 * Usage (CJS):
 *   const { syncToSupabase } = require('./lib/supabase-sync');
 *   fs.writeFileSync(ALL_COMPANIES, JSON.stringify(data, null, 2));
 *   await syncToSupabase(data);
 *
 * Usage (ESM):
 *   import { syncToSupabase } from './lib/supabase-sync.js';
 */

const fs = require("fs");
const path = require("path");

// Load .env.local if env vars aren't already set
function loadEnv() {
  const envPath = path.resolve(__dirname, "../../.env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// Transform a Company object (client schema) to a Supabase row (DB schema)
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
    category: c.category || null,
  };
}

/**
 * Upsert companies array to Supabase. Non-blocking — logs errors, never throws.
 * @param {Array} companies — Array of Company objects in client schema
 * @param {Object} [opts]
 * @param {boolean} [opts.silent=false] — Suppress success logs
 * @returns {Promise<{ok: boolean, upserted: number, errors: number}>}
 */
async function syncToSupabase(companies, opts = {}) {
  loadEnv();

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    if (!opts.silent) {
      console.log(
        "  [supabase-sync] Skipped — no SUPABASE_URL or SUPABASE_SERVICE_KEY"
      );
    }
    return { ok: false, upserted: 0, errors: 0 };
  }

  // Dynamic require — avoids needing @supabase/supabase-js at top level
  let createClient;
  try {
    createClient = require("@supabase/supabase-js").createClient;
  } catch {
    console.log("  [supabase-sync] Skipped — @supabase/supabase-js not found");
    return { ok: false, upserted: 0, errors: 0 };
  }

  const supabase = createClient(url, key);
  const BATCH_SIZE = 100;
  let upserted = 0;
  let errors = 0;

  const skipColumns = new Set();

  try {
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      let batch = companies.slice(i, i + BATCH_SIZE).map(toRow);

      // Strip columns that Supabase doesn't have yet
      if (skipColumns.size > 0) {
        batch = batch.map((row) => {
          const clean = { ...row };
          for (const col of skipColumns) delete clean[col];
          return clean;
        });
      }

      const { error } = await supabase
        .from("companies")
        .upsert(batch, { onConflict: "id" });

      if (error) {
        // If column doesn't exist, strip it and retry this batch
        const colMatch = error.message.match(
          /Could not find the '(\w+)' column/
        );
        if (colMatch) {
          skipColumns.add(colMatch[1]);
          // Retry this batch without the missing column
          const retryBatch = batch.map((row) => {
            const clean = { ...row };
            delete clean[colMatch[1]];
            return clean;
          });
          const { error: retryErr } = await supabase
            .from("companies")
            .upsert(retryBatch, { onConflict: "id" });
          if (retryErr) {
            console.error(
              `  [supabase-sync] Error batch ${i}-${i + retryBatch.length}: ${retryErr.message}`
            );
            errors += retryBatch.length;
          } else {
            upserted += retryBatch.length;
          }
        } else {
          console.error(
            `  [supabase-sync] Error batch ${i}-${i + batch.length}: ${error.message}`
          );
          errors += batch.length;
        }
      } else {
        upserted += batch.length;
      }
    }

    if (!opts.silent) {
      console.log(
        `  [supabase-sync] Synced ${upserted}/${companies.length} companies to Supabase` +
          (errors > 0 ? ` (${errors} errors)` : "")
      );
    }
  } catch (err) {
    console.error(`  [supabase-sync] Fatal: ${err.message}`);
    return { ok: false, upserted, errors: errors + 1 };
  }

  return { ok: errors === 0, upserted, errors };
}

module.exports = { syncToSupabase, toRow };
