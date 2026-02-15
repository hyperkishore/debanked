const fs = require('fs');
const data = require('../src/data/all-companies.json');

// Find TAM companies with no/empty description
const empty = data.filter(c =>
  c.type === 'TAM' && (c.desc === undefined || c.desc === '' || c.desc.length < 20)
);

console.log('Empty TAM companies:', empty.length);

// Extract minimal info for research
const forResearch = empty.map(c => ({
  id: c.id,
  name: c.name,
  website: c.website || '',
  location: c.location || '',
  employees: c.employees || 0
}));

// Split into 5 batches
const batchSize = Math.ceil(forResearch.length / 5);
for (let i = 0; i < 5; i++) {
  const batch = forResearch.slice(i * batchSize, (i + 1) * batchSize);
  if (batch.length === 0) continue;
  const outPath = `scripts/tam-batch-${i + 1}.json`;
  fs.writeFileSync(outPath, JSON.stringify(batch, null, 2));
  console.log(`Batch ${i + 1}: ${batch.length} companies → ${outPath}`);
}
