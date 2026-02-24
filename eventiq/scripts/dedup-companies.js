#!/usr/bin/env node
/**
 * Deduplicate companies in all-companies.json.
 *
 * CONSERVATIVE approach: Only merges when confident entries are the same company.
 * Two matching strategies:
 *   1. Name-based: Strip legal suffixes (LLC, Inc) + whitespace/punctuation only.
 *      Does NOT strip business words like "capital", "funding", "financial" —
 *      those are part of the company identity and removing them causes false merges
 *      (e.g., "Blue Bridge Financial" ≠ "Bluebridge Funding").
 *   2. Website-based: Same domain → same company (after normalizing www/trailing slash).
 *
 * For each group of duplicates, keeps the best entry (most leaders, most description,
 * higher priority type) and merges data from the others into it.
 *
 * Use find-dupes.js for aggressive duplicate DISCOVERY (it strips more words),
 * then manually review before running this script.
 */
const fs = require('fs');
const path = require('path');
const { syncToSupabase } = require('./lib/supabase-sync');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');
const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

// Conservative normalization — only strip legal suffixes and punctuation
function norm(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(llc|inc|corp|ltd|company|co)$/g, '');
}

// Normalize website domain for comparison
function normDomain(website) {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith('http') ? website : 'https://' + website);
    return url.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

// Build duplicate groups by normalized name
const byNorm = new Map();
for (const c of data) {
  const n = norm(c.name);
  if (byNorm.has(n)) {
    byNorm.get(n).push(c);
  } else {
    byNorm.set(n, [c]);
  }
}

// Also find duplicates by website domain
const byDomain = new Map();
for (const c of data) {
  const d = normDomain(c.website);
  if (!d) continue;
  if (byDomain.has(d)) {
    byDomain.get(d).push(c);
  } else {
    byDomain.set(d, [c]);
  }
}

// Merge domain-based groups into the main groups (if not already covered by name)
const processedIds = new Set();
const mergeGroups = [];

// First: name-based groups
for (const [key, companies] of byNorm) {
  if (companies.length <= 1) continue;
  const ids = companies.map(c => c.id).sort().join(',');
  if (!processedIds.has(ids)) {
    mergeGroups.push(companies);
    processedIds.add(ids);
  }
}

// Second: website-based groups (only add if not already in a name group)
for (const [domain, companies] of byDomain) {
  if (companies.length <= 1) continue;
  // Check if all members are already in a name-based group together
  const alreadyCovered = mergeGroups.some(group => {
    const groupIds = new Set(group.map(c => c.id));
    return companies.every(c => groupIds.has(c.id));
  });
  if (!alreadyCovered) {
    mergeGroups.push(companies);
    console.log('Domain-based match (' + domain + '):', companies.map(c => c.name).join(' + '));
  }
}

const TYPE_RANK = { SQO: 1, Client: 2, ICP: 3, TAM: 4 };

function score(c) {
  return (
    (c.leaders ? c.leaders.length * 10 : 0) +
    (c.desc ? c.desc.length : 0) +
    (c.news ? c.news.length * 5 : 0) +
    (c.icebreakers ? c.icebreakers.length * 3 : 0) +
    (c.tp ? c.tp.length * 3 : 0) +
    (c.location ? 5 : 0) +
    (c.employees ? 5 : 0) +
    (c.website ? 5 : 0)
  );
}

function mergeInto(primary, dupe) {
  // Fill empty scalar fields
  if (!primary.location && dupe.location) primary.location = dupe.location;
  if (!primary.employees && dupe.employees) primary.employees = dupe.employees;
  if (!primary.website && dupe.website) primary.website = dupe.website;
  if (!primary.linkedinUrl && dupe.linkedinUrl && dupe.linkedinUrl.includes('linkedin')) {
    primary.linkedinUrl = dupe.linkedinUrl;
  }
  if (!primary.ice && dupe.ice) primary.ice = dupe.ice;
  if (!primary.ask && dupe.ask) primary.ask = dupe.ask;
  if (!primary.category && dupe.category) primary.category = dupe.category;

  // Upgrade type (prefer SQO > Client > ICP > TAM)
  if ((TYPE_RANK[dupe.type] || 99) < (TYPE_RANK[primary.type] || 99)) {
    primary.type = dupe.type;
  }
  primary.priority = Math.min(primary.priority || 99, dupe.priority || 99);

  // Merge desc (append unique facts if primary desc is shorter)
  if (dupe.desc && dupe.desc.length > 0 && (!primary.desc || primary.desc.length === 0)) {
    primary.desc = dupe.desc;
  }

  // Merge news
  if (dupe.news && dupe.news.length > 0) {
    if (!primary.news) primary.news = [];
    const existing = new Set(primary.news.map(n => n.h.toLowerCase().trim()));
    for (const item of dupe.news) {
      if (!existing.has(item.h.toLowerCase().trim())) {
        primary.news.push(item);
      }
    }
  }

  // Merge icebreakers
  if (dupe.icebreakers && dupe.icebreakers.length > 0) {
    if (!primary.icebreakers) primary.icebreakers = [];
    const existing = new Set(primary.icebreakers.map(i => i.slice(0, 40).toLowerCase()));
    for (const ice of dupe.icebreakers) {
      if (!existing.has(ice.slice(0, 40).toLowerCase())) {
        primary.icebreakers.push(ice);
      }
    }
  }

  // Merge talking points
  if (dupe.tp && dupe.tp.length > 0) {
    if (!primary.tp) primary.tp = [];
    const existing = new Set(primary.tp.map(t => t.slice(0, 40).toLowerCase()));
    for (const tp of dupe.tp) {
      if (!existing.has(tp.slice(0, 40).toLowerCase())) {
        primary.tp.push(tp);
      }
    }
  }

  // Merge leaders (by normalized name)
  if (dupe.leaders && dupe.leaders.length > 0) {
    if (!primary.leaders) primary.leaders = [];
    const existing = new Set(primary.leaders.map(l => l.n.toLowerCase().trim()));
    for (const leader of dupe.leaders) {
      if (!existing.has(leader.n.toLowerCase().trim())) {
        primary.leaders.push(leader);
      } else {
        // Merge hooks for existing leaders
        const pl = primary.leaders.find(l => l.n.toLowerCase().trim() === leader.n.toLowerCase().trim());
        if (pl && leader.hooks) {
          if (!pl.hooks) pl.hooks = [];
          const existingHooks = new Set(pl.hooks.map(h => h.toLowerCase()));
          for (const hook of leader.hooks) {
            if (!existingHooks.has(hook.toLowerCase())) {
              pl.hooks.push(hook);
            }
          }
        }
        if (!pl.li && leader.li) pl.li = leader.li;
        if (!pl.bg && leader.bg) pl.bg = leader.bg;
      }
    }
  }

  // Merge contacts
  if (dupe.contacts && dupe.contacts.length > 0) {
    if (!primary.contacts) primary.contacts = [];
    const existing = new Set(primary.contacts.map(c => c.n.toLowerCase().trim()));
    for (const contact of dupe.contacts) {
      if (!existing.has(contact.n.toLowerCase().trim())) {
        primary.contacts.push(contact);
      }
    }
  }

  // Merge source
  if (dupe.source) {
    if (!primary.source) primary.source = [];
    for (const src of dupe.source) {
      if (!primary.source.includes(src)) primary.source.push(src);
    }
  }
}

// Process duplicates
const toRemove = new Set();
let mergedCount = 0;

for (const companies of mergeGroups) {
  // Safety check: if companies have DIFFERENT website domains, skip
  const domains = companies.map(c => normDomain(c.website)).filter(Boolean);
  const uniqueDomains = [...new Set(domains)];
  if (uniqueDomains.length > 1) {
    console.log('SKIPPED (different websites):', companies.map(c => c.name + ' → ' + (c.website || 'none')).join(' | '));
    continue;
  }

  // Sort by score descending — best entry first
  companies.sort((a, b) => score(b) - score(a));

  const primary = companies[0];
  for (let i = 1; i < companies.length; i++) {
    if (toRemove.has(companies[i].id)) continue; // Already removed by another group
    mergeInto(primary, companies[i]);
    toRemove.add(companies[i].id);
    mergedCount++;
  }

  console.log('Merged:', companies.map(c => c.name + ' (id:' + c.id + ')').join(' + '),
    '→ kept id:' + primary.id, primary.name);
}

// Remove duplicates
const filtered = data.filter(c => !toRemove.has(c.id));

console.log('\nDuplicate groups:', mergeGroups.length);
console.log('Entries removed:', mergedCount);
console.log('Companies before:', data.length);
console.log('Companies after:', filtered.length);

fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2));
console.log('Written to', DATA_FILE);

// Sync to Supabase
syncToSupabase(filtered);
