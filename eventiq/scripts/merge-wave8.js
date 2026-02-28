#!/usr/bin/env node

/**
 * merge-wave8.js — Merge 50 researched companies from Wave 8 batch files
 * into src/data/all-companies.json
 *
 * Usage: node scripts/merge-wave8.js
 */

const fs = require('fs');
const path = require('path');

const MAIN_FILE = path.join(__dirname, '..', 'src', 'data', 'all-companies.json');
const BATCH_FILES = [
  path.join(__dirname, 'p4-wave8-batch-1.json'),
  path.join(__dirname, 'p4-wave8-batch-2.json'),
  path.join(__dirname, 'p4-wave8-batch-3.json'),
  path.join(__dirname, 'p4-wave8-batch-4.json'),
  path.join(__dirname, 'p4-wave8-batch-5.json'),
];

// Fields to overwrite from batch data
const OVERWRITE_FIELDS = [
  'leaders', 'desc', 'news', 'location', 'full_address', 'website', 'employees', 'category'
];

// Valid lowercase categories
const VALID_CATEGORIES = ['funder', 'iso', 'marketplace', 'bank', 'technology', 'competitor', 'service_provider'];

// Category normalization map
const CATEGORY_NORMALIZATION = {
  'broker': 'iso',
};

function main() {
  // Read main dataset
  const mainData = JSON.parse(fs.readFileSync(MAIN_FILE, 'utf8'));
  const mainMap = new Map(mainData.map(c => [c.id, c]));

  // Read all batch files
  let allBatchCompanies = [];
  for (const batchFile of BATCH_FILES) {
    const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
    console.log(`Read ${path.basename(batchFile)}: ${batch.length} companies`);
    allBatchCompanies = allBatchCompanies.concat(batch);
  }

  console.log(`\nTotal batch companies: ${allBatchCompanies.length}`);
  console.log(`Main dataset: ${mainData.length} companies\n`);

  // Tracking
  let updated = 0;
  let leadersAdded = 0;
  let categoryCorrections = 0;
  let employeeFixups = 0;
  let notFound = [];
  let nameUpdates = [];
  let hooksStringFixups = 0;
  let descFieldFixups = 0;
  let newsFieldFixups = 0;

  for (const batchCompany of allBatchCompanies) {
    const existing = mainMap.get(batchCompany.id);
    if (!existing) {
      notFound.push({ id: batchCompany.id, name: batchCompany.name });
      continue;
    }

    // Track leaders added
    const existingLeaderCount = (existing.leaders || []).length;
    const batchLeaderCount = (batchCompany.leaders || []).length;

    // Normalize "description" field to "desc" (some batches use "description")
    if (batchCompany.description && !batchCompany.desc) {
      batchCompany.desc = batchCompany.description;
      delete batchCompany.description;
      descFieldFixups++;
      console.log(`  Desc field fix: ID ${batchCompany.id} "${batchCompany.name}" — "description" → "desc"`);
    }

    // Normalize news format: some batches use {date, headline} instead of {d, h, s}
    if (batchCompany.news && Array.isArray(batchCompany.news)) {
      batchCompany.news = batchCompany.news.map(item => {
        if (item.headline && !item.h) {
          newsFieldFixups++;
          return {
            h: item.headline,
            s: item.source || 'Unknown',
            d: item.date || ''
          };
        }
        return item;
      });
    }

    // Normalize hooks from string to array for leaders
    if (batchCompany.leaders && Array.isArray(batchCompany.leaders)) {
      batchCompany.leaders.forEach(leader => {
        if (typeof leader.hooks === 'string') {
          leader.hooks = [leader.hooks];
          hooksStringFixups++;
          console.log(`  Hooks fix: ID ${batchCompany.id} leader "${leader.n}" — string → array`);
        }
      });
    }

    // Category normalization — handle "broker" → "iso" and force lowercase
    if (batchCompany.category) {
      let normalized = batchCompany.category.toLowerCase();
      // Apply category normalization map
      if (CATEGORY_NORMALIZATION[normalized]) {
        const original = normalized;
        normalized = CATEGORY_NORMALIZATION[normalized];
        categoryCorrections++;
        console.log(`  Category fix: ID ${batchCompany.id} "${batchCompany.name}" — "${original}" → "${normalized}"`);
      } else if (normalized !== batchCompany.category) {
        categoryCorrections++;
        console.log(`  Category fix: ID ${batchCompany.id} "${batchCompany.name}" — "${batchCompany.category}" → "${normalized}"`);
      }
      if (!VALID_CATEGORIES.includes(normalized)) {
        console.log(`  WARNING: ID ${batchCompany.id} has invalid category "${normalized}"`);
      }
      batchCompany.category = normalized;
    }

    // Ensure employees is an integer, not a string
    if (batchCompany.employees !== undefined) {
      const parsed = parseInt(batchCompany.employees, 10);
      if (typeof batchCompany.employees === 'string' || batchCompany.employees !== parsed) {
        employeeFixups++;
        console.log(`  Employee fix: ID ${batchCompany.id} "${batchCompany.name}" — ${JSON.stringify(batchCompany.employees)} → ${parsed}`);
      }
      batchCompany.employees = isNaN(parsed) ? 0 : parsed;
    }

    // Overwrite specified fields
    for (const field of OVERWRITE_FIELDS) {
      if (batchCompany[field] !== undefined) {
        existing[field] = batchCompany[field];
      }
    }

    // Check if batch has a better name (more complete)
    if (batchCompany.name && batchCompany.name !== existing.name) {
      if (batchCompany.name.length > existing.name.length) {
        nameUpdates.push({ id: existing.id, old: existing.name, new: batchCompany.name });
        existing.name = batchCompany.name;
      }
    }

    // Add "researched" to source array if not present
    if (!existing.source) {
      existing.source = [];
    }
    if (!existing.source.includes('researched')) {
      existing.source.push('researched');
    }

    // Track leaders added
    if (batchLeaderCount > 0 && existingLeaderCount === 0) {
      leadersAdded += batchLeaderCount;
    } else if (batchLeaderCount > existingLeaderCount) {
      leadersAdded += (batchLeaderCount - existingLeaderCount);
    }

    updated++;
  }

  // Write updated file
  fs.writeFileSync(MAIN_FILE, JSON.stringify(mainData, null, 2) + '\n', 'utf8');

  // Summary
  console.log('\n=== MERGE SUMMARY ===');
  console.log(`Total batch companies: ${allBatchCompanies.length}`);
  console.log(`Updated in main dataset: ${updated}`);
  console.log(`Leaders added/updated: ${leadersAdded}`);
  console.log(`Category corrections: ${categoryCorrections}`);
  console.log(`Employee type fixups: ${employeeFixups}`);
  console.log(`Hooks string→array fixups: ${hooksStringFixups}`);
  console.log(`Desc field renames: ${descFieldFixups}`);
  console.log(`News field normalizations: ${newsFieldFixups}`);
  console.log(`IDs not found: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log('\nNot found:');
    notFound.forEach(nf => console.log(`  ID ${nf.id}: ${nf.name}`));
  }

  if (nameUpdates.length > 0) {
    console.log('\nName updates:');
    nameUpdates.forEach(nu => console.log(`  ID ${nu.id}: "${nu.old}" → "${nu.new}"`));
  }

  console.log('\nDone. Updated file:', MAIN_FILE);
}

main();
