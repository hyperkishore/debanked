#!/usr/bin/env node
/**
 * Merge hooks-result-*.json files into all-companies.json
 *
 * Each input file is a JSON array of:
 *   { companyId, leaderName, hooks: [...] }
 *
 * Usage: node scripts/merge-hooks.js
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');
const scriptsDir = __dirname;

// Find all hooks-result files
const inputFiles = fs.readdirSync(scriptsDir)
  .filter(f => f.match(/hooks-result-\d+\.json$/))
  .map(f => path.join(scriptsDir, f));

if (inputFiles.length === 0) {
  console.error('No hooks-result-*.json files found.');
  process.exit(1);
}

console.log(`Loading ${inputFiles.length} hooks result files...`);

let entries = [];
for (const file of inputFiles) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (Array.isArray(data)) {
      entries.push(...data);
      console.log(`  ${path.basename(file)}: ${data.length} entries`);
    }
  } catch (e) {
    console.error(`  Error reading ${file}: ${e.message}`);
  }
}

console.log(`Total hook entries: ${entries.length}`);

// Build lookup: companyId -> leaderName -> hooks
const hookMap = new Map();
for (const entry of entries) {
  const key = `${entry.companyId}::${entry.leaderName.toLowerCase().trim()}`;
  if (entry.hooks && entry.hooks.length > 0) {
    hookMap.set(key, entry.hooks);
  }
}

// Load and update
const allCompanies = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));
let addedCount = 0;
let skippedAlreadyHas = 0;
let notFound = 0;

for (const company of allCompanies) {
  if (!company.leaders) continue;
  for (const leader of company.leaders) {
    if (leader.hooks && leader.hooks.length > 0) {
      skippedAlreadyHas++;
      continue;
    }
    const key = `${company.id}::${leader.n.toLowerCase().trim()}`;
    const hooks = hookMap.get(key);
    if (hooks) {
      leader.hooks = hooks;
      addedCount++;
      hookMap.delete(key); // Mark as used
    }
  }
}

// Check for unmatched entries (name mismatches)
if (hookMap.size > 0) {
  console.log(`\nWarning: ${hookMap.size} hook entries did not match any leader:`);
  for (const [key] of hookMap) {
    console.log(`  ${key}`);
    notFound++;
  }
}

console.log(`\nHooks added: ${addedCount}`);
console.log(`Already had hooks: ${skippedAlreadyHas}`);
if (notFound > 0) console.log(`Unmatched: ${notFound}`);

// Write
fs.writeFileSync(ALL_COMPANIES, JSON.stringify(allCompanies, null, 2));
const size = fs.statSync(ALL_COMPANIES).size;
console.log(`\nWritten to ${ALL_COMPANIES}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);

// Final stats
const totalLeaders = allCompanies.reduce((s, c) => s + (c.leaders || []).length, 0);
const withHooks = allCompanies.reduce((s, c) =>
  s + ((c.leaders || []).filter(l => l.hooks && l.hooks.length > 0).length), 0);
const pct = (100 * withHooks / totalLeaders).toFixed(1);
console.log(`\nTotal leaders: ${totalLeaders}`);
console.log(`With hooks: ${withHooks} (${pct}%)`);
console.log(`Without hooks: ${totalLeaders - withHooks}`);
