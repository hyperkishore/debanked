#!/usr/bin/env node
/**
 * Prepare batches for a news/enrichment refresh cycle.
 *
 * Usage:
 *   node scripts/refresh.js                    # All researched companies
 *   node scripts/refresh.js --priority P0      # Only P0
 *   node scripts/refresh.js --priority P1      # Only P1
 *   node scripts/refresh.js --stale 30         # Companies with news older than 30 days
 *   node scripts/refresh.js --all              # Every company in the dataset
 *
 * This generates batch files (refresh-batch-1.json ... refresh-batch-5.json)
 * that Claude Code agents can pick up for web research.
 *
 * After agents produce refresh-result-*.json files, run:
 *   node scripts/merge-enrichment.js scripts/refresh-result-*.json
 */

const fs = require('fs');
const path = require('path');

const ALL_COMPANIES = path.join(__dirname, '../src/data/all-companies.json');
const data = JSON.parse(fs.readFileSync(ALL_COMPANIES, 'utf-8'));

const args = process.argv.slice(2);
const AGENT_COUNT = 5;

let targets;

if (args.includes('--unresearched-icp')) {
  const countIdx = args.indexOf('--count');
  const count = countIdx !== -1 ? parseInt(args[countIdx + 1]) : 50;
  targets = data
    .filter(c => c.type === 'ICP' && (!c.leaders || c.leaders.length === 0))
    .slice(0, count);
  console.log(`Mode: Unresearched ICP companies (${targets.length}/${count} requested)`);
} else if (args.includes('--all')) {
  targets = data;
  console.log('Mode: ALL companies');
} else if (args.includes('--priority')) {
  const prio = args[args.indexOf('--priority') + 1];
  const prioMap = { P0: [1, 2], P1: [3, 4], TBC: [5, 6], 'Not Priority': [7] };
  const prioValues = prioMap[prio] || [parseInt(prio)];
  targets = data.filter(c => prioValues.includes(c.priority));
  console.log(`Mode: Priority ${prio} (values: ${prioValues.join(',')})`);
} else if (args.includes('--stale')) {
  const days = parseInt(args[args.indexOf('--stale') + 1]) || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffTs = cutoff.getTime();

  const months = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };

  function parseNewsDate(news) {
    // Prefer structured p (published_at ISO) field
    if (news.p) {
      const ts = new Date(news.p).getTime();
      if (!isNaN(ts)) return ts;
    }
    // Fallback: parse "Mon YYYY" from source string
    if (news.s) {
      const m = news.s.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})\b/i);
      if (m) {
        const month = months[m[1].toLowerCase().slice(0, 3)];
        const year = parseInt(m[2]);
        if (!isNaN(month) && !isNaN(year)) return new Date(year, month, 15).getTime();
      }
    }
    return 0; // unparseable = stale
  }

  targets = data.filter(c => {
    if (!c.news || c.news.length === 0) return true;
    // Check if the newest news item is older than cutoff
    const newestTs = Math.max(...c.news.map(parseNewsDate));
    return newestTs < cutoffTs;
  }).filter(c => c.desc && c.desc.length > 0); // Only researched ones
  console.log(`Mode: Stale (>${days} days) — ${targets.length} companies with old/missing news`);
} else {
  targets = data.filter(c => c.source && c.source.includes('researched'));
  console.log('Mode: Researched companies only');
}

console.log(`Targets: ${targets.length} companies`);
console.log(`Splitting into ${AGENT_COUNT} batches...\n`);

const batchSize = Math.ceil(targets.length / AGENT_COUNT);

for (let i = 0; i < AGENT_COUNT; i++) {
  const batch = targets.slice(i * batchSize, (i + 1) * batchSize);
  if (batch.length === 0) continue;

  const simplified = batch.map(c => ({
    id: c.id,
    name: c.name,
    website: c.website || '',
    linkedinUrl: c.linkedinUrl || '',
    location: c.location || '',
    employees: c.employees || 0,
    leaders: (c.leaders || []).map(l => ({
      n: l.n,
      t: l.t,
      li: l.li || '',
      hasHooks: !!(l.hooks && l.hooks.length > 0)
    })),
    currentNewsCount: (c.news || []).length
  }));

  const outFile = path.join(__dirname, `refresh-batch-${i + 1}.json`);
  fs.writeFileSync(outFile, JSON.stringify(simplified, null, 2));
  console.log(`Batch ${i + 1}: ${batch.length} companies → ${path.basename(outFile)}`);
}

console.log('\nBatch files ready. Spawn Claude Code agents with prompt:');
console.log('  "Research batch N: find latest news, missing LinkedIn URLs, and add conversation hooks"');
console.log('  Output to: scripts/refresh-result-N.json');
console.log('\nThen merge with:');
console.log('  node scripts/merge-enrichment.js scripts/refresh-result-*.json');
