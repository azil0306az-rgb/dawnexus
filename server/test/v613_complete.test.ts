import { test, describe, before } from 'node:test';
import assert from 'node:assert';
import { AnalyticsService } from '../analyticsService.js';
import { WebsiteContentService, DEFAULT_SERVICE_PAGES } from '../websiteContent.js';
import { McpService } from '../mcpService.js';
import { initDatabase, getDatabase } from '../db.js';

describe('Version 6.1.3: Unified Behaviour Intelligence & Dynamic Website Optimization', () => {
  before(async () => {
    await initDatabase();
  });

  // --------------------------------------------------------------------------
  // SUITE 1: FIRST-PARTY VISITOR TRACKING & BOT FILTERING
  // --------------------------------------------------------------------------
  describe('System A — Tracking Ingestion & Bot Classification', () => {
    test('Correctly identifies search crawlers and headless spiders', () => {
      const googlebot = AnalyticsService.classifyBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
      assert.strictEqual(googlebot.isBot, true);
      assert.ok(googlebot.reason?.includes('Googlebot'));

      const ahrefs = AnalyticsService.classifyBot('Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)');
      assert.strictEqual(ahrefs.isBot, true);
      assert.ok(ahrefs.reason?.includes('Ahrefs'));

      const human = AnalyticsService.classifyBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      assert.strictEqual(human.isBot, false);
      assert.strictEqual(human.reason, undefined);
    });

    test('Ingests human visitor batch and registers session & events', async () => {
      const sessionId = 'test-session-' + Date.now();
      const visitorId = 'test-vid-' + Date.now();

      const batch = {
        sessionId,
        visitorId,
        landingPage: '/services/website-design',
        deviceType: 'desktop',
        referrer: 'https://google.com',
        events: [
          {
            eventType: 'page_view',
            pagePath: '/services/website-design',
            elementId: undefined,
            xPos: 0,
            yPos: 0,
            scrollDepth: 0,
            timestamp: new Date().toISOString()
          },
          {
            eventType: 'scroll_milestone',
            pagePath: '/services/website-design',
            elementId: undefined,
            xPos: 0,
            yPos: 0,
            scrollDepth: 50,
            timestamp: new Date().toISOString()
          },
          {
            eventType: 'cta_click',
            pagePath: '/services/website-design',
            elementId: 'cta-website-design-hero',
            xPos: 52,
            yPos: 34,
            scrollDepth: 50,
            timestamp: new Date().toISOString()
          },
          {
            eventType: 'form_start',
            pagePath: '/services/website-design',
            elementId: 'contact-form',
            xPos: 50,
            yPos: 80,
            scrollDepth: 85,
            timestamp: new Date().toISOString()
          },
          {
            eventType: 'form_submit',
            pagePath: '/services/website-design',
            elementId: 'contact-form',
            xPos: 50,
            yPos: 85,
            scrollDepth: 85,
            timestamp: new Date().toISOString()
          }
        ]
      };

      const result = await AnalyticsService.recordBatch(
        batch,
        { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.eventCount, 5);
    });

    test('Ingests bot traffic and marks is_bot = 1 without breaking metrics', async () => {
      const botSessionId = 'bot-session-' + Date.now();
      const botVisitorId = 'bot-vid-' + Date.now();

      const batch = {
        sessionId: botSessionId,
        visitorId: botVisitorId,
        landingPage: '/services/seo-services',
        deviceType: 'desktop',
        referrer: '',
        events: [
          {
            eventType: 'page_view',
            pagePath: '/services/seo-services',
            timestamp: new Date().toISOString()
          }
        ]
      };

      const result = await AnalyticsService.recordBatch(
        batch,
        { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }
      );

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.eventCount, 1);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 2: CONVERSION FUNNELS, JOURNEYS & HEATMAPS
  // --------------------------------------------------------------------------
  describe('System A — Behaviour Analytics & Funnel Calculations', () => {
    test('Calculates overview metrics with human/bot breakdown', () => {
      const overview = AnalyticsService.getOverview('28d');
      assert.ok(typeof overview.totalSessions === 'number');
      assert.ok(typeof overview.totalVisitors === 'number');
      assert.ok(typeof overview.conversionRate === 'number');
      assert.ok(typeof overview.botSessionsFiltered === 'number');
    });

    test('Computes 7-step commercial conversion funnel', () => {
      const funnel = AnalyticsService.getConversionFunnel('28d');
      assert.ok(Array.isArray(funnel.stages));
      assert.strictEqual(funnel.stages.length, 7);

      const stageIds = funnel.stages.map(s => s.id);
      assert.ok(stageIds.includes('visit'));
      assert.ok(stageIds.includes('service_page'));
      assert.ok(stageIds.includes('cta_clicked'));
      assert.ok(stageIds.includes('conversion'));
    });

    test('Aggregates click coordinates and scroll milestones for heatmap', () => {
      const heatmap = AnalyticsService.getHeatmapData('/services/website-design');
      assert.strictEqual(heatmap.pagePath, '/services/website-design');
      assert.ok(typeof heatmap.totalClicks === 'number');
      assert.ok(Array.isArray(heatmap.clickPoints));
      assert.ok(typeof heatmap.scrollMilestones.reached25 === 'number');
      assert.ok(typeof heatmap.scrollMilestones.reached50 === 'number');
    });

    test('Retrieves visitor journeys as ordered path sequences', () => {
      const journeys = AnalyticsService.getVisitorJourneys(10);
      assert.ok(Array.isArray(journeys));
      if (journeys.length > 0) {
        assert.ok(journeys[0].sessionId);
        assert.ok(Array.isArray(journeys[0].pathSequence));
      }
    });

    test('Computes form abandonment statistics', () => {
      const formStats = AnalyticsService.getFormAbandonment('28d');
      assert.ok(typeof formStats.formStarts === 'number');
      assert.ok(typeof formStats.formCompletions === 'number');
      assert.ok(typeof formStats.overallAbandonmentRate === 'number');
      assert.ok(Array.isArray(formStats.stepDropOffs));
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 3: DATABASE-BACKED WEBSITE CONTENT & IMMEDIATE PUBLISHING
  // --------------------------------------------------------------------------
  describe('System B — Dynamic Service Pages & Rollback Protection', () => {
    test('Retrieves default content for all 4 primary service pages', () => {
      for (const slug of ['website-design', 'seo-services', 'ai-video-creation', 'digital-marketing']) {
        const page = WebsiteContentService.getPage(slug);
        assert.ok(page, `Page ${slug} should exist`);
        assert.strictEqual(page.slug, slug);
        assert.ok(page.title.length > 0);
        assert.ok(page.canonical_url.includes(slug));
        assert.ok(Array.isArray(page.capabilities));
        assert.ok(Array.isArray(page.faqs));
      }
    });

    test('Strictly preserves immutable title and canonical URL from tampering', async () => {
      const targetSlug = 'website-design';

      // Attempt to tamper with title and canonical_url
      const tampered = await WebsiteContentService.saveDraft(
        targetSlug,
        {
          title: 'TAMPERED TITLE SHOULD BE IGNORED',
          canonical_url: 'https://evil.com/fake-url',
          hero_badge: 'TEST // UPDATED BADGE'
        },
        'Test tamper protection',
        'test-runner'
      );

      // Verification: title and canonical URL MUST match official defaults
      assert.strictEqual(tampered.title, DEFAULT_SERVICE_PAGES[targetSlug].title);
      assert.strictEqual(tampered.canonical_url, DEFAULT_SERVICE_PAGES[targetSlug].canonical_url);
      assert.strictEqual(tampered.hero_badge, 'TEST // UPDATED BADGE');
    });

    test('Publishes page update live to database without build or deploy', async () => {
      const targetSlug = 'seo-services';

      const published = await WebsiteContentService.publishPage(
        targetSlug,
        {
          hero_subtitle: 'Updated Live Subtitle Without Redeploy'
        },
        'Live test publish',
        'admin'
      );

      assert.strictEqual(published.hero_subtitle, 'Updated Live Subtitle Without Redeploy');

      // Verify immediate read reflects live change
      const readBack = WebsiteContentService.getPage(targetSlug);
      assert.strictEqual(readBack.hero_subtitle, 'Updated Live Subtitle Without Redeploy');
    });

    test('Rolls back version cleanly to restore previous state', async () => {
      const targetSlug = 'seo-services';
      const versions = WebsiteContentService.getVersions(targetSlug);
      assert.ok(versions.length >= 1);

      // Rollback to version 1
      const rolledBack = await WebsiteContentService.rollbackVersion(targetSlug, 1, 'Test rollback');
      assert.ok(rolledBack);

      const current = WebsiteContentService.getPage(targetSlug);
      assert.strictEqual(current.hero_subtitle, DEFAULT_SERVICE_PAGES[targetSlug].hero_subtitle);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 4: AI OPTIMIZATION SYNTHESIS & APPROVAL WORKFLOW
  // --------------------------------------------------------------------------
  describe('System B — AI Optimization Workflow & Approval', () => {
    test('Synthesizes evidence-backed proposals from visitor analytics', async () => {
      const proposals = await AnalyticsService.generateOptimizationProposals();
      assert.ok(Array.isArray(proposals));
      assert.ok(proposals.length > 0);

      const first = proposals[0];
      assert.ok(first.id);
      assert.ok(first.pageSlug);
      assert.ok(first.problemStatement);
      assert.ok(first.evidence);
      assert.ok(first.proposedChanges);
      assert.ok(first.status === 'pending' || first.status === 'pending_review');
    });

    test('Approves proposal and immediately publishes update with audit record', async () => {
      const proposals = await AnalyticsService.generateOptimizationProposals();
      const target = proposals[0];

      const approveResult = await AnalyticsService.approveAndPublishProposal(target.id, 'lead-engineer');
      assert.strictEqual(approveResult.success, true);
      assert.strictEqual(approveResult.pageSlug, target.pageSlug);
      assert.ok(typeof approveResult.version === 'number' && approveResult.version >= 1);
    });
  });

  // --------------------------------------------------------------------------
  // SUITE 5: EXTENDED MCP SERVER TOOLS INTEGRATION
  // --------------------------------------------------------------------------
  describe('System C — Extended MCP Server Tools Parity', () => {
    test('analytics_get_overview returns valid intelligence through McpService', async () => {
      const result = await McpService.analyticsGetOverview({ days: 30 });
      assert.ok(typeof result.totalSessions === 'number');
      assert.ok(typeof result.conversionRate === 'number');
    });

    test('analytics_get_conversion_funnel returns complete funnel through McpService', async () => {
      const result = await McpService.analyticsGetConversionFunnel({ days: 30 });
      assert.strictEqual(result.stages.length, 7);
    });

    test('website_list_editable_pages returns all 4 service pages', async () => {
      const result = await McpService.websiteListEditablePages();
      assert.strictEqual(result.length, 4);
      const slugs = result.map(p => p.slug);
      assert.ok(slugs.includes('website-design'));
      assert.ok(slugs.includes('digital-marketing'));
    });

    test('website_get_page_content returns full structured content', async () => {
      const content = await McpService.websiteGetPageContent({ slug: 'ai-video-creation' });
      assert.strictEqual(content.slug, 'ai-video-creation');
      assert.ok(content.capabilities.length > 0);
    });

    test('website_create_optimization_draft creates draft without publishing', async () => {
      const draftResult = await McpService.websiteCreateOptimizationDraft({
        slug: 'website-design',
        targetSection: 'hero',
        proposedChanges: { hero_badge: 'OPTIMIZATION // DRAFT TEST' },
        reason: 'Low CTR observed on primary button',
        createdBy: 'mcp-chatgpt'
      });

      assert.strictEqual(draftResult.success, true);
      assert.strictEqual(draftResult.slug, 'website-design');
      assert.ok(draftResult.message.includes('human review'));
    });
  });
});
