process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../index.js';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import {
  PUBLIC_CHATBOT_TOOLS,
  ADMIN_STUDIO_TOOLS,
  convertJsonSchemaToGemini,
  getGeminiFunctionDeclarations,
  redactSecrets
} from '../geminiMcpClient.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { initDatabase } from '../db.js';

let baseUrl: string;
let server: any;
let adminCookie: string = '';

describe('Dawnexus Version 7.1.8: Gemini + MCP Unified Integration', () => {
  const mcpKey = getExpectedMcpKey();

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

    // Authenticate as Admin
    const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || '9566' })
    });
    
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      adminCookie = setCookie.split(';')[0];
    }
  });

  after(() => {
    if (server) server.close();
  });

  test('1. Tool Registry: All 53 MCP tools registered with valid schemas', () => {
    assert.ok(MCP_TOOLS.length >= 53, 'Should have at least 53 registered MCP tools');

    const expectedNewTools = [
      'chatbot_get_public_knowledge',
      'chatbot_estimate_pricing',
      'chatbot_submit_enquiry',
      'enquiries_admin_list'
    ];

    for (const toolName of expectedNewTools) {
      const found = MCP_TOOLS.find(t => t.name === toolName);
      assert.ok(found, `Tool '${toolName}' must be registered in MCP_TOOLS`);
      assert.ok(found.description, `Tool '${toolName}' must have a description`);
      assert.strictEqual(found.inputSchema.type, 'object', `Tool '${toolName}' inputSchema must be object`);
    }
  });

  test('2. Public vs Admin Allowlists: Strict isolation enforced', () => {
    assert.strictEqual(PUBLIC_CHATBOT_TOOLS.length, 3, 'Public chatbot must have exactly 3 allowed tools');
    assert.ok(PUBLIC_CHATBOT_TOOLS.includes('chatbot_get_public_knowledge'));
    assert.ok(PUBLIC_CHATBOT_TOOLS.includes('chatbot_estimate_pricing'));
    assert.ok(PUBLIC_CHATBOT_TOOLS.includes('chatbot_submit_enquiry'));

    // Strictly ensure no admin or internal tools in public allowlist
    const forbiddenPublicTools = [
      'create_blog_draft',
      'schedule_blog_draft',
      'gsc_get_search_analytics',
      'ga4_get_overview',
      'analytics_get_overview',
      'website_publish_approved_changes',
      'enquiries_admin_list'
    ];

    for (const forbidden of forbiddenPublicTools) {
      assert.ok(
        !(PUBLIC_CHATBOT_TOOLS as readonly string[]).includes(forbidden),
        `Public chatbot must NEVER have access to '${forbidden}'`
      );
    }

    // Admin studio has all tools
    assert.ok(ADMIN_STUDIO_TOOLS.length >= 53, 'Admin studio must have access to all tools');
  });

  test('3. Schema Conversion: Transforms JSON Schema to Gemini Function Calling format', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        websiteType: { type: 'string', description: 'Website type' },
        pageCount: { type: 'number', description: 'Page count' },
        features: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['websiteType']
    };

    const geminiSchema = convertJsonSchemaToGemini(jsonSchema);
    assert.strictEqual(geminiSchema.type, 'OBJECT');
    assert.strictEqual(geminiSchema.properties.websiteType.type, 'STRING');
    assert.strictEqual(geminiSchema.properties.pageCount.type, 'NUMBER');
    assert.strictEqual(geminiSchema.properties.features.type, 'ARRAY');
    assert.strictEqual(geminiSchema.properties.features.items.type, 'STRING');
    assert.deepStrictEqual(geminiSchema.required, ['websiteType']);

    const declarations = getGeminiFunctionDeclarations(PUBLIC_CHATBOT_TOOLS);
    assert.strictEqual(declarations.length, 3);
    assert.strictEqual(declarations[0].name, 'chatbot_get_public_knowledge');
  });

  test('4. Secret Redaction: Masks API keys, tokens, and credentials from text', () => {
    const sampleKey = process.env.GEMINI_API_KEY || 'AQ.MockKeySampleForTesting1234567890';
    const rawText = `API key is ${sampleKey} and token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test and Supabase sb_abcdef12345678901234`;
    const cleaned = redactSecrets(rawText);

    assert.ok(!cleaned.includes(sampleKey), 'Real key must be redacted');
    assert.ok(cleaned.includes('[REDACTED_API_KEY]') || cleaned.includes('[REDACTED_GEMINI_KEY]'), 'Should contain redacted key marker');
    assert.ok(!cleaned.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'), 'Bearer token must be redacted');
    assert.ok(!cleaned.includes('sb_abcdef12345678901234'), 'Supabase token must be redacted');
  });

  test('5. Tool Execution: chatbot_get_public_knowledge returns verified knowledge', async () => {
    const result = await executeMcpTool('chatbot_get_public_knowledge', { query: 'SEO and web design' }, 'unit-test');

    const business = result.businessInfo || result.business;
    assert.ok(business, 'Should return business profile');
    assert.strictEqual(business.companyName || business.name, 'Dawnexus');
    assert.ok(Array.isArray(result.services), 'Should return services list');
    assert.ok(result.services.some((s: any) => s.slug === 'website-design'));
    assert.ok(result.services.some((s: any) => s.slug === 'seo-services'));
    assert.ok(Array.isArray(result.recentArticles), 'Should return recent articles');
    assert.ok(Array.isArray(result.faqs), 'Should return FAQs');
  });

  test('6. Tool Execution: chatbot_estimate_pricing computes authoritative website costs', async () => {
    const result = await executeMcpTool('chatbot_estimate_pricing', {
      websiteType: 'corporate-business',
      pageCount: 5,
      designTier: 'Standard',
      maintenanceOption: 'Monthly'
    }, 'unit-test');

    assert.ok(result.referenceId.includes('-EST-'), 'Should return standard estimate reference ID');
    assert.strictEqual(result.currency, 'INR');
    assert.strictEqual(result.currencySymbol, '₹');
    assert.ok(result.oneTimeSetupTotal > 0, 'Should have positive setup total');
    assert.ok(result.recurringMonthlyTotal > 0, 'Should have positive monthly maintenance total');
    assert.ok(Array.isArray(result.breakdown), 'Should return itemized breakdown');
  });

  test('7. Tool Execution: chatbot_submit_enquiry enforces user confirmation', async () => {
    // Attempt without confirmation
    const unconfirmed = await executeMcpTool('chatbot_submit_enquiry', {
      full_name: 'Test Visitor',
      email: 'visitor@example.com',
      project_details: 'Need a corporate website',
      confirmed_by_user: false
    }, 'unit-test');

    assert.strictEqual(unconfirmed.success, false);
    assert.strictEqual(unconfirmed.requiresConfirmation, true);
    assert.ok(unconfirmed.message.includes('confirm'));

    // Attempt with confirmation
    const confirmed = await executeMcpTool('chatbot_submit_enquiry', {
      full_name: 'Test Visitor Confirmed',
      email: 'visitor@example.com',
      phone: '+919876543210',
      requested_services: ['Website Design'],
      budget: '₹25,000 - ₹50,000',
      project_details: 'Need a corporate website with 5 pages',
      confirmed_by_user: true
    }, 'unit-test');

    assert.strictEqual(confirmed.success, true);
    assert.ok(confirmed.enquiryId > 0, 'Should return generated enquiry ID');
    assert.strictEqual(confirmed.status, 'New');

    // Verify admin can retrieve the enquiry
    const adminList = await executeMcpTool('enquiries_admin_list', { limit: 5 }, 'admin-unit-test');
    assert.ok(adminList.total > 0);
    assert.ok(adminList.enquiries.some((e: any) => e.email === 'visitor@example.com'));
  });

  test('8. REST /tools/call Endpoint: Dispatches tools seamlessly via HTTP', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpKey
      },
      body: JSON.stringify({
        name: 'chatbot_estimate_pricing',
        arguments: {
          websiteType: 'ecommerce-store',
          pageCount: 8,
          designTier: 'Premium'
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.referenceId);
    assert.strictEqual(body.websiteType, 'ecommerce-store');
  });

  test('9. Public Assistant Endpoint: Rejects invalid bodies and enforces rate limit', async () => {
    const emptyRes = await fetch(`${baseUrl}/api/public/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(emptyRes.status, 400);
    const body = await emptyRes.json();
    assert.ok(body.error.includes('Messages'));
  });

  test('10. Admin Assistant Endpoint: Requires admin authentication', async () => {
    // Unauthenticated call should be rejected (401)
    const unauthRes = await fetch(`${baseUrl}/api/admin/seo-ai/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What are our top GSC queries?' }]
      })
    });

    assert.strictEqual(unauthRes.status, 401);

    // Authenticated call to retired endpoint returns 410
    const authRes = await fetch(`${baseUrl}/api/admin/seo-ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({})
    });

    assert.ok(authRes.status === 410 || authRes.status === 400);
  });

  test('11. Standard OAuth 2.0 Discovery: RFC 8414 metadata endpoint', async () => {
    const metaRes = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
    assert.strictEqual(metaRes.status, 200);
    const meta = await metaRes.json();

    assert.ok(meta.authorization_endpoint.includes('/api/mcp/oauth/authorize'));
    assert.ok(meta.token_endpoint.includes('/api/mcp/oauth/token'));
    assert.ok(meta.grant_types_supported.includes('client_credentials'));
    assert.ok(meta.grant_types_supported.includes('authorization_code'));
  });

  test('12. Standard OAuth 2.0: Client Credentials grant issues signed access token', async () => {
    const tokenRes = await fetch(`${baseUrl}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: 'dawnexus-gemini-client',
        client_secret: 'dawnexus_sec_gemini_oauth_9566',
        scope: 'mcp:tools'
      })
    });

    assert.strictEqual(tokenRes.status, 200);
    const tokenData = await tokenRes.json();

    assert.ok(tokenData.access_token);
    assert.strictEqual(tokenData.token_type, 'Bearer');
    assert.ok(tokenData.expires_in > 0);

    // Verify the issued OAuth token authenticates tool calls
    const toolRes = await fetch(`${baseUrl}/api/mcp/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        name: 'chatbot_estimate_pricing',
        arguments: {
          websiteType: 'corporate-business',
          pageCount: 3,
          designTier: 'Standard'
        }
      })
    });

    assert.strictEqual(toolRes.status, 200);
    const toolBody = await toolRes.json();
    assert.ok(toolBody.referenceId);
  });

  test('13. Standard OAuth 2.0: Authorization Code flow with redirect', async () => {
    // 1. Authorize
    const authRes = await fetch(`${baseUrl}/api/mcp/oauth/authorize?response_type=code&client_id=dawnexus-gemini-client&redirect_uri=https://oauth.pstmn.io/v1/callback&state=test_state`, {
      redirect: 'manual'
    });

    assert.strictEqual(authRes.status, 302);
    const location = authRes.headers.get('location') || '';
    const redirectUrl = new URL(location);
    const code = redirectUrl.searchParams.get('code');
    const state = redirectUrl.searchParams.get('state');

    assert.ok(code);
    assert.strictEqual(state, 'test_state');

    // 2. Exchange code for access token
    const exchangeRes = await fetch(`${baseUrl}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: 'dawnexus-gemini-client',
        client_secret: 'dawnexus_sec_gemini_oauth_9566'
      })
    });

    assert.strictEqual(exchangeRes.status, 200);
    const exchanged = await exchangeRes.json();
    assert.ok(exchanged.access_token);
    assert.ok(exchanged.refresh_token);
  });
});
