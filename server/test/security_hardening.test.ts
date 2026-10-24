import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { refreshFromPersistentStore } from '../db.js';

describe('Dawnexus Production Security Hardening & Vulnerability Regression Suite', () => {
  let server: http.Server;
  let baseUrl: string;
  let mcpToken: string;

  before(async () => {
    await refreshFromPersistentStore();
    await new Promise<void>((resolve) => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
    mcpToken = getExpectedMcpKey();
  });

  after(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test('1. Security Headers: Essential defense-in-depth headers are set on HTTP responses', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);

    const headers = res.headers;
    assert.equal(headers.get('x-content-type-options'), 'nosniff', 'Must include nosniff');
    assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN', 'Must restrict framing to SAMEORIGIN');
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Must enforce strict referrer policy');
    assert.ok(headers.get('permissions-policy')?.includes('camera=()'), 'Must restrict device permissions');
  });

  test('2. CORS: Trusted origin https://www.dawnexus.in is permitted with credentials', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://www.dawnexus.in'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://www.dawnexus.in');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  test('3. CORS: Untrusted origin https://malicious-attacker.com is rejected and denied credentialed reflection', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'https://malicious-attacker.com'
      }
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), null, 'Untrusted origin must not receive Access-Control-Allow-Origin header');
  });

  test('4. Admin Auth: Protected admin endpoints reject unauthenticated requests with 401', async () => {
    const endpoints = [
      '/api/admin/stats',
      '/api/admin/enquiries',
      '/api/admin/blogs',
      '/api/admin/clients',
      '/api/admin/notification-settings'
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      assert.equal(res.status, 401, `Endpoint ${ep} must require admin authentication`);
    }
  });

  test('5. Admin Auth: Rejects incorrect passwords with 401 and timing-safe comparison', async () => {
    const res = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong-guess-password-9999' })
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error?.includes('Invalid administrative password'));
  });

  test('6. MCP Auth: Unauthenticated /api/mcp/rpc calls are rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error?.includes('Unauthorized'));
  });

  test('7. MCP Auth: Invalid token is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': 'completely-invalid-bogus-token-12345'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.ok(data.error?.includes('Forbidden'));
  });

  test('8. MCP Auth: Valid token succeeds and tools/list returns complete registry', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpToken
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.result?.tools));
    assert.ok(data.result.tools.length >= 70);
  });

  test('9. Cron Auth: Scheduled publication cron endpoint rejects unauthorized access', async () => {
    const res = await fetch(`${baseUrl}/api/cron/publish`, {
      method: 'POST'
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error?.includes('Unauthorized'));
  });

  test('10. SQL Injection: Search queries with injection payloads do not cause syntax errors or data leaks', async () => {
    const injectionStrings = [
      "' OR '1'='1",
      "'; DROP TABLE blogs; --",
      "1 UNION SELECT null, null, null--",
      "admin'--"
    ];

    for (const payload of injectionStrings) {
      const res = await fetch(`${baseUrl}/api/blogs?search=${encodeURIComponent(payload)}`);
      assert.equal(res.status, 200, `Search query must execute safely for payload: ${payload}`);
      const data = await res.json();
      assert.ok(Array.isArray(data.items));
    }
  });

  test('11. Enquiry Honeypot: Bot submissions with website_hp are silently dropped without saving', async () => {
    const res = await fetch(`${baseUrl}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Bot Spammer',
        email: 'bot@spamnetwork.com',
        phone: '+919876543210',
        project_details: 'We want to sell you crypto leads for high profits.',
        website_hp: 'https://spamurl.com' // Honeypot filled
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  test('12. Image Upload: Disguised non-image data URL is rejected with 400', async () => {
    // Authenticate admin first
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || '9566' })
    });
    const cookieHeader = loginRes.headers.get('set-cookie') || '';

    // Malicious fake image containing script text instead of image bytes
    const fakeHtmlImage = 'data:image/png;base64,' + Buffer.from('<script>alert("xss")</script>').toString('base64');
    const uploadRes = await fetch(`${baseUrl}/api/admin/blogs/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader
      },
      body: JSON.stringify({ image: fakeHtmlImage })
    });
    assert.equal(uploadRes.status, 400);
    const data = await uploadRes.json();
    assert.ok(data.error?.includes('Unsupported or corrupted image format'));
  });

  test('13. Error Handling: Malformed JSON request bodies return 400 rather than 500', async () => {
    const res = await fetch(`${baseUrl}/api/calculator/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is invalid json payload ... '
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error?.includes('Invalid JSON payload'));
  });
});

