import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'node:fs';

async function runLighthouse(url, isMobile = true) {
  console.log(`Starting Lighthouse for ${url} (${isMobile ? 'Mobile' : 'Desktop'})...`);
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  const flags = {
    logLevel: 'error',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance']
  };

  const config = isMobile
    ? undefined // default is mobile
    : {
        extends: 'lighthouse:default',
        settings: {
          formFactor: 'desktop',
          screenEmulation: {
            mobile: false,
            width: 1350,
            height: 940,
            deviceScaleFactor: 1,
            disabled: false
          },
          throttling: {
            rttMs: 40,
            throughputKbps: 10240,
            cpuSlowdownMultiplier: 1
          }
        }
      };

  const runnerResult = await lighthouse(url, flags, config);
  await chrome.kill();

  const lhr = runnerResult.lhr;
  const perf = lhr.categories.performance;
  const audits = lhr.audits;

  console.log(`\n========================================`);
  console.log(`  ${isMobile ? 'MOBILE' : 'DESKTOP'} AUDIT RESULTS`);
  console.log(`========================================`);
  console.log(`Performance Score: ${Math.round(perf.score * 100)}`);
  console.log(`FCP: ${audits['first-contentful-paint']?.displayValue} (raw: ${audits['first-contentful-paint']?.numericValue?.toFixed(0)}ms)`);
  console.log(`LCP: ${audits['largest-contentful-paint']?.displayValue} (raw: ${audits['largest-contentful-paint']?.numericValue?.toFixed(0)}ms)`);
  console.log(`TBT: ${audits['total-blocking-time']?.displayValue} (raw: ${audits['total-blocking-time']?.numericValue?.toFixed(0)}ms)`);
  console.log(`CLS: ${audits['cumulative-layout-shift']?.displayValue}`);
  console.log(`Speed Index: ${audits['speed-index']?.displayValue}`);
  console.log(`LCP Element: ${audits['largest-contentful-paint-element']?.details?.items?.[0]?.node?.snippet || audits['largest-contentful-paint-element']?.displayValue}`);

  console.log(`\nRender-blocking resources (Savings: ${audits['render-blocking-resources']?.details?.overallSavingsMs || 0}ms):`);
  audits['render-blocking-resources']?.details?.items?.forEach(item => {
    console.log(` - ${item.url} (${item.wastedMs}ms)`);
  });

  console.log(`\nUnused JavaScript (Savings: ${audits['unused-javascript']?.details?.overallSavingsMs || 0}ms, Wasted: ${Math.round((audits['unused-javascript']?.details?.overallSavingsBytes || 0)/1024)}KB):`);
  audits['unused-javascript']?.details?.items?.forEach(item => {
    console.log(` - ${item.url} (${Math.round(item.wastedBytes/1024)}KB wasted)`);
  });

  console.log(`\nModern Image Formats (Savings: ${audits['modern-image-formats']?.details?.overallSavingsMs || 0}ms):`);
  audits['modern-image-formats']?.details?.items?.forEach(item => {
    console.log(` - ${item.url} (${Math.round((item.wastedBytes || 0)/1024)}KB wasted)`);
  });

  console.log(`\nServer Response Time: ${audits['server-response-time']?.displayValue}`);
  return {
    score: Math.round(perf.score * 100),
    fcp: audits['first-contentful-paint']?.displayValue,
    lcp: audits['largest-contentful-paint']?.displayValue,
    tbt: audits['total-blocking-time']?.displayValue,
    cls: audits['cumulative-layout-shift']?.displayValue,
    speedIndex: audits['speed-index']?.displayValue
  };
}

async function main() {
  const url = process.argv[2] || 'https://dawnexus.in/';
  console.log(`Running baseline audits for: ${url}`);
  const mobile = await runLighthouse(url, true);
  const desktop = await runLighthouse(url, false);
  fs.writeFileSync('server/test/baseline-report.json', JSON.stringify({ mobile, desktop, timestamp: new Date().toISOString() }, null, 2));
}

main().catch(err => {
  console.error('Lighthouse run error:', err);
  process.exit(1);
});
