#!/usr/bin/env node
/**
 * Merge enrichment data (hooks, LinkedIn URLs, fresh news) into all-companies.json
 *
 * Usage: node scripts/merge-enrichment.js scripts/enrich-result-*.json
 *
 * Each input file should be a JSON array of objects with:
 *   { id, name, leaders: [{n, t, bg, li, hooks}], news: [{h, s, d}] }
 *
 * This script MERGES — it won't overwrite existing data unless the new data is non-empty.
 * Leaders are matched by name. News items are appended (deduped by headline).
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');

// Collect input files
let inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  const scriptsDir = __dirname;
  inputFiles = fs.readdirSync(scriptsDir)
    .filter(f => f.match(/(enrich|refresh)-result-\d+\.json$/))
    .map(f => path.join(scriptsDir, f));
}

if (inputFiles.length === 0) {
  console.error('No enrichment files found.');
  process.exit(1);
}

console.log(`Loading ${inputFiles.length} enrichment files...`);

let enrichments = [];
for (const file of inputFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (Array.isArray(data)) {
      enrichments.push(...data);
      console.log(`  ${path.basename(file)}: ${data.length} companies`);
    }
  } catch (e) {
    console.error(`  Error reading ${file}: ${e.message}`);
  }
}

console.log(`Total enrichment entries: ${enrichments.length}`);

// Build lookups
const enrichById = new Map();
const enrichByName = new Map();
for (const e of enrichments) {
  if (e.id) enrichById.set(e.id, e);
  if (e.name) enrichByName.set(e.name.toLowerCase().trim().replace(/[^a-z0-9]/g, ''), e);
}

// Load existing
const allCompanies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
console.log(`\nExisting companies: ${allCompanies.length}`);

let updatedLeaders = 0;
let updatedNews = 0;
let addedHooks = 0;
let addedLinkedIn = 0;

for (const company of allCompanies) {
  let enrichment = enrichById.get(company.id);
  if (!enrichment) {
    const norm = company.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    enrichment = enrichByName.get(norm);
  }
  if (!enrichment) continue;

  // Merge leaders: match by normalized name, add hooks + LinkedIn
  if (enrichment.leaders && enrichment.leaders.length > 0 && company.leaders) {
    for (const existingLeader of company.leaders) {
      const normName = existingLeader.n.toLowerCase().trim();
      const enrichLeader = enrichment.leaders.find(
        l => l.n.toLowerCase().trim() === normName
      );
      if (enrichLeader) {
        // Add hooks if missing
        if (enrichLeader.hooks && enrichLeader.hooks.length > 0 && (!existingLeader.hooks || existingLeader.hooks.length === 0)) {
          existingLeader.hooks = enrichLeader.hooks;
          addedHooks++;
        }
        // Add LinkedIn if missing
        if (enrichLeader.li && enrichLeader.li.length > 0 && (!existingLeader.li || existingLeader.li.length === 0)) {
          existingLeader.li = enrichLeader.li;
          addedLinkedIn++;
        }
        // Update background if enrichment has a longer one
        if (enrichLeader.bg && enrichLeader.bg.length > (existingLeader.bg || '').length) {
          existingLeader.bg = enrichLeader.bg;
        }
      }
    }
    // Add any new leaders not in existing
    for (const enrichLeader of enrichment.leaders) {
      const normName = enrichLeader.n.toLowerCase().trim();
      const exists = company.leaders.some(l => l.n.toLowerCase().trim() === normName);
      if (!exists && enrichLeader.n && enrichLeader.t) {
        company.leaders.push(enrichLeader);
      }
    }
    updatedLeaders++;
  }

  // Merge news: append new headlines (dedup by normalized headline)
  if (enrichment.news && enrichment.news.length > 0) {
    const existingHeadlines = new Set(
      (company.news || []).map(n => n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''))
    );
    const newNews = enrichment.news.filter(n => {
      const norm = n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return !existingHeadlines.has(norm);
    });
    if (newNews.length > 0) {
      company.news = [...newNews, ...(company.news || [])]; // New news first
      updatedNews++;
    }
  }
}

console.log(`\nLeaders enriched: ${updatedLeaders} companies`);
console.log(`Hooks added: ${addedHooks} leaders`);
console.log(`LinkedIn URLs added: ${addedLinkedIn} leaders`);
console.log(`News updated: ${updatedNews} companies`);

// Write
fs.writeFileSync(ALL_COMPANIES, JSON.stringify(allCompanies, null, 2));
const size = fs.statSync(ALL_COMPANIES).size;
console.log(`\nWritten to ${ALL_COMPANIES}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);

// Stats
const totalWithHooks = allCompanies.reduce((s, c) =>
  s + ((c.leaders || []).filter(l => l.hooks && l.hooks.length > 0).length), 0);
const totalWithLi = allCompanies.reduce((s, c) =>
  s + ((c.leaders || []).filter(l => l.li && l.li.length > 0).length), 0);
const totalLeaders = allCompanies.reduce((s, c) => s + (c.leaders || []).length, 0);
console.log(`\nTotal leaders: ${totalLeaders}`);
console.log(`With hooks: ${totalWithHooks}`);
console.log(`With LinkedIn: ${totalWithLi}`);
