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

