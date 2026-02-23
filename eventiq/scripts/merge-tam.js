#!/usr/bin/env node
/**
 * Merge TAM companies with existing EventIQ companies into all-companies.json
 *
 * - Deduplicates TAM internal duplicates
 * - Handles overlaps: preserves rich EventIQ data, adds TAM fields + source tags
 * - Creates TAM-only skeleton records
 * - Normalizes locations and websites
 * - Maps TAM priority strings to numeric values
 */

const fs = require('fs');
const path = require('path');
const { syncToSupabase } = require('./lib/supabase-sync');

const EXISTING_DATA = path.join(__dirname, '../src/data/companies.json');
const TAM_DATA = path.join(__dirname, '../src/data/tam-companies.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/all-companies.json');

// Load data
const existing = JSON.parse(fs.readFileSync(EXISTING_DATA, 'utf-8'));
const tam = JSON.parse(fs.readFileSync(TAM_DATA, 'utf-8'));

console.log(`Existing companies: ${existing.length}`);
console.log(`TAM companies: ${tam.length}`);

// --- Normalization helpers ---

function normalizeCompanyName(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function normalizeLocation(loc) {
  if (!loc) return '';
  const map = {
    'ny': 'New York', 'new york': 'New York',
    'fl': 'Florida', 'florida': 'Florida',
    'ca': 'California', 'california': 'California',
    'tx': 'Texas', 'texas': 'Texas',
    'nj': 'New Jersey', 'new jersey': 'New Jersey',
    'il': 'Illinois', 'illinois': 'Illinois',
    'pa': 'Pennsylvania', 'pennsylvania': 'Pennsylvania',
    'oh': 'Ohio', 'ohio': 'Ohio',
    'ga': 'Georgia', 'georgia': 'Georgia',
    'nc': 'North Carolina', 'north carolina': 'North Carolina',
    'va': 'Virginia', 'virginia': 'Virginia',
    'ma': 'Massachusetts', 'massachusetts': 'Massachusetts',
    'ct': 'Connecticut', 'connecticut': 'Connecticut',
    'md': 'Maryland', 'maryland': 'Maryland',
    'mi': 'Michigan', 'michigan': 'Michigan',
    'az': 'Arizona', 'arizona': 'Arizona',
    'co': 'Colorado', 'colorado': 'Colorado',
    'mn': 'Minnesota', 'minnesota': 'Minnesota',
    'mo': 'Missouri', 'missouri': 'Missouri',
    'tn': 'Tennessee', 'tennessee': 'Tennessee',
    'ut': 'Utah', 'utah': 'Utah',
    'wi': 'Wisconsin', 'wisconsin': 'Wisconsin',
    'wa': 'Washington', 'washington': 'Washington',
    'sc': 'South Carolina', 'south carolina': 'South Carolina',
    'ok': 'Oklahoma', 'oklahoma': 'Oklahoma',
    'or': 'Oregon', 'oregon': 'Oregon',
    'nv': 'Nevada', 'nevada': 'Nevada',
    'in': 'Indiana', 'indiana': 'Indiana',
    'la': 'Louisiana', 'louisiana': 'Louisiana',
    'al': 'Alabama', 'alabama': 'Alabama',
    'ky': 'Kentucky', 'kentucky': 'Kentucky',
    'ri': 'Rhode Island', 'rhode island': 'Rhode Island',
    'dc': 'Washington DC', 'washington dc': 'Washington DC',
  };
  const key = loc.toLowerCase().trim();
  return map[key] || loc.trim();
}

function normalizeWebsite(url) {
  if (!url || url === 'Not Available' || url === 'N/A' || url === '') return '';
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

function priorityToNumber(p) {
  switch (p) {
    case 'P0': return 2;
    case 'P1': return 4;
    case 'TBC': return 6;
    case 'Not Priority': return 7;
    default: return 6;
  }
}

// --- Deduplicate TAM internal duplicates ---
const tamDeduped = [];
const tamSeen = new Map();
for (const t of tam) {
  const norm = normalizeCompanyName(t.name);
  if (!tamSeen.has(norm)) {
    tamSeen.set(norm, t);
    tamDeduped.push(t);
  } else {
    // Keep the one with more data (more employees or better priority)
    const prev = tamSeen.get(norm);
    if ((t.employees || 0) > (prev.employees || 0)) {
      const idx = tamDeduped.indexOf(prev);
      tamDeduped[idx] = t;
      tamSeen.set(norm, t);
    }
  }
}
console.log(`TAM after internal dedup: ${tamDeduped.length} (removed ${tam.length - tamDeduped.length})`);

// --- Build lookup maps ---
const existingByNorm = new Map();
for (const c of existing) {
  existingByNorm.set(normalizeCompanyName(c.name), c);
}

const tamByNorm = new Map();
for (const t of tamDeduped) {
  tamByNorm.set(normalizeCompanyName(t.name), t);
}

// --- Find overlaps ---
const overlapNames = [];
for (const [norm] of existingByNorm) {
  if (tamByNorm.has(norm)) overlapNames.push(norm);
}
console.log(`Overlaps: ${overlapNames.length}`);

// --- Build merged list ---
const merged = [];
let nextId = 1000;

// 1. Process existing companies — add source tags + TAM fields for overlaps
for (const c of existing) {
  const norm = normalizeCompanyName(c.name);
  const tamMatch = tamByNorm.get(norm);

  const entry = {
    ...c,
    source: tamMatch ? ['eventiq', 'tam'] : ['eventiq'],
  };

  if (tamMatch) {
    entry.location = normalizeLocation(tamMatch.location) || c.location || '';
    entry.employees = tamMatch.employees || c.employees || 0;
    entry.website = normalizeWebsite(tamMatch.website) || c.website || '';
    entry.linkedinUrl = tamMatch.linkedin || c.linkedinUrl || '';
    // Override priority if TAM gives higher priority
    const tamPriority = priorityToNumber(tamMatch.priority);
    if (tamPriority < c.priority) {
      entry.priority = tamPriority;
    }
  }

  merged.push(entry);
}

// 2. Process TAM-only companies — create skeleton records
let tamOnlyCount = 0;
for (const t of tamDeduped) {
  const norm = normalizeCompanyName(t.name);
  if (existingByNorm.has(norm)) continue; // Skip overlaps, already handled

  tamOnlyCount++;
  merged.push({
    id: nextId++,
    name: t.name,
    type: 'TAM',
    priority: priorityToNumber(t.priority),
    phase: 0,
    booth: false,
    clear: false,
    contacts: [],
    desc: '',
    notes: '',
    news: [],
    ice: '',
    icebreakers: [],
    tp: [],
    leaders: [],
    ask: '',
    location: normalizeLocation(t.location),
    employees: t.employees || 0,
    website: normalizeWebsite(t.website),
    linkedinUrl: t.linkedin || '',
    source: ['tam'],
  });
}

console.log(`TAM-only new companies: ${tamOnlyCount}`);
console.log(`\nFinal merged count: ${merged.length}`);

// --- Stats ---
const types = { SQO: 0, Client: 0, ICP: 0, TAM: 0 };
for (const c of merged) types[c.type] = (types[c.type] || 0) + 1;
console.log(`  SQO: ${types.SQO}, Client: ${types.Client}, ICP: ${types.ICP}, TAM: ${types.TAM}`);

const sources = { eventiqOnly: 0, tamOnly: 0, both: 0 };
for (const c of merged) {
  const s = c.source;
  if (s.includes('eventiq') && s.includes('tam')) sources.both++;
  else if (s.includes('eventiq')) sources.eventiqOnly++;
  else sources.tamOnly++;
}
console.log(`  EventIQ only: ${sources.eventiqOnly}, TAM only: ${sources.tamOnly}, Both: ${sources.both}`);

const priorities = {};
for (const c of merged) {
  priorities[c.priority] = (priorities[c.priority] || 0) + 1;
}
console.log(`  Priorities:`, priorities);

// --- Write output ---
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
const size = fs.statSync(OUTPUT_FILE).size;
console.log(`\nWritten to ${OUTPUT_FILE}`);
console.log(`File size: ${(size / 1024).toFixed(1)} KB`);

// Sync to Supabase
syncToSupabase(merged);
