const fs = require('fs');
const path = require('path');
const { syncToSupabase } = require('./lib/supabase-sync');

// Usage: node scripts/merge-tam-research.js scripts/tam-result-*.json
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/merge-tam-research.js <result-files...>');
  process.exit(1);
}

// Load result files
const results = [];
args.forEach(f => {
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  const arr = Array.isArray(raw) ? raw : [raw];
  console.log(`  ${path.basename(f)}: ${arr.length} entries`);
  results.push(...arr);
});
console.log(`Total entries: ${results.length}`);

// Load main data
const dataPath = path.join(__dirname, '..', 'src', 'data', 'all-companies.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

let descUpdated = 0;
let contactsAdded = 0;
let linkedinAdded = 0;
let websiteUpdated = 0;
let notFound = 0;

results.forEach(r => {
  const company = data.find(c => c.id === r.id);
  if (company === undefined || company === null) {
    notFound++;
    return;
  }

  // Update desc if we have a better one
  if (r.desc && r.desc.length > 20 && r.desc !== 'Small business lending company. Limited public information available.') {
    if (company.desc === undefined || company.desc === '' || company.desc.length < 20) {
      company.desc = r.desc;
      descUpdated++;
    }
  }

  // Add contacts if company has none
  if (r.contacts && r.contacts.length > 0) {
    if (company.contacts === undefined || company.contacts === null || company.contacts.length === 0) {
      company.contacts = r.contacts;
      contactsAdded++;
    }
  }

  // Add company LinkedIn URL
  if (r.linkedinUrl && r.linkedinUrl.length > 0) {
    if (company.linkedinUrl === undefined || company.linkedinUrl === null || company.linkedinUrl === '') {
      company.linkedinUrl = r.linkedinUrl;
      linkedinAdded++;
    }
  }

  // Update website if better
  if (r.website && r.website.length > 0) {
    if (company.website === undefined || company.website === null || company.website === '') {
      company.website = r.website;
      websiteUpdated++;
    }
  }

  // Tag as tam-researched
  if (company.source === undefined || company.source === null) {
    company.source = [];
  }
  if (company.source.indexOf('tam-researched') === -1 && r.desc && r.desc.length > 20) {
    company.source.push('tam-researched');
  }
});

console.log('');
console.log(`Descriptions updated: ${descUpdated}`);
console.log(`Contacts added: ${contactsAdded}`);
console.log(`Company LinkedIn added: ${linkedinAdded}`);
console.log(`Websites updated: ${websiteUpdated}`);
console.log(`Not found in dataset: ${notFound}`);

// Write back
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to ${dataPath}`);

// Stats
const withDesc = data.filter(c => c.desc && c.desc.length > 20);
console.log(`\nCompanies with description: ${withDesc.length} / ${data.length} (${(withDesc.length / data.length * 100).toFixed(1)}%)`);

// Sync to Supabase
syncToSupabase(data);
