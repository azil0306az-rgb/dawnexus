import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { McpService } from '../mcpService.js';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import { getBlogById, refreshFromPersistentStore } from '../db.js';

describe('Dawnexus Blog CMS — Restored 8.3.0 Baseline & Conventional Technical SEO', () => {
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

  test('1. Article #698 exists with id 698 and expected slug', async () => {
    const raw = getBlogById(698);
    assert.ok(raw, 'Article #698 must exist');
    assert.equal(raw.id, 698);
    assert.equal(raw.slug, 'website-visitors-few-enquiries-conversion-audit');
    assert.ok(raw.title.includes('Website Visitors Not Converting'));
  });

  test('2. get_blog_post returns complete record with all fields and never returns {}', async () => {
    const post = await McpService.getBlogPost({ id: 698 });
    assert.ok(post, 'Post must be returned');
    assert.equal(post.id, 698);
    assert.equal(post.slug, 'website-visitors-few-enquiries-conversion-audit');
    
    // Core & Metadata fields
    assert.ok('title' in post);
    assert.ok('slug' in post);
    assert.ok('category' in post);
    assert.ok('status' in post);
    assert.ok('excerpt' in post);
    assert.ok('content' in post);
    assert.ok('primary_keyword' in post);
    assert.ok('secondary_keywords' in post);
    assert.ok('target_location' in post);
    assert.ok('search_intent' in post);
    assert.ok('target_audience' in post);
    assert.ok('seo_title' in post);
    assert.ok('meta_description' in post);
    assert.ok('canonical_url' in post);
    assert.ok('featured_image' in post);
    assert.ok('image_alt' in post);
    assert.ok('caption' in post);

    // Evidence & E-E-A-T fields (preserved without gating)
    assert.ok('firsthand_observations' in post);
    assert.ok('project_examples' in post);
    assert.ok('case_studies' in post);
    assert.ok('original_research_data' in post);
    assert.ok('implementation_process' in post);
    assert.ok('limitations_lessons' in post);
    assert.ok('external_sources' in post);
    assert.ok('citation_answer_blocks' in post);
    assert.ok('author' in post);
    assert.ok('author_role' in post);
    assert.ok('author_bio' in post);
    assert.ok('author_credentials' in post);
    assert.ok('reviewer_name' in post);
    assert.ok('editorial_notes' in post);
    assert.ok('review_cycle_days' in post);
    assert.ok('last_reviewed_at' in post);
    assert.ok('url' in post);

    // Internal and external links extracted
    assert.ok(Array.isArray(post.internal_links));
    assert.ok(Array.isArray(post.external_links));

    // Conventional Technical SEO score included
    assert.ok('technical_seo_score' in post);
  });

  test('3. get_blog_post error handling returns actionable messages instead of empty object {}', async () => {
    await assert.rejects(
      async () => McpService.getBlogPost({ id: 999999 }),
      /not found/i
    );
    await assert.rejects(
      async () => McpService.getBlogPost({ slug: 'non-existent-slug-xyz' }),
      /not found/i
    );
    await assert.rejects(
      async () => McpService.getBlogPost({}),
      /Please provide either an article/i
    );
  });

  test('4. MCP tool definitions match the 8.3.0 restored baseline (78 tools)', () => {
    assert.equal(MCP_TOOLS.length, 78, `Expected exactly 78 tools, found ${MCP_TOOLS.length}`);
    const names = MCP_TOOLS.map(t => t.name);

    // Baseline core tools must exist
    assert.ok(names.includes('get_blog_post'));
    assert.ok(names.includes('get_blog_post_status'));
    assert.ok(names.includes('list_blog_posts'));
    assert.ok(names.includes('create_blog_draft'));
    assert.ok(names.includes('update_blog_draft'));
    assert.ok(names.includes('schedule_blog_draft'));
    assert.ok(names.includes('schedule_blog_post'));
    assert.ok(names.includes('publish_blog_post'));
    assert.ok(names.includes('run_seo_quality_check'));

    // Experimental bloat tools must NOT exist
    assert.ok(!names.includes('update_blog_article'));
    assert.ok(!names.includes('edit_scheduled_blog'));
    assert.ok(!names.includes('read_blog_post'));
    assert.ok(!names.includes('audit_blog_article'));
    assert.ok(!names.includes('audit_information_gain'));
    assert.ok(!names.includes('run_information_gain_audit'));
    assert.ok(!names.includes('audit_technical_seo'));
    assert.ok(!names.includes('bulk_audit_blogs'));
    assert.ok(!names.includes('bulk_improve_blogs'));
  });

  test('5. Conventional Technical SEO is the single automated scoring requirement', async () => {
    const seoAudit = await McpService.runSeoQualityCheck({ id: 698 });
    assert.ok(seoAudit.totalScore >= 90, `SEO score should be >= 90, got ${seoAudit.totalScore}`);
    assert.equal(seoAudit.meetsThreshold, true);
    assert.equal(seoAudit.threshold, 90);
    assert.ok(seoAudit.passedChecks.length >= 8);
  });

  test('6. Status safeguards: update_blog_draft prohibits modifying published/scheduled articles', async () => {
    await assert.rejects(
      async () => McpService.updateBlogDraft(698, { title: 'Unauthorized Modification' }),
      /prohibited/i
    );
  });

  test('7. HTTP: /api/mcp/openapi.json exposes valid baseline schema', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/openapi.json`);
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.1.0');
    assert.ok(spec.paths['/tools/call']);
    assert.ok(spec.paths['/tools/blogs']);
    assert.ok(spec.paths['/tools/blogs/{id}']);
    assert.ok(spec.components.schemas.BlogArticleResponse);

    // Experimental bloat routes must be removed
    assert.ok(!spec.paths['/tools/blogs/audit']);
    assert.ok(!spec.paths['/tools/blogs/information-gain']);
    assert.ok(!spec.paths['/tools/blogs/bulk-audit']);
    assert.ok(!spec.paths['/tools/blogs/bulk-improve']);
  });

  test('8. HTTP: GET /api/mcp/tools/blogs/698 returns full article record', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/blogs/698`, {
      headers: { Authorization: `Bearer ${mcpToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 698);
    assert.equal(data.slug, 'website-visitors-few-enquiries-conversion-audit');
    assert.ok(data.title.includes('Website Visitors Not Converting'));
    assert.ok(data.url.includes('/blog/website-visitors-few-enquiries-conversion-audit'));
  });

  test('9. HTTP: POST /api/mcp/tools/call executes get_blog_post for ChatGPT and never returns {}', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mcpToken}`
      },
      body: JSON.stringify({
        name: 'get_blog_post',
        arguments: { id: 698 }
      })
    });
    assert.equal(res.status, 200);
    const result = await res.json();
    assert.equal(result.id, 698);
    assert.equal(result.slug, 'website-visitors-few-enquiries-conversion-audit');
    assert.ok(result.content.length > 100);
  });

  test('10. HTTP: POST /api/mcp/rpc executes JSON-RPC tools/call statelessly', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mcpToken}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_blog_post',
          arguments: { id: 698 }
        }
      })
    });
    assert.equal(res.status, 200);
    const jsonRpcRes = await res.json();
    assert.equal(jsonRpcRes.jsonrpc, '2.0');
    assert.equal(jsonRpcRes.id, 1);
    assert.ok(Array.isArray(jsonRpcRes.result.content));
    assert.equal(jsonRpcRes.result.content[0].type, 'text');
    const parsed = JSON.parse(jsonRpcRes.result.content[0].text);
    assert.equal(parsed.id, 698);
    assert.equal(parsed.slug, 'website-visitors-few-enquiries-conversion-audit');
  });
});
