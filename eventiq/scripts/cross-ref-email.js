#!/usr/bin/env node
/**
 * cross-ref-email.js
 *
 * Cross-references EventIQ company domains against the Email Contact Extractor
 * SQLite DB to discover outreach history with each company.
 *
 * Usage: node scripts/cross-ref-email.js
 *
 * Reads: src/data/all-companies.json
 * Reads: ~/Desktop/Claude-experiments/Email-contact-extraction/data/contacts.db
 * Outputs: scripts/cross-ref-result.json
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const COMPANIES_PATH = path.join(__dirname, '..', 'src', 'data', 'all-companies.json');
const DB_PATH = path.join(
  process.env.HOME,
  'Desktop', 'Claude-experiments', 'Email-contact-extraction', 'data', 'contacts.db'
);
const OUTPUT_PATH = path.join(__dirname, 'cross-ref-result.json');

// Primary person ID for kishore@hyperverge.co in the email DB
const PRIMARY_PERSON_ID = 1;

function extractDomain(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function classifyRelationship(outbound, inbound) {
  if (outbound > 0 && inbound > 0) return 'engaged';
  if (outbound > 0) return 'contacted';
  if (inbound > 0) return 'responded';
  return 'no_history';
}

function run() {
  console.log('Loading companies...');
  const companies = JSON.parse(fs.readFileSync(COMPANIES_PATH, 'utf-8'));
  console.log(`  ${companies.length} companies loaded`);

  console.log('Opening email DB...');
  const db = new DatabaseSync(DB_PATH, { readOnly: true });

  // Prepare queries
  const contactsByDomain = db.prepare(`
    SELECT c.email, c.name, c.title, c.company, c.person_id
    FROM contacts c
    WHERE c.email LIKE ?
  `);

  const relationshipForContact = db.prepare(`
    SELECT rf.outbound_count, rf.inbound_count,
           rf.outbound_direct_count, rf.inbound_direct_count,
           rf.last_outbound_at, rf.last_inbound_at,
           rf.first_seen_at, rf.total_message_count,
           rs.outbound_score, rs.inbound_score, rs.bulk_score
    FROM relationship_facts rf
    LEFT JOIN relationship_scores rs
      ON rs.primary_person_id = rf.primary_person_id
      AND rs.contact_person_id = rf.contact_person_id
    WHERE rf.primary_person_id = ? AND rf.contact_person_id = ?
  `);

  const results = [];
  let matched = 0;
  let engaged = 0;
  let contacted = 0;
  let responded = 0;
  let noHistory = 0;

  for (const company of companies) {
    const domain = extractDomain(company.website);
    if (!domain) {
      results.push({
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        domain: null,
        status: 'no_website',
        totalOutbound: 0,
        totalInbound: 0,
        lastActivityDate: null,
        matchedContacts: [],
      });
      noHistory++;
      continue;
    }

    // Find all contacts with emails matching this domain
    const domainContacts = contactsByDomain.all(`%@${domain}`);

    if (domainContacts.length === 0) {
      results.push({
        companyId: company.id,
        companyName: company.name,
        companyType: company.type,
        domain,
        status: 'no_history',
        totalOutbound: 0,
        totalInbound: 0,
        lastActivityDate: null,
        matchedContacts: [],
      });
      noHistory++;
      continue;
    }

    matched++;
    let totalOutbound = 0;
    let totalInbound = 0;
    let lastActivity = null;
    const matchedContacts = [];

    for (const contact of domainContacts) {
      if (!contact.person_id) continue;

      const rel = relationshipForContact.get(PRIMARY_PERSON_ID, contact.person_id);
      const outbound = rel?.outbound_count || 0;
      const inbound = rel?.inbound_count || 0;
      totalOutbound += outbound;
      totalInbound += inbound;

      // Track latest activity
      const dates = [rel?.last_outbound_at, rel?.last_inbound_at].filter(Boolean);
      for (const d of dates) {
        if (!lastActivity || d > lastActivity) lastActivity = d;
      }

      matchedContacts.push({
        email: contact.email,
        name: contact.name || '',
        title: contact.title || '',
        outbound,
        inbound,
        outboundScore: rel?.outbound_score || 0,
        inboundScore: rel?.inbound_score || 0,
      });
    }

    const status = classifyRelationship(totalOutbound, totalInbound);
    if (status === 'engaged') engaged++;
    else if (status === 'contacted') contacted++;
    else if (status === 'responded') responded++;
    else noHistory++;

    results.push({
      companyId: company.id,
      companyName: company.name,
      companyType: company.type,
      domain,
      status,
      totalOutbound,
      totalInbound,
      lastActivityDate: lastActivity,
      matchedContacts: matchedContacts
        .sort((a, b) => (b.outbound + b.inbound) - (a.outbound + a.inbound))
        .slice(0, 10), // Top 10 contacts per company
    });
  }

  db.close();

  // Write output
  const output = {
    generatedAt: new Date().toISOString(),
    primaryAccount: 'kishore@hyperverge.co',
    summary: {
      totalCompanies: companies.length,
      withWebsite: companies.filter(c => c.website).length,
      domainMatched: matched,
      engaged,
      contacted,
      responded,
      noHistory,
    },
    companies: results,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${OUTPUT_PATH}`);
  console.log('\nSummary:');
  console.log(`  Total companies: ${companies.length}`);
  console.log(`  Domain matched: ${matched}`);
  console.log(`  Engaged (bidirectional): ${engaged}`);
  console.log(`  Contacted (outbound only): ${contacted}`);
  console.log(`  Responded (inbound only): ${responded}`);
  console.log(`  No history: ${noHistory}`);
}

run();
