import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';

// Start test server on ephemeral port
let testServer: http.Server;
let baseUrl: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    testServer = app.listen(0, '127.0.0.1', () => {
      const address = testServer.address() as { port: number };
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    testServer.close(() => resolve());
  });
  process.exit(0);
});

test('Health endpoint returns ok', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.brand, 'Dawnexus');
});

test('Public Enquiry: Rejects invalid or incomplete submission', async () => {
  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: '',
      email: 'not-an-email',
      project_details: 'short'
    })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.details);
  assert.ok(data.details.full_name);
  assert.ok(data.details.email);
  assert.ok(data.details.project_details);
});

let createdEnquiryId: number;

test('Public Enquiry: Accepts valid submission and saves to SQLite', async () => {
  const payload = {
    full_name: 'Test Customer Alpha',
    business_name: 'Alpha Growth Labs',
    email: 'alpha@growthlabs.test',
    phone: '+1 555 123 4567',
    requested_services: ['Website Design & Development', 'AI Video Creation'],
    budget: '$5,000 – $10,000',
    project_details: 'We need a high-converting agency website and 5 AI reels for our launch.'
  };

  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.enquiryId);
  createdEnquiryId = data.enquiryId;
});

test('Security Honeypot: Silently suppresses bot submissions', async () => {
  const botPayload = {
    full_name: 'Bot Spammer',
    email: 'bot@spam.test',
    project_details: 'Cheap links buy now!',
    website_hp: 'http://spam-link.test' // Honeypot filled
  };

  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(botPayload)
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  // Verify it did not create an enquiry ID
  assert.equal(data.enquiryId, undefined);
});

test('Admin Auth: Protected endpoints reject unauthenticated requests', async () => {
  const resStats = await fetch(`${baseUrl}/api/admin/stats`);
  assert.equal(resStats.status, 401);

  const resEnquiries = await fetch(`${baseUrl}/api/admin/enquiries`);
  assert.equal(resEnquiries.status, 401);

  const resExport = await fetch(`${baseUrl}/api/admin/export`);
  assert.equal(resExport.status, 401);
});

test('Admin Auth: Rejects incorrect password', async () => {
  const res = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrongpassword' })
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Invalid administrative password'));
});

let sessionCookie = '';

test('Admin Auth: Accepts configured development password 9566 and returns session cookie', async () => {
  const res = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '9566' })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);

  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie);
  assert.ok(setCookie.includes('dawnexus_session='));
  sessionCookie = setCookie.split(';')[0];
});

test('Admin Auth: Session check validates authenticated status', async () => {
  const res = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.authenticated, true);
});

test('Admin Stats: Returns real database counts reflecting created enquiry', async () => {
  const res = await fetch(`${baseUrl}/api/admin/stats`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total >= 1);
  assert.ok(data.new >= 1);
});

test('Admin Enquiries: Can fetch, search, and filter enquiries', async () => {
  const res = await fetch(`${baseUrl}/api/admin/enquiries?search=Alpha`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.items.length >= 1);
  const item = data.items.find((x: { id: number }) => x.id === createdEnquiryId);
  assert.ok(item);
  assert.equal(item.full_name, 'Test Customer Alpha');
});

test('Admin Enquiries: Can update status and admin notes', async () => {
  const updateRes = await fetch(`${baseUrl}/api/admin/enquiries/${createdEnquiryId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({
      status: 'In Progress',
      admin_notes: 'Spoke with Alex. Scheduled discovery call for Tuesday.'
    })
  });

  assert.equal(updateRes.status, 200);
  const data = await updateRes.json();
  assert.equal(data.enquiry.status, 'In Progress');
  assert.equal(data.enquiry.admin_notes, 'Spoke with Alex. Scheduled discovery call for Tuesday.');
});

test('Admin CSV Export: Generates correctly formatted CSV', async () => {
  const res = await fetch(`${baseUrl}/api/admin/export`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/csv'));
  const text = await res.text();
  assert.ok(text.includes('Customer Name'));
  assert.ok(text.includes('Test Customer Alpha'));
});

test('Admin Enquiries: Can delete enquiry permanently', async () => {
  const deleteRes = await fetch(`${baseUrl}/api/admin/enquiries/${createdEnquiryId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie }
  });

  assert.equal(deleteRes.status, 200);
  const data = await deleteRes.json();
  assert.equal(data.success, true);

  // Verify it is gone
  const getRes = await fetch(`${baseUrl}/api/admin/enquiries/${createdEnquiryId}`, {
    headers: { Cookie: sessionCookie }
  });
  assert.equal(getRes.status, 404);
});

test('Blog CMS: Public /api/blogs listing returns published seed articles', async () => {
  const res = await fetch(`${baseUrl}/api/blogs`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.items));
  assert.ok(data.total >= 2);
  const slugs = data.items.map((i: any) => i.slug);
  assert.ok(slugs.includes('website-design-cost-coimbatore'));
});

test('Blog CMS: Public /api/blogs/:slug returns article with related posts', async () => {
  const res = await fetch(`${baseUrl}/api/blogs/website-design-cost-coimbatore`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.blog);
  assert.equal(data.blog.slug, 'website-design-cost-coimbatore');
  assert.ok(data.blog.title.includes('Coimbatore'));
  assert.ok(Array.isArray(data.related));
});

test('Blog CMS & Dynamic Sitemap: /sitemap.xml generates valid XML with canonical domain and article URLs', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(text.includes('<loc>https://dawnexus.in/</loc>'));
  assert.ok(text.includes('<loc>https://dawnexus.in/services/website-design</loc>'));
  assert.ok(text.includes('<loc>https://dawnexus.in/blog</loc>'));
  assert.ok(text.includes('<loc>https://dawnexus.in/blog/website-design-cost-coimbatore</loc>'));
});

let createdBlogId: number;

test('Blog CMS Admin: Can create, schedule, auto-publish, and manage articles', async () => {
  // 1. Create a draft article
  const createRes = await fetch(`${baseUrl}/api/admin/blogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({
      title: 'Automated Publishing Test Article',
      slug: 'automated-publishing-test-article',
      excerpt: 'Testing scheduled publishing pipeline',
      content: '<h2>Automated Test</h2><p>This is a test article.</p>',
      category: 'Website Design',
      primary_keyword: 'automated publishing',
      status: 'Scheduled',
      // Scheduled 1 minute ago so it is immediately due
      scheduled_at: new Date(Date.now() - 60000).toISOString()
    })
  });

  assert.equal(createRes.status, 201);
  const createData = await createRes.json();
  assert.ok(createData.blog);
  createdBlogId = createData.blog.id;
  assert.equal(createData.blog.status, 'Scheduled');

  // 2. Trigger scheduler via /api/cron/publish
  const cronRes = await fetch(`${baseUrl}/api/cron/publish`);
  assert.equal(cronRes.status, 200);
  const cronData = await cronRes.json();
  assert.ok(cronData.publishedCount >= 1);

  // 3. Verify article is now Published
  const checkRes = await fetch(`${baseUrl}/api/admin/blogs/${createdBlogId}`, {
    headers: { Cookie: sessionCookie }
  });
  assert.equal(checkRes.status, 200);
  const checkData = await checkRes.json();
  assert.equal(checkData.status, 'Published');
  assert.ok(checkData.published_at);

  // 4. Duplicate article
  const dupRes = await fetch(`${baseUrl}/api/admin/blogs/${createdBlogId}/duplicate`, {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });
  assert.equal(dupRes.status, 201);
  const dupData = await dupRes.json();
  assert.equal(dupData.blog.status, 'Draft');
  const dupId = dupData.blog.id;

  // 5. Delete duplicated and original test articles
  const delDup = await fetch(`${baseUrl}/api/admin/blogs/${dupId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie }
  });
  assert.equal(delDup.status, 200);

  const delOrig = await fetch(`${baseUrl}/api/admin/blogs/${createdBlogId}`, {
    method: 'DELETE',
    headers: { Cookie: sessionCookie }
  });
  assert.equal(delOrig.status, 200);
});

test('Admin Auth: Logout invalidates session', async () => {
  const logoutRes = await fetch(`${baseUrl}/api/admin/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie }
  });
  assert.equal(logoutRes.status, 200);

  // Subsequent check should fail
  const checkRes = await fetch(`${baseUrl}/api/admin/session`, {
    headers: { Cookie: sessionCookie }
  });
  assert.equal(checkRes.status, 401);
});

