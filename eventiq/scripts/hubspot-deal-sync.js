#!/usr/bin/env node
/**
 * EventIQ HubSpot Deal Sync
 *
 * Syncs HubSpot US GTM Pipeline deals to Supabase `companies.hubspot_deals` column.
 * Fetches pipeline stages, paginates all deals, fuzzy-matches to Supabase companies,
 * extracts product from deal name, maps HubSpot stages to EventIQ pipeline stages,
 * and updates matched companies with their deal data.
 *
 * Usage:
 *   node scripts/hubspot-deal-sync.js           # Full sync
 *   node scripts/hubspot-deal-sync.js --dry-run  # Preview only, no Supabase writes
 *
 * Environment (reads from .env.local or process.env):
 *   HUBSPOT_API_KEY              — HubSpot private app access token
 *   NEXT_PUBLIC_SUPABASE_URL     — Supabase project URL
 *   SUPABASE_SERVICE_KEY         — Supabase service role key
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const US_GTM_PIPELINE_ID = '749665394';
const HUBSPOT_BASE = 'https://api.hubapi.com';
const MATCH_THRESHOLD = 0.85;

// ---------------------------------------------------------------------------
// Environment loading
// ---------------------------------------------------------------------------

function loadEnv() {
  // Try dotenv first
  try {
    require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });
    return;
  } catch {
    // dotenv not installed — manual parse
  }

  const envPath = path.resolve(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const HELP = args.includes('--help') || args.includes('-h');

if (HELP) {
  console.log(`
EventIQ HubSpot Deal Sync
===========================
Syncs US GTM Pipeline deals from HubSpot to Supabase companies.hubspot_deals.

Usage:
  node scripts/hubspot-deal-sync.js [options]

Options:
  --dry-run    Preview matches and stage mappings without writing to Supabase
  -h, --help   Show this help

Environment (set in .env.local or export):
  HUBSPOT_API_KEY              HubSpot private app token
  NEXT_PUBLIC_SUPABASE_URL     Supabase project URL
  SUPABASE_SERVICE_KEY         Supabase service role key
  `);
  process.exit(0);
}

if (!HUBSPOT_API_KEY) {
  console.error('ERROR: HUBSPOT_API_KEY not found. Set it in .env.local or export it.');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are required.');
  console.error('Set them in .env.local or export them.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// HTTP helpers (built-in https — no npm dependencies)
// ---------------------------------------------------------------------------

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`));
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

// ---------------------------------------------------------------------------
// HubSpot API
// ---------------------------------------------------------------------------

async function hubspotGet(endpoint, params = {}) {
  const url = new URL(`${HUBSPOT_BASE}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  return httpRequest(url.toString(), {
    headers: {
      Authorization: `Bearer ${HUBSPOT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

async function hubspotGetAll(endpoint, params = {}, propertyList = []) {
  const all = [];
  let after = undefined;
  const queryParams = { ...params, limit: '100' };
  if (propertyList.length > 0) {
    queryParams.properties = propertyList.join(',');
  }

  while (true) {
    if (after) queryParams.after = after;
    const data = await hubspotGet(endpoint, queryParams);
    all.push(...(data.results || []));

    if (data.paging?.next?.after) {
      after = data.paging.next.after;
    } else {
      break;
    }
  }

  return all;
}

// ---------------------------------------------------------------------------
// Supabase REST API (no npm — raw REST calls)
// ---------------------------------------------------------------------------

function supabaseHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };
}

async function supabaseGetAllCompanies() {
  const companies = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/companies?select=id,name&order=id.asc&offset=${offset}&limit=${PAGE_SIZE}`;
    const batch = await httpRequest(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!Array.isArray(batch)) {
      throw new Error(`Supabase returned non-array: ${JSON.stringify(batch).slice(0, 300)}`);
    }

    companies.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return companies;
}

async function supabaseUpdateCompany(companyId, hubspotDeals) {
  const url = `${SUPABASE_URL}/rest/v1/companies?id=eq.${companyId}`;
  return httpRequest(url, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify({ hubspot_deals: hubspotDeals }),
  });
}

// ---------------------------------------------------------------------------
// Fuzzy matching (Levenshtein — inline to avoid npm dependency)
// ---------------------------------------------------------------------------

const STRIP_SUFFIXES = /\b(llc|inc|corp|ltd|co|company|group|capital|funding|financial|holdings|partners|solutions|services|technologies|tech)\b/gi;

function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function similarityScore(name1, name2) {
  const norm1 = normalizeCompanyName(name1);
  const norm2 = normalizeCompanyName(name2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = Math.min(norm1.length, norm2.length);
    const longer = Math.max(norm1.length, norm2.length);
    return 0.8 + (0.2 * shorter / longer);
  }
  const dist = levenshtein(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  return Math.max(0, 1 - dist / maxLen);
}

// ---------------------------------------------------------------------------
// Deal name parsing
// ---------------------------------------------------------------------------

/**
 * Known suffixes that indicate a product within a deal name.
 * e.g. "Kapitus - Clear" → product = "Clear", baseName = "Kapitus"
 */
const DEAL_SUFFIXES = [
  'MCA', 'Clear', 'BSA', 'New Deal', 'Equipment Finance', 'EF',
  'SBA', 'Factoring', 'LOC', 'Term Loan', 'RBF', 'Invoice',
  'Working Capital', 'Renewal', 'Expansion', 'Pilot', 'Phase 2',
  'Phase 1', 'POC', 'NDA', 'MSA',
];

/**
 * Extract base company name and product from deal name.
 * "Kapitus - Clear" → { baseName: "Kapitus", product: "Clear" }
 * "Kapitus"         → { baseName: "Kapitus", product: null }
 */
function parseDealName(dealName) {
  if (!dealName) return { baseName: '', product: null };

  // Try splitting by " - " (most common pattern)
  const dashParts = dealName.split(/\s*-\s*/);
  if (dashParts.length >= 2) {
    const lastPart = dashParts[dashParts.length - 1].trim();
    const baseName = dashParts.slice(0, -1).join(' - ').trim();
    return { baseName, product: lastPart || null };
  }

  return { baseName: dealName.trim(), product: null };
}

// ---------------------------------------------------------------------------
// Manual override mappings
// ---------------------------------------------------------------------------

/**
 * Check manual overrides before fuzzy matching.
 * Returns company ID or null.
 */
function checkManualOverride(dealName, companiesByName) {
  if (!dealName) return null;
  const dn = dealName.trim();
  const { baseName } = parseDealName(dn);
  const lowerBase = baseName.toLowerCase();
  const lowerDeal = dn.toLowerCase();

  // Prefix-based overrides → specific company IDs
  if (lowerBase.startsWith('ecg') || lowerDeal.startsWith('ecg')) {
    return { id: 114, matchType: 'override:ECG→Expansion Capital Group' };
  }
  if (lowerBase.startsWith('kcg') || lowerDeal.startsWith('kcg')) {
    return { id: 1067, matchType: 'override:KCG→Kalamata Capital Group' };
  }

  // Name-based overrides → match by company name
  const nameOverrides = {
    'breakout finance': 'Breakout Capital Finance',
    'good funding': 'GOOD FUNDING LLC',
    'newco': 'NewCo Capital Group',
    'prime ft': 'Prime Financial Technologies',
  };

  for (const [trigger, targetName] of Object.entries(nameOverrides)) {
    if (lowerBase === trigger || lowerDeal.includes(trigger)) {
      const match = companiesByName.get(normalizeCompanyName(targetName));
      if (match) {
        return { id: match.id, matchType: `override:${trigger}→${targetName}` };
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// HubSpot stage → EventIQ pipeline stage mapping
// ---------------------------------------------------------------------------

const STAGE_MAP = {
  'Yet to Contact': 'researched',
  'Discovery Ongoing': 'contacted',
  'Pre Qualified Opportunity': 'engaged',
  'Qualified Opportunity': 'engaged',
  'POC & Tech Evaluation': 'demo',
  'Commercial Negotiation': 'proposal',
  'Implementation': 'proposal',
  'Agreement Signed & Go Live Ready': 'won',
  'Closed Won (Gone Live)': 'won',
  'Closed Lost': 'lost',
  'Revisit Later': 'lost',
  'Scaled Up': 'won',
};

// Order for stage advancement (higher = more advanced)
const STAGE_ORDER = {
  researched: 1,
  contacted: 2,
  engaged: 3,
  demo: 4,
  proposal: 5,
  won: 6,
  lost: 0,  // Closed deals rank lowest unless no active deals
};

const CLOSED_STAGES = new Set(['lost', 'won']);

/**
 * Given an array of deals (with mapped eventiq_stage), determine the
 * best pipeline stage for the company.
 * Prefers the most advanced ACTIVE deal. Falls back to most advanced closed.
 */
function pickBestStage(deals) {
  const active = deals.filter(d => !CLOSED_STAGES.has(d.eventiq_stage));
  const closed = deals.filter(d => CLOSED_STAGES.has(d.eventiq_stage));

  const pool = active.length > 0 ? active : closed;
  if (pool.length === 0) return null;

  pool.sort((a, b) => (STAGE_ORDER[b.eventiq_stage] || 0) - (STAGE_ORDER[a.eventiq_stage] || 0));
  return pool[0].eventiq_stage;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('EventIQ HubSpot Deal Sync');
  console.log('=========================');
  if (DRY_RUN) console.log('[DRY RUN MODE — no Supabase writes]\n');
  else console.log('');

  // -----------------------------------------------------------------------
  // Step 1: Fetch pipeline stages
  // -----------------------------------------------------------------------
  console.log('Step 1: Fetching pipeline stages...');
  const pipelineData = await hubspotGet(`/crm/v3/pipelines/deals/${US_GTM_PIPELINE_ID}/stages`);
  const stageMap = new Map(); // stageId → stageName
  for (const stage of pipelineData.results || []) {
    stageMap.set(stage.id, stage.label);
  }
  console.log(`  Found ${stageMap.size} stages:`);
  for (const [id, name] of stageMap) {
    const mapped = STAGE_MAP[name] || '???';
    console.log(`    ${id} → "${name}" → eventiq:${mapped}`);
  }

  // -----------------------------------------------------------------------
  // Step 2: Fetch ALL deals from US GTM Pipeline (paginated)
  // -----------------------------------------------------------------------
  console.log('\nStep 2: Fetching deals from US GTM Pipeline...');

  // HubSpot search API for filtering by pipeline
  const allDeals = [];
  let searchAfter = 0;

  while (true) {
    const searchBody = {
      filterGroups: [{
        filters: [{
          propertyName: 'pipeline',
          operator: 'EQ',
          value: US_GTM_PIPELINE_ID,
        }],
      }],
      properties: ['dealname', 'dealstage', 'amount', 'closedate', 'hs_lastmodifieddate'],
      limit: 100,
      after: searchAfter,
    };

    const searchUrl = `${HUBSPOT_BASE}/crm/v3/objects/deals/search`;
    const result = await httpRequest(searchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    allDeals.push(...(result.results || []));
    console.log(`  Fetched ${allDeals.length} deals so far...`);

    if (result.paging?.next?.after) {
      searchAfter = result.paging.next.after;
    } else {
      break;
    }
  }

  console.log(`  Total deals: ${allDeals.length}`);

  // -----------------------------------------------------------------------
  // Step 3: Fetch ALL companies from Supabase
  // -----------------------------------------------------------------------
  console.log('\nStep 3: Fetching companies from Supabase...');
  const supabaseCompanies = await supabaseGetAllCompanies();
  console.log(`  Found ${supabaseCompanies.length} companies`);

  // Build lookup indices
  const companiesById = new Map();
  const companiesByNormName = new Map();
  for (const c of supabaseCompanies) {
    companiesById.set(c.id, c);
    const norm = normalizeCompanyName(c.name);
    if (norm) companiesByNormName.set(norm, c);
  }

  // -----------------------------------------------------------------------
  // Step 4 & 5: Match deals to Supabase companies
  // -----------------------------------------------------------------------
  console.log('\nStep 4: Matching deals to companies...');

  const matched = [];      // { deal, companyId, matchType }
  const unmatched = [];    // { deal, baseName }
  const stageCounts = {};  // stageName → count

  for (const deal of allDeals) {
    const props = deal.properties || {};
    const dealName = props.dealname || '';
    const stageId = props.dealstage || '';
    const stageName = stageMap.get(stageId) || 'Unknown';
    const eventiqStage = STAGE_MAP[stageName] || null;

    // Count stages
    stageCounts[stageName] = (stageCounts[stageName] || 0) + 1;

    const { baseName, product } = parseDealName(dealName);

    // Build deal record
    const dealRecord = {
      dealId: deal.id,
      dealName,
      stage: stageName,
      stageId,
      amount: props.amount ? parseFloat(props.amount) : null,
      closeDate: props.closedate || null,
      lastModified: props.hs_lastmodifieddate
        ? props.hs_lastmodifieddate.split('T')[0]
        : null,
      product: product || null,
      eventiq_stage: eventiqStage,
    };

    // Step 5: Check manual overrides first
    const override = checkManualOverride(dealName, companiesByNormName);
    if (override) {
      matched.push({ deal: dealRecord, companyId: override.id, matchType: override.matchType });
      continue;
    }

    // Fuzzy match baseName against Supabase companies
    const normBase = normalizeCompanyName(baseName);
    if (!normBase) {
      unmatched.push({ dealName, baseName });
      continue;
    }

    // Exact normalized match
    if (companiesByNormName.has(normBase)) {
      const c = companiesByNormName.get(normBase);
      matched.push({ deal: dealRecord, companyId: c.id, matchType: 'exact' });
      continue;
    }

    // Fuzzy search
    let bestScore = 0;
    let bestCompany = null;
    for (const c of supabaseCompanies) {
      const score = similarityScore(baseName, c.name);
      if (score > bestScore) {
        bestScore = score;
        bestCompany = c;
      }
    }

    if (bestScore >= MATCH_THRESHOLD && bestCompany) {
      matched.push({
        deal: dealRecord,
        companyId: bestCompany.id,
        matchType: `fuzzy(${bestScore.toFixed(2)})`,
      });
    } else {
      unmatched.push({
        dealName,
        baseName,
        bestCandidate: bestCompany ? `${bestCompany.name} (${bestScore.toFixed(2)})` : 'none',
      });
    }
  }

  console.log(`  Matched: ${matched.length}/${allDeals.length}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  // -----------------------------------------------------------------------
  // Step 6 & 7: Group by company and build hubspot_deals arrays
  // -----------------------------------------------------------------------
  console.log('\nStep 5: Grouping deals by company...');

  const dealsByCompany = new Map(); // companyId → deal[]
  for (const m of matched) {
    if (!dealsByCompany.has(m.companyId)) {
      dealsByCompany.set(m.companyId, []);
    }
    dealsByCompany.get(m.companyId).push(m.deal);
  }

  console.log(`  Companies with deals: ${dealsByCompany.size}`);

  // Build the final payload per company
  const updates = []; // { companyId, companyName, hubspot_deals, bestStage }
  for (const [companyId, deals] of dealsByCompany) {
    const company = companiesById.get(companyId);
    const companyName = company?.name || `ID:${companyId}`;

    // Build clean hubspot_deals array (strip internal eventiq_stage field)
    const hubspotDeals = deals.map(d => ({
      dealId: d.dealId,
      dealName: d.dealName,
      stage: d.stage,
      stageId: d.stageId,
      amount: d.amount,
      closeDate: d.closeDate,
      lastModified: d.lastModified,
      product: d.product,
    }));

    const bestStage = pickBestStage(deals);

    updates.push({ companyId, companyName, hubspotDeals, bestStage, dealCount: deals.length });
  }

  // -----------------------------------------------------------------------
  // Step 8 & 9: Update Supabase
  // -----------------------------------------------------------------------
  console.log('\nStep 6: Updating Supabase...');

  let updatedCount = 0;
  let errorCount = 0;

  for (const update of updates) {
    if (DRY_RUN) {
      console.log(`  [DRY RUN] ${update.companyName} (ID:${update.companyId}): ${update.dealCount} deal(s), stage=${update.bestStage}`);
      for (const d of update.hubspotDeals) {
        console.log(`    - "${d.dealName}" → ${d.stage} | amt=${d.amount} | product=${d.product}`);
      }
    } else {
      try {
        await supabaseUpdateCompany(update.companyId, update.hubspotDeals);
        updatedCount++;
      } catch (err) {
        console.error(`  ERROR updating ${update.companyName} (ID:${update.companyId}): ${err.message}`);
        errorCount++;
      }
    }
  }

  if (!DRY_RUN) {
    console.log(`  Updated: ${updatedCount} companies`);
    if (errorCount > 0) console.log(`  Errors: ${errorCount}`);
  }

  // -----------------------------------------------------------------------
  // Step 10: Summary
  // -----------------------------------------------------------------------
  console.log('\n========================================');
  console.log('                SUMMARY');
  console.log('========================================');
  console.log(`Total deals in US GTM Pipeline:  ${allDeals.length}`);
  console.log(`Matched to Supabase companies:   ${matched.length}`);
  console.log(`Unmatched:                       ${unmatched.length}`);
  console.log(`Companies updated:               ${DRY_RUN ? `${updates.length} (dry run)` : updatedCount}`);

  console.log('\n--- Deals per HubSpot Stage ---');
  const sortedStages = Object.entries(stageCounts).sort((a, b) => b[1] - a[1]);
  for (const [stage, count] of sortedStages) {
    const mapped = STAGE_MAP[stage] || '???';
    console.log(`  ${stage.padEnd(40)} ${String(count).padStart(4)}  → ${mapped}`);
  }

  console.log('\n--- Deals per Company (matched) ---');
  const sortedUpdates = [...updates].sort((a, b) => b.dealCount - a.dealCount);
  for (const u of sortedUpdates) {
    console.log(`  ${u.companyName.padEnd(40)} ${String(u.dealCount).padStart(3)} deal(s)  stage=${u.bestStage || 'n/a'}`);
  }

  if (unmatched.length > 0) {
    console.log('\n--- Unmatched Deals ---');
    for (const u of unmatched) {
      console.log(`  "${u.dealName}" (base: "${u.baseName}")${u.bestCandidate ? ` — closest: ${u.bestCandidate}` : ''}`);
    }
  }

  // Print match type breakdown
  const matchTypes = {};
  for (const m of matched) {
    matchTypes[m.matchType] = (matchTypes[m.matchType] || 0) + 1;
  }
  console.log('\n--- Match Type Breakdown ---');
  for (const [type, count] of Object.entries(matchTypes).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type.padEnd(50)} ${count}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
