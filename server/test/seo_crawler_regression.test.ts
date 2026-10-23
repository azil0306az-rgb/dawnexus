import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getBlogById, getPublishedBlogsForSitemap } from '../db.js';
import { validateJsonLdStructure } from '../jsonLdService.js';

let testServer: http.Server;
let baseUrl: string;

before(async () => {
  await new Promise<void>((resolve) => {
    testServer = app.listen(0, '127.0.0.1', () => {
      const address = testServer.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise<void>((resolve) => {
    testServer.close(() => resolve());
  });
});

test('SEO & Crawler Suite: Robots, Sitemap & AI Discovery', async () => {
  // 1. robots.txt
  const robotsRes = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robotsRes.status, 200);
  const robotsType = robotsRes.headers.get('content-type') || '';
  assert.ok(robotsType.includes('text/plain'), 'robots.txt should be text/plain');
  const robotsText = await robotsRes.text();
  assert.ok(robotsText.includes('User-agent: *'), 'Must allow crawlers');
  assert.ok(robotsText.includes('Disallow: /admin'), 'Must disallow admin area');
  assert.ok(robotsText.includes('Sitemap: https://www.dawnexus.in/sitemap.xml'), 'Must declare sitemap location');

  // 2. sitemap.xml
  const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemapRes.status, 200);
  const sitemapType = sitemapRes.headers.get('content-type') || '';
  assert.ok(sitemapType.includes('xml'), 'sitemap should be xml');
  const sitemapText = await sitemapRes.text();
  assert.ok(sitemapText.includes('<urlset'), 'Must be valid urlset XML');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/'), 'Must contain homepage');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/services/website-design'), 'Must contain website design');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/services/seo-services'), 'Must contain seo services');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/services/ai-video-creation'), 'Must contain ai video');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/services/digital-marketing'), 'Must contain digital marketing');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/website-cost-calculator'), 'Must contain cost calculator');
  assert.ok(sitemapText.includes('https://www.dawnexus.in/blog'), 'Must contain blog hub');

  // 3. llms.txt (AI crawler discovery standard)
  const llmsRes = await fetch(`${baseUrl}/llms.txt`);
  assert.equal(llmsRes.status, 200);
  const llmsType = llmsRes.headers.get('content-type') || '';
  assert.ok(llmsType.includes('markdown') || llmsType.includes('text/plain'), 'llms.txt should be markdown/text');
  const llmsText = await llmsRes.text();
  assert.ok(llmsText.startsWith('# Dawnexus'), 'llms.txt must start with # Dawnexus');
  assert.ok(!llmsText.includes('<!DOCTYPE html>'), 'llms.txt must not return HTML SPA page');
  assert.ok(llmsText.includes('https://www.dawnexus.in/services/website-design'), 'Must reference services');

  // 4. llms-full.txt
  const llmsFullRes = await fetch(`${baseUrl}/llms-full.txt`);
  assert.equal(llmsFullRes.status, 200);
  const llmsFullText = await llmsFullRes.text();
  assert.ok(llmsFullText.startsWith('# Dawnexus'), 'llms-full.txt must start with # Dawnexus');
});

test('SEO & Crawler Suite: Heading Hierarchy, Metadata & Structured Data across Public Routes', async () => {
  const routesToAudit = [
    { path: '/', expectedH1Keyword: 'Dawnexus' },
    { path: '/services/website-design', expectedH1Keyword: 'Website Design' },
    { path: '/services/seo-services', expectedH1Keyword: 'Search Engine Optimization' },
    { path: '/services/ai-video-creation', expectedH1Keyword: 'AI Video Creation' },
    { path: '/services/digital-marketing', expectedH1Keyword: 'Performance Digital Marketing' },
    { path: '/website-cost-calculator', expectedH1Keyword: 'Website Cost Calculator' },
    { path: '/blog', expectedH1Keyword: 'Insights' }
  ];

  for (const item of routesToAudit) {
    const res = await fetch(`${baseUrl}${item.path}`);
    assert.equal(res.status, 200, `Expected 200 for ${item.path}`);
    const html = await res.text();

    // Check single H1 tag
    const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    assert.ok(h1Matches, `Expected at least one H1 in raw HTML for ${item.path}`);
    assert.equal(h1Matches.length, 1, `Expected exactly one H1 for ${item.path}, found ${h1Matches.length}`);
    assert.ok(h1Matches[0].includes(item.expectedH1Keyword), `H1 should contain keyword "${item.expectedH1Keyword}"`);

    // Check Title & Meta Description
    assert.ok(html.includes('<title>'), `Expected <title> tag for ${item.path}`);
    assert.ok(html.includes('<meta name="description"'), `Expected meta description for ${item.path}`);
    assert.ok(html.includes('<link rel="canonical"'), `Expected canonical link for ${item.path}`);
    assert.ok(html.includes('https://www.dawnexus.in'), `Canonical must use authoritative HTTPS www domain`);

    // Check Single Valid JSON-LD
    const jsonLdMatches = html.match(/<script id=["']page-json-ld["'][^>]*>([\s\S]*?)<\/script>/gi);
    assert.ok(jsonLdMatches, `Expected id="page-json-ld" script for ${item.path}`);
    assert.equal(jsonLdMatches.length, 1, `Expected exactly one JSON-LD block for ${item.path}`);

    // Parse and validate JSON-LD
    const jsonStr = jsonLdMatches[0].replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
    let parsedSchema: any;
    try {
      parsedSchema = JSON.parse(jsonStr);
    } catch (e: any) {
      assert.fail(`JSON-LD on ${item.path} is not valid JSON: ${e.message}`);
    }
    const validation = validateJsonLdStructure(parsedSchema);
    assert.equal(validation.isValid, true, `JSON-LD on ${item.path} failed validation: ${validation.errors.join(', ')}`);
    assert.equal(validation.hasFabricatedReviews, false, `JSON-LD on ${item.path} contains fabricated reviews`);

    // Check Crawlability: ensure at least 5 crawlable internal links exist
    const linkMatches = html.match(/<a\s+[^>]*href=["']\/[^"']*["']/gi);
    assert.ok(linkMatches && linkMatches.length >= 5, `Expected at least 5 internal crawl links for ${item.path}, found ${linkMatches?.length || 0}`);
  }
});

test('SEO & Crawler Suite: Article #698 Preservation & Blog Route Crawlability', async () => {
  const blog = getBlogById(698);
  assert.ok(blog, 'Article #698 must exist in database');
  assert.equal(blog.status, 'Published', 'Article #698 must remain Published');

  const publishedBlogs = getPublishedBlogsForSitemap();
  const has698InSitemap = publishedBlogs.some(b => b.id === 698 || b.slug === blog.slug);
  assert.equal(has698InSitemap, true, 'Article #698 must appear in dynamic sitemap');

  // Request article via raw HTTP
  const res = await fetch(`${baseUrl}/blog/${blog.slug}`);
  assert.equal(res.status, 200);
  const html = await res.text();

  // Verify single H1 with blog title
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi);
  assert.ok(h1Matches && h1Matches.length === 1, 'Blog page must have exactly one H1');
  assert.ok(h1Matches[0].includes('Website Visitors Not Converting'), 'H1 must match blog title');

  // Verify BlogPosting Schema.org JSON-LD
  const jsonLdMatch = html.match(/<script id=["']page-json-ld["'][^>]*>([\s\S]*?)<\/script>/i);
  assert.ok(jsonLdMatch, 'Blog must have page-json-ld script');
  const schema = JSON.parse(jsonLdMatch[1].trim());
  assert.equal(schema['@type'], 'BlogPosting');
  assert.equal(schema.headline, blog.title);
  assert.ok(schema.author, 'BlogPosting must have author');
  assert.ok(schema.publisher, 'BlogPosting must have publisher');

  // Verify internal links back to blog hub and services
  assert.ok(html.includes('href="/blog"'), 'Must have backlink to /blog');
  assert.ok(html.includes('href="/services/seo-services"'), 'Must have internal link to SEO services');
});
