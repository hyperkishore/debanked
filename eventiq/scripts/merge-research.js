#!/usr/bin/env node
/**
 * Merge researched company data from agent output files into all-companies.json
 *
 * Usage: node scripts/merge-research.js scripts/p0-research-*.json
 *
 * Each input file should be a JSON array of objects with:
 *   { id, name, desc, contacts, leaders, news, ice, icebreakers, tp, ask }
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');

// Collect input files from args or find them automatically
let inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  // Auto-discover research output files
  const scriptsDir = __dirname;
  inputFiles = fs.readdirSync(scriptsDir)
    .filter(f => f.match(/p0-research-\d+\.json$/))
    .map(f => path.join(scriptsDir, f));
}

if (inputFiles.length === 0) {
  console.error('No research files found. Pass file paths as arguments or place p0-research-*.json in scripts/');
  process.exit(1);
}

console.log(`Loading ${inputFiles.length} research files...`);

// Load all researched companies
let researched = [];
for (const file of inputFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (Array.isArray(data)) {
      researched.push(...data);
      console.log(`  ${path.basename(file)}: ${data.length} companies`);
    }
  } catch (e) {
    console.error(`  Error reading ${file}: ${e.message}`);
  }
}

console.log(`Total researched entries: ${researched.length}`);

// Build lookup by ID
const researchById = new Map();
for (const r of researched) {
  if (r.id) researchById.set(r.id, r);
}

// Also build by normalized name for fallback matching
const researchByName = new Map();
for (const r of researched) {
  if (r.name) {
    researchByName.set(r.name.toLowerCase().trim().replace(/[^a-z0-9]/g, ''), r);
  }
}

// Load existing data
const allCompanies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
console.log(`\nExisting companies: ${allCompanies.length}`);

let updated = 0;
let notFound = 0;

for (const company of allCompanies) {
  // Try to find research data by ID first, then by name
  let research = researchById.get(company.id);
  if (!research) {
    const norm = company.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    research = researchByName.get(norm);
  }

  if (research) {
    // Merge research data — merge arrays by name instead of overwriting
    if (research.desc && research.desc.length > 0) company.desc = research.desc;

    // Merge contacts: dedup by normalized name before appending
    if (research.contacts && research.contacts.length > 0) {
      const existingNames = new Set((company.contacts || []).map(c => c.n.toLowerCase().trim()));
      const newContacts = research.contacts.filter(c => !existingNames.has(c.n.toLowerCase().trim()));
      company.contacts = [...(company.contacts || []), ...newContacts];
      // If research has more complete contacts, prefer them
      if (research.contacts.length > company.contacts.length) {
        company.contacts = research.contacts;
      }
    }

    // Merge leaders: dedup by normalized name before appending
    if (research.leaders && research.leaders.length > 0) {
      const existingLeaderNames = new Set((company.leaders || []).map(l => l.n.toLowerCase().trim()));
      for (const rl of research.leaders) {
        const normName = rl.n.toLowerCase().trim();
        if (existingLeaderNames.has(normName)) {
          // Update existing leader with research data if research has more detail
          const existing = (company.leaders || []).find(l => l.n.toLowerCase().trim() === normName);
          if (existing && rl.bg && rl.bg.length > (existing.bg || '').length) {
            existing.bg = rl.bg;
          }
          if (existing && rl.hooks && rl.hooks.length > 0 && (!existing.hooks || existing.hooks.length === 0)) {
            existing.hooks = rl.hooks;
          }
          if (existing && rl.li && !existing.li) {
            existing.li = rl.li;
          }
        } else {
          if (!company.leaders) company.leaders = [];
          company.leaders.push(rl);
          existingLeaderNames.add(normName);
        }
      }
    }

    // Merge news: dedup by normalized headline before appending
    if (research.news && research.news.length > 0) {
      const existingHeadlines = new Set((company.news || []).map(n => n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, '')));
      const newNews = research.news.filter(n => !existingHeadlines.has(n.h.toLowerCase().trim().replace(/[^a-z0-9]/g, '')));
      company.news = [...newNews, ...(company.news || [])];
    }
    if (research.ice && research.ice.length > 0) company.ice = research.ice;
    if (research.icebreakers && research.icebreakers.length > 0) company.icebreakers = research.icebreakers;
    if (research.tp && research.tp.length > 0) company.tp = research.tp;
    if (research.ask && research.ask.length > 0) company.ask = research.ask;

    // Add 'researched' to source tags if not already present
    if (!company.source.includes('researched')) {
      company.source.push('researched');
    }

    updated++;
  }
}

notFound = researched.length - updated;

console.log(`\nUpdated: ${updated} companies`);
if (notFound > 0) console.log(`Not matched: ${notFound} entries`);

// Write output
fs.writeFileSync(ALL_COMPANIES, JSON.stringify(allCompanies, null, 2));
const size = fs.statSync(ALL_COMPANIES).size;
console.log(`Written to ${ALL_COMPANIES}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);

// Stats
const totalResearched = allCompanies.filter(c => c.desc && c.desc.length > 0 && c.contacts.length > 0).length;
console.log(`\nTotal researched now: ${totalResearched}/${allCompanies.length} (${(totalResearched/allCompanies.length*100).toFixed(1)}%)`);
