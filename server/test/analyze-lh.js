import fs from 'node:fs';

const lhr = JSON.parse(fs.readFileSync('lh-mobile.json', 'utf8'));
const a = lhr.audits;

console.log('--- Network Requests ---');
a['network-requests']?.details?.items?.forEach(r => {
  const name = r.url.length > 60 ? '...' + r.url.slice(-50) : r.url;
  console.log(`[${r.statusCode}] ${r.mimeType} ${(r.resourceSize / 1024).toFixed(1)}KB (${(r.totalBytes / 1024).toFixed(1)}KB wire) - ${name}`);
});

console.log('\n--- Critical Request Chains ---');
console.log(JSON.stringify(a['critical-request-chains']?.details?.chains, null, 2));

console.log('\n--- Bootup Time / Script Execution ---');
a['bootup-time']?.details?.items?.forEach(b => {
  const tot = b.total ? b.total.toFixed(0) : '?';
  const evalMs = b.scriptEval ? b.scriptEval.toFixed(0) : '?';
  console.log(`${b.url} - Total: ${tot}ms, Script eval: ${evalMs}ms`);
});

console.log('\n--- Main Thread Breakdown ---');
a['mainthread-work-breakdown']?.details?.items?.forEach(m => {
  console.log(`${m.groupLabel}: ${m.duration.toFixed(0)}ms`);
});

console.log('\n--- Render Blocking ---');
console.log(JSON.stringify(a['render-blocking-resources']?.details?.items, null, 2));

console.log('\n--- Fonts ---');
console.log(JSON.stringify(a['font-display']?.details?.items, null, 2));
