#!/usr/bin/env node
/**
 * EventIQ CLI Import Tool
 *
 * Import companies from CSV, TSV, or JSON files into all-companies.json.
 * Uses Claude API for intelligent field mapping (with heuristic fallback).
 * Fuzzy-matches incoming companies against existing data to prevent duplicates.
 *
 * Usage:
 *   node scripts/import.js <file>              # Auto-detect format
 *   node scripts/import.js <file> --dry-run    # Preview only, don't write
 *   node scripts/import.js <file> --no-ai      # Skip Claude API, use heuristics only
 *   node scripts/import.js <file> --threshold 0.8  # Fuzzy match threshold (0-1)
 *
 * Environment:
 *   ANTHROPIC_API_KEY=sk-...   # Optional: enables Claude API field mapping
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const { autoParse } = require('./lib/csv-parser');
const { heuristicMap, claudeMap, rowsToCompanies, SCHEMA_FIELDS } = require('./lib/field-mapper');
const { buildCompanyIndex, findBestMatch, normalizeCompanyName } = require('./lib/fuzzy-match');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');

// --- CLI argument parsing ---
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  noAi: args.includes('--no-ai'),
  threshold: 0.75,
  help: args.includes('--help') || args.includes('-h'),
};

const thresholdIdx = args.indexOf('--threshold');
if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
  flags.threshold = parseFloat(args[thresholdIdx + 1]);
}

const filePath = args.find(a => !a.startsWith('--') && !a.startsWith('-'));

if (flags.help || !filePath) {
  console.log(`
EventIQ Import Tool
====================
Import companies from CSV, TSV, or JSON files.

Usage:
  node scripts/import.js <file> [options]

Options:
  --dry-run         Preview changes without writing
  --no-ai           Skip Claude API, use heuristic mapping only
  --threshold <n>   Fuzzy match threshold (0-1, default: 0.75)
  -h, --help        Show this help

Environment:
  ANTHROPIC_API_KEY  Claude API key for intelligent field mapping

Examples:
  node scripts/import.js hubspot-export.csv
  node scripts/import.js contacts.json --dry-run
  node scripts/import.js data.tsv --no-ai --threshold 0.8
  `);
  process.exit(0);
}

// --- Interactive prompt helper ---
function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// --- Main ---
async function main() {
  // 1. Load input file
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`\nReading: ${absPath}`);
  const raw = fs.readFileSync(absPath, 'utf-8');
  const { headers, rows, format } = autoParse(raw);

  console.log(`Format: ${format.toUpperCase()}`);
  console.log(`Columns: ${headers.length}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`Headers: ${headers.join(', ')}`);

  if (rows.length === 0) {
    console.error('No data rows found.');
    process.exit(1);
  }

  // Show sample
  console.log('\nSample data (first 3 rows):');
  rows.slice(0, 3).forEach((row, i) => {
    const preview = Object.entries(row)
      .map(([k, v]) => `${k}: "${String(v).slice(0, 40)}"`)
      .join(', ');
    console.log(`  ${i + 1}. ${preview}`);
  });

  // 2. Field mapping
  console.log('\n--- Field Mapping ---');
  let mapping;
  if (!flags.noAi && process.env.ANTHROPIC_API_KEY) {
    console.log('Using Claude API for field mapping...');
    mapping = await claudeMap(headers, rows.slice(0, 3));
  } else {
    console.log('Using heuristic field mapping...');
    mapping = heuristicMap(headers);
  }

  // Display mapping
  console.log('\nColumn mapping:');
  const mapped = [];
  const skipped = [];
  for (const [header, field] of Object.entries(mapping)) {
    const info = SCHEMA_FIELDS[field];
    if (field === '_skip') {
      skipped.push(header);
      console.log(`  ${header} → (skipped)`);
    } else {
      mapped.push({ header, field, label: info?.label || field });
      console.log(`  ${header} → ${info?.label || field} [${field}]`);
    }
  }

  if (!mapping[Object.keys(mapping).find(k => mapping[k] === 'name')]) {
    // Check if 'name' field is mapped
    const hasName = Object.values(mapping).includes('name');
    if (!hasName) {
      console.error('\nERROR: No column mapped to "Company Name". Cannot proceed.');
      console.log('Tip: Ensure your data has a column like "Company", "Name", or "Account"');
      process.exit(1);
    }
  }

  // Confirm mapping
  const confirmMapping = await ask('\nProceed with this mapping? (y/n/edit): ');
  if (confirmMapping.toLowerCase() === 'n') {
    console.log('Import cancelled.');
    process.exit(0);
  }

  // 3. Convert rows to companies
  const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const maxExistingId = existingData.reduce((max, c) => Math.max(max, c.id), 0);
  const importedCompanies = rowsToCompanies(rows, mapping, maxExistingId + 1);

  console.log(`\nConverted ${rows.length} rows → ${importedCompanies.length} companies`);

  // 4. Fuzzy match against existing
  console.log('\n--- Matching Against Existing Data ---');
  const index = buildCompanyIndex(existingData);

  const updates = []; // Companies that match existing
  const newCompanies = []; // Companies that are new

  for (const imported of importedCompanies) {
    const result = findBestMatch(imported.name, index, flags.threshold);

    if (result.match) {
      updates.push({
        imported,
        existing: result.match,
        score: result.score,
        exact: result.exact,
      });
    } else {
      newCompanies.push(imported);
    }
  }

  console.log(`Matched (updates): ${updates.length}`);
  console.log(`Unmatched (new): ${newCompanies.length}`);

  // Show update preview
  if (updates.length > 0) {
    console.log('\nUpdates preview:');
    for (const { imported, existing, score, exact } of updates.slice(0, 10)) {
      const matchType = exact ? 'EXACT' : `fuzzy ${(score * 100).toFixed(0)}%`;
      console.log(`  "${imported.name}" → "${existing.name}" (${matchType}, id:${existing.id})`);
      // Show what fields would be added/updated
      const changes = [];
      if (imported.desc && !existing.desc) changes.push('desc');
      if (imported.website && !existing.website) changes.push('website');
      if (imported.linkedinUrl && !existing.linkedinUrl) changes.push('linkedinUrl');
      if (imported.location && !existing.location) changes.push('location');
      if (imported.employees && !existing.employees) changes.push('employees');
      if (imported.contacts.length > 0) changes.push(`+${imported.contacts.length} contacts`);
      if (imported.notes) changes.push('notes');
      if (changes.length > 0) console.log(`    Fields to fill: ${changes.join(', ')}`);
    }
    if (updates.length > 10) console.log(`  ... and ${updates.length - 10} more`);
  }

  // Show new company preview
  if (newCompanies.length > 0) {
    console.log('\nNew companies preview:');
    for (const c of newCompanies.slice(0, 10)) {
      const contacts = c.contacts.map(ct => ct.n).join(', ');
      console.log(`  + "${c.name}" (${c.type}) ${contacts ? `[${contacts}]` : ''}`);
    }
    if (newCompanies.length > 10) console.log(`  ... and ${newCompanies.length - 10} more`);
  }

  // 5. Confirm and write
  if (flags.dryRun) {
    console.log('\n[DRY RUN] No changes written.');
    process.exit(0);
  }

  const confirmWrite = await ask(`\nWrite ${updates.length} updates + ${newCompanies.length} new companies? (y/n): `);
  if (confirmWrite.toLowerCase() !== 'y') {
    console.log('Import cancelled.');
    process.exit(0);
  }

  // Apply updates (conservative: only fill empty fields)
  let updatedCount = 0;
  for (const { imported, existing } of updates) {
    let changed = false;
    if (imported.desc && !existing.desc) { existing.desc = imported.desc; changed = true; }
    if (imported.website && !existing.website) { existing.website = imported.website; changed = true; }
    if (imported.linkedinUrl && !existing.linkedinUrl) { existing.linkedinUrl = imported.linkedinUrl; changed = true; }
    if (imported.location && !existing.location) { existing.location = imported.location; changed = true; }
    if (imported.employees && !existing.employees) { existing.employees = imported.employees; changed = true; }

    // Add new contacts
    for (const contact of imported.contacts) {
      const normName = contact.n.toLowerCase().trim();
      const existsInContacts = existing.contacts?.some(c => c.n.toLowerCase().trim() === normName);
      const existsInLeaders = existing.leaders?.some(l => l.n.toLowerCase().trim() === normName);
      if (!existsInContacts && !existsInLeaders) {
        if (!existing.contacts) existing.contacts = [];
        existing.contacts.push(contact);
        changed = true;
      }
    }

    // Append import notes
    if (imported.notes) {
      const importNote = `[Import] ${imported.notes}`;
      if (existing.notes && !existing.notes.includes(importNote)) {
        existing.notes = existing.notes + '\n' + importNote;
        changed = true;
      } else if (!existing.notes) {
        existing.notes = importNote;
        changed = true;
      }
    }

    // Add source tag
    if (!existing.source) existing.source = [];
    if (!existing.source.includes('import')) {
      existing.source.push('import');
      changed = true;
    }

    if (changed) updatedCount++;
  }

  // Add new companies (clean up _importMeta before writing)
  for (const company of newCompanies) {
    delete company._importMeta;
    existingData.push(company);
  }

  // Write
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
  const fileSize = (fs.statSync(DATA_FILE).size / 1024).toFixed(1);

  console.log(`\nImport complete!`);
  console.log(`  Updated: ${updatedCount} companies`);
  console.log(`  Added: ${newCompanies.length} companies`);
  console.log(`  Total: ${existingData.length} companies`);
  console.log(`  File: ${DATA_FILE} (${fileSize} KB)`);

  // Save import metadata
  const metaPath = path.join(__dirname, `import-log-${Date.now()}.json`);
  fs.writeFileSync(metaPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    source: absPath,
    format,
    rowCount: rows.length,
    mapping,
    updates: updates.map(u => ({ input: u.imported.name, matched: u.existing.name, score: u.score })),
    newCompanies: newCompanies.map(c => c.name),
  }, null, 2));
  console.log(`  Import log: ${metaPath}`);
}

main().catch(err => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
