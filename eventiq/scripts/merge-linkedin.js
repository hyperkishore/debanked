const fs = require('fs');
const path = require('path');

// Usage: node scripts/merge-linkedin.js scripts/linkedin-result-*.json
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/merge-linkedin.js <result-files...>');
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

let added = 0;
let alreadyHad = 0;
let notFound = 0;
let emptyResult = 0;

results.forEach(r => {
  if (r.li === undefined || r.li === null || r.li === '') {
    emptyResult++;
    return;
  }

  const company = data.find(c => c.id === r.companyId);
  if (company === undefined || company === null) {
    notFound++;
    return;
  }

  if (company.leaders === undefined || company.leaders === null) {
    notFound++;
    return;
  }

  const leader = company.leaders.find(l => l.n === r.leaderName);
  if (leader === undefined || leader === null) {
    notFound++;
    return;
  }

  if (leader.li && leader.li.length > 0) {
    alreadyHad++;
    return;
  }

  leader.li = r.li;
  added++;
});

console.log('');
console.log(`LinkedIn URLs added: ${added}`);
console.log(`Already had URL: ${alreadyHad}`);
console.log(`No match found: ${notFound}`);
console.log(`Empty result (not found): ${emptyResult}`);

// Write back
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to ${dataPath}`);

// Stats
const allLeaders = data.filter(c => c.leaders && c.leaders.length > 0).flatMap(c => c.leaders);
const withLi = allLeaders.filter(l => l.li && l.li.length > 0);
console.log(`Total leaders: ${allLeaders.length}`);
console.log(`With LinkedIn: ${withLi.length} (${(withLi.length / allLeaders.length * 100).toFixed(1)}%)`);
