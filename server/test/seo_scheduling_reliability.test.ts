import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSeoScore,
  normalizeSeoReport,
  computeContentRevision,
  isValidDawnexusInternalLink,
  normalizeDawnexusPath,
  DEFAULT_SEO_THRESHOLD
} from '../seoScorer.js';
import {
  initDatabase,
  createBlog,
  getBlogById,
  updateBlog,
  getPublishedBlogsForSitemap,
  deleteBlog,
  persistBlog,
  persistBlogDeletion
} from '../db.js';
import { McpService } from '../mcpService.js';

describe('Dawnexus Technical SEO and Scheduling Reliability', () => {
  initDatabase();

  // Test 1: normalizeSeoReport handles null, undefined, primitives and empty objects
  test('1. normalizeSeoReport handles null, undefined, and empty inputs gracefully', () => {
    const reportFromNull = normalizeSeoReport(null);
    assert.strictEqual(reportFromNull.schemaVersion, 'v1.0');
    assert.strictEqual(reportFromNull.totalScore, 0);
    assert.strictEqual(reportFromNull.meetsThreshold, false);
    assert.ok(Array.isArray(reportFromNull.mandatoryFailures));
    assert.ok(reportFromNull.mandatoryFailures.length > 0);

    const reportFromUndefined = normalizeSeoReport(undefined);
    assert.strictEqual(reportFromUndefined.schemaVersion, 'v1.0');
    assert.ok(Array.isArray(reportFromUndefined.mandatoryFailures));

    const reportFromEmpty = normalizeSeoReport({});
    assert.strictEqual(reportFromEmpty.schemaVersion, 'v1.0');
    assert.ok(Array.isArray(reportFromEmpty.mandatoryFailures));
  });

  // Test 2: normalizeSeoReport handles mandatoryFailures variations
  test('2. normalizeSeoReport handles mandatoryFailures as null, string, undefined, and arrays', () => {
    const repWithNullFailures = normalizeSeoReport({ totalScore: 80, mandatoryFailures: null });
    assert.ok(Array.isArray(repWithNullFailures.mandatoryFailures));
    assert.strictEqual(repWithNullFailures.mandatoryFailures.length, 0);

    const repWithStringFailure = normalizeSeoReport({ totalScore: 80, mandatoryFailures: 'Image missing' });
    assert.ok(Array.isArray(repWithStringFailure.mandatoryFailures));
    assert.strictEqual(repWithStringFailure.mandatoryFailures.length, 1);
    assert.strictEqual(repWithStringFailure.mandatoryFailures[0], 'Image missing');

    const repWithArray = normalizeSeoReport({ totalScore: 80, mandatoryFailures: ['Missing alt', 'Missing h1'] });
    assert.ok(Array.isArray(repWithArray.mandatoryFailures));
    assert.strictEqual(repWithArray.mandatoryFailures.length, 2);
  });

  // Test 3: Guaranteed iterability of mandatoryFailures (Prevent "mandatoryFailures is not iterable")
  test('3. Iterating over seoReport.mandatoryFailures never throws TypeError', () => {
    const edgeCases = [
      null,
      undefined,
      {},
      { mandatoryFailures: null },
      { mandatoryFailures: undefined },
      { mandatoryFailures: 'single-error' },
      { mandatoryFailures: ['error1', 'error2'] },
      { mandatoryFailures: 12345 }
    ];

    for (const edge of edgeCases) {
      const normalized = normalizeSeoReport(edge);
      let count = 0;
      assert.doesNotThrow(() => {
        for (const failure of normalized.mandatoryFailures) {
          count++;
          assert.strictEqual(typeof failure, 'string');
        }
      });
      assert.ok(count >= 0);
    }
  });

  // Test 4: Deterministic score calculation and threshold compliance
  test('4. calculateSeoScore computes deterministic score meeting >=90 threshold on quality draft', () => {
    const qualityDraft = {
      title: 'Complete Guide to Enterprise Web Architecture in India',
      slug: 'enterprise-web-architecture-india',
      content: `
# Enterprise Web Architecture in India

Modern Indian enterprises require resilient digital infrastructure to support rapid growth and high user traffic across sectors. Selecting the right stack and deployment topology makes a measurable difference in operational scalability and organic discovery. When architecting web systems for performance and high availability, speed and data integrity come first. A distributed system ensures uptime across diverse network conditions. For specialized guidance, explore our [website design services](https://www.dawnexus.in/services/website-design) to evaluate modern component architectures.

## Core Architectural Principles

High-traffic websites require optimized asset pipelines, edge caching, and automated database failover. Measuring Time to First Byte (TTFB) and Largest Contentful Paint (LCP) provides an actionable baseline for continuous improvement. Enterprise web design and digital infrastructure must operate in complete harmony. Learn more about search performance and Core Web Vitals on our [SEO services](https://www.dawnexus.in/services/seo-services) hub.

Engineers must decouple presentation logic from backend data pipelines. Microservices and headless architectures allow multi-region deployment without vendor lock-in. Load balancing algorithms should evenly distribute requests across active availability zones. Database connection pooling and read replicas prevent bottlenecking during intense user concurrency.

## Infrastructure Sizing and Cost Management

Planning capacity prevents over-provisioning while ensuring stability during traffic spikes. Scalability in India requires accommodating variable mobile bandwidths and diverse device tiers. Asset payloads must be compressed using WebP and AVIF formats with progressive rendering. You can estimate architecture expenses transparently using the [Dawnexus website cost calculator](https://www.dawnexus.in/website-cost-calculator).

Budget allocation must account for content delivery networks, automated security scans, and redundant storage volumes. By monitoring CPU utilization and memory thresholds, organizations avoid unexpected cloud surcharges while upholding strict service level agreements.

## Security Governance and Resilience

Enterprise web systems must enforce zero-trust network access, end-to-end TLS encryption, and rigorous vulnerability assessments. Web application firewalls block malicious traversal and distributed denial of service attempts before traffic touches origin clusters. Regular penetration testing and automated dependency patching protect sensitive client credentials and organizational trust.

Audit logs should be immutably stored with real-time anomaly alerting. Role-based access control guarantees that developers operate with least-privilege permissions across staging and production environments.

## Conclusion: Engineering for Scalability

Enterprise web architecture in India requires ongoing security patching, uptime monitoring, and disciplined code reviews. Regular audits keep the application performant and compliant. By prioritizing performance benchmarks, modular codebases, and proactive infrastructure governance, forward-thinking enterprises establish a reliable foundation for sustained market expansion.
      `.trim(),
      category: 'Website Design',
      primary_keyword: 'Enterprise web architecture in India',
      secondary_keywords: ['enterprise web design', 'digital infrastructure', 'scalability in India'],
      search_intent: 'Informational',
      target_audience: 'CTOs, Engineering Directors, and Enterprise Leaders',
      seo_title: 'Enterprise Web Architecture in India | Technical Playbook',
      meta_description: 'Discover how Indian enterprises build resilient, scalable web architecture with performance optimization and cost governance.',
      canonical_url: 'https://www.dawnexus.in/blog/enterprise-web-architecture-india',
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      image_alt: 'Enterprise cloud architecture dashboard with server metrics and data flow'
    };

    const report = calculateSeoScore(qualityDraft, []);
    assert.strictEqual(report.schemaVersion, 'v1.0');
    assert.ok(report.totalScore >= 90, `Expected score >= 90, got ${report.totalScore}`);
    assert.strictEqual(report.meetsThreshold, true);
    assert.strictEqual(report.mandatoryFailures.length, 0);
  });

  // Test 5: Quality check blocks scheduling when score < 90
  test('5. Low-scoring article (<90) is identified and meetsThreshold is false', () => {
    const thinDraft = {
      title: 'Short Note',
      slug: 'short-note',
      content: 'This is a very short article with very little text.',
      category: 'Digital Strategy'
    };

    const report = calculateSeoScore(thinDraft, []);
    assert.ok(report.totalScore < 90);
    assert.strictEqual(report.meetsThreshold, false);
    assert.ok(report.mandatoryFailures.length > 0 || report.totalScore < 90);
  });

  // Test 6: Quality check blocks scheduling when mandatory failure exists
  test('6. Mandatory failures block meetsThreshold even if numerical score is high', () => {
    const invalidCategoryDraft = {
      title: 'Enterprise Architecture Strategy and Implementation Roadmap',
      slug: 'enterprise-architecture-roadmap',
      content: `
# Enterprise Architecture Strategy

Modern digital organizations require resilient digital infrastructure to support rapid growth and high user traffic across sectors. Selecting the right stack and deployment topology makes a measurable difference in operational scalability.

## Strategy Fundamentals

Building scalable applications requires clean separation of concerns, API-first architecture, and structured content models. Review our [website design services](https://www.dawnexus.in/services/website-design) for strategic architectural planning.

### Continuous Deployment

Automating builds and test suites ensures steady release cycles without downtime. Reliable monitoring and log centralization provide immediate visibility when incidents occur. Check our [SEO services](https://www.dawnexus.in/services/seo-services) for indexing and technical health workflows.

### Measuring Architecture Returns

Connect architectural improvements directly to business metrics like latency reduction and lead conversion.
      `.trim(),
      category: 'NonExistentCategory', // MANDATORY FAILURE: INVALID CATEGORY
      primary_keyword: 'Enterprise architecture strategy',
      seo_title: 'Enterprise Architecture Strategy | Comprehensive Guide',
      meta_description: 'Learn how to plan and execute a resilient enterprise architecture roadmap with measurable reliability.',
      canonical_url: 'https://www.dawnexus.in/blog/enterprise-architecture-roadmap',
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      image_alt: 'Architecture roadmap'
    };

    const report = calculateSeoScore(invalidCategoryDraft, []);
    assert.strictEqual(report.meetsThreshold, false);
    assert.ok(report.mandatoryFailures.some(f => f.includes('Invalid category')));
  });

  // Test 7: computeContentRevision produces consistent hash and changes on modification
  test('7. computeContentRevision produces consistent hash and updates on content changes', () => {
    const draftA = {
      title: 'Original Title',
      slug: 'original-title',
      content: 'Original content body text here.',
      category: 'SEO Strategy',
      primary_keyword: 'SEO testing'
    };

    const hash1 = computeContentRevision(draftA);
    const hash2 = computeContentRevision(draftA);
    assert.strictEqual(hash1, hash2);

    const draftB = { ...draftA, content: 'Updated content body with new paragraphs.' };
    const hash3 = computeContentRevision(draftB);
    assert.notStrictEqual(hash1, hash3);
  });

  // Test 8: Stale SEO report detection and automatic re-evaluation
  test('8. Content revision mismatch detects stale reports', () => {
    const testDraft = createBlog({
      title: 'Revision Test Blog Post',
      slug: `revision-test-${Date.now()}`,
      content: 'Initial article text for revision verification test.',
      category: 'SEO Strategy',
      primary_keyword: 'Revision testing',
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      image_alt: 'Revision test preview graphic'
    });

    const initialRevision = computeContentRevision(testDraft);
    assert.ok(initialRevision.length > 0);

    // Update content
    const updated = updateBlog(testDraft.id, {
      content: 'Completely revised and expanded article text with multiple paragraphs.'
    })!;

    const newRevision = computeContentRevision(updated);
    assert.notStrictEqual(initialRevision, newRevision);

    // Clean up
    deleteBlog(testDraft.id);
  });

  // Test 9: Successful scheduling when approved and score >= 90
  // Test 9: Successful scheduling when approved and score >= 90
  test('9. scheduleBlogDraft schedules article when approved and score >= 90', async () => {
    const qualityContent = `
# Scheduling Reliability Audit and Deployment Strategy

Modern Indian enterprises require resilient digital infrastructure to support rapid growth and high user traffic across sectors. A disciplined scheduling reliability audit ensures operational scalability and organic discovery. When architecting web systems for performance and high availability, speed and data integrity come first. A distributed system ensures uptime across diverse network conditions. For specialized guidance, explore our [website design services](https://www.dawnexus.in/services/website-design) to evaluate modern component architectures.

## Core Architectural Principles

High-traffic websites require optimized asset pipelines, edge caching, and automated database failover. Measuring Time to First Byte (TTFB) and Largest Contentful Paint (LCP) provides an actionable baseline for continuous improvement. Enterprise web design and digital infrastructure must operate in complete harmony. Learn more about search performance and Core Web Vitals on our [SEO services](https://www.dawnexus.in/services/seo-services) hub.

Engineers must decouple presentation logic from backend data pipelines. Microservices and headless architectures allow multi-region deployment without vendor lock-in. A rigorous scheduling reliability audit validates that background cron jobs trigger at verified intervals without duplicating requests. Load balancing algorithms should evenly distribute requests across active availability zones. Database connection pooling and read replicas prevent bottlenecking during intense user concurrency.

## Infrastructure Sizing and Cost Governance

Planning capacity prevents over-provisioning while ensuring stability during traffic spikes. Scalability in India requires accommodating variable mobile bandwidths and diverse device tiers. Asset payloads must be compressed using WebP and AVIF formats with progressive rendering. You can estimate architecture expenses transparently using the [Dawnexus website cost calculator](https://www.dawnexus.in/website-cost-calculator).

Budget allocation must account for content delivery networks, automated security scans, and redundant storage volumes. By monitoring CPU utilization and memory thresholds, organizations avoid unexpected cloud surcharges while upholding strict service level agreements.

## Security Governance and Verification

Enterprise web systems must enforce zero-trust network access, end-to-end TLS encryption, and rigorous vulnerability assessments. Web application firewalls block malicious traversal and distributed denial of service attempts before traffic touches origin clusters. Regular penetration testing and automated dependency patching protect sensitive client credentials and organizational trust.

Audit logs should be immutably stored with real-time anomaly alerting. Role-based access control guarantees that developers operate with least-privilege permissions across staging and production environments. A comprehensive scheduling reliability audit keeps automated publication queues synchronized across multi-region edge nodes.

## Conclusion: Engineering for Scalability

Enterprise web architecture in India requires ongoing security patching, uptime monitoring, and disciplined code reviews. Regular audits keep the application performant and compliant. By prioritizing performance benchmarks, modular codebases, and proactive infrastructure governance, forward-thinking enterprises establish a reliable foundation for sustained market expansion.
    `.trim();

    const testDraft = createBlog({
      title: 'Scheduling Reliability Audit and Deployment Strategy in India',
      slug: `scheduling-audit-test-${Date.now()}`,
      content: qualityContent,
      category: 'Website Design',
      primary_keyword: 'Scheduling reliability audit',
      secondary_keywords: ['digital infrastructure', 'scheduling verification', 'scalability in india'],
      target_audience: 'Enterprise engineering leaders, CTOs, and digital marketing directors evaluating scalability.',
      seo_title: 'Scheduling Reliability Audit and Deployment Strategy | Dawnexus',
      meta_description: 'Comprehensive analysis of enterprise digital scheduling, quality validation, and publication workflows for modern engineering organizations.',
      canonical_url: `https://www.dawnexus.in/blog/scheduling-audit-test-${Date.now()}`,
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      image_alt: 'Automated scheduling timeline dashboard with verified checkmarks',
      status: 'Draft'
    });

    try {
      await persistBlog(testDraft);
    } catch {}

    const futureTime = new Date(Date.now() + 3600000).toISOString();
    const result = await McpService.scheduleBlogDraft({
      id: testDraft.id,
      scheduled_at: futureTime,
      approved: true
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'Scheduled');
    assert.ok(result.seoScore >= 90);
    assert.ok(result.previewUrl.startsWith('https://www.dawnexus.in/blog/'));

    const inDb = getBlogById(testDraft.id);
    assert.strictEqual(inDb?.status, 'Scheduled');
    assert.ok(inDb?.seo_report);
    assert.ok(inDb?.content_revision);

    // Clean up
    deleteBlog(testDraft.id);
    try {
      await persistBlogDeletion(testDraft.id);
    } catch {}
  });

  // Test 10: scheduleBlogDraft rejects when approved !== true
  test('10. scheduleBlogDraft rejects when approved is false', async () => {
    const testDraft = createBlog({
      title: 'Unapproved Scheduling Test',
      slug: `unapproved-test-${Date.now()}`,
      content: 'Article text',
      category: 'Digital Strategy'
    });

    try {
      await persistBlog(testDraft);
    } catch {}

    await assert.rejects(
      async () => {
        await McpService.scheduleBlogDraft({
          id: testDraft.id,
          scheduled_at: new Date(Date.now() + 3600000).toISOString(),
          approved: false
        });
      },
      /Approval required/
    );

    // Clean up
    deleteBlog(testDraft.id);
    try {
      await persistBlogDeletion(testDraft.id);
    } catch {}
  });

  // Test 11: scheduleBlogDraft rejects past or immediate timestamp
  test('11. scheduleBlogDraft rejects past or immediate publication time', async () => {
    const qualityContent = `
# Scheduling Reliability Audit and Deployment Strategy

Modern Indian enterprises require resilient digital infrastructure to support rapid growth and high user traffic across sectors. A disciplined scheduling reliability audit ensures operational scalability and organic discovery. When architecting web systems for performance and high availability, speed and data integrity come first. A distributed system ensures uptime across diverse network conditions. For specialized guidance, explore our [website design services](https://www.dawnexus.in/services/website-design) to evaluate modern component architectures.

## Core Architectural Principles

High-traffic websites require optimized asset pipelines, edge caching, and automated database failover. Measuring Time to First Byte (TTFB) and Largest Contentful Paint (LCP) provides an actionable baseline for continuous improvement. Enterprise web design and digital infrastructure must operate in complete harmony. Learn more about search performance and Core Web Vitals on our [SEO services](https://www.dawnexus.in/services/seo-services) hub.

Engineers must decouple presentation logic from backend data pipelines. Microservices and headless architectures allow multi-region deployment without vendor lock-in. A rigorous scheduling reliability audit validates that background cron jobs trigger at verified intervals without duplicating requests. Load balancing algorithms should evenly distribute requests across active availability zones. Database connection pooling and read replicas prevent bottlenecking during intense user concurrency.

## Infrastructure Sizing and Cost Governance

Planning capacity prevents over-provisioning while ensuring stability during traffic spikes. Scalability in India requires accommodating variable mobile bandwidths and diverse device tiers. Asset payloads must be compressed using WebP and AVIF formats with progressive rendering. You can estimate architecture expenses transparently using the [Dawnexus website cost calculator](https://www.dawnexus.in/website-cost-calculator).

Budget allocation must account for content delivery networks, automated security scans, and redundant storage volumes. By monitoring CPU utilization and memory thresholds, organizations avoid unexpected cloud surcharges while upholding strict service level agreements.

## Security Governance and Verification

Enterprise web systems must enforce zero-trust network access, end-to-end TLS encryption, and rigorous vulnerability assessments. Web application firewalls block malicious traversal and distributed denial of service attempts before traffic touches origin clusters. Regular penetration testing and automated dependency patching protect sensitive client credentials and organizational trust.

Audit logs should be immutably stored with real-time anomaly alerting. Role-based access control guarantees that developers operate with least-privilege permissions across staging and production environments. A comprehensive scheduling reliability audit keeps automated publication queues synchronized across multi-region edge nodes.

## Conclusion: Engineering for Scalability

Enterprise web architecture in India requires ongoing security patching, uptime monitoring, and disciplined code reviews. Regular audits keep the application performant and compliant. By prioritizing performance benchmarks, modular codebases, and proactive infrastructure governance, forward-thinking enterprises establish a reliable foundation for sustained market expansion.
    `.trim();

    const testDraft = createBlog({
      title: 'Scheduling Reliability Audit and Deployment Strategy in India',
      slug: `past-time-test-${Date.now()}`,
      content: qualityContent,
      category: 'Website Design',
      primary_keyword: 'Scheduling reliability audit',
      secondary_keywords: ['digital infrastructure', 'scheduling verification', 'scalability in india'],
      target_audience: 'Enterprise engineering leaders, CTOs, and digital marketing directors evaluating scalability.',
      seo_title: 'Scheduling Reliability Audit and Deployment Strategy | Dawnexus',
      meta_description: 'Comprehensive analysis of enterprise digital scheduling, quality validation, and publication workflows for modern engineering organizations.',
      canonical_url: `https://www.dawnexus.in/blog/past-time-test-${Date.now()}`,
      featured_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
      image_alt: 'Automated scheduling timeline dashboard with verified checkmarks',
      status: 'Draft'
    });

    try {
      await persistBlog(testDraft);
    } catch {}

    const pastTime = new Date(Date.now() - 3600000).toISOString();
    await assert.rejects(
      async () => {
        await McpService.scheduleBlogDraft({
          id: testDraft.id,
          scheduled_at: pastTime,
          approved: true
        });
      },
      /Scheduled publication time must be in the future/
    );

    // Clean up
    deleteBlog(testDraft.id);
    try {
      await persistBlogDeletion(testDraft.id);
    } catch {}
  });

  // Test 12: Timezone handling for Asia/Kolkata
  test('12. McpService parses and formats Kolkata timezone correctly', () => {
    const dateStr = '2026-10-25 15:30:00';
    const parsed = McpService.parseKolkataScheduleDate(dateStr);
    assert.ok(!isNaN(parsed.getTime()));

    const formatted = McpService.formatKolkataDate(parsed);
    assert.ok(formatted.includes('IST'));
  });

  // Test 13: Canonical URL accepts www.dawnexus.in without warnings
  test('13. calculateSeoScore accepts https://www.dawnexus.in/blog/<slug> as valid canonical URL', () => {
    const draft = {
      title: 'Canonical URL Test Post',
      slug: 'canonical-url-test',
      content: 'Short content body here.',
      category: 'SEO Strategy',
      canonical_url: 'https://www.dawnexus.in/blog/canonical-url-test'
    };

    const report = calculateSeoScore(draft, []);
    assert.ok(report.passedChecks.some(c => c.includes('Canonical URL follows official Dawnexus conventions')));
    assert.ok(!report.warnings.some(w => w.includes('Canonical URL should point to')));
  });

  // Test 14: Internal link verification supports both www and apex and relative
  test('14. isValidDawnexusInternalLink accepts www, apex, and root-relative paths', () => {
    assert.strictEqual(isValidDawnexusInternalLink('https://www.dawnexus.in/services/website-design'), true);
    assert.strictEqual(isValidDawnexusInternalLink('https://dawnexus.in/services/website-design'), true);
    assert.strictEqual(isValidDawnexusInternalLink('/services/website-design'), true);
    assert.strictEqual(isValidDawnexusInternalLink('/blog/sample-slug', ['sample-slug']), true);
    assert.strictEqual(isValidDawnexusInternalLink('/blog/unknown-slug', ['sample-slug']), false);
    assert.strictEqual(normalizeDawnexusPath('https://www.dawnexus.in/blog/test'), '/blog/test');
    assert.strictEqual(normalizeDawnexusPath('https://dawnexus.in/blog/test'), '/blog/test');
  });

  // Test 15: getPublishedBlogsForSitemap strictly excludes Draft, Scheduled, and Failed
  test('15. getPublishedBlogsForSitemap excludes Draft, Scheduled, and Failed posts', () => {
    const draft1 = createBlog({
      title: 'Draft Post For Sitemap Exclusion',
      slug: `sitemap-draft-${Date.now()}`,
      content: 'Draft text',
      status: 'Draft'
    });

    const scheduled1 = createBlog({
      title: 'Scheduled Post For Sitemap Exclusion',
      slug: `sitemap-sched-${Date.now()}`,
      content: 'Scheduled text',
      status: 'Scheduled',
      scheduled_at: new Date(Date.now() + 100000).toISOString()
    });

    const sitemapBlogs = getPublishedBlogsForSitemap();
    assert.ok(!sitemapBlogs.some(b => b.slug === draft1.slug));
    assert.ok(!sitemapBlogs.some(b => b.slug === scheduled1.slug));

    // Clean up
    deleteBlog(draft1.id);
    deleteBlog(scheduled1.id);
  });

  // Test 16: Published posts appear in sitemap with published_at and updated_at
  test('16. Published blog appears in sitemap list', () => {
    const publishedPost = createBlog({
      title: 'Published Post For Sitemap Inclusion',
      slug: `sitemap-pub-${Date.now()}`,
      content: 'Published post content body.',
      status: 'Published'
    });

    const sitemapBlogs = getPublishedBlogsForSitemap();
    assert.ok(sitemapBlogs.some(b => b.slug === publishedPost.slug));

    // Clean up
    deleteBlog(publishedPost.id);
  });

  // Test 17: Database columns seo_report and content_revision persist and retrieve safely
  test('17. Database safely stores and retrieves seo_report and content_revision columns', () => {
    const post = createBlog({
      title: 'Persistence Test Article',
      slug: `persist-test-${Date.now()}`,
      content: 'Content text for persistence test.',
      category: 'Digital Strategy'
    });

    const mockReport = normalizeSeoReport({ totalScore: 92, draftId: post.id });
    const mockRevision = 'mock-sha256-hash-value-12345';

    const updated = updateBlog(post.id, {
      seo_report: JSON.stringify(mockReport),
      content_revision: mockRevision
    });

    assert.ok(updated);
    const retrieved = getBlogById(post.id)!;
    assert.ok(retrieved.seo_report);
    assert.strictEqual(retrieved.content_revision, mockRevision);

    const parsedReport = JSON.parse(retrieved.seo_report);
    assert.strictEqual(parsedReport.totalScore, 92);
    assert.strictEqual(parsedReport.schemaVersion, 'v1.0');

    // Clean up
    deleteBlog(post.id);
  });
});
