import test from 'node:test';
import assert from 'node:assert/strict';
import { MCP_TOOLS, executeMcpTool } from '../mcpServer.js';
import { SeoQualityService, assessInformationGain, detectContentOverlap } from '../seoQualityService.js';
import { JsonLdService, generateServerJsonLd, validateJsonLdStructure } from '../jsonLdService.js';
import { PayloadAuditService, auditHtmlPayloads } from '../payloadAudit.js';
import { getBlogsRequiringReview, getContextualCtaConfigs, getAiCitationObservations } from '../db.js';

test('V830 - Total MCP Tools Count is 78', () => {
  assert.equal(MCP_TOOLS.length, 78, `Expected 87 MCP tools, but found ${MCP_TOOLS.length}`);
  
  // Verify 5 new Version 8.3.0 SEO tools are registered
  const toolNames = MCP_TOOLS.map(t => t.name);
  assert.ok(toolNames.includes('seo_audit_content_quality'), 'Missing seo_audit_content_quality tool');
  assert.ok(toolNames.includes('seo_audit_ai_discovery'), 'Missing seo_audit_ai_discovery tool');
  assert.ok(toolNames.includes('seo_get_content_freshness'), 'Missing seo_get_content_freshness tool');
  assert.ok(toolNames.includes('seo_validate_structured_data'), 'Missing seo_validate_structured_data tool');
  assert.ok(toolNames.includes('seo_get_html_payload_report'), 'Missing seo_get_html_payload_report tool');
});

test('V830 - Information Gain & Content Quality Assessment', () => {
  const sampleArticle = {
    title: 'Website Redesign Pricing in Coimbatore 2026',
    slug: 'website-redesign-pricing-coimbatore',
    content: '<h2>What determines pricing?</h2><p>Here is an empirical overview.</p><h3>Process</h3><p>We audit infrastructure first.</p>',
    firsthand_observations: 'Over 40 client audits in Coimbatore in 2025-2026 revealed 65% of redesigns were triggered by mobile speed issues.',
    project_examples: 'Redesigned a textile machinery manufacturer website, reducing LCP from 4.2s to 1.4s.',
    case_studies: 'Textile export client achieved a 42% increase in overseas inbound inquiries.',
    original_research_data: 'Dawnexus 2026 local web pricing benchmark across 50 regional firms.',
    implementation_process: 'Step 1: Canonical audit. Step 2: Payload reduction. Step 3: Core Value Path optimization.',
    external_sources: ['https://web.dev/vitals/'],
    author_role: 'Principal Technical Architect',
    author_credentials: '8+ years enterprise web engineering, 50+ Coimbatore client rollouts',
    citation_answer_blocks: [
      {
        heading_text: 'What is the average cost of website redesign in Coimbatore?',
        heading_level: 'h2',
        concise_answer: 'In Coimbatore, a professional business website redesign typically ranges from ₹25,000 for standard 5-to-8 page commercial sites to ₹85,000+ for custom web applications with booking flows or product catalogs, depending on speed optimization and custom UI architecture.',
        supporting_points: ['Catalog size', 'ERP integration', 'Core Web Vitals tuning'],
        source_reference: 'Dawnexus 2026 Local Benchmark'
      }
    ]
  };

  const audit = assessInformationGain(sampleArticle);
  assert.ok(audit.overallScore >= 75, `Expected score >= 75, got ${audit.overallScore}`);
  assert.ok(audit.criteria.length >= 6, 'Expected at least 6 criteria evaluated');
  assert.equal(audit.has_original_data, true, 'Expected has_original_data to be true');
  assert.equal(audit.answer_blocks_count, 1, 'Expected 1 citation answer block');
});

test('V830 - JSON-LD Structured Data Validator (Zero Fabricated Reviews)', () => {
  // Test Organization Schema
  const orgSchema = JsonLdService.generateOrganizationSchema();
  const orgValidation = validateJsonLdStructure(orgSchema);
  assert.equal(orgValidation.isValid, true, 'Organization schema should be valid');
  assert.equal(orgValidation.hasFabricatedReviews, false, 'Organization schema must not have fabricated reviews');

  // Test LocalBusiness conditional check (returns null if no physical walk-in premises)
  const localNull = JsonLdService.generateLocalBusinessSchema({ hasPhysicalPremises: false });
  assert.equal(localNull, null, 'Must return null when physical customer premises are not confirmed');

  // Test fabricated review rejection
  const fabricatedSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: 100
    }
  };
  const fabValidation = validateJsonLdStructure(fabricatedSchema);
  assert.equal(fabValidation.hasFabricatedReviews, true, 'Must flag unsubstantiated AggregateRating without review bodies');
});

test('V830 - HTML Payload Audit against 2 MB Threshold', async () => {
  const report = await auditHtmlPayloads();
  assert.ok(report.routes.length >= 5, 'Expected at least 5 audited routes');
  assert.equal(report.oversizedCount, 0, 'No route should exceed the 2 MB threshold');
  assert.equal(report.overallStatus, 'healthy', 'Overall payload status should be healthy');

  for (const r of report.routes) {
    assert.ok(r.uncompressedBytes < 2 * 1024 * 1024, `Route ${r.route} (${r.uncompressedBytes} bytes) exceeded 2 MB`);
  }
});

test('V830 - Content Freshness & 30/90 Day Review Cycle', () => {
  const freshnessList = getBlogsRequiringReview();
  assert.ok(Array.isArray(freshnessList), 'Freshness list should be an array');
  for (const b of freshnessList) {
    assert.ok(typeof b.days_since_review === 'number', 'Expected days_since_review to be a number');
    assert.ok(typeof b.is_overdue === 'boolean', 'Expected is_overdue to be a boolean');
  }
});

test('V830 - Contextual CTAs Configuration Retrieval', () => {
  const ctas = getContextualCtaConfigs();
  assert.ok(Array.isArray(ctas) && ctas.length >= 4, 'Expected at least 4 default contextual CTAs');
  const serviceKeys = ctas.map(c => c.service_key);
  assert.ok(serviceKeys.includes('website-design'));
  assert.ok(serviceKeys.includes('seo-services'));
  assert.ok(serviceKeys.includes('ai-video-creation'));
  assert.ok(serviceKeys.includes('digital-marketing'));
});

test('V830 - Read-Only MCP SEO Tools Execution', async () => {
  // 1. Freshness tool
  const freshnessRes = await executeMcpTool('seo_get_content_freshness', { filter: 'all' });
  assert.ok(typeof freshnessRes.total === 'number');

  // 2. Structured data validator tool
  const schemaRes = await executeMcpTool('seo_validate_structured_data', { page_type: 'home' });
  assert.equal(schemaRes.is_valid, true);

  // 3. Payload report tool
  const payloadRes = await executeMcpTool('seo_get_html_payload_report', {});
  assert.equal(payloadRes.overallStatus, 'healthy');
  assert.equal(payloadRes.oversizedCount, 0);
});
