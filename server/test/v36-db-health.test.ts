import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { performDatabaseHealthCheck, getDatabaseHealthStats } from '../dbHealth.js';

let server: http.Server;
let baseUrl: string;
let adminCookie: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  // Admin login
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
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  process.exit(0);
});

test('Database Health: Engine executes real check and returns valid telemetry', async () => {
  const result = await performDatabaseHealthCheck('manual');
  assert.ok(result);
  assert.equal(result.check_type, 'postgres_pooler_ping');
  assert.ok(typeof result.response_time_ms === 'number');
  assert.ok(['Healthy', 'Degraded', 'Unavailable'].includes(result.status));

  const stats = await getDatabaseHealthStats();
  assert.ok(stats.recentHistory.length >= 1);
  assert.ok(stats.lastCheck);
  assert.equal(stats.timezone, 'Asia/Kolkata (IST)');
});

test('Database Health: Admin GET /api/admin/db-health returns stats and check history', async () => {
  const res = await fetch(`${baseUrl}/api/admin/db-health`, {
    headers: { Cookie: adminCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.stats);
  assert.ok(data.stats.recentHistory.length >= 1);
});

test('Database Health: Admin POST /api/admin/db-health/check executes on-demand check', async () => {
  const res = await fetch(`${baseUrl}/api/admin/db-health/check`, {
    method: 'POST',
    headers: { Cookie: adminCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.result);
  assert.equal(data.result.check_type, 'postgres_pooler_ping');
  assert.ok(typeof data.result.response_time_ms === 'number');
});

test('Database Health: Cron GET /api/cron/db-health triggers automated 4-hour check', async () => {
  const res = await fetch(`${baseUrl}/api/cron/db-health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.result);
  assert.ok(data.stats);
  assert.ok(data.stats.recentHistory.length >= 1);
});
