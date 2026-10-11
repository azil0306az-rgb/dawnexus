async function verify() {
  const urls = [
    'https://dawnexus.in/',
    'https://dawnexus.in/sitemap.xml',
    'https://dawnexus.in/blog',
    'https://dawnexus.in/api/blogs',
    'https://dawnexus.in/api/blogs/website-design-cost-coimbatore',
    'https://dawnexus.in/api/cron/publish'
  ];

  console.log('--- LIVE PRODUCTION VERIFICATION ---');
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const ct = res.headers.get('content-type') || 'none';
      console.log(`[${res.status}] ${url} (${ct})`);
      if (url.endsWith('sitemap.xml')) {
        const text = await res.text();
        const hasCoimbatore = text.includes('website-design-cost-coimbatore');
        const hasServices = text.includes('services/website-design');
        console.log(` -> Sitemap valid: ${text.startsWith('<?xml')} | Has service: ${hasServices} | Has article: ${hasCoimbatore}`);
      } else if (url.includes('/api/blogs/website-design')) {
        const json = await res.json();
        console.log(` -> Article Title: "${json.blog?.title}" | Status: ${json.blog?.status}`);
      } else if (url.includes('/api/blogs')) {
        const json = await res.json();
        console.log(` -> Public Blog Count: ${json.total} articles`);
      } else if (url.includes('/api/cron/publish')) {
        const json = await res.json();
        console.log(` -> Cron result: success=${json.success}, published=${json.publishedCount}`);
      }
    } catch (e) {
      console.error(`[ERROR] ${url}:`, e.message);
    }
  }
}

verify();
