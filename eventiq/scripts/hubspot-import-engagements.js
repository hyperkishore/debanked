#!/usr/bin/env node
/**
 * Convert HubSpot engagements into EventIQ localStorage-compatible format
 *
 * Reads hubspot-engagements.json (output of hubspot-sync.js) and produces
 * a JSON file that can be pasted into browser console or used by the app.
 *
 * Usage:
 *   node scripts/hubspot-import-engagements.js
 *   node scripts/hubspot-import-engagements.js --output engagements-import.json
 */

const fs = require('fs');
const path = require('path');

const { buildCompanyIndex, findBestMatch } = require('./lib/fuzzy-match');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');
const ENGAGEMENTS_FILE = path.join(__dirname, 'hubspot-engagements.json');

const args = process.argv.slice(2);
const outputIdx = args.indexOf('--output');
const outputFile = outputIdx !== -1 && args[outputIdx + 1]
  ? path.resolve(args[outputIdx + 1])
  : path.join(__dirname, 'hubspot-engagements-import.json');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
HubSpot Engagements → EventIQ Format Converter
=================================================
Converts hubspot-engagements.json into EventIQ engagement format.

Usage:
  node scripts/hubspot-import-engagements.js [--output <file>]

Prerequisites:
  Run hubspot-sync.js first to generate hubspot-engagements.json

Output:
  JSON array of EngagementEntry objects for EventIQ localStorage
  `);
  process.exit(0);
}

if (!fs.existsSync(ENGAGEMENTS_FILE)) {
  console.error(`ERROR: ${ENGAGEMENTS_FILE} not found.`);
  console.error('Run hubspot-sync.js first to generate engagement data.');
  process.exit(1);
}

// Load data
const companies = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
const hubspotData = JSON.parse(fs.readFileSync(ENGAGEMENTS_FILE, 'utf-8'));
const companyIndex = buildCompanyIndex(companies);

console.log(`EventIQ companies: ${companies.length}`);
console.log(`HubSpot engagements: ${hubspotData.engagements?.length || 0}`);
console.log(`Synced at: ${hubspotData.syncedAt}`);

// Convert engagements to EventIQ format
const entries = [];

for (const eng of (hubspotData.engagements || [])) {
  // Map HubSpot channel/action to EventIQ format
  const validChannels = ['email', 'linkedin', 'imessage', 'call', 'meeting', 'note'];
  const channel = validChannels.includes(eng.channel) ? eng.channel : 'note';

  entries.push({
    id: `hs_${eng.hubspotId}`,
    companyId: 0, // Will need manual matching or association API
    contactName: '',
    channel: channel,
    action: eng.action || 'general',
    timestamp: eng.timestamp,
    notes: eng.summary || '',
    source: 'hubspot',
    metadata: {
      hubspotId: eng.hubspotId,
      hubspotType: eng.type,
    },
  });
}

// Write output
fs.writeFileSync(outputFile, JSON.stringify(entries, null, 2));
console.log(`\nConverted ${entries.length} engagements`);
console.log(`Written to: ${outputFile}`);
console.log(`\nTo import into EventIQ:`);
console.log(`  1. Open EventIQ in browser`);
console.log(`  2. Open DevTools console (F12)`);
console.log(`  3. Run: const data = ${entries.length > 5 ? '/* paste contents of ' + outputFile + ' */' : JSON.stringify(entries).slice(0, 100) + '...'}`);
console.log(`  4. Run: const existing = JSON.parse(localStorage.getItem('eventiq_engagements') || '[]');`);
console.log(`  5. Run: localStorage.setItem('eventiq_engagements', JSON.stringify([...existing, ...data]));`);
console.log(`  6. Reload the page`);
