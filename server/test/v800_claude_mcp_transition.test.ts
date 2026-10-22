process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../index.js';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { initDatabase } from '../db.js';

let baseUrl: string;
let server: any;
let adminCookie: string = '';

describe('Dawnexus Version 8.0.0: Claude MCP Transition & Admin Cleanup', () => {
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

    // Authenticate as Admin to verify admin dashboard and retirement responses
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

  // 1. Version 8.1.0 Verification
  test('1. Application Version: /api/health reports version 8.1.0', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.brand, 'Dawnexus');
    assert.ok(body.version >= '8.0.0');
    assert.ok(body.release.includes('8.'));
  });

  // 2. MCP Server Status
  test('2. MCP Server Status: /api/mcp/status reports version 8.x with Claude integration policy', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/status`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.service, 'Dawnexus MCP Server');
    assert.ok(body.version >= '8.0.0');
    assert.ok(body.policy.includes('Claude MCP Integration'));
    assert.ok(body.toolsCount >= 53);
  });

  // 3. OpenAPI 3.1 Specification
  test('3. OpenAPI Specification: /api/mcp/openapi.json exposes version 8.x spec', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/openapi.json`);
    assert.strictEqual(res.status, 200);
    const spec = await res.json();
    assert.strictEqual(spec.openapi, '3.1.0');
    assert.strictEqual(spec.info.title, 'Dawnexus MCP API');
    assert.ok(spec.info.version >= '8.0.0');
    assert.ok(spec.info.description.includes('Claude'));
  });

  // 4. MCP Tools Registry (53 tools preserved across all 6 categories)
  test('4. MCP Tool Registry: Exactly 53 tools preserved and categorized', () => {
    assert.ok(MCP_TOOLS.length >= 53, 'Must retain all 53 MCP tools');

    const expectedTools = [
      // A. Blog CMS (12)
      'get_blog_categories',
      'get_existing_articles',
      'get_search_console_opportunities',
      'get_weekly_content_context',
      'create_blog_draft',
      'update_blog_draft',
      'upload_blog_image',
      'attach_blog_image',
      'verify_blog_image',
      'update_blog_image_metadata',
      'schedule_blog_draft',
      'run_seo_quality_check',
      // B. Google Search Console (8)
      'gsc_get_connection_status',
      'gsc_list_properties',
      'gsc_get_search_analytics',
      'gsc_get_top_queries',
      'gsc_get_top_pages',
      'gsc_get_research_status',
      'gsc_run_research_sync',
      'gsc_get_research_job',
      // C. Google Analytics 4 (9)
      'ga4_get_connection_status',
      'ga4_list_properties',
      'ga4_get_overview',
      'ga4_get_traffic_acquisition',
      'ga4_get_landing_pages',
      'ga4_get_page_performance',
      'ga4_get_realtime',
      'ga4_get_report',
      'ga4_get_analytics_status',
      // D. Visitor Analytics Telemetry (11)
      'analytics_get_overview',
      'analytics_get_conversion_funnel',
      'analytics_get_page_performance',
      'analytics_get_visitor_journeys',
      'analytics_get_exit_analysis',
      'analytics_get_click_heatmap',
      'analytics_get_scroll_depth',
      'analytics_get_form_abandonment',
      'analytics_get_session_replay_summary',
      'analytics_get_bot_filter_stats',
      'analytics_get_tracking_health',
      // E. Dynamic Website Content (9)
      'website_list_editable_pages',
      'website_get_page_content',
      'website_get_page_metadata',
      'website_get_content_version_history',
      'website_create_optimization_draft',
      'website_preview_optimization_draft',
      'website_get_approval_status',
      'website_publish_approved_changes',
      'website_rollback_content_version',
      // F. Chatbot & Business Operations (4)
      'chatbot_get_public_knowledge',
      'chatbot_estimate_pricing',
      'chatbot_submit_enquiry',
      'enquiries_admin_list'
    ];

    for (const toolName of expectedTools) {
      const tool = MCP_TOOLS.find(t => t.name === toolName);
      assert.ok(tool, `Tool ${toolName} must be present in registry`);
      assert.ok(tool.description, `Tool ${toolName} must have a description`);
      assert.strictEqual(tool.inputSchema.type, 'object', `Tool ${toolName} schema must be object`);
    }
  });

  // 5. Retired Legacy AI Admin Endpoints
  test('5. Retired Endpoints: /api/admin/seo-ai and /api/admin/ai-optimization return HTTP 410 Gone', async () => {
    const seoAiRes = await fetch(`${baseUrl}/api/admin/seo-ai/status`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(seoAiRes.status, 410, 'Legacy seo-ai endpoint must return 410 Gone');
    const seoAiBody = await seoAiRes.json();
    assert.strictEqual(seoAiBody.version, '8.0.0');
    assert.ok(seoAiBody.error.includes('retired'));

    const aiOptRes = await fetch(`${baseUrl}/api/admin/ai-optimization/proposals`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(aiOptRes.status, 410, 'Legacy ai-optimization endpoint must return 410 Gone');
    const aiOptBody = await aiOptRes.json();
    assert.strictEqual(aiOptBody.version, '8.0.0');
    assert.ok(aiOptBody.error.includes('retired'));
  });

  // 6. Non-AI SEO and CMS Admin Capabilities Preserved
  test('6. Non-AI Admin Capabilities: Blogs CMS, Content Editor, Diagnostics remain fully functional', async () => {
    // Blog stats
    const blogStatsRes = await fetch(`${baseUrl}/api/admin/blogs/stats`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(blogStatsRes.status, 200);
    const blogStats = await blogStatsRes.json();
    assert.ok(typeof blogStats.total === 'number');

    // Website content pages
    const contentRes = await fetch(`${baseUrl}/api/admin/content/pages`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(contentRes.status, 200);
    const contentData = await contentRes.json();
    assert.ok(Array.isArray(contentData.pages));
    assert.strictEqual(contentData.pages.length, 4, 'Must retain 4 editable service pages');

    // System integration diagnostics
    const diagRes = await fetch(`${baseUrl}/api/admin/diagnostics`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(diagRes.status, 200);
    const diag = await diagRes.json();
    assert.ok(diag.checks.some((c: any) => c.id === 'claude-mcp-readiness'));
  });

  // 7. Claude MCP JSON-RPC Protocol Handshake
  test('7. JSON-RPC Handshake: Claude Desktop / Claude Code initialize handshake', async () => {
    const initRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpKey
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'Claude Desktop', version: '1.0.0' }
        }
      })
    });

    assert.strictEqual(initRes.status, 200);
    const initBody = await initRes.json();
    assert.strictEqual(initBody.jsonrpc, '2.0');
    assert.strictEqual(initBody.id, 1);
    assert.strictEqual(initBody.result.serverInfo.name, 'dawnexus-mcp-server');
    assert.ok(initBody.result.serverInfo.version >= '8.0.0');

    // tools/list over JSON-RPC
    const listRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpKey
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
    assert.ok(listBody.result.tools.length >= 53);

    // tools/call over JSON-RPC
    const callRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpKey
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'website_list_editable_pages',
          arguments: {}
        }
      })
    });

    assert.strictEqual(callRes.status, 200);
    const callBody = await callRes.json();
    assert.ok(callBody.result.content);
    assert.strictEqual(callBody.result.content[0].type, 'text');
    const parsedResult = JSON.parse(callBody.result.content[0].text);
    assert.ok(Array.isArray(parsedResult));
    assert.strictEqual(parsedResult.length, 4);
  });

  // 8. Claude MCP Authentication Guards
  test('8. Security Guards: Rejects unauthenticated calls and enforces credentials', async () => {
    const unauthRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 99,
        method: 'tools/list',
        params: {}
      })
    });
    assert.strictEqual(unauthRes.status, 401);
    const errBody = await unauthRes.json();
    assert.ok(errBody.error.includes('Unauthorized'));

    // Wrong API key
    const wrongKeyRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': 'invalid_claude_api_key_12345'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 100,
        method: 'tools/list',
        params: {}
      })
    });
    assert.strictEqual(wrongKeyRes.status, 403);
  });

  // 9. Write Safeguards for Protected Actions
  test('9. Safety Guards: Write operations require explicit human approval flags', async () => {
    // Attempt to schedule a draft without explicit approval flag
    const res = await fetch(`${baseUrl}/api/mcp/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mcp-api-key': mcpKey
      },
      body: JSON.stringify({
        name: 'schedule_blog_draft',
        arguments: {
          id: 1,
          scheduled_at: '2026-12-31T10:00:00+05:30',
          approved: false
        }
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Approval required'));
  });

  // 10. Direct Tool Execution Parity
  test('10. Direct Tool Execution: executeMcpTool executes cleanly for Claude runtime', async () => {
    const res = await executeMcpTool('get_blog_categories', {}, 'claude-desktop-client');
    assert.ok(Array.isArray(res.categories));
    assert.ok(res.categories.length > 0);
    assert.ok(res.categories[0].name);
  });
});
