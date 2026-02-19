#!/usr/bin/env node
/**
 * Build-time script: pull fresh news from Supabase company_news table
 * and merge into all-companies.json.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/pull-news-from-supabase.js
 *
 * This runs before `npm run build` to bake the latest news into the static export.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('Supabase not configured — skipping news pull. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.');
  process.exit(0);
}

async function supabaseQuery(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase query failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Pulling news from Supabase...');

  // Fetch all news items (ordered by published_at desc)
  const newsRows = await supabaseQuery('company_news', 'order=published_at.desc.nullslast&limit=5000');
  console.log(`  Fetched ${newsRows.length} news items from Supabase`);

  if (newsRows.length === 0) {
    console.log('  No news to merge. Exiting.');
    return;
  }

  // Group by company_id
  const newsMap = new Map();
  for (const row of newsRows) {
    const cid = row.company_id;
    if (!newsMap.has(cid)) newsMap.set(cid, []);
    newsMap.get(cid).push({
      h: row.headline,
      s: row.source || '',
      d: row.description || '',
      p: row.published_at || undefined,
    });
  }

  // Load existing companies
  const companies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
  console.log(`  Loaded ${companies.length} companies from all-companies.json`);

  let updatedCount = 0;

  for (const company of companies) {
    const freshNews = newsMap.get(company.id);
    if (!freshNews) continue;

    // Dedupe by headline (normalized)
    const existingHeadlines = new Set(
      (company.news || []).map(n => n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
    );

    const newItems = freshNews.filter(n => {
      const norm = n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return !existingHeadlines.has(norm);
    });

    if (newItems.length > 0) {
      company.news = [...newItems, ...(company.news || [])];
      updatedCount++;
    }

    // Also backfill p field on existing news items that lack it
    if (company.news) {
      const pMap = new Map();
      for (const fn of freshNews) {
        if (fn.p) {
          pMap.set(fn.h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''), fn.p);
        }
      }
      for (const n of company.news) {
        if (n.p) continue;
        const key = n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
        const p = pMap.get(key);
        if (p) n.p = p;
      }
    }
  }

  // Write back
  fs.writeFileSync(ALL_COMPANIES, JSON.stringify(companies, null, 2));
  const size = fs.statSync(ALL_COMPANIES).size;
  console.log(`  Updated ${updatedCount} companies with fresh news`);
  console.log(`  Written to ${ALL_COMPANIES} (${(size / 1024).toFixed(1)} KB)`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
