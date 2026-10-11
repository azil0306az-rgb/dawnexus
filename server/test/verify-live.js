async function testLive() {
  const res = await fetch('https://www.dawnexus.in/');
  console.log('Homepage Status:', res.status);
  const html = await res.text();
  console.log('Includes WebP D-symbol:', html.includes('dawnexus-d-symbol.webp'));
  console.log('Includes non-blocking fonts:', html.includes('media="print"'));
  console.log('Canonical tag:', html.match(/<link rel="canonical"[^>]+>/)?.[0]);
  
  const assetRes = await fetch('https://www.dawnexus.in/brand/dawnexus-d-symbol.webp');
  console.log('WebP Asset Status:', assetRes.status, 'Content-Type:', assetRes.headers.get('content-type'), 'Cache-Control:', assetRes.headers.get('cache-control'));

  const sitemapRes = await fetch('https://www.dawnexus.in/sitemap.xml');
  console.log('Sitemap Status:', sitemapRes.status, 'Content-Type:', sitemapRes.headers.get('content-type'));

  const robotsRes = await fetch('https://www.dawnexus.in/robots.txt');
  console.log('Robots Status:', robotsRes.status);
}
testLive();

