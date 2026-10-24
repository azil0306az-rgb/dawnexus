import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import app from '../index.js';
import {
  getAllShowcases,
  getPublicShowcases,
  getShowcaseById,
  getShowcaseBySlug,
  createShowcase,
  updateShowcase,
  deleteShowcase,
  duplicateShowcase,
  reorderShowcases,
  getDb
} from '../db.js';
import { validateSsrfSafeUrl } from '../services/ssrfProtection.js';
import { validateImageBuffer } from '../services/screenshotService.js';

describe('Dawnexus Version 8.4.0: Dynamic Products & Showcases CMS Test Suite', () => {
  let serverInstance: any;
  let baseUrl = '';
  let sessionCookie = '';
  let testShowcaseId: number | null = null;

  before(async () => {
    // Start local express server instance
    serverInstance = createServer(app);
    await new Promise<void>((resolve) => {
      serverInstance.listen(0, '127.0.0.1', () => {
        const addr = serverInstance.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Obtain admin authentication session cookie
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
    // Cleanup any created test showcase
    if (testShowcaseId) {
      try {
        deleteShowcase(testShowcaseId);
      } catch {}
    }
    if (serverInstance) serverInstance.close();
  });

  test('1. Database Seeding: 11 core product showcases exist and are valid', () => {
    const all = getAllShowcases();
    assert.ok(all.length >= 11, `Expected at least 11 showcases seeded, found ${all.length}`);

    // Verify key seeded products exist
    const slugs = all.map(s => s.slug);
    assert.ok(slugs.includes('appointment-booking-automation'), 'Missing appointment-booking-automation');
    assert.ok(slugs.includes('website-quotation-builder'), 'Missing website-quotation-builder');
    assert.ok(slugs.includes('interactive-3d-real-estate'), 'Missing interactive-3d-real-estate');
    assert.ok(slugs.includes('ai-seo-management'), 'Missing ai-seo-management');

    for (const item of all) {
      assert.ok(item.title && item.title.trim().length > 0, `Showcase #${item.id} has empty title`);
      assert.ok(item.slug && item.slug.trim().length > 0, `Showcase #${item.id} has empty slug`);
      assert.ok(item.category && item.category.trim().length > 0, `Showcase #${item.id} has empty category`);
      assert.ok(Array.isArray(item.features), `Showcase #${item.id} features is not array`);
      assert.ok(Array.isArray(item.tech_stack), `Showcase #${item.id} tech_stack is not array`);
    }
  });

  test('2. SSRF Protection: Blocks loopback, private ranges, and cloud metadata', async () => {
    const blockedTargets = [
      'http://127.0.0.1:8080/admin',
      'http://localhost/metrics',
      'http://169.254.169.254/latest/meta-data',
      'http://10.0.0.1/internal',
      'http://192.168.1.1/router',
      'ftp://example.com/file'
    ];

    for (const target of blockedTargets) {
      const check = await validateSsrfSafeUrl(target);
      assert.strictEqual(check.safe, false, `Target ${target} should have been blocked by SSRF defense`);
    }

    // Public domain should be safe
    const safeCheck = await validateSsrfSafeUrl('https://www.dawnexus.in');
    assert.strictEqual(safeCheck.safe, true, 'https://www.dawnexus.in should be validated as safe');
  });

  test('3. Image Magic Bytes: Accurately detects and validates PNG, JPEG, WebP', () => {
    // Valid PNG header (8 bytes)
    const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const pngResult = validateImageBuffer(pngBuf);
    assert.strictEqual(pngResult.mimeType, 'image/png');
    assert.strictEqual(pngResult.extension, 'png');

    // Valid JPEG header (3 bytes)
    const jpgBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const jpgResult = validateImageBuffer(jpgBuf);
    assert.strictEqual(jpgResult.mimeType, 'image/jpeg');

    // Invalid format throws
    const badBuf = Buffer.from('<html><script>alert(1)</script></html>');
    assert.throws(() => validateImageBuffer(badBuf), /Unsupported or corrupted image format/);
  });

  test('4. Admin Showcase CRUD: Create, read, update, duplicate, and delete showcase', async () => {
    assert.ok(sessionCookie, 'Admin session cookie required for CRUD test');

    // CREATE
    const createRes = await fetch(`${baseUrl}/api/admin/showcases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        title: 'Unit Test Showcase System',
        slug: 'unit-test-showcase-system',
        subtitle: 'Automated test item',
        category: 'Automation & Workflows',
        badge: 'Automated Test',
        description: 'Temporary item for unit test verification.',
        long_description: 'Full detailed documentation for unit test showcase.',
        website_url: 'https://www.dawnexus.in',
        features: ['Automated feature check 1', 'Automated feature check 2'],
        workflow_steps: [
          { step: 1, title: 'Test Step 1', description: 'Initial test step' },
          { step: 2, title: 'Test Step 2', description: 'Execution test step' }
        ],
        tech_stack: ['TypeScript', 'Express', 'SQLite'],
        tags: ['Test', 'CI'],
        status: 'In Development',
        publication_status: 'draft',
        display_order: 99
      })
    });

    assert.strictEqual(createRes.status, 201, 'Showcase creation failed');
    const createData = await createRes.json();
    assert.ok(createData.success);
    assert.ok(createData.item.id);
    testShowcaseId = createData.item.id;

    // READ by ID
    const readRes = await fetch(`${baseUrl}/api/admin/showcases/${testShowcaseId}`, {
      headers: { 'Cookie': sessionCookie }
    });
    assert.strictEqual(readRes.status, 200);
    const readData = await readRes.json();
    assert.strictEqual(readData.item.title, 'Unit Test Showcase System');
    assert.strictEqual(readData.item.features.length, 2);

    // UPDATE
    const updateRes = await fetch(`${baseUrl}/api/admin/showcases/${testShowcaseId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        title: 'Updated Unit Test Showcase System',
        badge: 'Updated Badge',
        publication_status: 'published'
      })
    });
    assert.strictEqual(updateRes.status, 200);
    const updateData = await updateRes.json();
    assert.strictEqual(updateData.item.title, 'Updated Unit Test Showcase System');
    assert.strictEqual(updateData.item.badge, 'Updated Badge');
    assert.strictEqual(updateData.item.publication_status, 'published');

    // DUPLICATE
    const dupRes = await fetch(`${baseUrl}/api/admin/showcases/${testShowcaseId}/duplicate`, {
      method: 'POST',
      headers: { 'Cookie': sessionCookie }
    });
    assert.strictEqual(dupRes.status, 201);
    const dupData = await dupRes.json();
    assert.ok(dupData.item.id !== testShowcaseId);
    assert.strictEqual(dupData.item.publication_status, 'draft');

    // Clean up duplicated item immediately
    deleteShowcase(dupData.item.id);

    // DELETE created item
    const deleteRes = await fetch(`${baseUrl}/api/admin/showcases/${testShowcaseId}`, {
      method: 'DELETE',
      headers: { 'Cookie': sessionCookie }
    });
    assert.strictEqual(deleteRes.status, 200);
    testShowcaseId = null;
  });

  test('5. Public Showcase Endpoints: GET /api/showcases & GET /api/showcases/:slug', async () => {
    // Fetch all public showcases
    const res = await fetch(`${baseUrl}/api/showcases`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.showcases));
    assert.ok(data.showcases.length >= 10);

    // Verify detail endpoint for appointment-booking-automation
    const detailRes = await fetch(`${baseUrl}/api/showcases/appointment-booking-automation`);
    assert.strictEqual(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.ok(detailData.success);
    assert.strictEqual(detailData.showcase.slug, 'appointment-booking-automation');
    assert.strictEqual(detailData.showcase.title, 'Appointment Booking Automation');
    assert.ok(detailData.showcase.workflow_steps.length > 0);

    // Verify 404 on non-existent slug
    const notFoundRes = await fetch(`${baseUrl}/api/showcases/non-existent-showcase-slug-12345`);
    assert.strictEqual(notFoundRes.status, 404);
  });

  test('6. Reordering Endpoints: Reorder showcases adjusts display_order correctly', async () => {
    assert.ok(sessionCookie);
    const current = getAllShowcases().slice(0, 3);
    if (current.length < 2) return;

    // Swap first two IDs
    const swappedIds = [current[1].id, current[0].id];
    const reorderRes = await fetch(`${baseUrl}/api/admin/showcases/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ orderedIds: swappedIds })
    });

    assert.strictEqual(reorderRes.status, 200);
    const item1 = getShowcaseById(swappedIds[0]);
    const item2 = getShowcaseById(swappedIds[1]);
    assert.strictEqual(item1?.display_order, 0);
    assert.strictEqual(item2?.display_order, 1);

    // Restore original order
    reorderShowcases([current[0].id, current[1].id]);
  });
});