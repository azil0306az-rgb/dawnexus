import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { McpService } from '../mcpService.js';
import { getBlogById, refreshFromPersistentStore } from '../db.js';

describe('Dawnexus CMS — ChatGPT Authorized Access & Evidence Repair', () => {
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

  test('1. Article #698 exists and is Scheduled with exact timestamp 2026-10-23T08:30:00+00:00', async () => {
    const raw = getBlogById(698);
    assert.ok(raw, 'Article #698 must exist');
    assert.equal(raw.id, 698);
    assert.equal(raw.status, 'Scheduled');
    assert.equal(raw.scheduled_at, '2026-10-23T08:30:00+00:00');
    assert.equal(raw.slug, 'website-visitors-few-enquiries-conversion-audit');
  });

  test('2. getBlogPost returns complete 360-degree record with all fields and actionable error handling', async () => {
    const post = await McpService.getBlogPost({ id: 698 });
    assert.ok(post, 'Post must be returned');
    assert.equal(post.id, 698);
    assert.equal(post.status, 'Scheduled');
    assert.equal(post.scheduled_at, '2026-10-23T08:30:00+00:00');
    
    // Core & Metadata fields
    assert.ok('title' in post);
    assert.ok('slug' in post);
    assert.ok('category' in post);
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

    // E-E-A-T & Evidence fields
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
    assert.ok('revision' in post);

    // Internal and external links extracted
    assert.ok(Array.isArray(post.internal_links));
    assert.ok(Array.isArray(post.external_links));

    // Audit scores included
    assert.ok('technical_seo_score' in post);
    assert.ok('information_gain_score' in post);
  });

  test('3. getBlogPost error handling returns actionable messages instead of empty object {}', async () => {
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

  test('4. auditBlogArticle executes dual scoring engine (Technical SEO + E-E-A-T)', async () => {
    const audit = await McpService.auditBlogArticle({ id: 698 });
    assert.equal(audit.id, 698);
    assert.ok(typeof audit.technicalSeo.score === 'number');
    assert.ok(typeof audit.informationGain.overallScore === 'number');
    assert.ok(Array.isArray(audit.informationGain.criteria));
    assert.ok(Array.isArray(audit.summary.strengths));
    assert.ok(Array.isArray(audit.summary.criticalGaps));
  });

  test('5. Status safeguards: updateBlogArticle strictly preserves scheduled_at timestamp for Scheduled articles', async () => {
    const rawBefore = getBlogById(698);
    assert.ok(rawBefore);
    const originalScheduledAt = rawBefore.scheduled_at;
    const originalStatus = rawBefore.status;
    const originalSlug = rawBefore.slug;

    // Passing update fields while scheduled_at is safeguarded
    const updateResult = await McpService.updateBlogArticle({
      id: 698,
      expected_revision: rawBefore.revision,
      author: 'Dawnexus Editorial Team',
      author_role: 'Senior Conversion & SEO Strategist',
      author_credentials: '10+ Years B2B Digital Marketing & Conversion Optimization Lead',
      author_bio: 'Experienced web strategist specializing in B2B landing page conversions, analytics funnels, and enterprise SEO.',
      reviewer_name: 'Lead Technical Reviewer',
      editorial_notes: 'Evidence fields and author credentials updated via authorized MCP.',
      firsthand_observations: 'Direct telemetry audits across 45+ B2B service websites revealed that 68% of form drop-offs happen on redundant telephone fields before page fold.',
      project_examples: JSON.stringify([
        {
          client_industry: 'Coimbatore Textile Manufacturing',
          challenge: 'High visitor traffic (14,000/mo) but under 0.4% enquiry conversion rate',
          solution: 'Replaced multi-step form with inline interactive estimate calculator and clear WhatsApp business channel',
          result: 'Enquiry rate increased from 0.38% to 2.45% in 60 days'
        }
      ]),
      case_studies: JSON.stringify([
        {
          title: 'Industrial Equipment Manufacturer Conversion Overhaul',
          duration: '90 days',
          metrics: {
            before_conversion_rate: '0.42%',
            after_conversion_rate: '2.18%',
            enquiry_volume_increase: '+419%'
          }
        }
      ]),
      original_research_data: JSON.stringify({
        sample_size: '45 B2B websites',
        benchmark_conversion_average: '1.2%',
        top_friction_factor: 'Slow mobile LCP (>3.4s) causing 52% bounce before form view',
        survey_year: '2026'
      }),
      implementation_process: 'Step 1: Inspect GA4 engagement time and drop-off steps. Step 2: Run click heatmap and scroll depth analysis. Step 3: Streamline enquiry form fields to name, contact, and requirements. Step 4: Add verified practitioner proof and client case studies.',
      limitations_lessons: 'Conversion rate improvements vary significantly by industry sector. High-ticket B2B transactions require multi-touch attribution rather than immediate single-visit conversions.',
      external_sources: JSON.stringify([
        { title: 'Google Web Vitals Documentation', url: 'https://web.dev/vitals/' },
        { title: 'Nielsen Norman Group Form Usability Guidelines', url: 'https://www.nngroup.com/articles/web-form-design/' }
      ]),
      citation_answer_blocks: [
        {
          heading_text: 'Why do websites with high traffic receive few enquiries?',
          concise_answer: 'Websites with high traffic but few enquiries typically suffer from three friction points: unclear value propositions above the fold, multi-field form friction, and slow mobile loading speeds that cause visitors to bounce before reaching contact elements.',
          key_takeaways: [
            'Audit above-the-fold value propositions for immediate clarity',
            'Reduce enquiry form fields to essentials (name, contact, requirement)',
            'Ensure sub-second mobile Largest Contentful Paint (LCP)'
          ],
          heading_level: 'h2'
        },
        {
          heading_text: 'What is a good conversion rate benchmark for B2B service websites?',
          concise_answer: 'A healthy conversion rate benchmark for B2B service websites is between 2.0% and 4.5%. Rates below 1.0% indicate critical friction in user journey, page speed, or proposition clarity.',
          key_takeaways: [
            'Average B2B service conversion rate: 1.5% to 3.0%',
            'High-performing optimized B2B sites: >4.0%',
            'Below 1.0% warrants an urgent technical and user experience audit'
          ],
          heading_level: 'h3'
        }
      ]
    });

    assert.equal(updateResult.success, true);
    assert.equal(updateResult.blog.id, 698);
    // CRITICAL: scheduled_at must remain exactly identical
    assert.equal(updateResult.blog.scheduled_at, originalScheduledAt, 'scheduled_at must never be modified or cleared');
    assert.equal(updateResult.blog.status, originalStatus, 'status must remain Scheduled');
    assert.equal(updateResult.blog.slug, originalSlug, 'slug must remain identical');

    // Read back through getBlogPost to verify complete persistence
    const reloaded = await McpService.getBlogPost({ id: 698 });
    assert.equal(reloaded.scheduled_at, originalScheduledAt);
    assert.equal(reloaded.status, originalStatus);
    assert.equal(reloaded.author_role, 'Senior Conversion & SEO Strategist');
    assert.ok(reloaded.firsthand_observations.includes('45+ B2B service websites'));
    assert.equal(reloaded.citation_answer_blocks.length, 2);
    assert.ok(reloaded.information_gain_score > 70, `Information Gain score should now be high (${reloaded.information_gain_score})`);
  });

  test('6. Concurrency check: updateBlogArticle detects stale revision when expected_revision does not match', async () => {
    const raw = getBlogById(698);
    assert.ok(raw);

    await assert.rejects(
      async () => McpService.updateBlogArticle({
        id: 698,
        expected_revision: 'stale-outdated-rev-000',
        author: 'Conflicting Author'
      }),
      /revision conflict/i
    );
  });

  test('7. Batch operations: bulk_audit_blogs audits articles with status counts', async () => {
    const result = await McpService.bulkAuditBlogs({ status: 'all', limit: 10 });
    assert.ok(result.totalAudited > 0);
    assert.ok(Array.isArray(result.results));
    assert.ok(result.summary);
  });

  test('8. Batch operations: bulk_improve_blogs dry_run evaluates without modifying database', async () => {
    const rawBefore = getBlogById(698);
    const dryRunResult = await McpService.bulkImproveBlogs({
      dry_run: true,
      improvements: [
        {
          id: 698,
          updates: {
            author_bio: 'Dry run test author bio that should not persist'
          }
        }
      ]
    });

    assert.equal(dryRunResult.dry_run, true);
    assert.equal(dryRunResult.improvementsCount, 1);
    assert.equal(dryRunResult.results[0].applied, false);

    const rawAfter = getBlogById(698);
    assert.equal(rawAfter.author_bio, rawBefore.author_bio, 'Database must not be altered during dry run');
  });

  test('9. HTTP: /api/mcp/openapi.json exposes new blog tools, schemas, and routes', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/openapi.json`);
    assert.equal(res.status, 200);
    const spec = await res.json();
    assert.equal(spec.openapi, '3.1.0');
    assert.ok(spec.paths['/tools/blogs']);
    assert.ok(spec.paths['/tools/blogs/{id}']);
    assert.ok(spec.paths['/tools/blogs/audit']);
    assert.ok(spec.paths['/tools/blogs/bulk-audit']);
    assert.ok(spec.paths['/tools/blogs/bulk-improve']);
    assert.ok(spec.paths['/tools/drafts/{id}'].get);
    assert.ok(spec.components.schemas.UpdateBlogArticleRequest);
    assert.ok(spec.components.schemas.AuditBlogArticleRequest);
  });

  test('10. HTTP: GET /api/mcp/tools/blogs/698 returns full 360-degree article record', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/blogs/698`, {
      headers: { Authorization: `Bearer ${mcpToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 698);
    assert.equal(data.status, 'Scheduled');
    assert.equal(data.scheduled_at, '2026-10-23T08:30:00+00:00');
    assert.ok(data.author_role.includes('Senior Conversion & SEO Strategist'));
    assert.ok(data.citation_answer_blocks.length >= 2);
    assert.ok(data.information_gain_score > 70);
  });

  test('11. HTTP: GET /api/mcp/tools/drafts/698 acts as transparent route to blog details', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/drafts/698`, {
      headers: { Authorization: `Bearer ${mcpToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, 698);
    assert.equal(data.scheduled_at, '2026-10-23T08:30:00+00:00');
  });

  test('12. HTTP: POST /api/mcp/tools/call executes universal MCP tool handler for ChatGPT', async () => {
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
    assert.equal(result.status, 'Scheduled');
    assert.equal(result.scheduled_at, '2026-10-23T08:30:00+00:00');
  });

  test('13. HTTP: POST /api/mcp/tools/blogs/audit returns dual audit results over REST', async () => {
    const res = await fetch(`${baseUrl}/api/mcp/tools/blogs/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mcpToken}`
      },
      body: JSON.stringify({ id: 698 })
    });
    assert.equal(res.status, 200);
    const audit = await res.json();
    assert.equal(audit.id, 698);
    assert.ok(audit.technical_seo.score >= 90);
    assert.ok(audit.evidence_audit.overall_score >= 80);
  });
});

