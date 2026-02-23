#!/usr/bin/env node
/**
 * Mechanical merge utility for EventIQ imports
 *
 * Takes pre-mapped JSON (array of Company-shaped objects) and merges into
 * all-companies.json using fuzzy matching. No intelligence, no field mapping,
 * no interactive prompts — the agent does the thinking, this script does mechanics.
 *
 * Usage:
 *   node scripts/import-merge.js <file>              # Merge mapped JSON
 *   node scripts/import-merge.js <file> --dry-run    # Preview only
 *   node scripts/import-merge.js <file> --threshold 0.8  # Fuzzy match threshold
 *   node scripts/import-merge.js <file> --overwrite  # Overwrite non-empty fields too
 *
 * Input: JSON array of objects with at minimum { name: string }
 * Output: Updates all-companies.json, writes import log to scripts/imports/
 */

const fs = require('fs');
const path = require('path');
const { syncToSupabase } = require('./lib/supabase-sync');

const { buildCompanyIndex, findBestMatch } = require('./lib/fuzzy-match');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');
const IMPORTS_DIR = path.join(__dirname, 'imports');

// --- CLI ---
const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  overwrite: args.includes('--overwrite'),
  threshold: 0.75,
  help: args.includes('--help') || args.includes('-h'),
};

const thresholdIdx = args.indexOf('--threshold');
if (thresholdIdx !== -1 && args[thresholdIdx + 1]) {
  flags.threshold = parseFloat(args[thresholdIdx + 1]);
}

const filePath = args.find(a => !a.startsWith('--'));

if (flags.help || !filePath) {
  console.log(`
EventIQ Import Merge
=====================
Merge pre-mapped JSON into all-companies.json.

Usage:
  node scripts/import-merge.js <file> [options]

Options:
  --dry-run         Preview changes without writing
  --overwrite       Overwrite non-empty fields (default: fill empty only)
  --threshold <n>   Fuzzy match threshold (0-1, default: 0.75)
  -h, --help        Show this help

Input format:
  JSON array of objects. At minimum: { "name": "Company Name" }
  Full schema: { name, type, desc, website, linkedinUrl, location,
                 employees, notes, contacts: [{n, t, li}], leaders: [{n, t, bg, li}] }

Examples:
  node scripts/import-merge.js scripts/imports/import-mapped-2026-02-15.json --dry-run
  node scripts/import-merge.js scripts/imports/hubspot-mapped.json
  `);
  process.exit(0);
}

// --- Main ---
function main() {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${absPath}`);
    process.exit(1);
  }

  // Load input
  console.log(`\nReading: ${absPath}`);
  let incoming;
  try {
    incoming = JSON.parse(fs.readFileSync(absPath, 'utf-8'));
  } catch (e) {
    console.error(`Failed to parse JSON: ${e.message}`);
    process.exit(1);
  }

  if (!Array.isArray(incoming)) {
    console.error('Input must be a JSON array of company objects.');
    process.exit(1);
  }

  // Filter out entries without names
  const valid = incoming.filter(c => c && c.name && c.name.trim());
  console.log(`Input: ${incoming.length} entries (${valid.length} with names)`);

  if (valid.length === 0) {
    console.error('No valid entries found (all missing "name" field).');
    process.exit(1);
  }

  // Load existing data
  const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const maxExistingId = existingData.reduce((max, c) => Math.max(max, c.id), 0);
  console.log(`Existing companies: ${existingData.length} (max id: ${maxExistingId})`);

  // Build index for fuzzy matching
  const index = buildCompanyIndex(existingData);

  const updates = [];
  const newCompanies = [];

  for (const imp of valid) {
    const result = findBestMatch(imp.name, index, flags.threshold);

    if (result.match) {
      updates.push({
        imported: imp,
        existing: result.match,
        score: result.score,
        exact: result.exact,
      });
    } else {
      newCompanies.push(imp);
    }
  }

  console.log(`\nMatched (updates): ${updates.length}`);
  console.log(`Unmatched (new):   ${newCompanies.length}`);

  // Preview updates
  if (updates.length > 0) {
    console.log('\n--- Updates ---');
    for (const { imported, existing, score, exact } of updates.slice(0, 15)) {
      const matchType = exact ? 'EXACT' : `fuzzy ${(score * 100).toFixed(0)}%`;
      console.log(`  "${imported.name}" → "${existing.name}" (${matchType}, id:${existing.id})`);
      const changes = [];
      if (imported.desc && (flags.overwrite || !existing.desc)) changes.push('desc');
      if (imported.website && (flags.overwrite || !existing.website)) changes.push('website');
      if (imported.linkedinUrl && (flags.overwrite || !existing.linkedinUrl)) changes.push('linkedinUrl');
      if (imported.location && (flags.overwrite || !existing.location)) changes.push('location');
      if (imported.employees && (flags.overwrite || !existing.employees)) changes.push('employees');
      if ((imported.contacts || []).length > 0) changes.push(`+${imported.contacts.length} contacts`);
      if ((imported.leaders || []).length > 0) changes.push(`+${imported.leaders.length} leaders`);
      if (imported.notes) changes.push('notes');
      if (changes.length > 0) console.log(`    Would fill: ${changes.join(', ')}`);
    }
    if (updates.length > 15) console.log(`  ... and ${updates.length - 15} more`);
  }

  // Preview new companies
  if (newCompanies.length > 0) {
    console.log('\n--- New Companies ---');
    for (const c of newCompanies.slice(0, 15)) {
      const contacts = (c.contacts || []).map(ct => ct.n).join(', ');
      console.log(`  + "${c.name}" ${contacts ? `[${contacts}]` : ''}`);
    }
    if (newCompanies.length > 15) console.log(`  ... and ${newCompanies.length - 15} more`);
  }

  // Dry run stops here
  if (flags.dryRun) {
    console.log('\n[DRY RUN] No changes written.');
    process.exit(0);
  }

  // Apply updates (conservative: fill empty fields only, unless --overwrite)
  let updatedCount = 0;
  for (const { imported, existing } of updates) {
    let changed = false;
    const shouldSet = (impVal, exVal) => impVal && (flags.overwrite || !exVal);

    if (shouldSet(imported.desc, existing.desc)) { existing.desc = imported.desc; changed = true; }
    if (shouldSet(imported.website, existing.website)) { existing.website = imported.website; changed = true; }
    if (shouldSet(imported.linkedinUrl, existing.linkedinUrl)) { existing.linkedinUrl = imported.linkedinUrl; changed = true; }
    if (shouldSet(imported.location, existing.location)) { existing.location = imported.location; changed = true; }
    if (shouldSet(imported.employees, existing.employees)) { existing.employees = imported.employees; changed = true; }

    // Add new contacts (dedupe by name)
    for (const contact of (imported.contacts || [])) {
      if (!contact.n) continue;
      const normName = contact.n.toLowerCase().trim();
      const existsInContacts = (existing.contacts || []).some(c => c.n.toLowerCase().trim() === normName);
      const existsInLeaders = (existing.leaders || []).some(l => l.n.toLowerCase().trim() === normName);
      if (!existsInContacts && !existsInLeaders) {
        if (!existing.contacts) existing.contacts = [];
        existing.contacts.push({ n: contact.n, t: contact.t || '' });
        changed = true;
      }
    }

    // Add new leaders (dedupe by name)
    for (const leader of (imported.leaders || [])) {
      if (!leader.n) continue;
      const normName = leader.n.toLowerCase().trim();
      const exists = (existing.leaders || []).some(l => l.n.toLowerCase().trim() === normName);
      if (!exists) {
        if (!existing.leaders) existing.leaders = [];
        existing.leaders.push({
          n: leader.n,
          t: leader.t || '',
          bg: leader.bg || '',
          li: leader.li || undefined,
          hooks: leader.hooks || undefined,
        });
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

    // Add 'import' source tag
    if (!existing.source) existing.source = [];
    if (!existing.source.includes('import')) {
      existing.source.push('import');
      changed = true;
    }

    if (changed) updatedCount++;
  }

  // Add new companies with proper schema defaults
  let nextId = maxExistingId + 1;
  for (const imp of newCompanies) {
    const company = {
      id: nextId++,
      name: imp.name.trim(),
      type: imp.type || 'TAM',
      priority: imp.priority || 6,
      phase: imp.phase || 0,
      booth: imp.booth || false,
      contacts: (imp.contacts || []).map(c => ({ n: c.n, t: c.t || '' })),
      desc: imp.desc || '',
      notes: imp.notes ? `[Import] ${imp.notes}` : '',
      news: imp.news || [],
      ice: imp.ice || '',
      icebreakers: imp.icebreakers || [],
      tp: imp.tp || [],
      leaders: (imp.leaders || (imp.contacts || []).map(c => ({
        n: c.n,
        t: c.t || '',
        bg: '',
        li: c.li || undefined,
      }))),
      ask: imp.ask || '',
      location: imp.location || '',
      employees: parseInt(imp.employees) || 0,
      website: imp.website || '',
      linkedinUrl: imp.linkedinUrl || '',
      source: ['import'],
    };
    existingData.push(company);
  }

  // Write
  fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
  const fileSize = (fs.statSync(DATA_FILE).size / 1024).toFixed(1);

  console.log(`\nImport complete!`);
  console.log(`  Updated: ${updatedCount} companies`);
  console.log(`  Added:   ${newCompanies.length} companies`);
  console.log(`  Total:   ${existingData.length} companies`);
  console.log(`  File:    ${DATA_FILE} (${fileSize} KB)`);

  // Save import log
  if (!fs.existsSync(IMPORTS_DIR)) fs.mkdirSync(IMPORTS_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const logPath = path.join(IMPORTS_DIR, `import-log-${timestamp}.json`);
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    source: absPath,
    flags,
    summary: {
      inputCount: valid.length,
      updates: updatedCount,
      newCompanies: newCompanies.length,
      totalAfter: existingData.length,
    },
    matches: updates.map(u => ({
      input: u.imported.name,
      matched: u.existing.name,
      score: u.score,
      exact: u.exact,
    })),
    newNames: newCompanies.map(c => c.name),
  }, null, 2));
  console.log(`  Log:     ${logPath}`);

  // Sync to Supabase
  await syncToSupabase(existingData);
}

main();
