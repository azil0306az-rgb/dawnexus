import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { publicRouter } from '../routes/api.js';
import { adminRouter } from '../routes/admin.js';
import {
  initDatabase,
  createClient,
  getAllClients,
  getPublicClients,
  updateClient,
  deleteClient,
  reorderClients
} from '../db.js';

function createTestServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);
  return http.createServer(app);
}

test('v3.5 Brand Icons: High contrast icons exist with solid backgrounds', () => {
  const icon96 = path.join(process.cwd(), 'public', 'brand', 'favicon-google-96.png');
  const icon192 = path.join(process.cwd(), 'public', 'brand', 'icon-192.png');
  const icon512 = path.join(process.cwd(), 'public', 'brand', 'icon-512.png');
  const manifest = path.join(process.cwd(), 'public', 'site.webmanifest');
  const favicon = path.join(process.cwd(), 'public', 'favicon.png');

  assert.ok(fs.existsSync(icon96), 'favicon-google-96.png should exist');
  assert.ok(fs.existsSync(icon192), 'icon-192.png should exist');
  assert.ok(fs.existsSync(icon512), 'icon-512.png should exist');
  assert.ok(fs.existsSync(manifest), 'site.webmanifest should exist');
  assert.ok(fs.existsSync(favicon), 'favicon.png must remain preserved');
});

test('v3.5 Client Database: Full CRUD and reordering lifecycle', () => {
  initDatabase();
  
  // 1. Create client
  const created = createClient({
    client_name: 'Test Client Corp',
    website_url: 'https://testclient.example.com',
    logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    hero_preview_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    service_category: 'Website Design & Development',
    description: 'Custom B2B SaaS platform deployment.',
    status: 'Draft'
  });

  assert.ok(created.id > 0, 'Created client should have positive id');
  assert.equal(created.status, 'Draft');

  // 2. Draft should not appear in public query
  const publicBefore = getPublicClients();
  assert.ok(!publicBefore.some(c => c.id === created.id), 'Draft should not appear in public clients');

  // 3. Update client to published
  const updated = updateClient(created.id, {
    client_name: 'Test Client Corp Updated',
    status: 'Published'
  });
  assert.equal(updated?.client_name, 'Test Client Corp Updated');
  assert.equal(updated?.status, 'Published');

  // 4. Now published should appear in public query
  const publicAfter = getPublicClients();
  assert.ok(publicAfter.some(c => c.id === created.id), 'Published client should appear in public clients');

  // 5. Test reordering
  const created2 = createClient({
    client_name: 'Test Client 2',
    website_url: 'https://testclient2.example.com',
    status: 'Published'
  });
  
  reorderClients([created2.id, created.id]);
  const ordered = getAllClients();
  const c2 = ordered.find(c => c.id === created2.id);
  const c1 = ordered.find(c => c.id === created.id);
  assert.ok((c2?.display_order ?? 0) < (c1?.display_order ?? 0), 'Display order should reflect reordering');

  // 6. Clean up
  deleteClient(created.id);
  deleteClient(created2.id);
  const afterDelete = getAllClients();
  assert.ok(!afterDelete.some(c => c.id === created.id || c.id === created2.id), 'Deleted clients should not exist');
});

test('v3.5 HTTP Endpoints: Public API and Admin Protected Routes', async () => {
  const server = createTestServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Public GET /api/clients should return 200
    const publicRes = await fetch(`${baseUrl}/api/clients`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();
    assert.ok(Array.isArray(publicData.items), 'Public clients should return items array');

    // 2. Admin GET /api/admin/clients without auth cookie should return 401
    const unauthRes = await fetch(`${baseUrl}/api/admin/clients`);
    assert.equal(unauthRes.status, 401);

    // 3. Admin login to obtain cookie
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '9566' })
    });
    assert.equal(loginRes.status, 200);
    const cookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(cookieHeader, 'Login should provide set-cookie header');
    const authCookie = cookieHeader.split(';')[0];

    // 4. Authenticated admin can read /api/admin/clients
    const authClientsRes = await fetch(`${baseUrl}/api/admin/clients`, {
      headers: { Cookie: authCookie }
    });
    assert.equal(authClientsRes.status, 200);
    const authClientsData = await authClientsRes.json();
    assert.ok(Array.isArray(authClientsData.items));

    // 5. SSRF validation check: auto-preview rejects private/loopback URLs
    const ssrfRes = await fetch(`${baseUrl}/api/admin/clients/auto-preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: authCookie },
      body: JSON.stringify({ url: 'http://127.0.0.1:8080/secret' })
    });
    assert.equal(ssrfRes.status, 400);
    const ssrfData = await ssrfRes.json();
    assert.ok(ssrfData.error.includes('Valid public website URL'), 'Should block loopback SSRF attempts');

  } finally {
    server.close();
  }
});
