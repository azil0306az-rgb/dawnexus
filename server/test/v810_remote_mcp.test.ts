process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import app from '../index.js';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { initDatabase, createBlog, persistBlog, deleteBlog, persistBlogDeletion } from '../db.js';

let baseUrl: string;
let server: any;
let validMcpApiKey: string;
let oauthBearerToken: string = '';

describe('Dawnexus Version 8.1.0: Remote MCP Server for Claude', () => {
  before(async () => {
    initDatabase();
    validMcpApiKey = getExpectedMcpKey();

    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  // 1. Version 8.1.0 Verification
  test('1. Application Version: /api/health reports version 8.1.0 Remote MCP Integration', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.brand, 'Dawnexus');
    assert.strictEqual(body.version, '8.1.0');
    assert.ok(body.release.includes('8.1.0'));
  });

  // 2. RFC 8414 & RFC 9728 Discovery Metadata
  test('2. RFC 8414 & RFC 9728: Discovery endpoints report OAuth and Protected Resource metadata', async () => {
    // RFC 8414
    const resAuth = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
    assert.strictEqual(resAuth.status, 200);
    const authMeta = await resAuth.json();
    assert.ok(authMeta.authorization_endpoint.includes('/api/mcp/oauth/authorize'));
    assert.ok(authMeta.token_endpoint.includes('/api/mcp/oauth/token'));
    assert.ok(authMeta.code_challenge_methods_supported.includes('S256'));

    // RFC 9728
    const resResource = await fetch(`${baseUrl}/.well-known/oauth-protected-resource`);
    assert.strictEqual(resResource.status, 200);
    const resourceMeta = await resResource.json();
    assert.ok(resourceMeta.resource.includes('/mcp'));
    assert.ok(Array.isArray(resourceMeta.authorization_servers));
  });

  // 3. OAuth 2.0 with PKCE (RFC 7636)
  test('3. OAuth 2.0 PKCE: Generates authorization code and validates S256 code_verifier', async () => {
    // Generate PKCE code verifier and challenge
    const verifier = crypto.randomBytes(32).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');

    // 1. Authorize with PKCE parameters
    const authRes = await fetch(
      `${baseUrl}/api/mcp/oauth/authorize?response_type=code&client_id=dawnexus-claude-client&redirect_uri=https://claude.ai/api/mcp/auth_callback&code_challenge=${challenge}&code_challenge_method=S256&state=claude-state-123`,
      { redirect: 'manual' }
    );
    assert.strictEqual(authRes.status, 302);
    const redirectLocation = authRes.headers.get('location');
    assert.ok(redirectLocation);
    const redirectUrl = new URL(redirectLocation);
    assert.strictEqual(redirectUrl.origin, 'https://claude.ai');
    assert.strictEqual(redirectUrl.pathname, '/api/mcp/auth_callback');
    assert.strictEqual(redirectUrl.searchParams.get('state'), 'claude-state-123');
    const authCode = redirectUrl.searchParams.get('code');
    assert.ok(authCode);

    // 2. Reject Token Exchange with invalid code_verifier
    const badTokenRes = await fetch(`${baseUrl}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: 'dawnexus-claude-client',
        code: authCode,
        code_verifier: 'invalid-verifier-string'
      })
    });
    assert.strictEqual(badTokenRes.status, 400);
    const badTokenBody = await badTokenRes.json();
    assert.strictEqual(badTokenBody.error, 'invalid_grant');

    // 3. Complete Token Exchange with valid code_verifier
    const goodTokenRes = await fetch(`${baseUrl}/api/mcp/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: 'dawnexus-claude-client',
        code: authCode,
        code_verifier: verifier
      })
    });
    assert.strictEqual(goodTokenRes.status, 200);
    const goodTokenBody = await goodTokenRes.json();
    assert.ok(goodTokenBody.access_token);
    assert.strictEqual(goodTokenBody.token_type, 'Bearer');
    oauthBearerToken = goodTokenBody.access_token;
  });

  // 4. Remote MCP Endpoint Status GET /mcp
  test('4. Remote MCP GET /mcp: Returns server metadata and status payload for browser/probes', async () => {
    const res = await fetch(`${baseUrl}/mcp`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ready');
    assert.strictEqual(body.server, 'dawnexus-mcp-server');
    assert.strictEqual(body.version, '8.1.0');
    assert.strictEqual(body.client_target, 'Claude Custom Connector');
    assert.ok(body.tools_count >= 73);
  });

  // 5. Remote MCP Authentication Enforcement
  test('5. Remote MCP Auth: Enforces authentication on POST /mcp', async () => {
    // Unauthenticated
    const resUnauth = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    assert.strictEqual(resUnauth.status, 401);

    // Invalid API Key
    const resBadKey = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': 'invalid_secret_key'
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} })
    });
    assert.strictEqual(resBadKey.status, 403);
  });

  // 6. Remote MCP Streamable HTTP Lifecycle with Claude Custom Connector
  test('6. Streamable HTTP Lifecycle: Initialize, tools/list, and session tracking', async () => {
    // A. Initialize request via Bearer token
    const initRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${oauthBearerToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'claude-ai', version: '1.0.0' }
        }
      })
    });
    assert.strictEqual(initRes.status, 200);
    const sessionId = initRes.headers.get('mcp-session-id');
    assert.ok(sessionId, 'Server must return mcp-session-id header');
    const initBody = await initRes.json();
    assert.strictEqual(initBody.result.serverInfo.name, 'dawnexus-mcp-server');
    assert.strictEqual(initBody.result.serverInfo.version, '8.1.0');

    // B. Notification: initialized
    const notifyRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${oauthBearerToken}`,
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      })
    });
    assert.ok(notifyRes.status === 200 || notifyRes.status === 202);

    // C. tools/list via session
    const listRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'x-mcp-api-key': validMcpApiKey,
        'mcp-session-id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      })
    });
    assert.strictEqual(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.result.tools));
    assert.ok(listBody.result.tools.length >= 73);

    const toolNames = listBody.result.tools.map((t: any) => t.name);
    // Verify canonical Section 5 tools are registered
    assert.ok(toolNames.includes('search_website_content'));
    assert.ok(toolNames.includes('get_website_page'));
    assert.ok(toolNames.includes('list_services'));
    assert.ok(toolNames.includes('get_service_details'));
    assert.ok(toolNames.includes('search_published_blogs'));
    assert.ok(toolNames.includes('get_blog_post'));
    assert.ok(toolNames.includes('get_approved_business_information'));
    assert.ok(toolNames.includes('get_approved_pricing_information'));
    assert.ok(toolNames.includes('list_blog_posts'));
    assert.ok(toolNames.includes('get_blog_post_status'));
    assert.ok(toolNames.includes('schedule_blog_post'));
    assert.ok(toolNames.includes('publish_blog_post'));
    assert.ok(toolNames.includes('list_authorized_enquiries'));
    assert.ok(toolNames.includes('get_authorized_enquiry'));
    assert.ok(toolNames.includes('create_enquiry'));
    assert.ok(toolNames.includes('get_enquiry_submission_status'));
    assert.ok(toolNames.includes('get_visitor_analytics_overview'));
    assert.ok(toolNames.includes('get_conversion_funnel'));
    assert.ok(toolNames.includes('get_page_engagement'));
    assert.ok(toolNames.includes('get_chatbot_analytics'));

    // D. Session Cleanup via DELETE /mcp
    const delRes = await fetch(`${baseUrl}/mcp`, {
      method: 'DELETE',
      headers: {
        'x-mcp-api-key': validMcpApiKey,
        'mcp-session-id': sessionId
      }
    });
    assert.strictEqual(delRes.status, 204);
  });

  // 7. Canonical Tool Execution: Website & Business Information
  test('7. Canonical Tools: search_website_content, list_services, and business info', async () => {
    // list_services
    const servicesResult = await executeMcpTool('list_services');
    assert.ok(Array.isArray(servicesResult.services));
    assert.strictEqual(servicesResult.services.length, 4);

    // get_service_details
    const serviceDetails = await executeMcpTool('get_service_details', { service_id: 'website-design' });
    assert.ok(serviceDetails);

    // get_approved_business_information
    const businessInfo = await executeMcpTool('get_approved_business_information');
    assert.strictEqual(businessInfo.brand, 'Dawnexus');
    assert.strictEqual(businessInfo.location.city, 'Coimbatore');
    assert.strictEqual(businessInfo.location.state, 'Tamil Nadu');

    // get_approved_pricing_information
    const pricingInfo = await executeMcpTool('get_approved_pricing_information');
    assert.ok(pricingInfo.pricingTiers.starter);
  });

  // 8. Canonical Tool Execution: Blog Management & Strict Approval Enforcement
  test('8. Canonical Tools: Blog list, search, and strict approval enforcement on publish', async () => {
    // Create draft blog for testing
    const testDraft = createBlog({
      title: 'Remote MCP Architecture for Claude Testing',
      category: 'Website Design',
      content: '# Testing Remote MCP\n\nHigh performance Model Context Protocol integration with Claude.',
      excerpt: 'Testing remote MCP tools for Dawnexus version 8.1.0',
      status: 'Draft',
      slug: `remote-mcp-test-${Date.now()}`
    });
    assert.ok(testDraft.id);
    await persistBlog(testDraft);

    // list_blog_posts
    const blogList = await executeMcpTool('list_blog_posts', { status: 'all', limit: 5 });
    assert.ok(blogList.total >= 1);

    // get_blog_post_status
    const postStatus = await executeMcpTool('get_blog_post_status', { id: testDraft.id });
    assert.strictEqual(postStatus.id, testDraft.id);
    assert.strictEqual(postStatus.status, 'Draft');

    // publish_blog_post WITHOUT approved: true -> MUST REJECT
    await assert.rejects(
      async () => {
        await executeMcpTool('publish_blog_post', { id: testDraft.id, approved: false });
      },
      (err: any) => err.message.includes('Approval required')
    );

    // publish_blog_post WITH approved: true -> MUST SUCCEED
    const pubResult = await executeMcpTool('publish_blog_post', { id: testDraft.id, approved: true });
    assert.strictEqual(pubResult.success, true);
    assert.strictEqual(pubResult.status, 'Published');
    assert.ok(pubResult.liveUrl.includes('/blog/'));

    // search_published_blogs
    const searchResult = await executeMcpTool('search_published_blogs', { query: 'Remote MCP' });
    assert.ok(searchResult.articles.length >= 1);

    // Clean up test article
    deleteBlog(testDraft.id);
    await persistBlogDeletion(testDraft.id);
  });

  // 9. Canonical Tool Execution: Enquiries & Analytics
  test('9. Canonical Tools: Enquiry creation, status lookup, and analytics telemetry', async () => {
    // create_enquiry
    const enquiryResult = await executeMcpTool('create_enquiry', {
      name: 'Claude Test Client',
      email: 'claude-test@example.com',
      phone: '+91 99999 88888',
      service: 'Website Design',
      message: 'Consultation request from Claude remote MCP verification test suite.'
    });
    assert.strictEqual(enquiryResult.success, true);
    assert.ok(enquiryResult.enquiryId);

    // get_enquiry_submission_status
    const statusResult = await executeMcpTool('get_enquiry_submission_status', {
      id: enquiryResult.enquiryId
    });
    assert.strictEqual(statusResult.found, true);
    assert.strictEqual(statusResult.status, 'New');

    // get_authorized_enquiry
    const enquiryDetails = await executeMcpTool('get_authorized_enquiry', {
      id: enquiryResult.enquiryId
    });
    assert.strictEqual(enquiryDetails.id, enquiryResult.enquiryId);
    assert.strictEqual(enquiryDetails.fullName, 'Claude Test Client');

    // Analytics overview
    const analyticsOverview = await executeMcpTool('get_visitor_analytics_overview', { days: 7 });
    assert.ok(analyticsOverview);

    // Conversion funnel
    const conversionFunnel = await executeMcpTool('get_conversion_funnel', { days: 30 });
    assert.ok(conversionFunnel);

    // Chatbot analytics
    const chatbotAnalytics = await executeMcpTool('get_chatbot_analytics', { days: 30 });
    assert.strictEqual(chatbotAnalytics.assistantStatus, 'Operational');
  });

  // 10. Backward Compatibility Preservation
  test('10. Backward Compatibility: Preserves /api/mcp/sse, /api/mcp/rpc, and /api/mcp/openapi.json', async () => {
    // OpenAPI
    const resOpenApi = await fetch(`${baseUrl}/api/mcp/openapi.json`);
    assert.strictEqual(resOpenApi.status, 200);
    const openapi = await resOpenApi.json();
    assert.strictEqual(openapi.info.title, 'Dawnexus MCP API');

    // JSON-RPC on existing endpoint
    const resRpc = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': validMcpApiKey
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 99,
        method: 'tools/list',
        params: {}
      })
    });
    assert.strictEqual(resRpc.status, 200);
    const rpcBody = await resRpc.json();
    assert.ok(rpcBody.result.tools.length >= 73);
  });
});
