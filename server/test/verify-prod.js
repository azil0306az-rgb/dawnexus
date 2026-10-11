async function verifyProduction() {
  console.log('=== VERIFYING PRODUCTION ENDPOINTS: https://dawnexus.in ===\n');

  // 1. Homepage
  const homeRes = await fetch('https://dawnexus.in/');
  console.log('1. Homepage Status:', homeRes.status);
  const homeHtml = await homeRes.text();
  const canonicalMatch = homeHtml.match(/<link rel="canonical" href="([^"]+)"/);
  const ogUrlMatch = homeHtml.match(/<meta property="og:url" content="([^"]+)"/);
  const ogImgMatch = homeHtml.match(/<meta property="og:image" content="([^"]+)"/);
  console.log('   Canonical Link:', canonicalMatch ? canonicalMatch[1] : 'NOT FOUND');
  console.log('   OG URL:        ', ogUrlMatch ? ogUrlMatch[1] : 'NOT FOUND');
  console.log('   OG Image:      ', ogImgMatch ? ogImgMatch[1] : 'NOT FOUND');

  // 2. Sitemap
  const sitemapRes = await fetch('https://dawnexus.in/sitemap.xml');
  console.log('\n2. Sitemap Status:', sitemapRes.status, 'Content-Type:', sitemapRes.headers.get('content-type'));
  const sitemapXml = await sitemapRes.text();
  console.log('   Sitemap Content:\n' + sitemapXml.trim());

  // 3. Robots.txt
  const robotsRes = await fetch('https://dawnexus.in/robots.txt');
  console.log('\n3. Robots.txt Status:', robotsRes.status, 'Content-Type:', robotsRes.headers.get('content-type'));
  const robotsTxt = await robotsRes.text();
  console.log('   Robots Content:\n' + robotsTxt.trim());

  // 4. Check for any remaining old domain mentions
  const hasOldDomain = homeHtml.includes('dawnexus.com') || sitemapXml.includes('dawnexus.com') || robotsTxt.includes('dawnexus.com');
  console.log('\n4. Contains old domain dawnexus.com:', hasOldDomain ? 'YES (ISSUE)' : 'NO (CLEAN)');
}

verifyProduction().catch(console.error);
