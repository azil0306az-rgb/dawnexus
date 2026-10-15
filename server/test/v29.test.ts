import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import app, { server as defaultServer } from '../index.js';
import {
  initDatabase,
  getNotificationSettings,
  createOtpChallenge,
  getLatestOtpChallenge,
  completeOtpVerification,
  deactivateNotificationSettings,
  getPublishedBlogsForSitemap,
  createEnquiry,
  createBlog
} from '../db.js';
import { normalizeIndianPhone, ALLOWED_BUDGETS } from '../routes/api.js';

let server: http.Server;
let baseUrl: string;
let adminCookie: string;

test.before(async () => {
  initDatabase();
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  // Authenticate admin
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || '9566' })
  });
  assert.equal(loginRes.status, 200);
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert.ok(cookieHeader);
  adminCookie = cookieHeader.split(';')[0];
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  if (defaultServer && defaultServer.listening) {
    const runningDefaultServer = defaultServer;
    await new Promise<void>((resolve) => {
      runningDefaultServer.close(() => resolve());
    });
  }
});

// --------------------------------------------------------------------------
// 1. INDIAN PHONE NUMBER VALIDATION & NORMALIZATION
// --------------------------------------------------------------------------
test('Phone: Valid Indian mobile numbers normalize cleanly to +91XXXXXXXXXX', () => {
  const cases = [
    { input: '9876543210', expected: '+919876543210' },
    { input: '+91 98765 43210', expected: '+919876543210' },
    { input: '+919876543210', expected: '+919876543210' },
    { input: '919876543210', expected: '+919876543210' },
    { input: '09876543210', expected: '+919876543210' },
    { input: '98765-43210', expected: '+919876543210' },
    { input: '+91+919876543210', expected: '+919876543210' }, // duplicate prefix cleaned
    { input: '  8123456789  ', expected: '+918123456789' },
    { input: '7012345678', expected: '+917012345678' },
    { input: '6381234567', expected: '+916381234567' }
  ];

  for (const c of cases) {
    const res = normalizeIndianPhone(c.input);
    assert.equal(res.valid, true, `Expected ${c.input} to be valid`);
    assert.equal(res.normalized, c.expected);
  }
});

test('Phone: Rejects US and foreign country codes', () => {
  const foreignNumbers = [
    '+1 (555) 123-4567',
    '+15551234567',
    '+44 20 7946 0958',
    '+61 412 345 678'
  ];

  for (const num of foreignNumbers) {
    const res = normalizeIndianPhone(num);
    assert.equal(res.valid, false);
    assert.match(res.error || '', /Indian phone numbers/i);
  }
});

test('Phone: Rejects invalid lengths and invalid starting digits', () => {
  const invalidNumbers = [
    '12345',              // too short
    '987654321012345',    // too long
    '5123456789',         // does not start with 6, 7, 8, 9
    '0123456789',         // after stripping 0, starts with 1
    'abcd-efgh-ij',       // non-numeric
    '98765 4321'          // 9 digits
  ];

  for (const num of invalidNumbers) {
    const res = normalizeIndianPhone(num);
    assert.equal(res.valid, false, `Expected ${num} to be invalid`);
  }
});

test('Phone: Optional field permits empty or whitespace', () => {
  assert.equal(normalizeIndianPhone('').valid, true);
  assert.equal(normalizeIndianPhone('   ').valid, true);
});

// --------------------------------------------------------------------------
// 2. INR BUDGET OPTIONS & VALIDATION
// --------------------------------------------------------------------------
test('Budget: Allowed options match exact specifications', () => {
  assert.deepEqual(ALLOWED_BUDGETS, [
    '₹5,000–₹10,000',
    '₹10,000–₹20,000',
    '₹20,000–₹30,000',
    '₹30,000–₹50,000',
    '₹50,000'
  ]);
});

test('Inquiry Submission: Accepts valid Indian phone and INR budget', async () => {
  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'Aditi Sharma',
      business_name: 'Sharma Tech Innovations',
      email: 'aditi@example.com',
      phone: '+91 98765 43210',
      requested_services: ['Website Design & Development', 'Search Engine Optimization'],
      budget: '₹20,000–₹30,000',
      project_details: 'Looking to revamp our corporate web portal and establish top ranking.'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.enquiryId);
});

test('Inquiry Submission: Rejects foreign phone code and invalid budget', async () => {
  const res = await fetch(`${baseUrl}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+1 555 123 4567', // US number
      budget: '$5,000 – $10,000', // USD instead of INR
      project_details: 'Testing rejection of US code and non-INR budget.'
    })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.details.phone);
  assert.ok(data.details.budget);
});

// --------------------------------------------------------------------------
// 3. ADMIN NOTIFICATION SETTINGS & SECURE OTP VERIFICATION
// --------------------------------------------------------------------------
test('Notification Settings: Protected from unauthenticated access', async () => {
  const res = await fetch(`${baseUrl}/api/admin/notification-settings`);
  assert.equal(res.status, 401);
});

test('Notification Settings: Authenticated admin can read settings', async () => {
  const res = await fetch(`${baseUrl}/api/admin/notification-settings`, {
    headers: { Cookie: adminCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.is_verified, 'number');
  assert.ok('provider_status' in data);
});

test('OTP: Requesting OTP creates hashed challenge, enforces 60s cooldown', async () => {
  const testEmail = 'ops-admin@dawnexus.in';

  // 1. Request OTP
  const reqRes = await fetch(`${baseUrl}/api/admin/notification-settings/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({ email: testEmail })
  });

  assert.equal(reqRes.status, 200);
  const reqData = await reqRes.json();
  assert.equal(reqData.success, true);
  assert.equal(reqData.email, testEmail);
  assert.equal(reqData.resend_cooldown_seconds, 60);

  // Challenge should be in DB with hash and salt, NOT plaintext OTP
  const challenge = getLatestOtpChallenge(testEmail);
  assert.ok(challenge);
  assert.equal(challenge.email, testEmail);
  assert.ok(challenge.otp_hash.length >= 64);
  assert.ok(challenge.salt.length >= 16);

  // 2. Requesting again immediately hits 60s cooldown (429)
  const spamRes = await fetch(`${baseUrl}/api/admin/notification-settings/request-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({ email: testEmail })
  });
  assert.equal(spamRes.status, 429);
  const spamData = await spamRes.json();
  assert.match(spamData.error, /Please wait/i);
});

test('OTP: Incorrect code increments failed attempts and is rejected', async () => {
  const testEmail = 'ops-admin@dawnexus.in';

  const verifyRes = await fetch(`${baseUrl}/api/admin/notification-settings/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({ email: testEmail, otp: '000000' })
  });

  assert.equal(verifyRes.status, 400);
  const data = await verifyRes.json();
  assert.match(data.error, /Invalid verification code/i);

  const challenge = getLatestOtpChallenge(testEmail);
  assert.ok(challenge);
  assert.equal(challenge.attempts, 1);
});

test('OTP: Correct code successfully verifies and activates recipient in DB', async () => {
  const targetEmail = 'founder@dawnexus.in';
  const knownOtp = '582914';
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHmac('sha256', salt).update(`${targetEmail}:${knownOtp}`).digest('hex');
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Insert challenge directly into DB
  createOtpChallenge(targetEmail, otpHash, salt, expiresAt);

  // Verify via API
  const verifyRes = await fetch(`${baseUrl}/api/admin/notification-settings/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: adminCookie
    },
    body: JSON.stringify({ email: targetEmail, otp: knownOtp })
  });

  assert.equal(verifyRes.status, 200);
  const data = await verifyRes.json();
  assert.equal(data.success, true);
  assert.equal(data.settings.active_email, targetEmail);
  assert.equal(data.settings.is_verified, 1);
  assert.ok(data.settings.verified_at);

  // Check persisted DB state
  const settings = getNotificationSettings();
  assert.equal(settings.active_email, targetEmail);
  assert.equal(settings.is_verified, 1);
});

test('Notification Settings: Deactivating clears active recipient safely', async () => {
  const res = await fetch(`${baseUrl}/api/admin/notification-settings/deactivate`, {
    method: 'POST',
    headers: { Cookie: adminCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.settings.active_email, null);
  assert.equal(data.settings.is_verified, 0);

  const settings = getNotificationSettings();
  assert.equal(settings.active_email, null);
  assert.equal(settings.is_verified, 0);
});

// --------------------------------------------------------------------------
// 4. DYNAMIC SITEMAP BUG FIX & VERIFICATION
// --------------------------------------------------------------------------
test('Sitemap: /sitemap.xml dynamically returns HTTP 200 with all published blogs including Local SEO Playbook', async () => {
  const res = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/xml/);

  const xml = await res.text();

  // Canonical base domain
  assert.ok(xml.includes('<loc>https://dawnexus.in/</loc>'));
  assert.ok(xml.includes('<loc>https://dawnexus.in/services/website-design</loc>'));
  assert.ok(xml.includes('<loc>https://dawnexus.in/services/seo-services</loc>'));
  assert.ok(xml.includes('<loc>https://dawnexus.in/services/ai-video-creation</loc>'));
  assert.ok(xml.includes('<loc>https://dawnexus.in/services/digital-marketing</loc>'));
  assert.ok(xml.includes('<loc>https://dawnexus.in/blog</loc>'));

  // Confirmed published blog article MUST be present in dynamic sitemap
  createBlog({
    title: 'Local SEO Playbook for Businesses',
    slug: 'local-seo-google-maps-playbook',
    status: 'Published',
    published_at: new Date().toISOString()
  });

  const resWithBlog = await fetch(`${baseUrl}/sitemap.xml`);
  const xmlWithBlog = await resWithBlog.text();
  assert.ok(
    xmlWithBlog.includes('<loc>https://dawnexus.in/blog/local-seo-google-maps-playbook</loc>'),
    'Published blog canonical URL must be present in dynamic sitemap'
  );

  // Ensure no draft or scheduled post appears
  createBlog({
    title: 'Secret Upcoming Strategy Post',
    slug: 'secret-draft-article',
    status: 'Draft'
  });
  createBlog({
    title: 'Far Future Post',
    slug: 'future-scheduled-article',
    status: 'Scheduled',
    scheduled_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
  });

  const refreshedSitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
  const refreshedXml = await refreshedSitemapRes.text();

  assert.equal(refreshedXml.includes('secret-draft-article'), false, 'Drafts must NOT appear in sitemap');
  assert.equal(refreshedXml.includes('future-scheduled-article'), false, 'Future scheduled posts must NOT appear in sitemap');
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
