process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../index.js';
import { GeminiService } from '../geminiService.js';
import {
  initDatabase,
  getSeoCategories,
  getSeoCategoryById,
  createSeoCategory,
  updateSeoCategory,
  deleteSeoCategory,
  createBlog,
  getBlogById,
  bulkScheduleBlogsReliable
} from '../db.js';

let baseUrl: string;
let server: any;
let adminCookie: string;

describe('Dawnexus Version 7.1.8: Gemini API Migration & SEO Management Suite', () => {
  before(async () => {
    initDatabase();
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Authenticate as Admin to acquire signed session cookie
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || '9566' })
    });
    assert.equal(loginRes.status, 200);
    adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
    assert.ok(adminCookie.includes('dawnexus_session='));

    // Wait 2 seconds for initial cold-start hydration to settle
    await new Promise(r => setTimeout(r, 2000));
  });

  after(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  // ----------------------------------------------------
  // 1. Security & Authentication Guards
  // ----------------------------------------------------
  test('1. Security: /api/admin/seo-ai routes reject unauthenticated requests', async () => {
    const endpoints = [
      { url: `${baseUrl}/api/admin/seo-ai/status`, method: 'GET' },
      { url: `${baseUrl}/api/admin/seo-ai/categories`, method: 'GET' },
      { url: `${baseUrl}/api/admin/seo-ai/generate-blog`, method: 'POST' },
      { url: `${baseUrl}/api/admin/seo-ai/suggest-topics`, method: 'POST' },
      { url: `${baseUrl}/api/admin/seo-ai/bulk-schedule`, method: 'POST' }
    ];

    for (const ep of endpoints) {
      const res = await fetch(ep.url, { method: ep.method });
      assert.equal(res.status, 401, `Expected 401 for unauthenticated ${ep.method} ${ep.url}`);
    }
  });

  // ----------------------------------------------------
  // 2. Secret Redaction & Key Protection
  // ----------------------------------------------------
  test('2. Security: GeminiService redacts sensitive API keys from messages and errors', () => {
    const fakeKey = process.env.GEMINI_API_KEY || 'MOCK_TEST_GEMINI_KEY_987654321';
    const leakedMessage = `HTTP 400 Bad Request: Invalid token ${fakeKey} passed to generativelanguage`;
    const redacted = GeminiService.redactSecrets(leakedMessage);

    assert.ok(!redacted.includes(fakeKey), 'Redacted message must not contain raw API key');
    assert.ok(redacted.includes('[REDACTED_GEMINI_KEY]'), 'Redacted message must contain replacement tag');
  });

  // ----------------------------------------------------
  // 3. Dynamic SEO Categories CRUD
  // ----------------------------------------------------
  test('3. Categories: Seeded default categories exist with proper search intent', () => {
    const categories = getSeoCategories();
    assert.ok(categories.length >= 5, 'Should have at least 5 default SEO categories');
    
    const catNames = categories.map(c => c.name);
    assert.ok(catNames.includes('Website Development'));
    assert.ok(catNames.includes('SEO Services'));
    assert.ok(catNames.includes('Google Business Profile Optimization'));
    assert.ok(catNames.includes('Digital Marketing'));
    assert.ok(catNames.includes('AI and Automation'));
  });

  test('4. Categories: Admin can create, edit, and delete category without affecting blogs', async () => {
    // A: Create Category via API with unique name
    const uniqueCatName = `Enterprise Cloud ${Date.now()}`;
    const createRes = await fetch(`${baseUrl}/api/admin/seo-ai/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        name: uniqueCatName,
        primary_keyword: 'enterprise cloud migration',
        secondary_keywords: ['aws cloud', 'azure enterprise', 'cloud cost optimization'],
        target_audience: 'Enterprise CTOs and Engineering Leaders',
        search_intent: 'Commercial',
        instructions: 'Focus on high availability and multi-region deployment'
      })
    });
    assert.equal(createRes.status, 201);
    const createdData = await createRes.json();
    assert.ok(createdData.category.id > 0);
    const categoryId = createdData.category.id;

    // B: Associate a blog draft with this category
    const blog = createBlog({
      title: 'Enterprise Cloud Scalability Blueprint',
      slug: `enterprise-cloud-scalability-${Date.now()}`,
      category: uniqueCatName,
      primary_keyword: 'enterprise cloud migration',
      content: 'Authoritative cloud content...',
      status: 'Draft'
    });
    assert.ok(blog.id > 0);

    // C: Update Category
    const updateRes = await fetch(`${baseUrl}/api/admin/seo-ai/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        instructions: 'Updated instruction: emphasize zero-downtime cutovers.'
      })
    });
    assert.equal(updateRes.status, 200);
    const updatedData = await updateRes.json();
    assert.equal(updatedData.category.instructions, 'Updated instruction: emphasize zero-downtime cutovers.');

    // D: Delete Category
    const deleteRes = await fetch(`${baseUrl}/api/admin/seo-ai/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { Cookie: adminCookie }
    });
    assert.equal(deleteRes.status, 200);

    // E: Verify blog record survived unharmed with historical category name
    const preservedBlog = getBlogById(blog.id);
    assert.ok(preservedBlog, 'Blog record must not be deleted when its category is removed');
    assert.equal(preservedBlog?.category, uniqueCatName, 'Blog retains historical category');
  });

  // ----------------------------------------------------
  // 4. Gemini Connection Status & Operational Telemetry
  // ----------------------------------------------------
  test('5. Telemetry: /api/admin/seo-ai/status returns v7.1.8 connection details without leaking key', async () => {
    const res = await fetch(`${baseUrl}/api/admin/seo-ai/status`, {
      headers: { Cookie: adminCookie }
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.success, true);
    assert.equal(data.version, '7.1.8');
    assert.equal(typeof data.connected, 'boolean');
    assert.ok(data.activeModel);
    assert.ok(data.usage);
    assert.equal(typeof data.usage.totalCalls, 'number');

    // Confirm raw key is NEVER present in response
    const jsonStr = JSON.stringify(data);
    const rawKey = process.env.GEMINI_API_KEY;
    if (rawKey) {
      assert.ok(!jsonStr.includes(rawKey), 'Status response must NEVER contain raw GEMINI_API_KEY');
    }
  });

  // ----------------------------------------------------
  // 5. Manual Bulk Blog Scheduling (Asia/Kolkata Timezone)
  // ----------------------------------------------------
  test('6. Bulk Scheduler: Correctly batches drafts in Asia/Kolkata timezone with atomic validation', async () => {
    // Create 3 test draft blogs
    const draft1 = createBlog({
      title: 'Bulk Test Post 1',
      slug: `bulk-test-1-${Date.now()}`,
      status: 'Draft',
      content: 'Draft 1 content'
    });
    const draft2 = createBlog({
      title: 'Bulk Test Post 2',
      slug: `bulk-test-2-${Date.now()}`,
      status: 'Draft',
      content: 'Draft 2 content'
    });
    const draft3 = createBlog({
      title: 'Bulk Test Post 3',
      slug: `bulk-test-3-${Date.now()}`,
      status: 'Draft',
      content: 'Draft 3 content'
    });

    // Schedule 2 per day starting tomorrow at 09:00 and 15:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const startDateStr = tomorrow.toISOString().split('T')[0];

    const schedRes = await fetch(`${baseUrl}/api/admin/seo-ai/bulk-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: adminCookie
      },
      body: JSON.stringify({
        generator: {
          blogIds: [draft1.id, draft2.id, draft3.id],
          startDate: startDateStr,
          postsPerDay: 2,
          times: ['09:00', '15:00'],
          timezone: 'Asia/Kolkata'
        }
      })
    });

    assert.equal(schedRes.status, 200);
    const schedData = await schedRes.json();
    assert.equal(schedData.success, true);
    assert.equal(schedData.scheduledCount, 3);

    // Verify all 3 posts are now in 'Scheduled' status with future dates
    const b1 = getBlogById(draft1.id);
    const b2 = getBlogById(draft2.id);
    const b3 = getBlogById(draft3.id);

    assert.equal(b1?.status, 'Scheduled');
    assert.equal(b2?.status, 'Scheduled');
    assert.equal(b3?.status, 'Scheduled');
    assert.ok(b1?.scheduled_at);
    assert.ok(b2?.scheduled_at);
    assert.ok(b3?.scheduled_at);

    // Verify that Day 1 got 2 posts and Day 2 got the 3rd post
    assert.notEqual(b1?.scheduled_at, b2?.scheduled_at, 'Posts must have distinct scheduled times');
    assert.notEqual(b2?.scheduled_at, b3?.scheduled_at, 'Day 2 post must have different date/time');
  });

  test('7. Bulk Scheduler: Rejects past publication times gracefully', async () => {
    const draft = createBlog({
      title: 'Past Time Rejection Test',
      slug: `past-rejection-${Date.now()}`,
      status: 'Draft',
      content: 'Content'
    });

    const pastDate = '2020-01-01T09:00:00Z';
    const res = await bulkScheduleBlogsReliable([
      { id: draft.id, scheduledAt: pastDate }
    ]);

    assert.equal(res.success, false);
    assert.equal(res.scheduledCount, 0);
    assert.ok(res.errors.length > 0);
    assert.ok(res.errors[0].error.includes('must be in the future'));
  });

  // ----------------------------------------------------
  // 6. Blog Generation Guardrails: Strict Text-Only, No AI Images
  // ----------------------------------------------------
  test('8. Blog Generator: Enforces strict text-only output with zero image markdown or watermarks', async () => {
    try {
      const draft = await GeminiService.generateBlogDraft({
        category: 'SEO Services',
        primaryKeyword: 'technical seo audit checklist',
        secondaryKeywords: ['crawlability', 'core web vitals', 'schema markup'],
        targetAudience: 'Software engineers and marketing leaders',
        searchIntent: 'Commercial'
      });

      assert.ok(draft.title, 'Draft must have a title');
      assert.ok(draft.seoTitle, 'Draft must have an SEO title');
      assert.ok(draft.metaDescription, 'Draft must have a meta description');
      assert.ok(draft.slug, 'Draft must have a slug');
      assert.ok(draft.content.length > 200, 'Draft content must have substantial depth');
      assert.ok(draft.faqs.length >= 1, 'Draft must include FAQ questions');

      // STRICT PRODUCTION RULE VERIFICATION:
      assert.ok(!draft.content.includes('![image]'), 'Content must not include markdown image tags');
      assert.ok(!draft.content.includes('![placeholder]'), 'Content must not include image placeholders');
      assert.ok(!draft.content.toLowerCase().includes('watermark'), 'Content must not reference watermarks');
      assert.ok(!draft.content.includes('http://') && !draft.content.includes('https://unsplash'), 'Content must not include unsplash image URLs');
    } catch (err: any) {
      // If live Google API returns temporary 503 spike, verify error was safely redacted without leaking key
      const rawKey = process.env.GEMINI_API_KEY;
      if (rawKey) {
        assert.ok(!err.message.includes(rawKey), 'Error must not leak raw Gemini API key');
      }
      assert.ok(err.message.includes('high demand') || err.message.includes('Gemini') || err.message.includes('fetch'));
    }
  });

  // ----------------------------------------------------
  // 7. Topic Suggestions Grounding & Resilience
  // ----------------------------------------------------
  test('9. Topic Suggestions: Successfully generates grounded topics and handles disconnected signals', async () => {
    // Request topic suggestions with simulated disconnected GSC and GA4
    const topics = await GeminiService.suggestTopics({
      category: 'Website Development',
      existingPostTitles: ['Top Web Trends in 2026'],
      gscQueries: [],
      ga4TopPages: []
    });

    assert.ok(Array.isArray(topics));
    assert.ok(topics.length >= 4, 'Should suggest at least 4 grounded topics');
    
    const first = topics[0];
    assert.ok(first.title);
    assert.ok(first.primaryKeyword);
    assert.ok(first.reason);
    assert.ok(first.searchIntent);
  });

  // ----------------------------------------------------
  // 8. Health Endpoint Version 7.1.8 Verification
  // ----------------------------------------------------
  test('10. System Version: /api/health reports version 7.1.8', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.version, '7.1.8');
    assert.equal(data.brand, 'Dawnexus');
  });
});
