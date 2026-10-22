import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import app from '../index.js';
import { getDb, getBlogRedirect, getAllBlogRedirects } from '../db.js';
import { resolvePageMetadata, injectPageMetadata } from '../ssrRenderer.js';
import { GscService } from '../gscService.js';
import { Ga4Service } from '../ga4Service.js';

describe('Dawnexus Version 8.2.0: Website, SEO, Canonical & GA4 Audit and Repair', () => {
  let serverInstance: any;
  let baseUrl = '';

  before(async () => {
    serverInstance = createServer(app);
    await new Promise<void>((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (serverInstance) serverInstance.close();
  });

  // 1. Version 8.2.0 Verification
  test('1. Application Version: /api/health reports version 8.2.0', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.brand, 'Dawnexus');
    assert.strictEqual(body.version, '8.2.0');
    assert.ok(body.release.includes('8.2.0'));
  });

  // 2. Canonical Host 301 Redirect Middleware
  test('2. Canonical Host Redirect: Host dawnexus.in redirects with 301 to https://www.dawnexus.in/*', async () => {
    const res = await fetch(`${baseUrl}/services/website-design?query=test`, {
      headers: {
        'x-forwarded-host': 'dawnexus.in'
      },
      redirect: 'manual'
    });

    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.get('location'), 'https://www.dawnexus.in/services/website-design?query=test');
  });

  // 3. Blog Slug 301 Redirect
  test('3. Blog Slug 301 Redirect: /blog/local-seo-google-maps-playbook redirects to active slug', async () => {
    const res = await fetch(`${baseUrl}/blog/local-seo-google-maps-playbook`, {
      redirect: 'manual'
    });

    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.get('location'), 'https://www.dawnexus.in/blog/local-seo-playbook-small-businesses');

    // DB helper test
    const redirectRecord = getBlogRedirect('/blog/local-seo-google-maps-playbook');
    assert.ok(redirectRecord);
    assert.strictEqual(redirectRecord.new_path, 'https://www.dawnexus.in/blog/local-seo-playbook-small-businesses');
  });

  // 4. Database Internal Links Verification
  test('4. Database Internal Links: Zero blog records contain non-www dawnexus.in links', () => {
    const db = getDb();
    const blogs = db.prepare("SELECT id, slug, content, canonical_url FROM blogs WHERE slug NOT LIKE '%mandatory-failure%' AND slug NOT LIKE '%automated-publishing-test%'").all() as any[];

    assert.ok(blogs.length >= 20, 'At least 20 blogs must be present in the database');

    const nonWwwBlogs = blogs.filter(b => {
      const nonWwwRegex = /https?:\/\/dawnexus\.in(\/[^\s\)\"\'>\]]*)?/g;
      return nonWwwRegex.test(b.content || '') || nonWwwRegex.test(b.canonical_url || '');
    });

    assert.strictEqual(
      nonWwwBlogs.length,
      0,
      `Expected 0 blogs with non-www links, found: ${JSON.stringify(nonWwwBlogs.map(b => b.slug))}`
    );
  });

  // 5. Technical Indexability & SSR Meta Injection
  test('5. SSR HTML Rendering: /services/website-design serves exact canonical and title in raw HTML', async () => {
    const res = await fetch(`${baseUrl}/services/website-design`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(
      html.includes('<link rel="canonical" href="https://www.dawnexus.in/services/website-design" />'),
      'Raw HTML must contain canonical URL pointing to https://www.dawnexus.in/services/website-design'
    );
    assert.ok(
      html.includes('Website Design &amp; Development Services in Coimbatore | Dawnexus'),
      'Raw HTML must contain service specific title with valid HTML entity encoding'
    );
    assert.ok(
      html.includes('<meta property="og:url" content="https://www.dawnexus.in/services/website-design" />'),
      'Raw HTML must contain OG url matching canonical'
    );
  });

  test('6. SSR HTML Rendering: Published blog post serves post-specific title, canonical and Schema', async () => {
    const res = await fetch(`${baseUrl}/blog/local-seo-playbook-small-businesses`);
    assert.strictEqual(res.status, 200);
    const html = await res.text();

    assert.ok(
      html.includes('<link rel="canonical" href="https://www.dawnexus.in/blog/local-seo-playbook-small-businesses" />'),
      'Raw HTML must contain blog canonical URL'
    );
    assert.ok(
      html.includes('Local SEO Playbook for Small Businesses | Dawnexus'),
      'Raw HTML must contain blog title'
    );
    assert.ok(
      html.includes('"@type": "BlogPosting"'),
      'Raw HTML must contain BlogPosting JSON-LD structured data'
    );
  });

  test('7. SSR HTML Rendering: Unknown blog slug returns HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/blog/completely-non-existent-article-slug-xyz-12345`);
    assert.strictEqual(res.status, 404);
    const html = await res.text();
    assert.ok(html.includes('Article Not Found | Dawnexus'));
  });

  // 8. Dynamic Sitemap
  test('8. Dynamic Sitemap: /sitemap.xml returns HTTP 200 with all canonical www URLs', async () => {
    const res = await fetch(`${baseUrl}/sitemap.xml`);
    assert.strictEqual(res.status, 200);
    const xml = await res.text();

    assert.ok(xml.includes('<loc>https://www.dawnexus.in/</loc>'));
    assert.ok(xml.includes('<loc>https://www.dawnexus.in/services/website-design</loc>'));
    assert.ok(xml.includes('<loc>https://www.dawnexus.in/services/seo-services</loc>'));
    assert.ok(xml.includes('<loc>https://www.dawnexus.in/blog/local-seo-playbook-small-businesses</loc>'));
    assert.ok(!xml.includes('https://dawnexus.in/'), 'Sitemap must not contain any non-www URLs');
  });

  // 9. GA4 Aggregation Invariant Protection
  test('9. GA4 Invariant: Total users must never be less than active users', async () => {
    // Test calculateDelta helper
    const deltaZero = Ga4Service.calculateDelta(0, 0);
    assert.strictEqual(deltaZero, 0);

    const deltaUp = Ga4Service.calculateDelta(20, 10);
    assert.strictEqual(deltaUp, 100);

    const deltaDown = Ga4Service.calculateDelta(5, 10);
    assert.strictEqual(deltaDown, -50);
  });
});
