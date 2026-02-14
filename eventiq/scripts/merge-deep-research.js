#!/usr/bin/env node
/**
 * Merge deep-research-*.json files into all-companies.json
 *
 * Each input file is a single company object with full research:
 *   { id, name, desc, news, leaders, ice, icebreakers, tp, ask, website, linkedinUrl }
 *
 * This performs a FULL OVERWRITE of researched fields (not conservative merge).
 * Deep research is the source of truth — it replaces shallow data.
 *
 * Usage: node scripts/merge-deep-research.js [files...]
 *        node scripts/merge-deep-research.js  (auto-finds scripts/deep-research-*.json)
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');
const scriptsDir = __dirname;

// Collect input files
let inputFiles = process.argv.slice(2);
if (inputFiles.length === 0) {
  inputFiles = fs.readdirSync(scriptsDir)
    .filter(f => f.match(/deep-research-.*\.json$/))
    .map(f => path.join(scriptsDir, f));
}

if (inputFiles.length === 0) {
  console.error('No deep-research-*.json files found.');
  process.exit(1);
}

console.log(`Loading ${inputFiles.length} deep research files...`);

const researched = [];
for (const file of inputFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    // Handle both single object and array format
    if (Array.isArray(data)) {
      researched.push(...data);
      console.log(`  ${path.basename(file)}: ${data.length} companies`);
    } else if (data.id) {
      researched.push(data);
      console.log(`  ${path.basename(file)}: ${data.name} (id:${data.id})`);
    }
  } catch (e) {
    console.error(`  Error reading ${file}: ${e.message}`);
  }
}

console.log(`Total research entries: ${researched.length}`);

// Build lookup by ID
const researchById = new Map();
for (const r of researched) {
  if (r.id) researchById.set(r.id, r);
}

// Load existing
const allCompanies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
console.log(`\nExisting companies: ${allCompanies.length}`);

let updatedCount = 0;
let leadersUpdated = 0;
let hooksAdded = 0;
let linkedInAdded = 0;
let newsUpdated = 0;

for (const company of allCompanies) {
  const research = researchById.get(company.id);
  if (!research) continue;

  updatedCount++;

  // Update company-level fields (overwrite with research)
  if (research.desc && research.desc.length > 0) company.desc = research.desc;
  if (research.website && research.website.length > 0) company.website = research.website;
  if (research.linkedinUrl && research.linkedinUrl.length > 0) company.linkedinUrl = research.linkedinUrl;
  if (research.ice && research.ice.length > 0) company.ice = research.ice;
  if (research.icebreakers && research.icebreakers.length > 0) company.icebreakers = research.icebreakers;
  if (research.tp && research.tp.length > 0) company.tp = research.tp;
  if (research.ask && research.ask.length > 0) company.ask = research.ask;

  // Update news (replace entirely with fresh research)
  if (research.news && research.news.length > 0) {
    company.news = research.news;
    newsUpdated++;
  }

  // Update leaders
  if (research.leaders && research.leaders.length > 0) {
    for (const researchLeader of research.leaders) {
      // Find matching leader by normalized name
      const normName = researchLeader.n.toLowerCase().trim();
      const existing = (company.leaders || []).find(
        l => l.n.toLowerCase().trim() === normName
      );

      if (existing) {
        // Update existing leader with research data
        if (researchLeader.bg && researchLeader.bg.length > 0) existing.bg = researchLeader.bg;
        if (researchLeader.t && researchLeader.t.length > 0) existing.t = researchLeader.t;
        if (researchLeader.hooks && researchLeader.hooks.length > 0) {
          existing.hooks = researchLeader.hooks;
          hooksAdded++;
        }
        if (researchLeader.li && researchLeader.li.length > 0) {
          if (!existing.li || existing.li.length === 0) linkedInAdded++;
          existing.li = researchLeader.li;
        }
        leadersUpdated++;
      } else {
        // Add new leader
        if (!company.leaders) company.leaders = [];
        company.leaders.push(researchLeader);
        leadersUpdated++;
        if (researchLeader.hooks && researchLeader.hooks.length > 0) hooksAdded++;
        if (researchLeader.li && researchLeader.li.length > 0) linkedInAdded++;
      }
    }
  }

  // Mark as deep-researched in source
  if (!company.source) company.source = [];
  if (!company.source.includes('deep-researched')) {
    company.source.push('deep-researched');
  }
}

console.log(`\nCompanies updated: ${updatedCount}`);
console.log(`Leaders updated: ${leadersUpdated}`);
console.log(`Hooks replaced: ${hooksAdded}`);
console.log(`LinkedIn URLs added: ${linkedInAdded}`);
console.log(`News refreshed: ${newsUpdated}`);

// Write
fs.writeFileSync(ALL_COMPANIES, JSON.stringify(allCompanies, null, 2));
const size = fs.statSync(ALL_COMPANIES).size;
console.log(`\nWritten to ${ALL_COMPANIES}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);

// Final stats
const totalLeaders = allCompanies.reduce((s, c) => s + (c.leaders || []).length, 0);
const withHooks = allCompanies.reduce((s, c) =>
  s + ((c.leaders || []).filter(l => l.hooks && l.hooks.length > 0).length), 0);
const withLi = allCompanies.reduce((s, c) =>
  s + ((c.leaders || []).filter(l => l.li && l.li.length > 0).length), 0);
const deepResearched = allCompanies.filter(c => c.source && c.source.includes('deep-researched')).length;
console.log(`\nTotal leaders: ${totalLeaders}`);
console.log(`With hooks: ${withHooks}`);
console.log(`With LinkedIn: ${withLi}`);
console.log(`Deep-researched companies: ${deepResearched}`);
