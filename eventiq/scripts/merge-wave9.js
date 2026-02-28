#!/usr/bin/env node
/**
 * Merge Wave 9 research results into all-companies.json
 * Wave 9: 50 companies (IDs from batches 1-5)
 */
const fs = require('fs');
const path = require('path');

const allPath = path.join(__dirname, '..', 'src', 'data', 'all-companies.json');
const all = JSON.parse(fs.readFileSync(allPath, 'utf8'));

// Load all 5 batch files
const batches = [];
for (let i = 1; i <= 5; i++) {
  const batchPath = path.join(__dirname, `p4-wave9-batch-${i}.json`);
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  batches.push(...batch);
}

console.log(`Loaded ${batches.length} researched companies from 5 batches`);

const validCategories = ['funder', 'iso', 'marketplace', 'bank', 'technology', 'competitor', 'service_provider'];
let merged = 0, leadersAdded = 0, catFixes = 0, nameFixes = 0;

for (const researched of batches) {
  const idx = all.findIndex(c => c.id === researched.id);
  if (idx === -1) {
    console.log(`  WARNING: ID ${researched.id} (${researched.name}) not found in all-companies.json`);
    continue;
  }

  const existing = all[idx];

  // Update fields from research
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

  // Fix name casing (many are ALL CAPS in the dataset)
  if (researched.name && researched.name !== existing.name) {
    // Only update if the researched name is NOT all caps (agent fixed it)
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
    // Map non-standard categories
    const catMap = {
      'broker': 'iso',
      'litigation_funder': 'funder',
      'litigation': 'funder',
      'legal_funding': 'funder',
      'equipment_finance': 'funder',
      'factoring': 'funder',
    };
    if (catMap[cat]) {
      console.log(`  Category map: "${cat}" → "${catMap[cat]}" for ${researched.name}`);
      cat = catMap[cat];
      catFixes++;
    }
    if (validCategories.includes(cat)) {
      existing.category = cat;
    } else if (cat !== existing.category) {
      console.log(`  WARNING: Unknown category "${cat}" for ${researched.name}, keeping "${existing.category}"`);
    }
  }

  // Contacts
  if (researched.contacts && researched.contacts.length > 0) {
    existing.contacts = researched.contacts;
  }

  // Leaders - merge carefully
  if (researched.leaders && researched.leaders.length > 0) {
    // Normalize news items in leaders if needed
    for (const leader of researched.leaders) {
      // Ensure hooks is an array
      if (leader.hooks && !Array.isArray(leader.hooks)) {
        leader.hooks = [leader.hooks];
      }
    }
    existing.leaders = researched.leaders;
    leadersAdded += researched.leaders.length;
  }

  // Normalize news items
  if (existing.news) {
    existing.news = existing.news.map(n => {
      // Handle {date, headline} format → {d, h, s}
      if (n.headline && !n.h) {
        return { h: n.headline, s: n.source || n.date || '', d: n.description || n.d || '' };
      }
      return n;
    });
  }

  // Source tags
  if (!existing.source) existing.source = [];
  if (!existing.source.includes('p4-wave9-researched')) {
    existing.source.push('p4-wave9-researched');
  }

  merged++;
}

console.log(`\nMerge complete:`);
console.log(`  Companies merged: ${merged}`);
console.log(`  Leaders added: ${leadersAdded}`);
console.log(`  Category fixes: ${catFixes}`);
console.log(`  Name fixes: ${nameFixes}`);

fs.writeFileSync(allPath, JSON.stringify(all, null, 2));
console.log(`\nWritten to ${allPath}`);

// Stats
const withLeaders = all.filter(c => c.leaders && c.leaders.length > 0).length;
const totalLeaders = all.reduce((s, c) => (c.leaders ? s + c.leaders.length : 0), 0);
const needResearch = all.filter(c => !c.desc || c.desc === '' || c.desc.includes('Limited public information')).length;
console.log(`\nDataset stats: ${all.length} companies, ${withLeaders} with leaders, ${totalLeaders} total leaders, ${needResearch} need research`);
