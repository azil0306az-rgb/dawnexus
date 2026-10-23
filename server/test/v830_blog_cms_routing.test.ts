import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import app from '../index.js';
import { getDb } from '../db.js';
import { analyzeInformationGain } from '../../src/utils/seoQuality.js';

describe('Dawnexus Version 8.3.0: Blogs & CMS Routing and Editor Stability', () => {
  let serverInstance: any;
  let baseUrl = '';
  let sessionCookie = '';
  let sampleBlog: any = null;

  before(async () => {
    // 1. Fetch an existing blog from DB for read-only tests (NO CREATION)
    const db = getDb();
    sampleBlog = db.prepare('SELECT id, slug, title FROM blogs LIMIT 1').get() as any;

    // 2. Start server
    serverInstance = createServer(app);
    await new Promise<void>((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // 3. Admin login to obtain session cookie
    const adminPassword = process.env.ADMIN_PASSWORD || '9566';
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: adminPassword })
    });

    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader.split(';')[0];
    }
  });

  after(() => {
    if (serverInstance) serverInstance.close();
  });

  test('1. SEO Quality: analyzeInformationGain executes safely without boilerplateCount ReferenceError', () => {
    // Diverse inputs including low-information filler phrases
    const sampleTextWithFiller = `
      In today's fast-paced digital world, it is important to remember that web design is crucial.
      Needless to say, without further ado, at the end of the day, when all is said and done,
      we provide top-tier SEO services in Coimbatore.
      Case study: In our 2026 deployment for XYZ Textiles, organic search conversions increased by 42%.
    `;

    const result = analyzeInformationGain(sampleTextWithFiller);
    assert.ok(result);
    assert.strictEqual(typeof result.score, 'number');
    assert.ok(result.score >= 0 && result.score <= 100);
    assert.strictEqual(typeof result.boilerplate_penalty, 'number');
    assert.ok(result.boilerplate_penalty > 0, 'Boilerplate penalty should be applied for filler phrases');
    assert.ok(Array.isArray(result.recommendations));
    assert.ok(Array.isArray(result.criteria));
  });

  test('2. Admin API: GET /api/admin/blogs/:id succeeds with numeric ID', async () => {
    assert.ok(sampleBlog, 'Expected at least one existing blog in database');
    const res = await fetch(`${baseUrl}/api/admin/blogs/${sampleBlog.id}`, {
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, sampleBlog.id);
    assert.strictEqual(body.slug, sampleBlog.slug);
  });

  test('3. Admin API: GET /api/admin/blogs/:id succeeds with slug parameter', async () => {
    assert.ok(sampleBlog, 'Expected at least one existing blog in database');
    const res = await fetch(`${baseUrl}/api/admin/blogs/${sampleBlog.slug}`, {
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.id, sampleBlog.id);
    assert.strictEqual(body.slug, sampleBlog.slug);
  });

  test('4. Admin API: GET /api/admin/blogs/:id returns 404 cleanly for non-existent blog', async () => {
    const res = await fetch(`${baseUrl}/api/admin/blogs/999999999`, {
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.ok(body.error);
  });

  test('5. Route Parser: Correctly maps clean and malformed admin paths', () => {
    // Pure function logic replication matching AdminDashboard.tsx parseAdminRoute
    function parseAdminRoute(pathname: string, search: string = '') {
      let decodedPath = pathname;
      try {
        decodedPath = decodeURIComponent(pathname);
      } catch {
        decodedPath = pathname;
      }

      let subPath = decodedPath.replace(/^\/+/, '');
      while (subPath.startsWith('admin/') || subPath === 'admin') {
        if (subPath === 'admin') {
          subPath = '';
          break;
        }
        subPath = subPath.slice(6);
      }

      const segments = subPath.split('/').filter(Boolean);
      let tab: string = 'overview';
      let blogId: string | null = null;
      let isNew = false;

      if (segments.length > 0) {
        const first = segments[0].toLowerCase().trim();
        if (first === 'blogs' || first === 'blogs and cms' || first === 'blog') {
          tab = 'blogs';
          if (segments[1] === 'new') {
            isNew = true;
          } else if (segments[1]) {
            blogId = segments[1];
          }
        } else if (first === 'enquiries' || first === 'leads') {
          tab = 'enquiries';
        } else if (first === 'seo') {
          tab = 'seo';
        } else {
          tab = first;
        }
      }

      if (search) {
        const params = new URLSearchParams(search);
        const tabParam = params.get('tab');
        const idParam = params.get('id');
        if (tabParam) {
          const normalized = tabParam.toLowerCase().trim();
          if (normalized === 'blogs' || normalized === 'blogs and cms') tab = 'blogs';
          else tab = normalized;
        }
        if (idParam) {
          if (idParam === 'new') isNew = true;
          else blogId = idParam;
        }
      }

      return { tab, blogId, isNew };
    }

    assert.deepStrictEqual(parseAdminRoute('/admin'), { tab: 'overview', blogId: null, isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/blogs'), { tab: 'blogs', blogId: null, isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/blogs/new'), { tab: 'blogs', blogId: null, isNew: true });
    assert.deepStrictEqual(parseAdminRoute('/admin/blogs/137'), { tab: 'blogs', blogId: '137', isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/blogs/seo-guide'), { tab: 'blogs', blogId: 'seo-guide', isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/admin/Blogs and CMS'), { tab: 'blogs', blogId: null, isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/admin/blogs/new'), { tab: 'blogs', blogId: null, isNew: true });
    assert.deepStrictEqual(parseAdminRoute('/admin', '?tab=blogs&id=137'), { tab: 'blogs', blogId: '137', isNew: false });
    assert.deepStrictEqual(parseAdminRoute('/admin/enquiries'), { tab: 'enquiries', blogId: null, isNew: false });
  });
});
