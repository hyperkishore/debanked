#!/usr/bin/env node
/**
 * Merge Wave 4 batch research data into all-companies.json
 *
 * Reads 5 batch files (p4-wave4-batch-{1..5}.json), matches by ID,
 * and updates fields per the merge rules.
 *
 * Usage: node scripts/merge-wave4.js
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');
const BATCH_FILES = [1, 2, 3, 4, 5].map(i =>
  path.join(__dirname, `p4-wave4-batch-${i}.json`)
);

// Category normalization map for non-standard categories
const CATEGORY_NORMALIZATION = {
  fintech_supply_chain_finance: 'technology',  // ID 1206 Efficient Finance
  saas_lender: 'funder',                       // ID 1207 Element SaaS Finance
  equipment_finance_lender: 'funder',           // ID 1208 Elite by Channel
  equipment_finance_fintech: 'technology',      // ID 1210 Equipment Funding Solutions
};

const VALID_CATEGORIES = new Set([
  'funder', 'iso', 'marketplace', 'bank', 'technology', 'competitor', 'service_provider'
]);

// Fields to overwrite from batch data
const OVERWRITE_FIELDS = ['leaders', 'desc', 'news', 'location', 'full_address', 'website', 'employees', 'category'];

// Load all batch files
console.log('Loading batch files...');
let batchCompanies = [];
for (const file of BATCH_FILES) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    console.log(`  ${path.basename(file)}: ${data.length} companies`);
    batchCompanies.push(...data);
  } catch (e) {
    console.error(`  ERROR reading ${path.basename(file)}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`Total batch companies: ${batchCompanies.length}`);

// Load main dataset
console.log(`\nLoading ${path.basename(ALL_COMPANIES)}...`);
const allCompanies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
console.log(`Total companies in dataset: ${allCompanies.length}`);

// Build lookup by ID
const companyById = new Map();
allCompanies.forEach((c, idx) => companyById.set(c.id, { company: c, index: idx }));

// Tracking stats
let updated = 0;
let leadersAdded = 0;
let categoryCorrections = 0;
let namesUpdated = 0;
let notFound = 0;

console.log('\nMerging...');
for (const batch of batchCompanies) {
  const entry = companyById.get(batch.id);
  if (!entry) {
    console.log(`  WARNING: ID ${batch.id} (${batch.name}) not found in all-companies.json`);
    notFound++;
    continue;
  }

  const target = entry.company;
  let changed = false;

  // Check if batch has a better/corrected name
  if (batch.name && batch.name !== target.name) {
    console.log(`  ID ${batch.id}: Name updated "${target.name}" → "${batch.name}"`);
    target.name = batch.name;
    namesUpdated++;
    changed = true;
  }

  // Overwrite fields from batch
  for (const field of OVERWRITE_FIELDS) {
    if (batch[field] === undefined || batch[field] === null) continue;

    // Special handling for category normalization
    if (field === 'category') {
      let newCategory = batch.category;
      if (CATEGORY_NORMALIZATION[newCategory]) {
        const original = newCategory;
        newCategory = CATEGORY_NORMALIZATION[newCategory];
        console.log(`  ID ${batch.id} (${batch.name}): Category normalized "${original}" → "${newCategory}"`);
        categoryCorrections++;
      }
      if (!VALID_CATEGORIES.has(newCategory)) {
        console.log(`  WARNING: ID ${batch.id} (${batch.name}) has invalid category "${newCategory}" — skipping`);
        continue;
      }
      if (target.category !== newCategory) {
        target.category = newCategory;
        changed = true;
      }
      continue;
    }

    // Track leaders added
    if (field === 'leaders' && Array.isArray(batch.leaders) && batch.leaders.length > 0) {
      const prevCount = (target.leaders || []).length;
      target.leaders = batch.leaders;
      leadersAdded += batch.leaders.length - prevCount;
      changed = true;
      continue;
    }

    // For other fields, overwrite if batch has a value
    if (field === 'employees' && typeof batch[field] === 'number' && batch[field] > 0) {
      target[field] = batch[field];
      changed = true;
    } else if (field !== 'employees' && batch[field] !== '' && batch[field] !== 'Unknown') {
      target[field] = batch[field];
      changed = true;
    }
  }

  // Add "researched" to source array if not present
  if (!Array.isArray(target.source)) {
    target.source = [];
  }
  if (!target.source.includes('researched')) {
    target.source.push('researched');
    changed = true;
  }
  // Add wave4-specific source tag
  if (!target.source.includes('p4-wave4-researched')) {
    target.source.push('p4-wave4-researched');
    changed = true;
  }

  if (changed) {
    updated++;
  }
}

// Write updated dataset
fs.writeFileSync(ALL_COMPANIES, JSON.stringify(allCompanies, null, 2) + '\n');

// Summary
console.log('\n=== MERGE SUMMARY ===');
console.log(`Batch companies processed: ${batchCompanies.length}`);
console.log(`Companies updated:         ${updated}`);
console.log(`Not found in dataset:      ${notFound}`);
console.log(`Names updated:             ${namesUpdated}`);
console.log(`Net leaders added:         ${leadersAdded}`);
console.log(`Category corrections:      ${categoryCorrections}`);
console.log(`\nDataset written: ${allCompanies.length} companies`);
