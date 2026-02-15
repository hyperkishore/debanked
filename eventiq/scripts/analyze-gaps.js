const data = require('../src/data/all-companies.json');
const total = data.length;
const withLeaders = data.filter(c => c.leaders && c.leaders.length > 0);
const withDesc = data.filter(c => c.desc && c.desc.length > 20);
const withNews = data.filter(c => c.news && c.news.length > 0);
const withIce = data.filter(c => c.ice && c.ice.length > 10);
const withTp = data.filter(c => c.tp && c.tp.length > 0);
const withAsk = data.filter(c => c.ask && c.ask.length > 10);
const withWebsite = data.filter(c => c.website && c.website.length > 0);

// By type
const byType = {};
data.forEach(c => {
  const t = c.type || 'Unknown';
  if (byType[t] === undefined) byType[t] = {total: 0, researched: 0, withLeaders: 0, withNews: 0};
  byType[t].total++;
  if (c.desc && c.desc.length > 20) byType[t].researched++;
  if (c.leaders && c.leaders.length > 0) byType[t].withLeaders++;
  if (c.news && c.news.length > 0) byType[t].withNews++;
});

// LinkedIn gap
const allLeaders = withLeaders.flatMap(c => c.leaders);
const missingLi = allLeaders.filter(l => l.li === undefined || l.li === null || l.li.length === 0);

// Unresearched ICP
const unresearchedICP = data.filter(c => c.type === 'ICP' && (c.desc === undefined || c.desc === '' || c.desc.length < 20));

console.log('=== DATASET OVERVIEW ===');
console.log('Total companies:', total);
console.log('With description (>20 chars):', withDesc.length, '(' + (withDesc.length/total*100).toFixed(1) + '%)');
console.log('With leaders:', withLeaders.length);
console.log('With news:', withNews.length);
console.log('With icebreakers:', withIce.length);
console.log('With talking points:', withTp.length);
console.log('With ask:', withAsk.length);
console.log('With website:', withWebsite.length);
console.log('');
console.log('=== BY TYPE ===');
Object.entries(byType).sort((a,b) => b[1].total - a[1].total).forEach(([t, s]) => {
  console.log(t + ': ' + s.total + ' total, ' + s.researched + ' researched, ' + s.withLeaders + ' leaders, ' + s.withNews + ' news');
});
console.log('');
console.log('=== LINKEDIN GAP ===');
console.log('Total leaders:', allLeaders.length);
console.log('Missing LinkedIn:', missingLi.length);
if (missingLi.length > 0) {
  console.log('Sample missing:', missingLi.slice(0, 10).map(l => l.n).join(', '));
}
console.log('');
console.log('=== UNRESEARCHED ICP ===');
console.log('Count:', unresearchedICP.length);
if (unresearchedICP.length > 0) {
  console.log('Names:', unresearchedICP.slice(0, 20).map(c => c.name).join(', '));
}

// TAM without any data
const emptyTAM = data.filter(c => c.type === 'TAM' && (c.desc === undefined || c.desc === '' || c.desc.length < 20));
console.log('');
console.log('=== EMPTY TAM ===');
console.log('TAM without description:', emptyTAM.length, 'of', byType['TAM'] ? byType['TAM'].total : 0);
