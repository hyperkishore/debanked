const data = require('../src/data/companies.json');
console.log('Total companies:', data.length);
console.log('');

// Check last 5 companies
console.log('Last 5 companies:');
data.slice(-5).forEach(c => {
  console.log(`  #${c.id} ${c.name} (${c.type}) - contacts: ${c.contacts?.length || 0}, desc: ${c.desc?.length || 0} chars`);
});

// Check first new company
console.log('\nFirst new company (#65):');
const c65 = data.find(c => c.id === 65);
if (c65) {
  console.log(`  Name: ${c65.name}`);
  console.log(`  Type: ${c65.type}`);
  console.log(`  Contacts: ${JSON.stringify(c65.contacts)}`);
  console.log(`  Desc: ${c65.desc.substring(0, 100)}...`);
  console.log(`  Ice: ${c65.ice.substring(0, 80)}...`);
  console.log(`  Ask: ${c65.ask}`);
  console.log(`  Has icebreakers: ${Array.isArray(c65.icebreakers)}, count: ${c65.icebreakers?.length}`);
}

// Check for missing data
let noDesc = 0, noContacts = 0, noIce = 0, noTp = 0, noAsk = 0;
data.forEach(c => {
  if (c.desc === '' || c.desc === undefined) noDesc++;
  if (c.contacts === undefined || c.contacts.length === 0) noContacts++;
  if ((c.ice === '' || c.ice === undefined) && (c.icebreakers === undefined || c.icebreakers.length === 0)) noIce++;
  if (c.tp === undefined || c.tp.length === 0) noTp++;
  if (c.ask === '' || c.ask === undefined) noAsk++;
});
console.log('\nData quality:');
console.log(`  Missing desc: ${noDesc}`);
console.log(`  Missing contacts: ${noContacts}`);
console.log(`  No icebreaker: ${noIce}`);
console.log(`  No talking points: ${noTp}`);
console.log(`  No ask: ${noAsk}`);

// Type breakdown
console.log('\nType breakdown:');
console.log(`  SQO: ${data.filter(c => c.type === 'SQO').length}`);
console.log(`  Client: ${data.filter(c => c.type === 'Client').length}`);
console.log(`  ICP: ${data.filter(c => c.type === 'ICP').length}`);
