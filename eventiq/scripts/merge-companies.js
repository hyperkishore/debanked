#!/usr/bin/env node
/**
 * Merge researched companies from agent outputs into companies.json
 *
 * Reads JSONL agent output files, extracts company JSON arrays,
 * deduplicates by name, renumbers IDs, and merges with existing data.
 */

const fs = require('fs');
const path = require('path');

const AGENT_OUTPUT_DIR = '/Users/kishore/.claude/projects/-Users-kishore-Desktop-Claude-experiments-debanked/bfc56a8c-6370-4f88-b9b5-6647cf32d228/subagents';
const EXISTING_DATA = path.join(__dirname, '../src/data/companies.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/companies.json');

const AGENT_IDS = ['agent-a8b6da1', 'agent-aaf4331', 'agent-a8bf436', 'agent-a0db0b4', 'agent-abdaf0a'];

function extractCompaniesFromJSONL(filePath) {
  const companies = [];
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.type === 'assistant' && entry.message?.content) {
          for (const block of entry.message.content) {
            if (block.type === 'text' && block.text) {
              // Find the largest JSON array in the text by looking for [ ... ]
              // that contains company objects
              const text = block.text;
              let bestArray = null;
              let bestLength = 0;

              // Find all opening brackets and try to parse from each
              for (let i = 0; i < text.length; i++) {
                if (text[i] === '[') {
                  // Find matching closing bracket by counting depth
                  let depth = 0;
                  let end = -1;
                  for (let j = i; j < text.length; j++) {
                    if (text[j] === '[') depth++;
                    else if (text[j] === ']') {
                      depth--;
                      if (depth === 0) {
                        end = j;
                        break;
                      }
                    }
                  }
                  if (end > i) {
                    const substr = text.substring(i, end + 1);
                    try {
                      const parsed = JSON.parse(substr);
                      if (Array.isArray(parsed) && parsed.length > bestLength
                          && parsed[0] && parsed[0].name && parsed[0].type) {
                        bestArray = parsed;
                        bestLength = parsed.length;
                      }
                    } catch (e) {
                      // Not valid JSON at this position
                    }
                  }
                }
              }

              if (bestArray) {
                companies.push(...bestArray);
              }
            }
          }
        }
      } catch (e) {
        // Not valid JSONL line, skip
      }
    }
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e.message);
  }
  return companies;
}

function normalizeCompanyName(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/llc|inc|corp|ltd|group|capital|funding|financial/g, '');
}

function validateCompany(c) {
  return c && c.name && c.type && ['SQO', 'Client', 'ICP'].includes(c.type);
}

function deduplicateCompanies(companies, existingNames) {
  const seen = new Set(existingNames.map(normalizeCompanyName));
  const deduped = [];

  for (const c of companies) {
    const normalized = normalizeCompanyName(c.name);
    if (!seen.has(normalized) && validateCompany(c)) {
      seen.add(normalized);
      deduped.push(c);
    }
  }

  return deduped;
}

function ensureCompanySchema(c, id) {
  return {
    id,
    name: c.name || '',
    type: c.type || 'ICP',
    priority: c.priority || 5,
    phase: c.phase || 4,
    booth: c.booth || false,
    clear: c.clear || false,
    contacts: Array.isArray(c.contacts) ? c.contacts : [],
    desc: c.desc || '',
    notes: c.notes || '',
    news: Array.isArray(c.news) ? c.news : [],
    ice: c.ice || '',
    icebreakers: Array.isArray(c.icebreakers) ? c.icebreakers : (c.ice ? [c.ice] : []),
    tp: Array.isArray(c.tp) ? c.tp : [],
    leaders: Array.isArray(c.leaders) ? c.leaders : [],
    ask: c.ask || ''
  };
}

// Main
console.log('Loading existing companies...');
const existing = JSON.parse(fs.readFileSync(EXISTING_DATA, 'utf-8'));
console.log(`Existing companies: ${existing.length}`);

const existingNames = existing.map(c => c.name);

console.log('\nExtracting companies from agent outputs...');
let allNew = [];

for (const agentId of AGENT_IDS) {
  const filePath = path.join(AGENT_OUTPUT_DIR, `${agentId}.jsonl`);
  console.log(`  Reading ${agentId}...`);
  const companies = extractCompaniesFromJSONL(filePath);
  console.log(`    Found ${companies.length} companies`);
  allNew.push(...companies);
}

console.log(`\nTotal raw companies from agents: ${allNew.length}`);

// Deduplicate
const deduped = deduplicateCompanies(allNew, existingNames);
console.log(`After deduplication: ${deduped.length}`);

// Assign IDs and ensure schema
const nextId = existing.length + 1;
const normalized = deduped.map((c, i) => ensureCompanySchema(c, nextId + i));

// Merge
const merged = [...existing, ...normalized];
console.log(`\nFinal company count: ${merged.length}`);
console.log(`  SQO: ${merged.filter(c => c.type === 'SQO').length}`);
console.log(`  Client: ${merged.filter(c => c.type === 'Client').length}`);
console.log(`  ICP: ${merged.filter(c => c.type === 'ICP').length}`);

// Write
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
console.log(`\nWritten to ${OUTPUT_FILE}`);
console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(1)} KB`);
