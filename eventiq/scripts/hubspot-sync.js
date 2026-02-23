#!/usr/bin/env node
/**
 * EventIQ HubSpot CRM Sync
 *
 * Pulls companies, contacts, deals, and engagement history from HubSpot CRM
 * and matches them to EventIQ companies using fuzzy name matching.
 *
 * Usage:
 *   HUBSPOT_API_KEY=xxx node scripts/hubspot-sync.js
 *   HUBSPOT_API_KEY=xxx node scripts/hubspot-sync.js --dry-run
 *   HUBSPOT_API_KEY=xxx node scripts/hubspot-sync.js --engagements-only
 *
 * Output:
 *   - Updates all-companies.json (company data)
 *   - Creates scripts/hubspot-engagements.json (engagement history)
 */

const fs = require('fs');
const path = require('path');
const { syncToSupabase } = require('./lib/supabase-sync');

const { buildCompanyIndex, findBestMatch } = require('./lib/fuzzy-match');

const DATA_FILE = path.join(__dirname, '../src/data/all-companies.json');
const ENGAGEMENTS_FILE = path.join(__dirname, 'hubspot-engagements.json');

const API_KEY = process.env.HUBSPOT_API_KEY;
const BASE_URL = 'https://api.hubapi.com';

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  engagementsOnly: args.includes('--engagements-only'),
  help: args.includes('--help') || args.includes('-h'),
};

if (flags.help) {
  console.log(`
EventIQ HubSpot Sync
=====================
Pulls CRM data from HubSpot and matches to EventIQ companies.

Usage:
  HUBSPOT_API_KEY=xxx node scripts/hubspot-sync.js [options]

Options:
  --dry-run           Preview changes without writing
  --engagements-only  Only pull engagements, skip company updates
  -h, --help          Show this help

Environment:
  HUBSPOT_API_KEY     HubSpot private app access token (required)
  `);
  process.exit(0);
}

if (!API_KEY) {
  console.error('ERROR: HUBSPOT_API_KEY environment variable is required.');
  console.error('Create a private app at: https://app.hubspot.com/private-apps/');
  console.error('Required scopes: crm.objects.companies.read, crm.objects.contacts.read, crm.objects.deals.read');
  process.exit(1);
}

// --- HubSpot API helpers ---

async function hubspotGet(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Paginate through all results for a HubSpot endpoint
 */
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

// --- Pull functions ---

async function pullCompanies() {
  console.log('Pulling HubSpot companies...');
  const companies = await hubspotGetAll('/crm/v3/objects/companies', {}, [
    'name', 'domain', 'description', 'city', 'state', 'country',
    'numberofemployees', 'linkedin_company_page', 'industry',
    'hs_lastmodifieddate', 'createdate',
  ]);
  console.log(`  Found ${companies.length} companies`);
  return companies;
}

async function pullContacts() {
  console.log('Pulling HubSpot contacts...');
  const contacts = await hubspotGetAll('/crm/v3/objects/contacts', {}, [
    'firstname', 'lastname', 'email', 'jobtitle', 'company',
    'linkedin_url', 'phone', 'hs_lastmodifieddate',
  ]);
  console.log(`  Found ${contacts.length} contacts`);
  return contacts;
}

async function pullDeals() {
  console.log('Pulling HubSpot deals...');
  const deals = await hubspotGetAll('/crm/v3/objects/deals', {}, [
    'dealname', 'amount', 'dealstage', 'closedate', 'pipeline',
    'hs_lastmodifieddate', 'createdate',
  ]);
  console.log(`  Found ${deals.length} deals`);
  return deals;
}

async function pullEngagements() {
  console.log('Pulling HubSpot engagements...');
  const types = ['emails', 'meetings', 'calls', 'notes'];
  const allEngagements = [];

  for (const type of types) {
    try {
      const items = await hubspotGetAll(`/crm/v3/objects/${type}`, {}, [
        'hs_timestamp', 'hs_body_preview', 'hs_email_subject',
        'hs_meeting_title', 'hs_call_title', 'hs_note_body',
        'hs_createdate',
      ]);
      for (const item of items) {
        allEngagements.push({ ...item, _type: type });
      }
      console.log(`  ${type}: ${items.length}`);
    } catch (err) {
      console.warn(`  ${type}: failed (${err.message})`);
    }
  }

  console.log(`  Total engagements: ${allEngagements.length}`);
  return allEngagements;
}

// --- Contact-to-company association ---

async function getContactCompanyAssociations(contactIds) {
  const associations = new Map();
  const batchSize = 100;

  for (let i = 0; i < contactIds.length; i += batchSize) {
    const batch = contactIds.slice(i, i + batchSize);
    try {
      const data = await hubspotGet('/crm/v3/associations/contacts/companies/batch/read', {});
      // For simpler approach: get associations per contact
      for (const id of batch) {
        try {
          const assoc = await hubspotGet(`/crm/v3/objects/contacts/${id}/associations/companies`);
          if (assoc.results?.length > 0) {
            associations.set(id, assoc.results[0].id);
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Fall back to individual lookups
    }
  }

  return associations;
}

// --- Main ---

async function main() {
  console.log('EventIQ HubSpot Sync');
  console.log('====================\n');

  // Load existing EventIQ data
  const existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  const companyIndex = buildCompanyIndex(existingData);
  console.log(`Existing EventIQ companies: ${existingData.length}\n`);

  // Pull HubSpot data
  const [hsCompanies, hsContacts, hsDeals, hsEngagements] = await Promise.all([
    flags.engagementsOnly ? Promise.resolve([]) : pullCompanies(),
    pullContacts(),
    flags.engagementsOnly ? Promise.resolve([]) : pullDeals(),
    pullEngagements(),
  ]);

  // --- Match HubSpot companies to EventIQ ---
  console.log('\n--- Matching Companies ---');
  const matchResults = { matched: 0, unmatched: 0, total: 0 };
  const hubspotToEventIQ = new Map(); // hubspotCompanyId → eventIqCompanyId

  for (const hsc of hsCompanies) {
    const name = hsc.properties?.name;
    if (!name) continue;
    matchResults.total++;

    const match = findBestMatch(name, companyIndex, 0.75);
    if (match.match) {
      hubspotToEventIQ.set(hsc.id, match.match.id);
      matchResults.matched++;

      if (!flags.engagementsOnly && !flags.dryRun) {
        // Update existing company with HubSpot data (fill empty fields only)
        const existing = existingData.find(c => c.id === match.match.id);
        if (existing) {
          const props = hsc.properties || {};
          if (props.domain && !existing.website) {
            existing.website = props.domain.startsWith('http') ? props.domain : `https://${props.domain}`;
          }
          if (props.description && !existing.desc) {
            existing.desc = props.description;
          }
          if ((props.city || props.state) && !existing.location) {
            existing.location = [props.city, props.state].filter(Boolean).join(', ');
          }
          if (props.numberofemployees && !existing.employees) {
            existing.employees = parseInt(props.numberofemployees) || 0;
          }
          if (props.linkedin_company_page && !existing.linkedinUrl) {
            existing.linkedinUrl = props.linkedin_company_page;
          }
          if (!existing.source) existing.source = [];
          if (!existing.source.includes('hubspot')) existing.source.push('hubspot');
        }
      }
    } else {
      matchResults.unmatched++;
    }
  }

  console.log(`  Matched: ${matchResults.matched}/${matchResults.total}`);
  console.log(`  Unmatched: ${matchResults.unmatched}`);

  // --- Match contacts to companies ---
  console.log('\n--- Processing Contacts ---');
  const contactsByCompany = new Map(); // eventIqCompanyId → contacts[]

  for (const contact of hsContacts) {
    const props = contact.properties || {};
    const fullName = [props.firstname, props.lastname].filter(Boolean).join(' ');
    if (!fullName) continue;

    // Try to match via company name in contact
    let eventIqCompanyId = null;
    if (props.company) {
      const match = findBestMatch(props.company, companyIndex, 0.75);
      if (match.match) eventIqCompanyId = match.match.id;
    }

    if (eventIqCompanyId) {
      if (!contactsByCompany.has(eventIqCompanyId)) {
        contactsByCompany.set(eventIqCompanyId, []);
      }
      contactsByCompany.get(eventIqCompanyId).push({
        name: fullName,
        title: props.jobtitle || '',
        email: props.email || '',
        linkedin: props.linkedin_url || '',
        phone: props.phone || '',
      });
    }
  }

  // Add contacts to existing companies
  if (!flags.engagementsOnly && !flags.dryRun) {
    let contactsAdded = 0;
    for (const [companyId, contacts] of contactsByCompany) {
      const existing = existingData.find(c => c.id === companyId);
      if (!existing) continue;

      for (const contact of contacts) {
        const normName = contact.name.toLowerCase().trim();
        const existsInContacts = existing.contacts?.some(c => c.n.toLowerCase().trim() === normName);
        const existsInLeaders = existing.leaders?.some(l => l.n.toLowerCase().trim() === normName);

        if (!existsInContacts && !existsInLeaders) {
          if (!existing.contacts) existing.contacts = [];
          existing.contacts.push({ n: contact.name, t: contact.title });
          contactsAdded++;
        }
      }
    }
    console.log(`  Added ${contactsAdded} new contacts to existing companies`);
  }

  // --- Build engagement history ---
  console.log('\n--- Processing Engagements ---');
  const engagementEntries = [];

  for (const eng of hsEngagements) {
    const props = eng.properties || {};
    const timestamp = props.hs_timestamp || props.hs_createdate;
    if (!timestamp) continue;

    let channel = 'note';
    let action = 'general';
    let summary = '';

    switch (eng._type) {
      case 'emails':
        channel = 'email';
        action = 'sent_intro';
        summary = props.hs_email_subject || props.hs_body_preview || '';
        break;
      case 'meetings':
        channel = 'meeting';
        action = 'completed';
        summary = props.hs_meeting_title || '';
        break;
      case 'calls':
        channel = 'call';
        action = 'outbound_call';
        summary = props.hs_call_title || '';
        break;
      case 'notes':
        channel = 'note';
        action = 'general';
        summary = (props.hs_note_body || '').slice(0, 200);
        break;
    }

    engagementEntries.push({
      hubspotId: eng.id,
      type: eng._type,
      channel,
      action,
      summary: summary.slice(0, 200),
      timestamp,
      // Association info would need separate API calls
    });
  }

  // --- Write outputs ---
  if (!flags.dryRun) {
    // Write company updates
    if (!flags.engagementsOnly) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(existingData, null, 2));
      console.log(`\nWritten company updates to ${DATA_FILE}`);
      await syncToSupabase(existingData);
    }

    // Write engagements
    fs.writeFileSync(ENGAGEMENTS_FILE, JSON.stringify({
      syncedAt: new Date().toISOString(),
      stats: {
        hubspotCompanies: hsCompanies.length,
        hubspotContacts: hsContacts.length,
        hubspotDeals: hsDeals.length,
        hubspotEngagements: hsEngagements.length,
        matchedCompanies: matchResults.matched,
        unmatchedCompanies: matchResults.unmatched,
      },
      engagements: engagementEntries,
      unmatchedCompanies: hsCompanies
        .filter(c => !hubspotToEventIQ.has(c.id))
        .map(c => ({
          hubspotId: c.id,
          name: c.properties?.name,
          domain: c.properties?.domain,
        })),
    }, null, 2));
    console.log(`Written engagements to ${ENGAGEMENTS_FILE}`);
  } else {
    console.log('\n[DRY RUN] No files written.');
  }

  // Summary
  console.log('\n--- Summary ---');
  console.log(`HubSpot companies: ${hsCompanies.length} (${matchResults.matched} matched)`);
  console.log(`HubSpot contacts: ${hsContacts.length}`);
  console.log(`HubSpot deals: ${hsDeals.length}`);
  console.log(`Engagements captured: ${engagementEntries.length}`);
}

main().catch(err => {
  console.error('HubSpot sync failed:', err.message);
  process.exit(1);
});
