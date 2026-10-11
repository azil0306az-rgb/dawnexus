async function verifyProduction() {
  console.log('=== VERIFYING DAWNEXUS V2 PRODUCTION: https://dawnexus.in ===\n');

  // 1. Homepage & Admin Portal Button Check
  const homeRes = await fetch('https://dawnexus.in/');
  console.log('1. Homepage Status:', homeRes.status);
  const homeHtml = await homeRes.text();
  const hasAdminPortalButton = homeHtml.includes('Admin Portal') && homeHtml.includes('title="Administrator Portal"');
  console.log('   Admin Portal button removed from footer:', !hasAdminPortalButton ? 'YES (PASSED)' : 'NO (FAILED)');

  // 2. Service Pages Direct URL Checks
  const serviceUrls = [
    { name: 'Website Design', path: '/services/website-design' },
    { name: 'SEO Services', path: '/services/seo-services' },
    { name: 'AI Video Creation', path: '/services/ai-video-creation' },
    { name: 'Digital Marketing', path: '/services/digital-marketing' }
  ];

  console.log('\n2. Testing 4 Dedicated Service Pages:');
  for (const s of serviceUrls) {
    const res = await fetch(`https://dawnexus.in${s.path}`);
    const html = await res.text();
    console.log(`   - ${s.name} (${s.path}): Status ${res.status}`);
  }

  // 3. Sitemap Verification
  const sitemapRes = await fetch('https://dawnexus.in/sitemap.xml');
  console.log('\n3. Sitemap Status:', sitemapRes.status, 'Content-Type:', sitemapRes.headers.get('content-type'));
  const sitemapXml = await sitemapRes.text();
  console.log('   Sitemap Content:\n' + sitemapXml.trim());

  // 4. Robots.txt
  const robotsRes = await fetch('https://dawnexus.in/robots.txt');
  console.log('\n4. Robots.txt Status:', robotsRes.status);
  const robotsTxt = await robotsRes.text();
  console.log('   Robots Content:\n' + robotsTxt.trim());

  // 5. Admin Protected Portal Check
  const adminRes = await fetch('https://dawnexus.in/admin');
  console.log('\n5. Admin Portal Protected Route Status:', adminRes.status);
}

verifyProduction().catch(console.error);
