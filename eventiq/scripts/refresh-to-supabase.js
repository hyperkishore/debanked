#!/usr/bin/env node
/**
 * Write agent research results directly to Supabase company_news table.
 *
 * Usage:
 *   node scripts/refresh-to-supabase.js scripts/refresh-result-*.json
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY env vars
 * (uses service key to bypass RLS for batch inserts)
 *
 * Each input file: JSON array of objects with:
 *   { id, name, news: [{h, s, d, p?}] }
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
  process.exit(1);
}

// Minimal Supabase REST client (no npm dependency needed for scripts)
async function supabaseInsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates', // upsert on conflict
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed (${res.status}): ${text}`);
  }
  return res;
}

// Signal classification (matches feed-helpers.ts)
function classifySignal(headline, description) {
  const text = `${headline} ${description}`.toLowerCase();
  if (/securitiz|abs|credit facilit|funding round|raise|series [a-f]|warehouse|capital|million|billion|\$\d/.test(text)) return 'funding';
  if (/partner|integrat|collaborat|alliance|joined|embedded|api/.test(text)) return 'partnership';
  if (/launch|new product|new feature|platform|tool|service|division/.test(text)) return 'product';
  if (/hire|appoint|ceo|cro|ciso|cmo|chief|new leadership|new head/.test(text)) return 'hiring';
  if (/regulat|compliance|law|bill|act|fda|fcc|fdic|sba|ftc|settlement/.test(text)) return 'regulatory';
  if (/milestone|surpass|\d+b|\d+m|record|award|ranked|best|fastest/.test(text)) return 'milestone';
  return 'general';
}

// Parse date from source string
function parseDateFromSource(source) {
  const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  const m = (source || '').match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
  if (m) {
    const month = months[m[1].toLowerCase().slice(0, 3)];
    const year = parseInt(m[2]);
    if (!isNaN(month) && !isNaN(year)) {
      return new Date(year, month, 15).toISOString().split('T')[0];
    }
  }
  return null;
}

async function main() {
  let inputFiles = process.argv.slice(2);

  if (inputFiles.length === 0) {
    const scriptsDir = __dirname;
    inputFiles = fs.readdirSync(scriptsDir)
      .filter(f => f.match(/(enrich|refresh)-result-\d+\.json$/))
      .map(f => path.join(scriptsDir, f));
  }

  if (inputFiles.length === 0) {
    console.error('No result files found.');
    process.exit(1);
  }

  console.log(`Loading ${inputFiles.length} result files...`);

  let totalRows = 0;
  let totalCompanies = 0;

  for (const file of inputFiles) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (!Array.isArray(data)) continue;

      console.log(`  ${path.basename(file)}: ${data.length} companies`);

      for (const company of data) {
        if (!company.news || company.news.length === 0) continue;

        const rows = company.news
          .filter(n => n.h && n.h.length > 5)
          .map(n => ({
            company_id: company.id,
            company_name: company.name || '',
            headline: n.h,
            source: n.s || '',
            description: n.d || '',
            published_at: n.p || parseDateFromSource(n.s),
            signal_type: classifySignal(n.h, n.d || ''),
          }));

        if (rows.length > 0) {
          // Insert in batches of 50
          for (let i = 0; i < rows.length; i += 50) {
            await supabaseInsert('company_news', rows.slice(i, i + 50));
          }
          totalRows += rows.length;
          totalCompanies++;
        }
      }
    } catch (e) {
      console.error(`  Error processing ${file}: ${e.message}`);
    }
  }

  console.log(`\nDone: ${totalRows} news items from ${totalCompanies} companies → Supabase company_news`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
