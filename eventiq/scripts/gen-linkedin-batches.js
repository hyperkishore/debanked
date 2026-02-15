const fs = require('fs');
const data = require('../src/data/all-companies.json');

// Find all leaders missing LinkedIn URLs
const missing = [];
data.forEach(c => {
  if (c.leaders) {
    c.leaders.forEach(l => {
      if (l.li === undefined || l.li === null || l.li === '') {
        missing.push({
          companyId: c.id,
          companyName: c.name,
          leaderName: l.n,
          leaderTitle: l.t,
          leaderBg: l.bg || ''
        });
      }
    });
  }
});

console.log('Total leaders missing LinkedIn:', missing.length);

// Split into 5 batches
const batchSize = Math.ceil(missing.length / 5);
for (let i = 0; i < 5; i++) {
  const batch = missing.slice(i * batchSize, (i + 1) * batchSize);
  if (batch.length === 0) continue;
  const outPath = `scripts/linkedin-batch-${i + 1}.json`;
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log(`Batch ${i + 1}: ${batch.length} leaders → ${outPath}`);
}
