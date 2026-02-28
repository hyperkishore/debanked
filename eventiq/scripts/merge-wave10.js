#!/usr/bin/env node
/**
 * Merge Wave 10 research results into all-companies.json
 * Wave 10: Final wave — batch 1 only (batches 2-3 hit usage limits)
 */
const fs = require('fs');
const path = require('path');

const allPath = path.join(__dirname, '..', 'src', 'data', 'all-companies.json');
const all = JSON.parse(fs.readFileSync(allPath, 'utf8'));

// Load available batch files
const batches = [];
for (let i = 1; i <= 3; i++) {
  const batchPath = path.join(__dirname, `p4-wave10-batch-${i}.json`);
  if (fs.existsSync(batchPath)) {
    const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
    batches.push(...batch);
    console.log(`Loaded batch ${i}: ${batch.length} companies`);
  } else {
    console.log(`Batch ${i}: NOT FOUND (skipping)`);
  }
}

console.log(`\nTotal loaded: ${batches.length} researched companies`);

const validCategories = ['funder', 'iso', 'marketplace', 'bank', 'technology', 'competitor', 'service_provider'];
let merged = 0, leadersAdded = 0, catFixes = 0, nameFixes = 0;

for (const researched of batches) {
  const idx = all.findIndex(c => c.id === researched.id);
  if (idx === -1) {
    console.log(`  WARNING: ID ${researched.id} (${researched.name}) not found in all-companies.json`);
    continue;
  }

  const existing = all[idx];

  if (researched.desc) existing.desc = researched.desc;
  if (researched.website) existing.website = researched.website;
  if (researched.location) existing.location = researched.location;
  if (researched.full_address) existing.full_address = researched.full_address;
  if (researched.employees && typeof researched.employees === 'number') existing.employees = researched.employees;
  if (researched.news && researched.news.length > 0) existing.news = researched.news;
  if (researched.ice) existing.ice = researched.ice;
  if (researched.icebreakers && researched.icebreakers.length > 0) existing.icebreakers = researched.icebreakers;
  if (researched.tp && researched.tp.length > 0) existing.tp = researched.tp;
  if (researched.ask) existing.ask = researched.ask;
  if (researched.notes) existing.notes = researched.notes;

  // Name casing fix
  if (researched.name && researched.name !== existing.name) {
    if (researched.name !== researched.name.toUpperCase() || existing.name === existing.name.toUpperCase()) {
      if (existing.name !== researched.name) {
        console.log(`  Name fix: "${existing.name}" → "${researched.name}"`);
        existing.name = researched.name;
        nameFixes++;
      }
    }
  }

  // Category normalization
  if (researched.category) {
    let cat = researched.category.toLowerCase().trim();
    const catMap = { 'broker': 'iso', 'litigation_funder': 'funder', 'litigation': 'funder' };
    if (catMap[cat]) { cat = catMap[cat]; catFixes++; }
    if (validCategories.includes(cat)) existing.category = cat;
  }

  if (researched.contacts && researched.contacts.length > 0) existing.contacts = researched.contacts;

  if (researched.leaders && researched.leaders.length > 0) {
    for (const leader of researched.leaders) {
      if (leader.hooks && !Array.isArray(leader.hooks)) leader.hooks = [leader.hooks];
    }
    existing.leaders = researched.leaders;
    leadersAdded += researched.leaders.length;
  }

  if (existing.news) {
    existing.news = existing.news.map(n => {
      if (n.headline && !n.h) return { h: n.headline, s: n.source || n.date || '', d: n.description || n.d || '' };
      return n;
    });
  }

  if (!existing.source) existing.source = [];
  if (!existing.source.includes('p4-wave10-researched')) existing.source.push('p4-wave10-researched');

  merged++;
}

console.log(`\nMerge complete:`);
console.log(`  Companies merged: ${merged}`);
console.log(`  Leaders added: ${leadersAdded}`);
console.log(`  Category fixes: ${catFixes}`);
console.log(`  Name fixes: ${nameFixes}`);

fs.writeFileSync(allPath, JSON.stringify(all, null, 2));
console.log(`\nWritten to ${allPath}`);

const withLeaders = all.filter(c => c.leaders && c.leaders.length > 0).length;
const totalLeaders = all.reduce((s, c) => (c.leaders ? s + c.leaders.length : 0), 0);
const needResearch = all.filter(c => !c.desc || c.desc === '' || c.desc.includes('Limited public information')).length;
console.log(`\nDataset stats: ${all.length} companies, ${withLeaders} with leaders, ${totalLeaders} total leaders, ${needResearch} need research`);
