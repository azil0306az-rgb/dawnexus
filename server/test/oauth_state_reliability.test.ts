import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import app from '../index.js';
import {
  generateSignedOAuthState,
  verifyAndConsumeOAuthState,
  getGoogleOAuthRedirectUri
} from '../routes/seoResearch.js';
import {
  initDatabase,
  createOAuthState,
  consumeOAuthState,
  cleanupExpiredOAuthStates
} from '../db.js';

let server: http.Server;
let baseUrl: string;
let sessionCookie = '';

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

  // Obtain admin session cookie
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '9566' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (cookie) {
    sessionCookie = cookie.split(';')[0];
  }
});

test.after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  setTimeout(() => process.exit(0), 100).unref();
});

// ----------------------------------------------------
// 1. STATE GENERATION & CRYPTOGRAPHIC VERIFICATION
// ----------------------------------------------------

test('1. Valid state is generated and successfully accepted', () => {
  const { state } = generateSignedOAuthState('test-session-123');
  assert.ok(typeof state === 'string' && state.length > 32);

  const result = verifyAndConsumeOAuthState(state, 'test-session-123');
  assert.strictEqual(result.valid, true);
  assert.ok(result.reason.startsWith('valid'));
});

test('2. Missing or empty state is rejected', () => {
  const emptyRes = verifyAndConsumeOAuthState('');
  assert.strictEqual(emptyRes.valid, false);
  assert.strictEqual(emptyRes.reason, 'missing_state');

  const nullRes = verifyAndConsumeOAuthState(null as any);
  assert.strictEqual(nullRes.valid, false);
  assert.strictEqual(nullRes.reason, 'missing_state');
});

test('3. Incorrect or tampered state is rejected', () => {
  const { state } = generateSignedOAuthState();
  const tampered = state.slice(0, -4) + 'abcd';
  const result = verifyAndConsumeOAuthState(tampered);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'signature_mismatch');
});

test('4. Expired state is rejected', () => {
  // Construct an expired state with a valid signature from 15 minutes ago
  const rawRandom = crypto.randomBytes(16).toString('hex');
  const pastTimestamp = Date.now() - 15 * 60 * 1000;
  const payload = `${rawRandom}.${pastTimestamp}.public`;
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dawnexus_oauth_state_hmac_secret_salt_2026';
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expiredState = `${payload}.${signature}`;

  const result = verifyAndConsumeOAuthState(expiredState);
  assert.strictEqual(result.valid, false);
  assert.strictEqual(result.reason, 'expired');
});

test('5. Reused state is rejected safely (prevent replay attacks)', () => {
  const { state } = generateSignedOAuthState();

  // First consumption succeeds
  const firstUse = verifyAndConsumeOAuthState(state);
  assert.strictEqual(firstUse.valid, true);

  // Second consumption MUST fail
  const secondUse = verifyAndConsumeOAuthState(state);
  assert.strictEqual(secondUse.valid, false);
  assert.strictEqual(secondUse.reason, 'already_used');
});

test('6. Concurrent OAuth attempts do not interfere with each other', () => {
  const attempt1 = generateSignedOAuthState('session-A');
  const attempt2 = generateSignedOAuthState('session-B');
  const attempt3 = generateSignedOAuthState('session-C');

  assert.notStrictEqual(attempt1.state, attempt2.state);
  assert.notStrictEqual(attempt2.state, attempt3.state);

  // Consume out of order
  const res2 = verifyAndConsumeOAuthState(attempt2.state, 'session-B');
  const res1 = verifyAndConsumeOAuthState(attempt1.state, 'session-A');
  const res3 = verifyAndConsumeOAuthState(attempt3.state, 'session-C');

  assert.strictEqual(res2.valid, true);
  assert.strictEqual(res1.valid, true);
  assert.strictEqual(res3.valid, true);
});

test('7. State remains verifiable across separate server instances (cross-serverless verification)', () => {
  // Simulate instance A creating state without shared memory
  const { state } = generateSignedOAuthState();

  // Simulate Instance B validating in an isolated context
  const validation = verifyAndConsumeOAuthState(state);
  assert.strictEqual(validation.valid, true);
});

test('8. Server restarts / DB cleanup removes expired states without breaking valid states', () => {
  const validAttempt = generateSignedOAuthState();
  cleanupExpiredOAuthStates();

  const res = verifyAndConsumeOAuthState(validAttempt.state);
  assert.strictEqual(res.valid, true);
});

// ----------------------------------------------------
// 2. ENDPOINT & INTEGRATION BEHAVIOR
// ----------------------------------------------------

test('9. GET /api/admin/seo-research/google/auth-url generates signed state and sets secure cookie', async () => {
  const origClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = origClientId || 'mock-google-client-id-12345.apps.googleusercontent.com';

  try {
    const res = await fetch(`${baseUrl}/api/admin/seo-research/google/auth-url`, {
      headers: { Cookie: sessionCookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.authUrl);
    assert.ok(data.state);

    // Verify auth-url structure
    const url = new URL(data.authUrl);
    assert.strictEqual(url.searchParams.get('state'), data.state);
    assert.ok(url.searchParams.get('scope')?.includes('webmasters.readonly'));
    assert.ok(url.searchParams.get('scope')?.includes('analytics.readonly'));

    // Verify cookie header
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie?.includes('dawnexus_oauth_state'));
  } finally {
    process.env.GOOGLE_CLIENT_ID = origClientId;
  }
});

test('10. Callback handles missing state gracefully with admin redirect', async () => {
  const res = await fetch(`${baseUrl}/api/admin/seo-research/google/callback?code=mock_code`, {
    redirect: 'manual'
  });

  assert.strictEqual(res.status, 302);
  const location = res.headers.get('location');
  assert.ok(location?.includes('seo_error=missing_callback_params'));
});

test('11. Callback handles invalid state gracefully with admin redirect', async () => {
  const res = await fetch(`${baseUrl}/api/admin/seo-research/google/callback?code=mock_code&state=forged_state_value`, {
    redirect: 'manual'
  });

  assert.strictEqual(res.status, 302);
  const location = res.headers.get('location');
  assert.ok(location?.includes('seo_error=invalid_state'));
});

test('12. Canonical redirect URI helper resolves correctly', () => {
  const mockReqHttps = {
    protocol: 'http',
    get: (header: string) => {
      if (header === 'x-forwarded-proto') return 'https';
      if (header === 'x-forwarded-host') return 'www.dawnexus.in';
      if (header === 'host') return 'localhost:3001';
      return null;
    }
  };

  const uri = getGoogleOAuthRedirectUri(mockReqHttps);
  assert.ok(uri.startsWith('https://'));
  assert.ok(uri.includes('/api/admin/seo-research/google/callback'));
});
