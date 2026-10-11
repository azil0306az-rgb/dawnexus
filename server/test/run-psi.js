async function runPsi(strategy) {
  const url = 'https://dawnexus.in/';
  console.log(`Querying PageSpeed Insights for ${strategy}...`);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=PERFORMANCE`;
  const res = await fetch(endpoint);
  if (!res.ok) {
    console.error('PSI Error:', res.status, await res.text());
    return;
  }
  const data = await res.json();
  const perf = data.lighthouseResult.categories.performance;
  const audits = data.lighthouseResult.audits;
  console.log(`=== ${strategy.toUpperCase()} BASELINE ===`);
  console.log('Score:', Math.round(perf.score * 100));
  console.log('FCP:', audits['first-contentful-paint']?.displayValue);
  console.log('LCP:', audits['largest-contentful-paint']?.displayValue);
  console.log('TBT:', audits['total-blocking-time']?.displayValue);
  console.log('CLS:', audits['cumulative-layout-shift']?.displayValue);
  console.log('Speed Index:', audits['speed-index']?.displayValue);
  console.log('LCP Element:', audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet || 'N/A');
  console.log('Render Blocking Savings:', audits['render-blocking-resources']?.details?.overallSavingsMs, 'ms');
  console.log('Render Blocking Resources:', audits['render-blocking-resources']?.details?.items?.map(i => `${i.url} (${i.wastedMs}ms)`));
  console.log('Server Response Time:', audits['server-response-time']?.displayValue);
  console.log('Unused JS Savings:', audits['unused-javascript']?.details?.overallSavingsMs, 'ms');
  console.log('Unused JS Items:', audits['unused-javascript']?.details?.items?.map(i => `${i.url} (${Math.round(i.wastedBytes/1024)}KB wasted)`));
  console.log('Modern Image Formats Savings:', audits['modern-image-formats']?.details?.overallSavingsMs, 'ms');
  console.log('Optimized Images:', audits['uses-optimized-images']?.details?.overallSavingsMs, 'ms');
  console.log('Font Display:', audits['font-display']?.details?.items?.map(i => i.url));
  console.log('Critical Request Chains:', audits['critical-request-chains']?.details?.chains ? Object.keys(audits['critical-request-chains'].details.chains).length : 0);
}

async function main() {
  await runPsi('mobile');
  console.log('\n----------------------------------------\n');
  await runPsi('desktop');
}

main();
