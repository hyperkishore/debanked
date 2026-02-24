#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

function norm(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(llc|inc|corp|ltd|group|company|co|funding|capital|financial)/g, '');
}

const byNorm = new Map();
for (const c of data) {
  const n = norm(c.name);
  if (byNorm.has(n)) {
    byNorm.get(n).push(c);
  } else {
    byNorm.set(n, [c]);
  }
}

let dupeCount = 0;
for (const [key, companies] of byNorm) {
  if (companies.length > 1) {
    dupeCount++;
    console.log('DUPE:');
    for (const c of companies) {
      console.log('  id:' + c.id, c.name, '(' + c.type + ')', 'leaders:' + (c.leaders ? c.leaders.length : 0), 'quality:' + (c.desc ? c.desc.length : 0) + 'ch');
    }
  }
}
console.log('\nTotal duplicate groups:', dupeCount);
console.log('Total companies:', data.length);
