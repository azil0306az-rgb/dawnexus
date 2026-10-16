import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getExpectedMcpKey, getMcpAuditTrail } from '../mcpAuth.js';
import { MCP_TOOLS } from '../mcpServer.js';
import { calculateSeoScore, VALID_CATEGORIES } from '../seoScorer.js';
import { getBlogById, deleteBlog, persistBlogDeletion } from '../db.js';

let server: http.Server;
let baseUrl: string;
let mcpToken: string;
let createdDraftId: number;
const uniqueRunId = Date.now();
const testArticleTitle = `B2B Digital Marketing with AI Tools ${uniqueRunId}`;

test.before(async () => {
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

test.after(async () => {
  if (createdDraftId) {
    deleteBlog(createdDraftId);
    try {
      await persistBlogDeletion(createdDraftId);
    } catch {
      // Non-fatal cleanup
    }
  }

  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

// 1. Status & Public Info
test('MCP Status: /api/mcp/status returns 200 with service description and available transports', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/status`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'Dawnexus AI SEO Studio MCP Server');
  assert.equal(data.toolsCount, MCP_TOOLS.length);
  assert.ok(Array.isArray(data.transport));
});

// 2. OpenAPI Schema for ChatGPT Custom GPT Actions
test('OpenAPI: /api/mcp/openapi.json returns valid OpenAPI 3.1 schema', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/openapi.json`);
  assert.equal(res.status, 200);
  const spec = await res.json();
  assert.equal(spec.openapi, '3.1.0');
  assert.equal(spec.info.title, 'Dawnexus AI SEO Studio API');
  assert.ok(spec.paths['/tools/categories']);
  assert.ok(spec.paths['/tools/articles']);
  assert.ok(spec.paths['/tools/drafts']);
  assert.ok(spec.paths['/tools/attach-image']);
  assert.ok(spec.paths['/tools/seo-check']);
});

// 3. Security & Authentication Rejection
test('Security: Protected MCP endpoints reject unauthenticated requests', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/categories`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.ok(data.error.includes('Unauthorized'));
});

test('Security: Protected MCP endpoints reject invalid API keys', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/categories`, {
    headers: { Authorization: 'Bearer totally-invalid-token-xyz' }
  });
  assert.equal(res.status, 403);
  const data = await res.json();
  assert.ok(data.error.includes('Forbidden'));
});

// 4. Read Tools via REST Bridge
test('MCP Tools: get_blog_categories returns exact verified CMS categories', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/categories`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.categories));
  assert.equal(data.categories.length, VALID_CATEGORIES.length);
  
  const names = data.categories.map((c: any) => c.name);
  for (const cat of VALID_CATEGORIES) {
    assert.ok(names.includes(cat), `Category list must contain ${cat}`);
  }
});

test('MCP Tools: get_existing_articles returns articles and authentic internal link targets', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/articles`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.articles));
  assert.ok(Array.isArray(data.internalLinkTargets));
  
  const targetUrls = data.internalLinkTargets.map((t: any) => t.url);
  assert.ok(targetUrls.includes('https://dawnexus.in/'));
  assert.ok(targetUrls.includes('https://dawnexus.in/services/website-design'));
  assert.ok(targetUrls.includes('https://dawnexus.in/services/seo-services'));
  assert.ok(targetUrls.includes('https://dawnexus.in/website-cost-calculator'));
});

test('MCP Tools: get_search_console_opportunities returns real status without fabricating metrics', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/search-console`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(['connected', 'diagnostic', 'error'].includes(data.status));
  assert.ok(typeof data.hasLiveMetrics === 'boolean');
  assert.equal(data.property, 'https://dawnexus.in/');
  if (!data.hasLiveMetrics) {
    assert.ok(data.diagnosticMessage);
    assert.equal(data.opportunities.length, 0); // Must NOT fabricate fake metrics
  }
});

test('MCP Tools: get_weekly_content_context aggregates categories, drafts, and link targets', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/weekly-context`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.categories));
  assert.ok(Array.isArray(data.publishedArticles));
  assert.ok(Array.isArray(data.internalLinkTargets));
  assert.ok(data.contentGuidelines);
  assert.equal(data.contentGuidelines.publicationPolicy, 'Draft first. Human approval and scheduling strictly required through the Dawnexus Admin panel.');
});

// 5. JSON-RPC Protocol Endpoint (/api/mcp/rpc)
test('JSON-RPC 2.0: initialize and tools/list protocol handling', async () => {
  // initialize
  const initRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    })
  });
  assert.equal(initRes.status, 200);
  const initData = await initRes.json();
  assert.equal(initData.result.serverInfo.name, 'dawnexus-ai-seo-studio');

  // tools/list
  const listRes = await fetch(`${baseUrl}/api/mcp/rpc`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
      params: {}
    })
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json();
  assert.equal(listData.result.tools.length, MCP_TOOLS.length);
});

// 6. Draft Creation, Validation, and Prohibition of Direct Publishing
test('MCP Write Validation: Rejects invalid categories not present in CMS', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Invalid Category Post',
      category: 'NonExistentCategory123',
      content: 'Sample content for invalid category test.'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Category \'NonExistentCategory123\' does not exist'));
});

test('MCP Prohibited Action: Rejects attempting to set status to Published directly', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Unauthorized Auto-Publish Test',
      category: 'Website Design',
      content: 'Trying to bypass human review and publish directly.',
      status: 'Published'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Action prohibited: MCP connector can only create articles with status \'Draft\''));
});

test('MCP Prohibited Action: Rejects attempting to set status to Scheduled directly', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Unauthorized Auto-Schedule Test',
      category: 'SEO Strategy',
      content: 'Trying to bypass human review and schedule directly.',
      status: 'Scheduled',
      scheduled_at: new Date().toISOString()
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Action prohibited'));
});

// 7. Successful Draft Creation & Deterministic SEO Quality Scoring
test('MCP Create Draft: Successfully creates Draft in Supabase & evaluates SEO quality score', async () => {
  const richMarkdownContent = `
# How AI Creative Tools Streamline B2B Digital Marketing in 2026

Modern businesses face intense competition in digital acquisition. To build a resilient growth pipeline, founders and marketing leaders must combine creative agility with high-conversion technical infrastructure. Integrating b2b digital marketing with automated video production unlocks unprecedented marketing throughput.

## 1. The Convergence of AI Video and High-Performance Web Design

Video content now drives over 82% of all organic consumer engagement across multi-channel buyer touchpoints. When B2B buyers search for strategic technology partners, the speed and elegance of the landing page dictate conversion rates. Exploring modern [custom website design services](https://dawnexus.in/services/website-design) provides the foundation required to retain high-intent traffic and nurture enterprise accounts.

### Strategic Implementation Steps
1. Map customer touchpoints to personalized interactive video messages.
2. Implement automated CRM pipelines to capture inbound leads directly without manual latency.
3. Optimize Core Web Vitals to maintain sub-second page rendering and eliminate user friction.

### Technical Architecture Considerations
Modern enterprise architectures demand headless content systems and reactive hydration. Delivering sub-second first input delay ensures visitors stay engaged during product demonstrations and interactive cost assessments.

## 2. Measuring Measurable ROI and Conversion Velocity

Rather than tracking vanity metrics such as generic page impressions, high-performing b2b digital marketing campaigns focus rigorously on customer acquisition cost (CAC), pipeline velocity, and customer lifetime value (LTV). Calculating accurate project investment upfront using the interactive [website cost calculator](https://dawnexus.in/website-cost-calculator) enables predictable quarterly budgeting and eliminates costly scope creep.

### Budgeting for Scalable Performance
Strategic marketing teams allocate resources across three foundational pillars: brand positioning, high-converting digital infrastructure, and systematic audience retargeting. This balanced allocation ensures consistent lead generation across seasonal fluctuations.

## 3. Essential Frameworks for Long-Term Organic Search Authority

Investing in targeted [professional SEO services](https://dawnexus.in/services/seo-services) ensures that technical search authority continuously compounds alongside paid acquisition funnels. By establishing topical authority across specific vertical clusters, enterprises create durable organic moats that competitors cannot easily displace.

### Semantic Clustering and Search Intent Optimization
Effective topical clustering requires addressing informational, commercial investigation, and transactional queries within a structured content hierarchy. Linking foundational guides to targeted service landing pages distributes page authority and signals topical mastery to search algorithms.

## 4. Operational Best Practices for Marketing Leaders

Scaling creative production requires streamlined collaboration between creative directors, copywriters, and technical developers. Establishing unified brand component libraries ensures that every asset conforms to rigorous typographic, color, and accessibility standards.

## Conclusion and Strategic Next Steps

Building a resilient digital footprint requires systematic execution across design, search visibility, and creative media. By aligning technical excellence with authentic audience engagement, modern enterprises achieve sustainable organic growth. Plan your agency roadmap with clarity and measurable milestones.
`;

  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: testArticleTitle,
      category: 'AI Creative',
      content: richMarkdownContent,
      primary_keyword: 'b2b digital marketing',
      secondary_keywords: ['ai video', 'website design services', 'seo services'],
      search_intent: 'Informational',
      target_audience: 'B2B marketing leaders and enterprise founders',
      seo_title: 'AI Creative Tools for B2B Digital Marketing (2026)',
      meta_description: 'Discover how modern AI creative workflows, high-performance website architecture, and SEO strategies transform B2B digital marketing.',
      featured_image: 'https://susdqywigvzcijsvlksb.supabase.co/storage/v1/object/public/blog-images/sample-ai-creative.jpg',
      image_alt: 'Futuristic AI creative workstation showing video marketing analytics'
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  createdDraftId = data.blog.id;
  assert.equal(data.blog.status, 'Draft'); // Strictly Draft
  assert.equal(data.blog.category, 'AI Creative');
  assert.ok(data.blog.id > 0);
  assert.ok(data.seoReport);
  assert.ok(data.seoReport.totalScore >= 90, `Expected score >= 90, got: ${data.seoReport.totalScore}`);
  assert.equal(data.seoReport.meetsThreshold, true);

  // Confirm record in SQLite
  const inDb = getBlogById(createdDraftId);
  assert.ok(inDb);
  assert.equal(inDb.status, 'Draft');
  assert.equal(inDb.category, 'AI Creative');
});

// 8. Duplicate Topic Prevention
test('MCP Duplicate Prevention: Rejects creating second draft with identical title', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: testArticleTitle,
      category: 'AI Creative',
      content: 'Attempting to duplicate identical topic.'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Duplicate topic detected'));
});

// 9. Draft Update
test('MCP Update Draft: Successfully updates draft and recalculates quality score', async () => {
  assert.ok(createdDraftId > 0);
  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts/${createdDraftId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      target_location: 'India & Global',
      meta_description: 'Updated meta description meeting exact 140-character length recommendation for highest SERP click-through rates.'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.blog.target_location, 'India & Global');
  assert.equal(data.blog.status, 'Draft');
  assert.ok(data.seoReport);
});

// 10. Prohibit Modifying Published Articles
test('MCP Protection: Rejects attempt to modify published article through draft tools', async () => {
  // Published article #137 or #138
  const publishedBlog = getBlogById(137) || getBlogById(138);
  assert.ok(publishedBlog, 'Expected published blog #137 or #138');

  const res = await fetch(`${baseUrl}/api/mcp/tools/drafts/${publishedBlog.id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Unauthorized Mod of Published Blog'
    })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Action prohibited: Article'));
  assert.ok(data.error.includes('The MCP connector is strictly prohibited from modifying published, scheduled, or archived articles'));
});

// 11. Attach Blog Image
test('MCP Attach Image: Attaches hosted URL to draft and updates alt text', async () => {
  assert.ok(createdDraftId > 0);
  const imageUrl = 'https://susdqywigvzcijsvlksb.supabase.co/storage/v1/object/public/blog-images/ai-creative-hero.webp';
  const res = await fetch(`${baseUrl}/api/mcp/tools/attach-image`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: createdDraftId,
      image: imageUrl,
      image_alt: 'Futuristic AI Creative design dashboard render in dark mode with lime accents'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.featured_image, imageUrl);
  assert.ok(data.image_alt.includes('Futuristic AI Creative'));

  // Confirm in database
  const updated = getBlogById(createdDraftId);
  assert.equal(updated?.featured_image, imageUrl);
});

// 12. Deterministic SEO Quality Scorer Unit Tests
test('SEO Scorer: Correctly calculates rubric scores and enforces mandatory failures', () => {
  // Comprehensive guide > 800 words with single H1, multiple H2s, H3s, internal links, valid metadata
  const comprehensiveContent = `
# Complete Guide to Selecting a Professional Web Agency

Choosing the right digital partner is one of the most consequential decisions an expanding enterprise will make. A high-converting digital storefront directly influences customer acquisition efficiency and long-term brand equity. Exploring verified [custom website design services](https://dawnexus.in/services/website-design) ensures your architecture is engineered for modern conversion rate optimization.

## 1. Technical Capabilities and Engineering Standards

Before evaluating visual aesthetics, technical decision-makers must inspect an agency's fundamental engineering practices. Sub-second First Contentful Paint (FCP) and seamless mobile responsiveness are essential to maintaining search visibility. Calculating comprehensive project investment using the [website cost calculator](https://dawnexus.in/website-cost-calculator) provides transparent financial benchmarks.

### Core Web Vitals and Page Experience
Modern search engines prioritize pages that render without cumulative layout shifts. Agencies adhering to modern standards eliminate bloat, minimize third-party scripts, and ensure assets hydrate efficiently across all devices.

### Scalable Content Architecture
Whether deploying headless architectures or static generation, your backend content management must empower non-technical editorial staff to publish rich media without compromising performance.

## 2. Strategic Search Engine Optimization Integration

A visually striking website is useless if prospective buyers cannot find it through organic search. Partnering with an agency offering integrated [professional SEO services](https://dawnexus.in/services/seo-services) guarantees that semantic heading hierarchies, structured schema markup, and canonical tags are baked into the code from day one.

### Keyword Intent Alignment
Every landing page must answer specific user intent: informational, commercial investigation, or transactional. Content should address customer pain points directly rather than stuffing redundant keywords.

## 3. Creative Production and High-Impact Visuals

Modern digital branding requires captivating creative assets. Engaging interactive showcases and high-fidelity video demonstrations elevate average session duration and accelerate buyer decision cycles.

### Case Studies and Verifiable Results
Always request verified references and live production URLs. Examining real client outcomes demonstrates whether an agency delivers reliable post-launch support and ongoing performance optimization.

## 4. Contractual Transparency and Project Governance

Clear project milestones, defined deliverables, and transparent communication protocols prevent scope expansion and budget overruns. Professional agencies establish structured weekly check-ins and test-driven deployment schedules.

## Conclusion and Strategic Next Steps

Selecting a premier web agency requires balancing technical rigor, creative innovation, and strategic business alignment. By conducting thorough due diligence across performance, SEO foundation, and portfolio evidence, your organization can forge a collaborative partnership that drives sustainable organic growth.
`;

  const goodReport = calculateSeoScore({
    title: 'How to Choose the Best Professional Web Agency in 2026',
    slug: 'how-to-choose-best-professional-web-agency',
    category: 'Website Design',
    content: comprehensiveContent,
    primary_keyword: 'web agency',
    secondary_keywords: ['website design services', 'seo services', 'website cost calculator'],
    search_intent: 'Informational',
    target_audience: 'Enterprise marketing directors and founders',
    seo_title: 'How to Choose the Best Professional Web Agency (2026)',
    meta_description: 'Comprehensive guide for business owners to evaluate, choose, and partner with the best web agency for maximum digital ROI and scalability.',
    featured_image: 'https://dawnexus.in/assets/showcase.jpg',
    image_alt: 'Modern web development workstation showing responsive analytics'
  });

  assert.ok(goodReport.totalScore >= 90, `Expected score >= 90, got: ${goodReport.totalScore}`);
  assert.equal(goodReport.meetsThreshold, true);
  assert.equal(goodReport.failedChecks.length, 0);

  // Bad draft with broken link and invalid category
  const badReport = calculateSeoScore({
    title: '',
    slug: 'invalid_slug_with_underscores',
    category: 'FakeCategory',
    content: 'Very short content [broken link](https://dawnexus.in/fake-broken-path-12345).',
    primary_keyword: 'unfound keyword'
  });

  assert.ok(badReport.totalScore < 50);
  assert.equal(badReport.meetsThreshold, false);
  assert.ok(badReport.failedChecks.length >= 3);
  assert.ok(badReport.requiredFixes.length >= 2);
});

// 13. Audit Trail Verification
test('Audit Trail: /api/mcp/audit records all read, write, and audit tool operations', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/audit`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.total >= 5);
  assert.ok(Array.isArray(data.trail));
  
  const toolNames = data.trail.map((t: any) => t.tool);
  assert.ok(toolNames.includes('create_blog_draft'));
  assert.ok(toolNames.includes('update_blog_draft'));
  assert.ok(toolNames.includes('attach_blog_image'));
});
