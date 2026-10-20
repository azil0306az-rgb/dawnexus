import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../index.js';

let baseUrl: string;
let server: any;
let adminCookie: string;

test.before(async () => {
  server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // Login as admin
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || '9566' })
  });
  assert.equal(loginRes.status, 200);
  adminCookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
  assert.ok(adminCookie.includes('dawnexus_session='));
});

test.after(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(resolve));
  }
});

test('Diagnostics: /api/admin/diagnostics requires authentication', async () => {
  const res = await fetch(`${baseUrl}/api/admin/diagnostics`);
  assert.equal(res.status, 401);
});

test('Diagnostics: /api/admin/diagnostics returns complete diagnostic structure with admin session', async () => {
  const res = await fetch(`${baseUrl}/api/admin/diagnostics`, {
    headers: { Cookie: adminCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.ok(data.timestamp);
  assert.ok(data.overallStatus);
  assert.ok(typeof data.totalChecks === 'number');
  assert.ok(typeof data.passedChecks === 'number');
  assert.ok(Array.isArray(data.checks));
  assert.ok(data.checks.length >= 10);

  const checkIds = data.checks.map((c: any) => c.id);
  assert.ok(checkIds.includes('api-reachability'));
  assert.ok(checkIds.includes('mcp-auth'));
  assert.ok(checkIds.includes('mcp-tools'));
  assert.ok(checkIds.includes('openapi-schema'));
  assert.ok(checkIds.includes('database-persistence'));
  assert.ok(checkIds.includes('cms-connectivity'));
  assert.ok(checkIds.includes('gsc-connection'));
  assert.ok(checkIds.includes('ga4-connection'));
  assert.ok(checkIds.includes('image-storage'));
  assert.ok(checkIds.includes('tool-audit-telemetry'));
  assert.ok(checkIds.includes('website-content-protection'));

  for (const check of data.checks) {
    assert.ok(check.id);
    assert.ok(check.name);
    assert.ok(check.status);
    assert.ok(check.message);
    assert.ok(check.lastTested);
  }
});
