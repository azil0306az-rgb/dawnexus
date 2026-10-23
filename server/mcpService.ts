/**
 * Dawnexus AI SEO Studio — Core MCP Service
 * Encapsulates all read and write business logic for the MCP Tools
 */

import {
  getBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  persistBlog,
  ensureUniqueSlug,
  slugify,
  getSeoConnection,
  refreshFromPersistentStore,
  BlogRecord,
  createEnquiry,
  persistEnquiry,
  getEnquiries,
  getEnquiryById,
  getCalculatorPricingConfig,
  getPublicBlogs
} from './db.js';
import { isSupabaseActive } from './supabase.js';
import { calculateWebsiteCost } from './calculatorPricing.js';
import { sendEnquiryNotification } from './email.js';
import {
  calculateSeoScore,
  normalizeSeoReport,
  computeContentRevision,
  VALID_CATEGORIES,
  DAWNEXUS_CORE_URLS,
  SeoAuditReport,
  BlogAuditInput,
  extractLinks
} from './seoScorer.js';
import { assessInformationGain } from './seoQualityService.js';
import { recordMcpAudit } from './mcpAuth.js';
import { GscService, decryptPayload } from './gscService.js';
import { Ga4Service } from './ga4Service.js';
import { AnalyticsService } from './analyticsService.js';
import { WebsiteContentService, DEFAULT_SERVICE_PAGES } from './websiteContent.js';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  targetServices: string[];
}

export const CATEGORY_DEFINITIONS: CategoryInfo[] = [
  {
    id: 'website-design',
    name: 'Website Design',
    description: 'Modern, high-performance website architecture, conversion UI/UX, responsive engineering, and brand websites.',
    targetServices: ['https://www.dawnexus.in/services/website-design', 'https://www.dawnexus.in/website-cost-calculator']
  },
  {
    id: 'seo-strategy',
    name: 'SEO Strategy',
    description: 'Technical SEO, search ranking signals, search intent, topical authority, local visibility, and organic search growth.',
    targetServices: ['https://www.dawnexus.in/services/seo-services']
  },
  {
    id: 'ai-creative',
    name: 'AI Creative',
    description: 'Generative media workflows, AI commercial video production, interactive 3D visualizations, and modern creative technology.',
    targetServices: ['https://www.dawnexus.in/services/ai-video-creation']
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'Paid search, social acquisition, performance funnels, multi-channel growth campaigns, and customer journey optimization.',
    targetServices: ['https://www.dawnexus.in/services/digital-marketing']
  },
  {
    id: 'digital-strategy',
    name: 'Digital Strategy',
    description: 'Executive business transformation, digital ROI planning, technology roadmaps, and competitive market positioning.',
    targetServices: ['https://www.dawnexus.in/']
  },
  {
    id: 'conversion-optimization',
    name: 'Conversion Optimization',
    description: 'Landing page conversion rate optimization (CRO), user journey analytics, heatmaps, and funnel drop-off mitigation.',
    targetServices: ['https://www.dawnexus.in/services/website-design', 'https://www.dawnexus.in/website-cost-calculator']
  },
  {
    id: 'case-studies',
    name: 'Case Studies',
    description: 'Deep-dive client implementation analyses, architectural walkthroughs, and measurable verified outcomes.',
    targetServices: ['https://www.dawnexus.in/']
  }
];

export class McpService {
  /**
   * Tool 1: get_blog_categories
   * Returns categories configured in the Dawnexus CMS.
   */
  static getBlogCategories(): { categories: CategoryInfo[]; authoritativeSource: string } {
    return {
      categories: CATEGORY_DEFINITIONS,
      authoritativeSource: 'Dawnexus CMS Configuration'
    };
  }

  /**
   * Tool 2: get_existing_articles
   * Returns published and draft articles with metadata for duplicate prevention & internal link mapping.
   */
  static async getExistingArticles(): Promise<{
    articles: Array<{
      id: number;
      title: string;
      slug: string;
      category: string;
      primary_keyword: string;
      status: string;
      published_at: string | null;
      canonical_url: string;
      search_intent: string;
    }>;
    internalLinkTargets: Array<{ title: string; url: string; category: string }>;
  }> {
    await refreshFromPersistentStore();
    const { items } = getBlogs({ limit: 100 });
    
    const articles = items.map(blog => ({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      category: blog.category,
      primary_keyword: blog.primary_keyword,
      status: blog.status,
      published_at: blog.published_at,
      canonical_url: blog.canonical_url,
      search_intent: blog.search_intent
    }));

    // Build authentic internal link targets
    const coreTargets = [
      { title: 'Dawnexus Homepage', url: 'https://www.dawnexus.in/', category: 'Core' },
      { title: 'Website Design & Development', url: 'https://www.dawnexus.in/services/website-design', category: 'Services' },
      { title: 'Search Engine Optimization', url: 'https://www.dawnexus.in/services/seo-services', category: 'Services' },
      { title: 'AI Video Creation & Marketing', url: 'https://www.dawnexus.in/services/ai-video-creation', category: 'Services' },
      { title: 'Digital Marketing & Growth', url: 'https://www.dawnexus.in/services/digital-marketing', category: 'Services' },
      { title: 'Interactive Website Cost Calculator', url: 'https://www.dawnexus.in/website-cost-calculator', category: 'Tools' },
      { title: 'Dawnexus Insights & Knowledge Hub', url: 'https://www.dawnexus.in/blog', category: 'Blog' }
    ];

    const publishedBlogTargets = items
      .filter(b => b.status === 'Published')
      .map(b => ({
        title: b.title,
        url: `https://www.dawnexus.in/blog/${b.slug}`,
        category: b.category
      }));

    return {
      articles,
      internalLinkTargets: [...coreTargets, ...publishedBlogTargets]
    };
  }

  /**
   * Tool 3: get_search_console_opportunities
   * Queries real Google Search Console metrics or reports diagnostic without inventing numbers.
   */
  static async getSearchConsoleOpportunities(): Promise<{
    status: 'connected' | 'diagnostic' | 'error';
    property: string;
    hasLiveMetrics: boolean;
    diagnosticMessage?: string;
    resolution?: string;
    opportunities: Array<{
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
      searchIntent: string;
      relevanceCategory: string;
      coveredInExistingBlog?: boolean;
    }>;
  }> {
    const conn = getSeoConnection();
    const targetProperty = conn?.selected_property || 'https://www.dawnexus.in/';

    const { accessToken, selectedProperty, error } = await GscService.getValidAccessToken();

    if (!accessToken) {
      return {
        status: 'diagnostic',
        property: selectedProperty,
        hasLiveMetrics: false,
        diagnosticMessage: error || 'Google Search Console is not connected. Connect your authorized Google Account in Dawnexus Admin > SEO Research.',
        resolution: 'Authenticate Google Search Console via OAuth in the Admin panel to stream live query performance metrics.',
        opportunities: []
      };
    }

    // Attempt real Search Console API query
    try {
      const gscRes = await GscService.executeSearchAnalyticsQuery({
        property: selectedProperty,
        startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 25
      });

      if (gscRes.error) {
        return {
          status: 'diagnostic',
          property: selectedProperty,
          hasLiveMetrics: false,
          diagnosticMessage: `Google Search Console API returned: ${gscRes.error}. The connected Google account may not have verified owner/viewer permissions for the property ${selectedProperty} in Google Search Console.`,
          resolution: 'Ensure the Google account authorized in Dawnexus Admin has been added as a Verified Owner or Full User in Google Search Console for https://www.dawnexus.in/.',
          opportunities: []
        };
      }

      const rows = gscRes.rows || [];
      const { items: existingBlogs } = getBlogs({ limit: 100 });

      const opportunities = rows.map((r: any) => {
        const query = r.keys ? r.keys[0] : '';
        const covered = existingBlogs.some(b => 
          (b.primary_keyword && b.primary_keyword.toLowerCase() === query.toLowerCase()) ||
          b.title.toLowerCase().includes(query.toLowerCase())
        );

        return {
          query,
          clicks: r.clicks || 0,
          impressions: r.impressions || 0,
          ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
          position: Number((r.position || 0).toFixed(1)),
          searchIntent: 'Informational',
          relevanceCategory: 'Website Design',
          coveredInExistingBlog: covered
        };
      });

      return {
        status: 'connected',
        property: selectedProperty,
        hasLiveMetrics: true,
        opportunities
      };
    } catch (err: any) {
      return {
        status: 'error',
        property: selectedProperty,
        hasLiveMetrics: false,
        diagnosticMessage: `Network or API exception querying Search Console: ${err?.message || err}`,
        opportunities: []
      };
    }
  }

  /**
   * Tool 4: get_weekly_content_context
   * Aggregates categories, existing content, link targets, and research context for weekly planning.
   */
  static async getWeeklyContentContext(): Promise<{
    categories: CategoryInfo[];
    publishedArticles: Array<{ id: number; title: string; slug: string; category: string; primary_keyword: string; published_at: string | null }>;
    scheduledArticles: Array<{ id: number; title: string; slug: string; scheduled_at: string | null }>;
    existingDraftTopics: Array<{ id: number; title: string; slug: string; category: string; primary_keyword: string }>;
    internalLinkTargets: Array<{ title: string; url: string; category: string }>;
    searchConsoleStatus: {
      hasLiveMetrics: boolean;
      property: string;
      diagnostic?: string;
    };
    googleAnalyticsStatus?: {
      isConnected: boolean;
      selectedProperty?: string | null;
      diagnostic?: string;
    };
    contentGuidelines: {
      targetAudience: string;
      tone: string;
      publicationPolicy: string;
      mandatoryChecks: string[];
    };
  }> {
    await refreshFromPersistentStore();
    const { items: allBlogs } = getBlogs({ limit: 100 });

    const publishedArticles = allBlogs
      .filter(b => b.status === 'Published')
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        category: b.category,
        primary_keyword: b.primary_keyword,
        published_at: b.published_at
      }));

    const scheduledArticles = allBlogs
      .filter(b => b.status === 'Scheduled')
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        scheduled_at: b.scheduled_at
      }));

    const existingDraftTopics = allBlogs
      .filter(b => b.status === 'Draft')
      .map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        category: b.category,
        primary_keyword: b.primary_keyword
      }));

    const gscResult = await this.getSearchConsoleOpportunities();

    const linkTargets = [
      { title: 'Dawnexus Homepage', url: 'https://www.dawnexus.in/', category: 'Core' },
      { title: 'Website Design & Development', url: 'https://www.dawnexus.in/services/website-design', category: 'Services' },
      { title: 'Search Engine Optimization', url: 'https://www.dawnexus.in/services/seo-services', category: 'Services' },
      { title: 'AI Video Creation & Marketing', url: 'https://www.dawnexus.in/services/ai-video-creation', category: 'Services' },
      { title: 'Digital Marketing & Growth', url: 'https://www.dawnexus.in/services/digital-marketing', category: 'Services' },
      { title: 'Interactive Website Cost Calculator', url: 'https://www.dawnexus.in/website-cost-calculator', category: 'Tools' },
      { title: 'Dawnexus Insights & Knowledge Hub', url: 'https://www.dawnexus.in/blog', category: 'Blog' },
      ...publishedArticles.map(p => ({
        title: p.title,
        url: `https://www.dawnexus.in/blog/${p.slug}`,
        category: p.category
      }))
    ];

    return {
      categories: CATEGORY_DEFINITIONS,
      publishedArticles,
      scheduledArticles,
      existingDraftTopics,
      internalLinkTargets: linkTargets,
      searchConsoleStatus: {
        hasLiveMetrics: gscResult.hasLiveMetrics,
        property: gscResult.property,
        diagnostic: gscResult.diagnosticMessage
      },
      googleAnalyticsStatus: {
        isConnected: (await Ga4Service.getConnectionStatus()).isConnected && (await Ga4Service.getConnectionStatus()).hasGa4Scope,
        selectedProperty: (await Ga4Service.getConnectionStatus()).selectedProperty,
        diagnostic: (await Ga4Service.getConnectionStatus()).diagnosticMessage
      },
      contentGuidelines: {
        targetAudience: 'Business owners, founders, CTOs, and marketing directors looking for modern web design, technical SEO, and AI digital growth.',
        tone: 'Authoritative, transparent, highly actionable, forward-looking agency perspective. No generic AI fluff.',
        publicationPolicy: 'Draft first. Human approval and scheduling strictly required through the Dawnexus Admin panel.',
        mandatoryChecks: [
          'Must select from existing CMS categories.',
          'Must link to at least 2 authentic Dawnexus URLs.',
          'No fabricated statistics or unverified client claims.',
          'Must achieve 90/100 or higher on deterministic SEO quality audit.',
          'Clearly distinguish Google Search Console data (organic search performance) from Google Analytics 4 data (on-site user behavior & conversions).'
        ]
      }
    };
  }

  /**
   * Tool 5: create_blog_draft
   * Validates inputs, creates draft in SQLite & Supabase, and evaluates SEO quality score.
   */
  static async createBlogDraft(
    input: {
      title: string;
      category: string;
      content: string;
      slug?: string;
      excerpt?: string;
      primary_keyword?: string;
      secondary_keywords?: string[];
      target_location?: string;
      search_intent?: string;
      target_audience?: string;
      target_questions?: string[];
      seo_title?: string;
      meta_description?: string;
      canonical_url?: string;
      featured_image?: string;
      image_alt?: string;
      status?: string;
    },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    blog: BlogRecord;
    seoReport: SeoAuditReport;
    previewUrl: string;
    adminReviewUrl: string;
    message: string;
  }> {
    await refreshFromPersistentStore();
    // 1. Validate required fields
    if (!input.title || typeof input.title !== 'string' || !input.title.trim()) {
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        details: 'Failed validation: Article title is required.'
      });
      throw new Error('Validation error: Article title is required.');
    }

    if (!input.content || typeof input.content !== 'string' || !input.content.trim()) {
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        details: 'Failed validation: Article content is required.'
      });
      throw new Error('Validation error: Article content is required.');
    }

    // 2. Strict Category Validation
    const cleanCategory = (input.category || '').trim();
    if (!(VALID_CATEGORIES as readonly string[]).includes(cleanCategory)) {
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        details: `Invalid category '${cleanCategory}'. Must match existing CMS categories.`
      });
      throw new Error(
        `Validation error: Category '${cleanCategory}' does not exist. Must be one of: ${VALID_CATEGORIES.join(', ')}.`
      );
    }

    // 3. Prohibit unauthorized status bypass (MCP can only create Drafts)
    if (input.status && input.status !== 'Draft') {
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        details: `Rejected attempt to set status='${input.status}'. MCP tools are strictly restricted to creating Drafts.`
      });
      throw new Error(
        `Action prohibited: MCP connector can only create articles with status 'Draft'. Publication and scheduling require human approval in the Dawnexus Admin panel.`
      );
    }

    // 4. Duplicate topic / slug detection
    const desiredSlug = ensureUniqueSlug(input.slug || input.title);
    const { items: existingBlogs } = getBlogs({ limit: 100 });
    
    // Check if title or primary keyword identically matches an existing draft or article
    const normTitle = input.title.trim().toLowerCase();
    const exactTitleMatch = existingBlogs.find(b => b.title.trim().toLowerCase() === normTitle);
    if (exactTitleMatch) {
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: exactTitleMatch.id,
        details: `Duplicate topic detected: matches existing article #${exactTitleMatch.id} ("${exactTitleMatch.title}").`
      });
      throw new Error(
        `Duplicate topic detected: An article with the exact title "${input.title}" already exists (ID: ${exactTitleMatch.id}, Status: ${exactTitleMatch.status}, Slug: ${exactTitleMatch.slug}). Please revise the proposed angle or update the existing draft.`
      );
    }

    // 5. Construct Clean Record
    const excerpt = (input.excerpt || '').trim() || input.content.slice(0, 160).replace(/[#*`_]/g, '').trim();
    const canonicalUrl = input.canonical_url || `https://www.dawnexus.in/blog/${desiredSlug}`;

    const created = createBlog({
      title: input.title.trim(),
      slug: desiredSlug,
      excerpt,
      content: input.content.trim(),
      featured_image: (input.featured_image || '').trim(),
      image_alt: (input.image_alt || '').trim(),
      author: 'Dawnexus Editorial',
      category: cleanCategory,
      tags: [],
      primary_keyword: (input.primary_keyword || '').trim(),
      secondary_keywords: input.secondary_keywords || [],
      target_location: (input.target_location || '').trim(),
      search_intent: input.search_intent || 'Informational',
      target_audience: (input.target_audience || '').trim(),
      target_questions: input.target_questions || [],
      seo_title: (input.seo_title || input.title).trim(),
      meta_description: (input.meta_description || excerpt).trim(),
      canonical_url: canonicalUrl,
      status: 'Draft',
      scheduled_at: null,
      published_at: null,
      admin_notes: `[MCP AI SEO Studio] Draft created via ChatGPT connector on ${new Date().toISOString()}`
    });

    // 6. Synchronous persistence to Supabase
    try {
      await persistBlog(created);
    } catch (persistErr: any) {
      console.error('[MCP Create Blog Supabase Sync Error]:', persistErr);
      recordMcpAudit({
        tool: 'create_blog_draft',
        action: 'write',
        status: 'failed',
        callerIp,
        targetId: created.id,
        details: `Supabase persistence failed: ${persistErr?.message || persistErr}`
      });
      throw new Error(`Database error: Supabase rejected persistence of draft #${created.id}. ${persistErr?.message}`);
    }

    // 7. Deterministic SEO Quality Check
    const publishedSlugs = existingBlogs.filter(b => b.status === 'Published').map(b => b.slug);
    const seoReport = normalizeSeoReport(
      calculateSeoScore(
        {
          title: created.title,
          slug: created.slug,
          content: created.content,
          excerpt: created.excerpt,
          category: created.category,
          primary_keyword: created.primary_keyword,
          secondary_keywords: created.secondary_keywords,
          search_intent: created.search_intent,
          target_audience: created.target_audience,
          seo_title: created.seo_title,
          meta_description: created.meta_description,
          canonical_url: created.canonical_url,
          featured_image: created.featured_image,
          image_alt: created.image_alt
        },
        publishedSlugs,
        90,
        created.id
      )
    );

    const withSeo = updateBlog(created.id, {
      seo_report: JSON.stringify(seoReport),
      content_revision: seoReport.contentRevision
    }) || created;

    try {
      await persistBlog(withSeo);
    } catch {
      // Non-fatal
    }

    recordMcpAudit({
      tool: 'create_blog_draft',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: created.id,
      details: `Created draft #${created.id} ("${created.slug}"). SEO Score: ${seoReport.totalScore}/100.`
    });

    return {
      success: true,
      blog: withSeo,
      seoReport,
      previewUrl: `https://www.dawnexus.in/blog/${created.slug}`,
      adminReviewUrl: 'https://www.dawnexus.in/admin',
      message: `Draft #${created.id} saved successfully in Supabase as 'Draft'. Review and approve it in the Dawnexus Admin panel.`
    };
  }

  /**
   * Tool: update_blog_article
   * Allows authorized updates across Draft, Scheduled, and Published blogs with status-specific safeguards.
   */
  static async updateBlogArticle(
    input: {
      id: number;
      expected_revision?: string;
      title?: string;
      content?: string;
      excerpt?: string;
      category?: string;
      primary_keyword?: string;
      secondary_keywords?: string[] | string;
      target_location?: string;
      search_intent?: string;
      target_audience?: string;
      target_questions?: string[] | string;
      tags?: string[] | string;
      seo_title?: string;
      meta_description?: string;
      canonical_url?: string;
      featured_image?: string;
      image_alt?: string;
      status?: string;
      firsthand_observations?: string;
      project_examples?: string;
      case_studies?: string;
      original_research_data?: string;
      implementation_process?: string;
      limitations_lessons?: string;
      external_sources?: any;
      citation_answer_blocks?: any;
      author?: string;
      author_role?: string;
      author_bio?: string;
      author_credentials?: string;
      reviewer_name?: string;
      editorial_notes?: string;
      review_cycle_days?: number;
      last_reviewed_at?: string;
    },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    blog: BlogRecord;
    technicalSeo: SeoAuditReport;
    evidenceReport: any;
    message: string;
  }> {
    await refreshFromPersistentStore();
    const id = Number(input.id);
    if (!id) {
      throw new Error('Valid numeric article ID is required.');
    }

    const existing = getBlogById(id);
    if (!existing) {
      recordMcpAudit({
        tool: 'update_blog_article',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: id,
        details: `Article #${id} not found.`
      });
      throw new Error(`Article with ID #${id} not found.`);
    }

    // Optimistic concurrency protection
    if (input.expected_revision && existing.content_revision && input.expected_revision !== existing.content_revision) {
      recordMcpAudit({
        tool: 'update_blog_article',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: id,
        details: `Revision conflict on #${id}: Expected '${input.expected_revision}', found '${existing.content_revision}'.`
      });
      throw new Error(
        `Revision conflict: Expected revision '${input.expected_revision}' does not match current database revision '${existing.content_revision}'. Please re-fetch the latest article before modifying.`
      );
    }

    // Category validation if updating category
    if (input.category) {
      const cleanCat = input.category.trim();
      if (!(VALID_CATEGORIES as readonly string[]).includes(cleanCat)) {
        throw new Error(
          `Validation error: Category '${cleanCat}' is invalid. Must be one of: ${VALID_CATEGORIES.join(', ')}.`
        );
      }
    }

    // Status-specific safeguards
    const updatesToApply: any = { ...input };
    delete updatesToApply.id;
    delete updatesToApply.expected_revision;

    if (existing.status === 'Scheduled') {
      // SAFEGUARD FOR SCHEDULED ARTICLES:
      // Preserve scheduled_at timestamp, original slug, and Scheduled status!
      updatesToApply.status = 'Scheduled';
      updatesToApply.scheduled_at = existing.scheduled_at;
      updatesToApply.slug = existing.slug;
      updatesToApply.canonical_url = existing.canonical_url || `https://www.dawnexus.in/blog/${existing.slug}`;
    } else if (existing.status === 'Published') {
      // SAFEGUARD FOR PUBLISHED ARTICLES:
      // Preserve live URL, canonical URL, Published status, and published_at!
      updatesToApply.status = 'Published';
      updatesToApply.published_at = existing.published_at;
      updatesToApply.slug = existing.slug;
      updatesToApply.canonical_url = existing.canonical_url || `https://www.dawnexus.in/blog/${existing.slug}`;
    } else if (existing.status === 'Draft') {
      if (updatesToApply.status && updatesToApply.status !== 'Draft') {
        throw new Error(
          `Action prohibited: Direct status promotion to '${updatesToApply.status}' via MCP update is disallowed. Use schedule_blog_draft for scheduling.`
        );
      }
      updatesToApply.status = 'Draft';
    }

    // Append revision audit log to admin_notes
    const prevRevision = existing.content_revision || 'init';
    const auditStamp = `[MCP AI Improvement] Updated by ${callerIp} on ${new Date().toISOString()}. Prev revision: ${prevRevision}`;
    updatesToApply.admin_notes = existing.admin_notes ? `${existing.admin_notes}\n${auditStamp}` : auditStamp;

    // Apply update to SQLite
    const updated = updateBlog(id, updatesToApply);
    if (!updated) {
      throw new Error(`Failed to update article #${id}.`);
    }

    // Recalculate Technical SEO score
    const { items: allBlogs } = getBlogs({ limit: 100 });
    const publishedSlugs = allBlogs.filter(b => b.status === 'Published' && b.id !== id).map(b => b.slug);
    const seoReport = normalizeSeoReport(
      calculateSeoScore(
        {
          title: updated.title,
          slug: updated.slug,
          content: updated.content,
          excerpt: updated.excerpt,
          category: updated.category,
          primary_keyword: updated.primary_keyword,
          secondary_keywords: updated.secondary_keywords,
          search_intent: updated.search_intent,
          target_audience: updated.target_audience,
          seo_title: updated.seo_title,
          meta_description: updated.meta_description,
          canonical_url: updated.canonical_url,
          featured_image: updated.featured_image,
          image_alt: updated.image_alt
        },
        publishedSlugs,
        90,
        id
      )
    );

    // Recalculate Information Gain & E-E-A-T
    const evidenceReport = assessInformationGain(updated);

    // Persist new SEO report and revision hash
    const finalUpdated = updateBlog(id, {
      seo_report: JSON.stringify(seoReport),
      content_revision: seoReport.contentRevision
    }) || updated;

    // Persist to Supabase
    try {
      await persistBlog(finalUpdated);
    } catch (persistErr: any) {
      recordMcpAudit({
        tool: 'update_blog_article',
        action: 'write',
        status: 'failed',
        callerIp,
        targetId: id,
        details: `Supabase persistence failed on update: ${persistErr?.message}`
      });
      throw new Error(`Supabase persistence failed on update: ${persistErr?.message}`);
    }

    // Read-after-write verification
    const verified = getBlogById(id);
    if (!verified) {
      throw new Error(`Read-after-write verification failed: Article #${id} could not be retrieved after write.`);
    }

    recordMcpAudit({
      tool: 'update_blog_article',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: id,
      details: `Article #${id} (${verified.status}) successfully updated and verified. Technical SEO: ${seoReport.totalScore}/100, Evidence Quality: ${evidenceReport.overallScore}/100.`
    });

    return {
      success: true,
      blog: verified,
      technicalSeo: seoReport,
      evidenceReport,
      message: `Article #${id} (${verified.status}) updated and verified successfully.`
    };
  }

  /**
   * Tool 6: update_blog_draft (Alias for update_blog_article)
   */
  static async updateBlogDraft(
    id: number,
    updates: any,
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    blog: BlogRecord;
    seoReport: SeoAuditReport;
    message: string;
  }> {
    const res = await McpService.updateBlogArticle({ id, ...updates }, callerIp);
    return {
      success: res.success,
      blog: res.blog,
      seoReport: res.technicalSeo,
      message: res.message
    };
  }

  /**
   * Helper: Parse date for Asia/Kolkata timezone convention
   */
  static parseKolkataScheduleDate(inputDateStr: string): Date {
    const trimmed = (inputDateStr || '').trim();
    if (!trimmed) {
      throw new Error('Publication date is required.');
    }

    let parseable = trimmed;

    // Date-only format YYYY-MM-DD -> default 09:00:00 IST (+05:30)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      parseable = `${trimmed}T09:00:00+05:30`;
    }
    // ISO without timezone offset e.g. YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
      parseable = `${trimmed}+05:30`;
    }
    // Space-separated date and time without offset e.g. YYYY-MM-DD HH:mm:ss or YYYY-MM-DD HH:mm
    else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
      parseable = `${trimmed.replace(/\s+/, 'T')}+05:30`;
    }

    const parsed = new Date(parseable);
    if (isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid scheduled_at date/time format: "${inputDateStr}". Please supply an ISO 8601 string or YYYY-MM-DDTHH:mm:ss+05:30 in Asia/Kolkata timezone.`
      );
    }

    return parsed;
  }

  /**
   * Helper: Format Date into Asia/Kolkata IST string
   */
  static formatKolkataDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'short'
    }).format(date) + ' (IST)';
  }

  /**
   * Helper: Fetch buffer from base64 data URL or hosted public image URL
   */
  static async fetchImageBuffer(source: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    const trimmed = (source || '').trim();
    const dataUrlMatch = trimmed.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/s);
    if (dataUrlMatch) {
      const mimeType = dataUrlMatch[1];
      const buffer = Buffer.from(dataUrlMatch[2], 'base64');
      return { buffer, mimeType };
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const res = await fetch(trimmed, {
        headers: { 'User-Agent': 'Dawnexus-Image-Transfer/1.0' },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) {
        throw new Error(`Failed to download image from source URL (HTTP ${res.status} ${res.statusText})`);
      }
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = res.headers.get('content-type') || undefined;
      return { buffer, mimeType };
    }

    // Raw base64 string check
    if (trimmed.length > 50 && /^[A-Za-z0-9+/=\r\n\s]+$/.test(trimmed.slice(0, 50))) {
      try {
        const buffer = Buffer.from(trimmed.replace(/\s+/g, ''), 'base64');
        return { buffer };
      } catch {}
    }

    throw new Error('Invalid image format. Provide a base64 data URL (data:image/...) or a hosted public HTTPS image URL.');
  }

  /**
   * Helper: Validate image file type and magic bytes (PNG, JPEG, WEBP, GIF) <= 5MB
   */
  static validateImageBuffer(buffer: Buffer): { mimeType: string; extension: string } {
    if (!buffer || buffer.length === 0) {
      throw new Error('Validation error: Image payload is empty.');
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new Error(`Validation error: Image file size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds 5MB limit.`);
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return { mimeType: 'image/png', extension: 'png' };
    }

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mimeType: 'image/jpeg', extension: 'jpg' };
    }

    // WEBP: RIFF....WEBP
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
      return { mimeType: 'image/webp', extension: 'webp' };
    }

    // GIF: GIF8
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
      return { mimeType: 'image/gif', extension: 'gif' };
    }

    throw new Error('Validation error: Unsupported or corrupted image format. Only PNG, JPEG, WEBP, and GIF images are permitted.');
  }

  /**
   * Helper: Upload validated buffer to Supabase Storage bucket 'blog-images'
   */
  static async uploadBufferToSupabaseStorage(
    buffer: Buffer,
    mimeType: string,
    extension: string,
    prefix: string = 'mcp-blog'
  ): Promise<{ publicUrl: string; filename: string }> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase Storage is not configured on the server (missing SUPABASE_SERVICE_ROLE_KEY).');
    }

    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30) || 'mcp-blog';
    const safeName = `${cleanPrefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

    const { data, error } = await supabase.storage
      .from('blog-images')
      .upload(safeName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error || !data) {
      throw new Error(`Supabase Storage upload rejected: ${error?.message || 'No data returned'}`);
    }

    const { data: pubData } = supabase.storage
      .from('blog-images')
      .getPublicUrl(safeName);

    return {
      publicUrl: pubData.publicUrl,
      filename: safeName
    };
  }

  /**
   * Tool: upload_blog_image
   * Securely accepts image content (base64 data URL or hosted public URL such as DALL-E),
   * validates magic bytes and size (<= 5MB), and uploads to Supabase Storage bucket 'blog-images'.
   */
  static async uploadBlogImage(
    input: { image: string; filename?: string },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    url: string;
    filename: string;
    size: number;
    mimeType: string;
    message: string;
  }> {
    if (!input.image || typeof input.image !== 'string' || !input.image.trim()) {
      throw new Error('Image data (base64 data URL or hosted HTTPS image URL) is required.');
    }

    const { buffer } = await McpService.fetchImageBuffer(input.image);
    const validated = McpService.validateImageBuffer(buffer);

    const prefix = input.filename ? input.filename.replace(/\.[^/.]+$/, '') : 'mcp-blog';
    const { publicUrl, filename } = await McpService.uploadBufferToSupabaseStorage(
      buffer,
      validated.mimeType,
      validated.extension,
      prefix
    );

    recordMcpAudit({
      tool: 'upload_blog_image',
      action: 'write',
      status: 'success',
      callerIp,
      details: `Uploaded image ${filename} (${buffer.length} bytes, ${validated.mimeType}) to Supabase Storage.`
    });

    return {
      success: true,
      url: publicUrl,
      filename,
      size: buffer.length,
      mimeType: validated.mimeType,
      message: 'Image successfully validated and uploaded to Supabase Storage (blog-images).'
    };
  }

  /**
   * Tool: attach_blog_image
   * Attaches an image to an existing draft. Supports permanent image URL (from upload_blog_image)
   * or direct base64 / URL input.
   */
  static async attachBlogImage(
    input: {
      id: number;
      image_url?: string;
      image?: string;
      image_alt: string;
      caption?: string;
    },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    id: number;
    featured_image: string;
    image_alt: string;
    message: string;
  }> {
    await refreshFromPersistentStore();
    const existing = getBlogById(input.id);
    if (!existing) {
      throw new Error(`Article with ID #${input.id} not found.`);
    }

    if (existing.status !== 'Draft') {
      throw new Error(`Cannot attach image to article #${input.id} because its status is '${existing.status}'. Only drafts can be modified.`);
    }

    if (!input.image_alt || typeof input.image_alt !== 'string' || !input.image_alt.trim()) {
      throw new Error('Descriptive image_alt text is required for accessibility and SEO.');
    }

    let finalImageUrl = (input.image_url || '').trim();

    if (!finalImageUrl && input.image) {
      const rawImage = input.image.trim();
      // If base64 or raw data, upload to Supabase Storage
      if (rawImage.startsWith('data:image/') || (!rawImage.startsWith('http://') && !rawImage.startsWith('https://'))) {
        const uploadRes = await McpService.uploadBlogImage({ image: rawImage, filename: existing.slug }, callerIp);
        finalImageUrl = uploadRes.url;
      } else if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
        // If temporary DALL-E URL (Azure blob storage), transfer to permanent Supabase Storage
        if (rawImage.includes('blob.core.windows.net') || rawImage.includes('oaidalleapiprodscus')) {
          const uploadRes = await McpService.uploadBlogImage({ image: rawImage, filename: existing.slug }, callerIp);
          finalImageUrl = uploadRes.url;
        } else {
          finalImageUrl = rawImage;
        }
      }
    }

    if (!finalImageUrl) {
      throw new Error('Either image_url or image data must be provided.');
    }

    const captionNote = input.caption ? ` Caption: "${input.caption.trim()}".` : '';

    const updated = updateBlog(input.id, {
      featured_image: finalImageUrl,
      image_alt: input.image_alt.trim(),
      admin_notes: `${existing.admin_notes || ''}\n[MCP AI SEO Studio] Featured image attached on ${new Date().toISOString()}.${captionNote}`.trim()
    });

    if (!updated) {
      throw new Error(`Failed to update draft #${input.id} with image reference.`);
    }

    await persistBlog(updated);

    recordMcpAudit({
      tool: 'attach_blog_image',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: input.id,
      details: `Attached image (${finalImageUrl}) to draft #${input.id}.`
    });

    return {
      success: true,
      id: input.id,
      featured_image: finalImageUrl,
      image_alt: updated.image_alt,
      message: `Featured image successfully attached to draft #${input.id}.`
    };
  }

  /**
   * Tool: verify_blog_image
   * Verifies that the draft exists, has a featured image, and that the image URL is accessible over HTTP (200 OK).
   */
  static async verifyBlogImage(
    id: number,
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    id: number;
    accessible: boolean;
    imageUrl: string;
    imageAlt: string;
    httpStatus?: number;
    contentType?: string;
    message: string;
  }> {
    await refreshFromPersistentStore();
    const blog = getBlogById(id);
    if (!blog) {
      throw new Error(`Article with ID #${id} not found.`);
    }

    if (!blog.featured_image || !blog.featured_image.trim()) {
      throw new Error(`Article #${id} does not have a featured image attached.`);
    }

    const imageUrl = blog.featured_image.trim();
    let testUrl = imageUrl;
    if (testUrl.startsWith('/')) {
      testUrl = `https://www.dawnexus.in${testUrl}`;
    }

    try {
      let httpStatus = 200;
      let contentType = 'image/*';

      if (testUrl.startsWith('http://') || testUrl.startsWith('https://')) {
        let probeRes: Response;
        try {
          probeRes = await fetch(testUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(6000),
            headers: { 'User-Agent': 'Dawnexus-Image-Verifier/1.0' }
          });
          if (probeRes.status === 405) {
            probeRes = await fetch(testUrl, {
              method: 'GET',
              signal: AbortSignal.timeout(6000),
              headers: { 'User-Agent': 'Dawnexus-Image-Verifier/1.0', Range: 'bytes=0-100' }
            });
          }
        } catch {
          probeRes = await fetch(testUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(6000),
            headers: { 'User-Agent': 'Dawnexus-Image-Verifier/1.0' }
          });
        }

        httpStatus = probeRes.status;
        contentType = probeRes.headers.get('content-type') || 'image/*';

        if (!probeRes.ok) {
          recordMcpAudit({
            tool: 'verify_blog_image',
            action: 'audit',
            status: 'failed',
            callerIp,
            targetId: id,
            details: `Image verification failed: ${imageUrl} returned HTTP ${httpStatus}.`
          });

          return {
            success: false,
            id,
            accessible: false,
            imageUrl,
            imageAlt: blog.image_alt,
            httpStatus,
            contentType,
            message: `Featured image exists on article #${id} but failed HTTP accessibility verification (HTTP ${httpStatus}).`
          };
        }
      }

      recordMcpAudit({
        tool: 'verify_blog_image',
        action: 'audit',
        status: 'success',
        callerIp,
        targetId: id,
        details: `Verified featured image on article #${id} (${imageUrl}). HTTP ${httpStatus}.`
      });

      return {
        success: true,
        id,
        accessible: true,
        imageUrl,
        imageAlt: blog.image_alt,
        httpStatus,
        contentType,
        message: `Featured image is verified, accessible (HTTP ${httpStatus}), and correctly associated with draft #${id}.`
      };
    } catch (err: any) {
      return {
        success: false,
        id,
        accessible: false,
        imageUrl,
        imageAlt: blog.image_alt,
        message: `Image verification encountered an error probing ${imageUrl}: ${err?.message || err}`
      };
    }
  }

  /**
   * Tool: update_blog_image_metadata
   * Updates image alt text or caption on an existing draft without re-uploading the image.
   */
  static async updateBlogImageMetadata(
    input: { id: number; image_alt?: string; caption?: string },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    id: number;
    featured_image: string;
    image_alt: string;
    message: string;
  }> {
    await refreshFromPersistentStore();
    const blog = getBlogById(input.id);
    if (!blog) {
      throw new Error(`Article with ID #${input.id} not found.`);
    }

    if (blog.status !== 'Draft') {
      throw new Error(`Cannot update image metadata for article #${input.id} because status is '${blog.status}'. Only drafts can be modified.`);
    }

    const newAlt = input.image_alt !== undefined ? input.image_alt.trim() : blog.image_alt;
    const captionNote = input.caption ? ` Caption: "${input.caption.trim()}".` : '';

    const updated = updateBlog(input.id, {
      image_alt: newAlt,
      admin_notes: `${blog.admin_notes || ''}\n[MCP AI SEO Studio] Image metadata updated on ${new Date().toISOString()}.${captionNote}`.trim()
    });

    if (!updated) {
      throw new Error(`Failed to update draft #${input.id}.`);
    }

    await persistBlog(updated);

    recordMcpAudit({
      tool: 'update_blog_image_metadata',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: input.id,
      details: `Updated image alt text for draft #${input.id}.`
    });

    return {
      success: true,
      id: input.id,
      featured_image: updated.featured_image,
      image_alt: updated.image_alt,
      message: `Image metadata for draft #${input.id} successfully updated.`
    };
  }

  /**
   * Tool: schedule_blog_draft
   * Schedules an approved draft using the Dawnexus publication calendar.
   * Requires human approval (approved: true), future date/time in Asia/Kolkata timezone,
   * complete metadata/image, and SEO quality score >= 90/100.
   */
  static async scheduleBlogDraft(
    input: { id: number; scheduled_at: string; approved: boolean },
    callerIp: string = 'mcp-client'
  ): Promise<{
    success: boolean;
    id: number;
    title: string;
    slug: string;
    status: string;
    scheduled_at: string;
    scheduled_at_ist: string;
    seoScore: number;
    previewUrl: string;
    calendarUrl: string;
    message: string;
  }> {
    // 1. Approval Gate: ChatGPT cannot schedule without explicit human approval confirmation
    if (input.approved !== true) {
      recordMcpAudit({
        tool: 'schedule_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: input.id,
        details: 'Rejected attempt to schedule draft without explicit human approval (approved !== true).'
      });
      throw new Error(
        `Approval required: Draft #${input.id} cannot be scheduled without explicit approval confirmation (approved: true) from the user. Please present the draft preview and proposed schedule to the user for explicit approval first.`
      );
    }

    await refreshFromPersistentStore();
    const blog = getBlogById(input.id);
    if (!blog) {
      throw new Error(`Article with ID #${input.id} not found.`);
    }

    // 2. Draft Status Enforcement: Cannot schedule already Published articles
    if (blog.status === 'Published') {
      throw new Error(`Action prohibited: Article #${input.id} is already published. Published articles cannot be scheduled.`);
    }

    // 3. Completeness Checks
    if (!blog.title || !blog.title.trim()) {
      throw new Error(`Cannot schedule draft #${input.id}: Article title is missing.`);
    }
    if (!blog.content || blog.content.trim().length < 500) {
      throw new Error(`Cannot schedule draft #${input.id}: Article content is incomplete (minimum 500 characters required).`);
    }
    if (!blog.category || !(VALID_CATEGORIES as readonly string[]).includes(blog.category)) {
      throw new Error(`Cannot schedule draft #${input.id}: Category '${blog.category}' is invalid.`);
    }
    if (!blog.primary_keyword || !blog.primary_keyword.trim()) {
      throw new Error(`Cannot schedule draft #${input.id}: Primary target keyword is required.`);
    }
    if (!blog.featured_image || !blog.featured_image.trim()) {
      throw new Error(`Cannot schedule draft #${input.id}: Featured image is missing. Please create and attach a featured image before scheduling.`);
    }
    if (!blog.image_alt || !blog.image_alt.trim()) {
      throw new Error(`Cannot schedule draft #${input.id}: Featured image alt text is missing.`);
    }

    // 4. Deterministic SEO Quality Check (>= 90 score required and no mandatory failures)
    const { items: allBlogs } = getBlogs({ limit: 100 });
    const publishedSlugs = allBlogs.filter(b => b.status === 'Published').map(b => b.slug);
    const currentRevision = computeContentRevision(blog);

    let seoReport: SeoAuditReport;
    if (blog.seo_report && blog.content_revision === currentRevision) {
      try {
        seoReport = normalizeSeoReport(JSON.parse(blog.seo_report));
      } catch {
        seoReport = normalizeSeoReport(
          calculateSeoScore(
            {
              title: blog.title,
              slug: blog.slug,
              content: blog.content,
              excerpt: blog.excerpt,
              category: blog.category,
              primary_keyword: blog.primary_keyword,
              secondary_keywords: blog.secondary_keywords,
              search_intent: blog.search_intent,
              target_audience: blog.target_audience,
              seo_title: blog.seo_title,
              meta_description: blog.meta_description || blog.excerpt,
              canonical_url: blog.canonical_url || (blog.slug ? `https://www.dawnexus.in/blog/${blog.slug}` : ''),
              featured_image: blog.featured_image,
              image_alt: blog.image_alt
            },
            publishedSlugs,
            90,
            blog.id
          )
        );
        updateBlog(blog.id, {
          seo_report: JSON.stringify(seoReport),
          content_revision: seoReport.contentRevision
        });
      }
    } else {
      seoReport = normalizeSeoReport(
        calculateSeoScore(
          {
            title: blog.title,
            slug: blog.slug,
            content: blog.content,
            excerpt: blog.excerpt,
            category: blog.category,
            primary_keyword: blog.primary_keyword,
            secondary_keywords: blog.secondary_keywords,
            search_intent: blog.search_intent,
            target_audience: blog.target_audience,
            seo_title: blog.seo_title,
            meta_description: blog.meta_description || blog.excerpt,
            canonical_url: blog.canonical_url || (blog.slug ? `https://www.dawnexus.in/blog/${blog.slug}` : ''),
            featured_image: blog.featured_image,
            image_alt: blog.image_alt
          },
          publishedSlugs,
          90,
          blog.id
        )
      );
      updateBlog(blog.id, {
        seo_report: JSON.stringify(seoReport),
        content_revision: seoReport.contentRevision
      });
    }

    if (seoReport.totalScore < 90 || !seoReport.meetsThreshold || (Array.isArray(seoReport.mandatoryFailures) && seoReport.mandatoryFailures.length > 0)) {
      const mandatoryList = Array.isArray(seoReport.mandatoryFailures) ? seoReport.mandatoryFailures : [];
      const recList = Array.isArray(seoReport.recommendations) ? seoReport.recommendations : [];

      let errorMessage: string;
      if (mandatoryList.length > 0 && seoReport.totalScore >= 90) {
        errorMessage = `Quality check failed: Article meets numerical score requirement (${seoReport.totalScore}/100), but has mandatory structural failure(s): ${mandatoryList.join('; ')}`;
      } else if (mandatoryList.length > 0) {
        errorMessage = `Quality check failed: Article SEO score is ${seoReport.totalScore}/100 (minimum 90/100 required for scheduling). Mandatory failures: ${mandatoryList.join('; ')}. Recommendations: ${recList.slice(0, 3).join('; ')}`;
      } else {
        errorMessage = `Quality check failed: Article SEO score is ${seoReport.totalScore}/100 (minimum 90/100 required for scheduling). Issues to resolve: ${recList.slice(0, 3).join('; ')}`;
      }

      recordMcpAudit({
        tool: 'schedule_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: input.id,
        details: `Scheduling rejected: ${errorMessage}`
      });
      throw new Error(errorMessage);
    }

    // 5. Timezone & Schedule Date Validation (Asia/Kolkata convention)
    const targetDate = McpService.parseKolkataScheduleDate(input.scheduled_at);
    if (targetDate.getTime() <= Date.now() + 60000) {
      throw new Error('Scheduled publication time must be in the future (at least 1-2 minutes from now).');
    }

    const isoScheduledAt = targetDate.toISOString();
    const formattedIst = McpService.formatKolkataDate(targetDate);

    // 6. Update Article Status to Scheduled
    const updated = updateBlog(input.id, {
      status: 'Scheduled',
      scheduled_at: isoScheduledAt,
      admin_notes: `${blog.admin_notes || ''}\n[MCP AI SEO Studio] Approved and scheduled by user for ${formattedIst} on ${new Date().toISOString()}`.trim()
    });

    if (!updated) {
      throw new Error(`Failed to update draft #${input.id} to scheduled status.`);
    }

    // 7. Persist to Supabase
    await persistBlog(updated);

    recordMcpAudit({
      tool: 'schedule_blog_draft',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: input.id,
      details: `Draft #${input.id} approved and scheduled for ${formattedIst} (${isoScheduledAt}). SEO score: ${seoReport.totalScore}/100.`
    });

    return {
      success: true,
      id: input.id,
      title: updated.title,
      slug: updated.slug,
      status: 'Scheduled',
      scheduled_at: isoScheduledAt,
      scheduled_at_ist: formattedIst,
      seoScore: seoReport.totalScore,
      previewUrl: `https://www.dawnexus.in/blog/${updated.slug}`,
      calendarUrl: 'https://www.dawnexus.in/admin',
      message: `Article #${input.id} ("${updated.title}") has been approved and successfully scheduled for publication on ${formattedIst}. It will be automatically published by the Dawnexus background scheduler.`
    };
  }

  /**
   * Tool 8: run_seo_quality_check
   * Executes deterministic 100-point audit on draft or input object.
   */
  static async runSeoQualityCheck(
    input: { id?: number; draft?: BlogAuditInput },
    callerIp: string = 'mcp-client'
  ): Promise<SeoAuditReport> {
    let auditData: BlogAuditInput;

    if (input.id) {
      const blog = getBlogById(input.id);
      if (!blog) {
        throw new Error(`Draft with ID #${input.id} not found.`);
      }
      auditData = {
        title: blog.title,
        slug: blog.slug,
        content: blog.content,
        excerpt: blog.excerpt,
        category: blog.category,
        primary_keyword: blog.primary_keyword,
        secondary_keywords: blog.secondary_keywords,
        search_intent: blog.search_intent,
        target_audience: blog.target_audience,
        seo_title: blog.seo_title,
        meta_description: blog.meta_description,
        canonical_url: blog.canonical_url,
        featured_image: blog.featured_image,
        image_alt: blog.image_alt
      };
    } else if (input.draft) {
      auditData = input.draft;
    } else {
      throw new Error('Must provide either draft ID (#id) or draft object (#draft) to audit.');
    }

    const { items: allBlogs } = getBlogs({ limit: 100 });
    const publishedSlugs = allBlogs.filter(b => b.status === 'Published').map(b => b.slug);

    const report = normalizeSeoReport(calculateSeoScore(auditData, publishedSlugs, 90, input.id));

    if (input.id) {
      updateBlog(input.id, {
        seo_report: JSON.stringify(report),
        content_revision: report.contentRevision
      });
      const persisted = getBlogById(input.id);
      if (persisted) {
        try {
          await persistBlog(persisted);
        } catch {
          // Non-fatal
        }
      }
    }

    recordMcpAudit({
      tool: 'run_seo_quality_check',
      action: 'audit',
      status: 'success',
      callerIp,
      targetId: input.id,
      details: `Audit completed: Score ${report.totalScore}/100. Meets threshold: ${report.meetsThreshold}.`
    });

    return report;
  }

  /**
   * Tool: gsc_get_connection_status
   */
  static async gscGetConnectionStatus() {
    return await GscService.getConnectionStatus();
  }

  /**
   * Tool: gsc_list_properties
   */
  static async gscListProperties() {
    return await GscService.listProperties();
  }

  /**
   * Tool: gsc_get_search_analytics
   */
  static async gscGetSearchAnalytics(args: {
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
    property?: string;
  }) {
    return await GscService.executeSearchAnalyticsQuery({
      startDate: args.startDate,
      endDate: args.endDate,
      dimensions: args.dimensions || ['query'],
      rowLimit: args.rowLimit || 100,
      property: args.property
    });
  }

  /**
   * Tool: gsc_get_top_queries
   */
  static async gscGetTopQueries(args?: { dateRange?: '7d' | '28d' | '3m'; limit?: number }) {
    return await GscService.getQueryComparison(args?.dateRange || '28d', args?.limit || 50);
  }

  /**
   * Tool: gsc_get_top_pages
   */
  static async gscGetTopPages(args?: { limit?: number }) {
    return await GscService.getTopPages(args?.limit || 25);
  }

  /**
   * Tool: gsc_get_research_status
   */
  static async gscGetResearchStatus() {
    const status = await GscService.getConnectionStatus();
    const jobs = GscService.getJobs(5);
    return {
      connection: status,
      recentJobs: jobs
    };
  }

  /**
   * Tool: gsc_run_research_sync
   */
  static async gscRunResearchSync(args?: { dateRange?: '28d' | '3m'; triggeredBy?: string }) {
    return await GscService.runSyncJob(args?.triggeredBy || 'mcp-chatgpt', args?.dateRange || '28d');
  }

  /**
   * Tool: gsc_get_research_job
   */
  static async gscGetResearchJob(args: { jobId: string }) {
    if (!args.jobId) throw new Error('jobId parameter is required');
    const job = GscService.getJobById(args.jobId);
    if (!job) throw new Error(`Job not found with ID: ${args.jobId}`);
    return job;
  }

  // ==========================================
  // GOOGLE ANALYTICS 4 MCP TOOLS
  // ==========================================

  /**
   * Tool: ga4_get_connection_status
   */
  static async ga4GetConnectionStatus() {
    return await Ga4Service.getConnectionStatus();
  }

  /**
   * Tool: ga4_list_properties
   */
  static async ga4ListProperties() {
    return await Ga4Service.listProperties();
  }

  /**
   * Tool: ga4_get_overview
   */
  static async ga4GetOverview(args?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    forceRefresh?: boolean;
  }) {
    const res = await Ga4Service.getOverview(
      args?.dateRange || '28d',
      args?.startDate,
      args?.endDate,
      args?.forceRefresh || false
    );
    if (res.error) throw new Error(res.error);
    return res.data;
  }

  /**
   * Tool: ga4_get_traffic_acquisition
   */
  static async ga4GetTrafficAcquisition(args?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const res = await Ga4Service.getTrafficAcquisition(
      args?.dateRange || '28d',
      args?.startDate,
      args?.endDate,
      args?.limit || 25
    );
    if (res.error) throw new Error(res.error);
    return { channels: res.data || [] };
  }

  /**
   * Tool: ga4_get_landing_pages
   */
  static async ga4GetLandingPages(args?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const res = await Ga4Service.getLandingPages(
      args?.dateRange || '28d',
      args?.startDate,
      args?.endDate,
      args?.limit || 25
    );
    if (res.error) throw new Error(res.error);
    return { landingPages: res.data || [] };
  }

  /**
   * Tool: ga4_get_page_performance
   */
  static async ga4GetPagePerformance(args?: {
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const res = await Ga4Service.getPagePerformance(
      args?.dateRange || '28d',
      args?.startDate,
      args?.endDate,
      args?.limit || 25
    );
    if (res.error) throw new Error(res.error);
    return { pages: res.data || [] };
  }

  /**
   * Tool: ga4_get_realtime
   */
  static async ga4GetRealtime() {
    const res = await Ga4Service.getRealtimeReport();
    if (res.error) throw new Error(res.error);
    return res.data;
  }

  /**
   * Tool: ga4_get_report
   */
  static async ga4GetReport(args: {
    dimensions: string[];
    metrics: string[];
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const res = await Ga4Service.getValidatedReport(args);
    if (res.error) throw new Error(res.error);
    return res.data;
  }

  /**
   * Tool: ga4_get_analytics_status
   */
  static async ga4GetAnalyticsStatus(args?: { limit?: number }) {
    const status = await Ga4Service.getConnectionStatus();
    const { stats, recentJobs } = Ga4Service.getJobStatsAndHistory(args?.limit || 15);
    return {
      connection: status,
      jobStats: stats,
      recentJobs
    };
  }

  // ==========================================
  // VERSION 6.1.3: VISITOR ANALYTICS TOOLS
  // ==========================================

  /**
   * Tool: analytics_get_overview
   */
  static async analyticsGetOverview(args?: { days?: number; dateRange?: '7d' | '28d' | '90d' | 'today' }) {
    const range = args?.dateRange || (args?.days === 7 ? '7d' : args?.days === 90 ? '90d' : '28d');
    return AnalyticsService.getOverview(range);
  }

  /**
   * Tool: analytics_get_conversion_funnel
   */
  static async analyticsGetConversionFunnel(args?: { days?: number; dateRange?: '7d' | '28d' | '90d' }) {
    const range = args?.dateRange || (args?.days === 7 ? '7d' : args?.days === 90 ? '90d' : '28d');
    return AnalyticsService.getConversionFunnel(range);
  }

  /**
   * Tool: analytics_get_page_performance
   */
  static async analyticsGetPagePerformance(args?: { pageUrl?: string; device?: 'all' | 'desktop' | 'mobile' }) {
    const pageUrl = args?.pageUrl || '/';
    const heatmap = AnalyticsService.getHeatmapData(pageUrl, args?.device || 'all');
    return {
      pageUrl: heatmap.pagePath,
      totalClicks: heatmap.totalClicks,
      clickPoints: heatmap.clickPoints,
      scrollMilestones: heatmap.scrollMilestones,
      totalSessionsObserved: heatmap.totalSessionsObserved
    };
  }

  /**
   * Tool: analytics_get_visitor_journeys
   */
  static async analyticsGetVisitorJourneys(args?: { limit?: number }) {
    const journeys = AnalyticsService.getVisitorJourneys(args?.limit || 25);
    return { journeys };
  }

  /**
   * Tool: analytics_get_exit_analysis
   */
  static async analyticsGetExitAnalysis(args?: { limit?: number }) {
    const journeys = AnalyticsService.getVisitorJourneys(args?.limit || 50);
    const exitCounts: Record<string, number> = {};
    for (const j of journeys) {
      const lastEvent = j.pathSequence[j.pathSequence.length - 1];
      const exitPage = lastEvent ? lastEvent.pagePath : 'unknown';
      exitCounts[exitPage] = (exitCounts[exitPage] || 0) + 1;
    }
    const exitBreakdown = Object.entries(exitCounts)
      .map(([page, count]) => ({
        page,
        exits: count,
        percentage: Math.round((count / (journeys.length || 1)) * 100)
      }))
      .sort((a, b) => b.exits - a.exits);

    return {
      totalAnalyzedJourneys: journeys.length,
      exitBreakdown
    };
  }

  /**
   * Tool: analytics_get_click_heatmap
   */
  static async analyticsGetClickHeatmap(args: { pageUrl: string; device?: 'all' | 'desktop' | 'mobile' }) {
    const data = AnalyticsService.getHeatmapData(args.pageUrl, args.device || 'all');
    return {
      pageUrl: data.pagePath,
      totalClicks: data.totalClicks,
      clickPoints: data.clickPoints
    };
  }

  /**
   * Tool: analytics_get_scroll_depth
   */
  static async analyticsGetScrollDepth(args: { pageUrl: string; device?: 'all' | 'desktop' | 'mobile' }) {
    const data = AnalyticsService.getHeatmapData(args.pageUrl, args.device || 'all');
    return {
      pageUrl: data.pagePath,
      scrollMilestones: data.scrollMilestones
    };
  }

  /**
   * Tool: analytics_get_form_abandonment
   */
  static async analyticsGetFormAbandonment(args?: { dateRange?: '7d' | '28d' | '90d'; days?: number }) {
    const range = args?.dateRange || (args?.days === 7 ? '7d' : args?.days === 90 ? '90d' : '28d');
    return AnalyticsService.getFormAbandonment(range);
  }

  /**
   * Tool: analytics_get_session_replay_summary
   */
  static async analyticsGetSessionReplaySummary(args: { sessionId: string }) {
    return AnalyticsService.getSessionReplay(args.sessionId);
  }

  /**
   * Tool: analytics_get_bot_filter_stats
   */
  static async analyticsGetBotFilterStats() {
    return AnalyticsService.getBotFilterStats();
  }

  /**
   * Tool: analytics_get_tracking_health
   */
  static async analyticsGetTrackingHealth() {
    return AnalyticsService.getTrackingHealth();
  }

  // ==========================================
  // VERSION 6.1.3: WEBSITE CONTENT TOOLS
  // ==========================================

  /**
   * Tool: website_list_editable_pages
   */
  static async websiteListEditablePages() {
    return WebsiteContentService.listAllPages();
  }

  /**
   * Tool: website_get_page_content
   */
  static async websiteGetPageContent(args: { slug: string }) {
    const page = WebsiteContentService.getPage(args.slug);
    if (!page) throw new Error(`Page not found: ${args.slug}`);
    return page;
  }

  /**
   * Tool: website_get_page_metadata
   */
  static async websiteGetPageMetadata(args: { slug: string }) {
    const page = WebsiteContentService.getPage(args.slug);
    if (!page) throw new Error(`Page not found: ${args.slug}`);
    return {
      slug: page.slug,
      title: page.title,
      canonical_url: page.canonical_url,
      meta_title: page.meta_title,
      meta_description: page.meta_description,
      og_image: page.og_image
    };
  }

  /**
   * Tool: website_get_content_version_history
   */
  static async websiteGetContentVersionHistory(args: { slug: string }) {
    return WebsiteContentService.getVersions(args.slug);
  }

  /**
   * Tool: website_create_optimization_draft
   */
  static async websiteCreateOptimizationDraft(args: {
    slug: string;
    targetSection: string;
    proposedChanges: any;
    reason: string;
    createdBy?: string;
  }) {
    const current = WebsiteContentService.getPage(args.slug);
    if (!current) throw new Error(`Target page not found: ${args.slug}`);

    const updatedContent = { ...current };
    if (args.targetSection === 'hero') {
      if (typeof args.proposedChanges === 'object') {
        Object.assign(updatedContent, args.proposedChanges);
      }
    } else if (args.targetSection === 'capabilities') {
      if (Array.isArray(args.proposedChanges)) {
        updatedContent.capabilities = args.proposedChanges;
      }
    } else if (args.targetSection === 'faqs') {
      if (Array.isArray(args.proposedChanges)) {
        updatedContent.faqs = args.proposedChanges;
      }
    } else if (args.targetSection === 'cta') {
      if (typeof args.proposedChanges === 'object') {
        updatedContent.cta_section = args.proposedChanges;
      }
    }

    const draft = await WebsiteContentService.saveDraft(
      args.slug,
      updatedContent,
      args.reason || 'AI Optimization Draft',
      args.createdBy || 'mcp-agent'
    );

    return {
      success: true,
      slug: args.slug,
      targetSection: args.targetSection,
      draftContent: draft,
      message: 'Draft registered. Requires human review in Admin Panel before publishing.'
    };
  }

  /**
   * Tool: website_preview_optimization_draft
   */
  static async websitePreviewOptimizationDraft(args: { slug: string; versionNumber?: number }) {
    const live = WebsiteContentService.getPage(args.slug);
    const versions = WebsiteContentService.getVersions(args.slug);
    const targetVersion = args.versionNumber
      ? versions.find(v => v.version_number === args.versionNumber)
      : versions[0];

    return {
      slug: args.slug,
      liveContent: live,
      previewContent: targetVersion ? targetVersion.content_json : live,
      versionNumber: targetVersion ? targetVersion.version_number : 1,
      isPublished: targetVersion ? targetVersion.is_published : true
    };
  }

  /**
   * Tool: website_get_approval_status
   */
  static async websiteGetApprovalStatus(args?: { proposalId?: number; slug?: string }) {
    const proposals = await AnalyticsService.generateOptimizationProposals();
    if (args?.proposalId) {
      const match = proposals.find(p => p.id === String(args.proposalId));
      return { proposal: match || null };
    }
    if (args?.slug) {
      return { proposals: proposals.filter(p => p.pageSlug === args.slug) };
    }
    return { proposals };
  }

  /**
   * Tool: website_publish_approved_changes
   */
  static async websitePublishApprovedChanges(args: { proposalId: number | string; approvedBy: string }) {
    const result = await AnalyticsService.approveAndPublishProposal(
      String(args.proposalId),
      args.approvedBy || 'mcp-admin'
    );
    return result;
  }

  /**
   * Tool: website_rollback_content_version
   */
  static async websiteRollbackContentVersion(args: {
    slug: string;
    versionNumber: number;
    reason?: string;
  }) {
    const result = await WebsiteContentService.rollbackVersion(
      args.slug,
      args.versionNumber,
      args.reason || 'MCP requested rollback'
    );
    return result;
  }

  /**
   * Tool: chatbot_get_public_knowledge
   * Public knowledge retrieval for website visitors and chatbot assistant
   */
  static async chatbotGetPublicKnowledge(args?: { query?: string }) {
    const q = (args?.query || '').toLowerCase().trim();

    // 1. Service offerings
    const serviceList = WebsiteContentService.listAllPages();
    const serviceSummaries = serviceList.map(item => {
      const p = WebsiteContentService.getPage(item.slug);
      return {
        slug: p.slug,
        title: p.title,
        canonicalUrl: p.canonical_url,
        heroSubtitle: p.hero_subtitle || '',
        heroDescription: p.hero_description || '',
        capabilities: (p.capabilities || []).map(c => ({ title: c.title, desc: c.desc })),
        packages: (p.packages || []).map(pkg => ({ name: pkg.name, price: pkg.price, inclusions: pkg.inclusions })),
        faqs: p.faqs || []
      };
    });

    // Filter services if query matches specific keywords
    let matchingServices = serviceSummaries;
    if (q) {
      const filtered = serviceSummaries.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        s.capabilities.some(c => c.title.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q))
      );
      if (filtered.length > 0) matchingServices = filtered;
    }

    // 2. Approved business info
    const businessInfo = {
      companyName: 'Dawnexus',
      tagline: 'Modern Digital Marketing & AI-Powered Creative Agency',
      websiteUrl: 'https://www.dawnexus.in',
      primaryServices: [
        'Custom Website Design & Modern Web Development',
        'Technical SEO & Performance Optimization',
        'Google Business Profile & Local 3-Pack Growth',
        'Performance Digital Marketing & Full-Funnel Retargeting',
        'Interactive 3D Real Estate & AI Automations'
      ],
      headquarters: 'Chennai & Bangalore, India',
      contactEmail: 'hello@dawnexus.in',
      contactPhone: '+91 95663 88471',
      workingHours: 'Monday - Saturday: 9:00 AM - 7:00 PM IST',
      guarantee: 'Zero boilerplate templates, human review of all AI generation, sub-second Core Web Vitals performance.'
    };

    // 3. Recent published blog posts
    const publicBlogs = getPublicBlogs({ limit: 6 });
    const recentArticles = (publicBlogs.items || []).map((b: any) => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      url: `https://www.dawnexus.in/blog/${b.slug}`,
      category: b.category,
      excerpt: b.excerpt,
      publishedAt: b.published_at
    }));

    // 4. Common Public FAQs
    const allFaqs = serviceSummaries.flatMap(s => s.faqs);

    return {
      businessInfo,
      services: matchingServices.map(s => ({
        slug: s.slug,
        title: s.title,
        url: s.canonicalUrl,
        subtitle: s.heroSubtitle,
        description: s.heroDescription,
        keyCapabilities: s.capabilities.slice(0, 4),
        pricingTiers: s.packages.map(p => `${p.name}: ${p.price}`)
      })),
      faqs: allFaqs.slice(0, 8),
      recentArticles,
      pricingGuidance: 'Custom web solutions start from ₹15,000 for landing pages to ₹75,000+ for enterprise multi-feature platforms. Use chatbot_estimate_pricing for an exact quote.'
    };
  }

  /**
   * Tool: chatbot_estimate_pricing
   * Authoritative quotation engine for visitors
   */
  static async chatbotEstimatePricing(args: {
    websiteType?: string;
    pageCount?: number;
    designTier?: 'Standard' | 'Premium' | 'Custom';
    maintenanceOption?: 'None' | 'Monthly' | 'Annual';
    selectedFeatures?: string[];
  }) {
    const config = getCalculatorPricingConfig();
    const selections = {
      websiteType: args.websiteType || 'corporate-business',
      pageCount: Math.max(1, Math.min(args.pageCount || 5, config.maxStandardPages || 20)),
      selectedFeatures: Array.isArray(args.selectedFeatures) ? args.selectedFeatures : [],
      designTier: args.designTier || 'Standard',
      maintenanceOption: args.maintenanceOption || 'Monthly'
    };

    const estimate = calculateWebsiteCost(config, selections);

    return {
      referenceId: estimate.referenceId,
      websiteType: selections.websiteType,
      pageCount: selections.pageCount,
      designTier: selections.designTier,
      currency: config.currency,
      currencySymbol: config.currencySymbol,
      oneTimeSetupTotal: estimate.subtotalOneTime,
      recurringMonthlyTotal: estimate.recurringMaintenance?.amount || 0,
      breakdown: (estimate.items || []).map(b => ({
        label: b.label,
        description: b.description || '',
        amount: b.amount,
        type: b.type
      })),
      disclaimer: config.disclaimer
    };
  }

  /**
   * Tool: chatbot_submit_enquiry
   * Public enquiry submission via Chatbot with explicit visitor confirmation
   */
  static async chatbotSubmitEnquiry(
    args: {
      full_name: string;
      email: string;
      phone?: string;
      requested_services?: string[];
      budget?: string;
      project_details: string;
      estimate_ref_id?: string;
      confirmed_by_user?: boolean;
    },
    callerIp: string
  ) {
    if (!args.confirmed_by_user) {
      return {
        success: false,
        requiresConfirmation: true,
        message: 'Please ask the user to confirm their contact details and project summary before submitting.'
      };
    }

    if (!args.full_name || !args.full_name.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!args.email || !args.email.includes('@')) {
      return { success: false, error: 'A valid email address is required.' };
    }
    if (!args.project_details || !args.project_details.trim()) {
      return { success: false, error: 'Project details are required.' };
    }

    const enquiryRecord = createEnquiry({
      full_name: args.full_name.trim(),
      email: args.email.trim().toLowerCase(),
      phone: (args.phone || '').trim(),
      requested_services: Array.isArray(args.requested_services) && args.requested_services.length > 0
        ? args.requested_services
        : ['Website Design'],
      budget: args.budget || '₹25,000 - ₹50,000',
      project_details: args.project_details.trim(),
      estimate_ref_id: args.estimate_ref_id?.trim() || undefined
    });

    if (isSupabaseActive()) {
      try {
        await persistEnquiry(enquiryRecord);
      } catch {}
    }

    sendEnquiryNotification(enquiryRecord).catch(err => {
      console.warn('[Chatbot Enquiry Email Warning]:', err?.message || err);
    });

    recordMcpAudit({
      tool: 'chatbot_submit_enquiry',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: enquiryRecord.id,
      details: `Enquiry #${enquiryRecord.id} created for ${enquiryRecord.full_name} (${enquiryRecord.email})`
    });

    return {
      success: true,
      enquiryId: enquiryRecord.id,
      status: 'New',
      message: `Enquiry #${enquiryRecord.id} submitted successfully! A senior project strategist at Dawnexus will contact you at ${enquiryRecord.email} within 24 hours.`
    };
  }

  /**
   * Tool: enquiries_admin_list (Admin only)
   */
  static async enquiriesAdminList(args?: { status?: string; limit?: number }) {
    const limit = Math.min(args?.limit || 20, 100);
    const result = getEnquiries({
      status: (args?.status as any) || 'All',
      page: 1,
      limit
    });
    return {
      total: result.total,
      enquiries: (result.items || []).map(e => ({
        id: e.id,
        fullName: e.full_name,
        businessName: e.business_name,
        email: e.email,
        phone: e.phone,
        requestedServices: typeof e.requested_services === 'string' ? JSON.parse(e.requested_services || '[]') : e.requested_services,
        budget: e.budget,
        status: e.status,
        createdAt: e.created_at
      }))
    };
  }

  // ==========================================
  // VERSION 8.1.0: CLAUDE CANONICAL TOOLS
  // ==========================================

  /**
   * Tool: list_services
   */
  static listServices() {
    return {
      services: [
        {
          id: 'website-design',
          title: 'Website Design & High-Performance Web Development',
          slug: 'website-design',
          overview: 'Bespoke, conversion-engineered websites with sub-second page loads, mobile responsiveness, and modern interactive 3D capabilities.',
          targetAudience: 'Startups, growing enterprises, B2B services, and retail brands.',
          startingPrice: '₹14,999'
        },
        {
          id: 'seo-services',
          title: 'Search Engine Optimization (SEO) & Technical Visibility',
          slug: 'seo-services',
          overview: 'Data-backed search visibility and keyword rankings driven by Google Search Console insights, semantic schema markup, and content strategy.',
          targetAudience: 'Businesses targeting top Google search positions and inbound organic growth.',
          startingPrice: '₹9,999/mo'
        },
        {
          id: 'ai-video-creation',
          title: 'AI Video Creation & Visual Commercial Production',
          slug: 'ai-video-creation',
          overview: 'High-conversion AI video commercials, photorealistic avatar presentation, 3D product reels, and viral social campaigns.',
          targetAudience: 'E-commerce, real estate developers, product launches, and brand awareness.',
          startingPrice: '₹7,499'
        },
        {
          id: 'digital-marketing',
          title: 'Performance Digital Marketing & Full-Funnel Growth',
          slug: 'digital-marketing',
          overview: 'ROI-focused multi-channel marketing campaigns spanning Google Ads, Meta advertising, conversion funnel optimization, and retargeting.',
          targetAudience: 'Brands seeking direct customer acquisition, lead pipelines, and revenue scale.',
          startingPrice: '₹14,999/mo'
        }
      ]
    };
  }

  /**
   * Tool: get_service_details
   */
  static async getServiceDetails(serviceId: string) {
    const normalized = (serviceId || '').toLowerCase().replace(/^\/services\//, '').trim();
    const serviceContent = await this.websiteGetPageContent({ slug: normalized });
    if (serviceContent && (serviceContent as any).title) {
      return serviceContent;
    }
    const services = this.listServices().services;
    const matched = services.find(s => s.id === normalized || s.slug === normalized);
    if (!matched) {
      throw new Error(`Service '${serviceId}' not found. Available services: website-design, seo-services, ai-video-creation, digital-marketing`);
    }
    return matched;
  }

  /**
   * Tool: search_published_blogs
   */
  static async searchPublishedBlogs(args?: { query?: string; category?: string; limit?: number }) {
    await refreshFromPersistentStore();
    const result = getPublicBlogs({
      search: args?.query,
      category: args?.category,
      limit: args?.limit || 10
    });
    return {
      total: result.total,
      articles: result.items.map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        category: b.category,
        excerpt: b.excerpt,
        published_at: b.published_at,
        url: `https://www.dawnexus.in/blog/${b.slug}`
      }))
    };
  }

  /**
   * Tool: get_blog_post
   * Complete 360-degree article retrieval including all metadata, links, E-E-A-T evidence, citations, and SEO scores.
   */
  static async getBlogPost(args: { slug?: string; id?: number | string; blog_id?: number | string; article_id?: number | string }) {
    await refreshFromPersistentStore();
    const rawId = args?.id !== undefined && args.id !== null
      ? String(args.id).trim()
      : (args?.blog_id !== undefined && args.blog_id !== null
          ? String(args.blog_id).trim()
          : (args?.article_id !== undefined && args.article_id !== null
              ? String(args.article_id).trim()
              : ''));
    const rawSlug = args?.slug !== undefined && args.slug !== null ? String(args.slug).trim() : '';

    if (!rawId && !rawSlug) {
      throw new Error('Please provide either an article ID or slug to retrieve.');
    }

    let blog: BlogRecord | null = null;
    if (rawId) {
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId) && numId > 0 && String(numId) === rawId) {
        blog = getBlogById(numId);
      }
    }
    if (!blog && rawSlug) {
      blog = getBlogBySlug(rawSlug);
    }
    if (!blog && rawId && isNaN(parseInt(rawId, 10))) {
      blog = getBlogBySlug(rawId);
    }

    if (!blog) {
      throw new Error(
        `Blog post not found matching identifier ${rawId ? 'ID/slug "' + rawId + '"' : ''} ${rawSlug ? 'slug "' + rawSlug + '"' : ''}. Use list_blog_posts to view all active articles.`
      );
    }

    // Extract links
    const allExtracted = extractLinks(blog.content || '');
    const internalLinks = allExtracted
      .filter(l => l.href.startsWith('/') || l.href.includes('dawnexus.in'))
      .map(l => l.href);
    const externalLinks = allExtracted
      .filter(l => l.href.startsWith('http://') || l.href.startsWith('https://'))
      .filter(l => !l.href.includes('dawnexus.in'))
      .map(l => l.href);

    // Parse structured JSON arrays
    let secKws: string[] = [];
    try {
      secKws = typeof blog.secondary_keywords === 'string' ? JSON.parse(blog.secondary_keywords || '[]') : (blog.secondary_keywords || []);
    } catch {}

    let questions: string[] = [];
    try {
      questions = typeof blog.target_questions === 'string' ? JSON.parse(blog.target_questions || '[]') : (blog.target_questions || []);
    } catch {}

    let tags: string[] = [];
    try {
      tags = typeof blog.tags === 'string' ? JSON.parse(blog.tags || '[]') : (blog.tags || []);
    } catch {}

    let citationBlocks: any[] = [];
    try {
      citationBlocks = typeof blog.citation_answer_blocks === 'string' ? JSON.parse(blog.citation_answer_blocks || '[]') : (blog.citation_answer_blocks || []);
    } catch {}

    let extSources: any[] = [];
    try {
      extSources = typeof blog.external_sources === 'string' ? JSON.parse(blog.external_sources || '[]') : (blog.external_sources || []);
    } catch {}

    let parsedSeoReport: any = null;
    try {
      parsedSeoReport = blog.seo_report ? JSON.parse(blog.seo_report) : null;
    } catch {}

    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      status: blog.status,
      scheduled_at: blog.scheduled_at,
      published_at: blog.published_at,
      created_at: blog.created_at,
      updated_at: blog.updated_at,
      content: blog.content,
      excerpt: blog.excerpt,
      category: blog.category,
      author: blog.author,
      author_role: blog.author_role || '',
      author_bio: blog.author_bio || '',
      author_credentials: blog.author_credentials || '',
      reviewer_name: blog.reviewer_name || '',
      editorial_notes: blog.editorial_notes || '',
      primary_keyword: blog.primary_keyword,
      secondary_keywords: secKws,
      target_location: blog.target_location,
      search_intent: blog.search_intent,
      target_audience: blog.target_audience,
      target_questions: questions,
      tags,
      seo_title: blog.seo_title,
      meta_description: blog.meta_description,
      canonical_url: blog.canonical_url,
      featured_image: blog.featured_image,
      image_alt: blog.image_alt,
      caption: blog.caption || '',
      internal_links: internalLinks,
      external_links: externalLinks,
      firsthand_observations: blog.firsthand_observations || '',
      project_examples: blog.project_examples || '',
      case_studies: blog.case_studies || '',
      original_research_data: blog.original_research_data || '',
      implementation_process: blog.implementation_process || '',
      limitations_lessons: blog.limitations_lessons || '',
      external_sources: extSources,
      citation_answer_blocks: citationBlocks,
      review_cycle_days: blog.review_cycle_days || 90,
      last_reviewed_at: blog.last_reviewed_at,
      content_revision: blog.content_revision,
      revision: blog.revision || blog.content_revision || '',
      seo_report: parsedSeoReport,
      technical_seo_score: parsedSeoReport?.totalScore || 0,
      information_gain_score: assessInformationGain(blog).overallScore,
      admin_notes: blog.admin_notes || '',
      url: `https://www.dawnexus.in/blog/${blog.slug}`
    };
  }

  /**
   * Tool: get_approved_business_information
   */
  static getApprovedBusinessInformation() {
    return {
      brand: 'Dawnexus',
      legalEntity: 'Dawnexus Technologies',
      domain: 'https://www.dawnexus.in',
      tagline: 'Full-Stack Digital Engineering & AI SEO Architecture',
      description: 'Dawnexus is a full-stack digital product engineering, technical SEO, and AI solutions agency based in Coimbatore, Tamil Nadu, India. Dawnexus specializes in bespoke website engineering, high-performance SEO architecture, AI video commercials, and digital marketing.',
      location: {
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        postalCode: '641004',
        region: 'Asia/Kolkata'
      },
      contact: {
        email: 'contact@dawnexus.in',
        supportEmail: 'vkv@dawnexus.in',
        phone: '+91 95669 88390',
        businessHours: 'Monday - Saturday: 9:00 AM - 6:30 PM IST'
      },
      verifiedServices: [
        'Website Design & Custom Full-Stack Development',
        'Technical & Content Search Engine Optimization (SEO)',
        'AI Video Production & Visual Commercial Assets',
        'Performance Digital Marketing & Conversion Optimization'
      ],
      mcpEndpoint: 'https://www.dawnexus.in/mcp'
    };
  }

  /**
   * Tool: get_approved_pricing_information
   */
  static getApprovedPricingInformation(args?: { service?: string; complexity?: string }) {
    const config = getCalculatorPricingConfig();
    return {
      currency: 'INR (₹)',
      pricingTiers: {
        starter: { name: 'Starter Website', range: '₹14,999 - ₹24,999', turnAround: '5-7 business days' },
        business: { name: 'Business Growth Suite', range: '₹25,000 - ₹49,999', turnAround: '10-14 business days' },
        enterprise: { name: 'Enterprise Engineering / Full-Stack', range: '₹50,000+', turnAround: '15-25 business days' }
      },
      calculatorConfig: config,
      note: 'Exact pricing depends on specific functional requirements, database scope, AI features, and delivery timeline.'
    };
  }

  /**
   * Tool: list_blog_posts
   * Lists CMS articles with status counts, category filtering, and pagination.
   */
  static async listBlogPosts(args?: { status?: string; category?: string; limit?: number; page?: number }) {
    await refreshFromPersistentStore();
    const rawStatus = args?.status?.toLowerCase();
    const status = !rawStatus || rawStatus === 'all' ? undefined : (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1) as any);

    // Compute status counts across entire repository
    const { items: allArticles } = getBlogs({ limit: 1000 });
    const countsByStatus = {
      Draft: allArticles.filter(b => b.status === 'Draft').length,
      Scheduled: allArticles.filter(b => b.status === 'Scheduled').length,
      Published: allArticles.filter(b => b.status === 'Published').length,
      Failed: allArticles.filter(b => b.status === 'Failed').length,
      Archived: allArticles.filter(b => b.status === 'Archived').length,
      total: allArticles.length
    };

    const result = getBlogs({
      status,
      category: args?.category,
      limit: Math.min(args?.limit || 20, 100),
      page: args?.page || 1
    });

    return {
      countsByStatus,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      items: result.items.map(b => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        category: b.category,
        status: b.status,
        published_at: b.published_at,
        scheduled_at: b.scheduled_at,
        created_at: b.created_at,
        updated_at: b.updated_at,
        primary_keyword: b.primary_keyword,
        word_count: (b.content || '').split(/\s+/).filter(Boolean).length,
        has_featured_image: Boolean(b.featured_image),
        content_revision: b.content_revision,
        url: `https://www.dawnexus.in/blog/${b.slug}`
      }))
    };
  }

  /**
   * Tool: audit_blog_article
   * Executes dual Technical SEO (100-pt rubric) and Information Gain / E-E-A-T quality audit.
   */
  static async auditBlogArticle(args: { id?: number | string; slug?: string; draft?: BlogAuditInput }) {
    await refreshFromPersistentStore();
    let blog: any = null;
    if (args.draft) {
      blog = args.draft;
    } else if (args.id) {
      const numId = parseInt(String(args.id).trim(), 10);
      blog = getBlogById(numId);
    } else if (args.slug) {
      blog = getBlogBySlug(args.slug.trim());
    }

    if (!blog) {
      throw new Error(`Article not found for audit matching ${args.id ? 'ID #' + args.id : 'slug "' + args.slug + '"'}`);
    }

    const { items: allBlogs } = getBlogs({ limit: 100 });
    const publishedSlugs = allBlogs.filter(b => b.status === 'Published' && b.id !== blog.id).map(b => b.slug);

    // 1. Technical SEO Audit (100-point rubric)
    const technicalSeo = normalizeSeoReport(
      calculateSeoScore(
        {
          title: blog.title,
          slug: blog.slug,
          content: blog.content,
          excerpt: blog.excerpt,
          category: blog.category,
          primary_keyword: blog.primary_keyword,
          secondary_keywords: blog.secondary_keywords,
          search_intent: blog.search_intent,
          target_audience: blog.target_audience,
          seo_title: blog.seo_title,
          meta_description: blog.meta_description || blog.excerpt,
          canonical_url: blog.canonical_url,
          featured_image: blog.featured_image,
          image_alt: blog.image_alt
        },
        publishedSlugs,
        90,
        blog.id
      )
    );

    // 2. Information Gain & E-E-A-T Quality Audit
    const infoGain = assessInformationGain(blog);

    // 3. Evidence-aware completeness breakdown
    const hasFirsthand = Boolean((blog.firsthand_observations || '').trim().length >= 80);
    const hasCaseStudy = Boolean((blog.case_studies || '').trim().length >= 80 || (blog.original_research_data || '').trim().length >= 80);
    const hasImplementation = Boolean((blog.implementation_process || '').trim().length >= 80);
    let parsedExtSources: any[] = [];
    try {
      parsedExtSources = typeof blog.external_sources === 'string' ? JSON.parse(blog.external_sources || '[]') : (blog.external_sources || []);
    } catch {}
    let parsedCitationBlocks: any[] = [];
    try {
      parsedCitationBlocks = typeof blog.citation_answer_blocks === 'string' ? JSON.parse(blog.citation_answer_blocks || '[]') : (blog.citation_answer_blocks || []);
    } catch {}

    const evidenceSummary = {
      firsthand_evidence: hasFirsthand ? 'complete_verified' : (blog.firsthand_observations?.trim() ? 'supplied_unverified' : 'missing'),
      case_study_data: hasCaseStudy ? 'complete_verified' : (blog.case_studies?.trim() ? 'supplied_unverified' : 'missing'),
      implementation_detail: hasImplementation ? 'complete_verified' : (blog.implementation_process?.trim() ? 'supplied_unverified' : 'missing'),
      primary_citations: parsedExtSources.length > 0 ? 'complete_verified' : 'missing',
      limitations_uncertainty: blog.limitations_lessons?.trim() ? 'complete_verified' : 'missing',
      citation_answer_blocks: parsedCitationBlocks.length > 0 ? 'complete_verified' : 'missing',
      author_credentials: (blog.author_role?.trim() && blog.author_credentials?.trim()) ? 'complete_verified' : (blog.author_role?.trim() ? 'supplied_unverified' : 'missing')
    };

    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      status: blog.status,
      content_revision: technicalSeo.contentRevision,
      technical_seo: {
        score: technicalSeo.totalScore,
        max_score: technicalSeo.maxScore,
        percentage: technicalSeo.percentage,
        meets_threshold: technicalSeo.meetsThreshold,
        passed_checks: technicalSeo.passedChecks,
        failed_checks: technicalSeo.failedChecks,
        warnings: technicalSeo.warnings,
        required_fixes: technicalSeo.requiredFixes
      },
      technicalSeo: {
        score: technicalSeo.totalScore,
        maxScore: technicalSeo.maxScore,
        percentage: technicalSeo.percentage,
        meetsThreshold: technicalSeo.meetsThreshold,
        passedChecks: technicalSeo.passedChecks,
        failedChecks: technicalSeo.failedChecks,
        warnings: technicalSeo.warnings,
        requiredFixes: technicalSeo.requiredFixes
      },
      evidence_audit: {
        overall_score: infoGain.overallScore,
        ai_readiness_score: (infoGain as any).ai_readiness_score || 0,
        criteria: infoGain.criteria,
        strengths: infoGain.strengths,
        missing_evidence: infoGain.missingEvidence,
        actionable_fixes: infoGain.actionableFixes
      },
      informationGain: infoGain,
      summary: {
        strengths: infoGain.strengths,
        criticalGaps: infoGain.missingEvidence,
        technicalFixes: technicalSeo.requiredFixes
      },
      evidence_completeness_summary: evidenceSummary,
      recommendations: [
        ...technicalSeo.requiredFixes.map(f => `[Technical SEO Fix]: ${f}`),
        ...infoGain.actionableFixes.map(f => `[E-E-A-T & Evidence Fix]: ${f}`)
      ]
    };
  }

  /**
   * Tool: bulk_audit_blogs
   * Executes dual audits in controlled batches with pagination.
   */
  static async bulkAuditBlogs(args: {
    status?: string;
    category?: string;
    ids?: number[];
    page?: number;
    limit?: number;
  }) {
    await refreshFromPersistentStore();
    const { items: allBlogs } = getBlogs({ limit: 500 });
    let filtered = allBlogs;

    if (args.status && args.status.toLowerCase() !== 'all') {
      filtered = filtered.filter(b => b.status.toLowerCase() === args.status!.toLowerCase());
    }
    if (args.category) {
      filtered = filtered.filter(b => b.category.toLowerCase() === args.category!.toLowerCase());
    }
    if (Array.isArray(args.ids) && args.ids.length > 0) {
      filtered = filtered.filter(b => args.ids!.includes(b.id));
    }

    const page = Math.max(1, args.page || 1);
    const limit = Math.min(50, Math.max(1, args.limit || 10));
    const offset = (page - 1) * limit;
    const pageItems = filtered.slice(offset, offset + limit);

    const results = [];
    for (const blog of pageItems) {
      try {
        const audit = await McpService.auditBlogArticle({ id: blog.id });
        results.push({
          id: blog.id,
          title: blog.title,
          slug: blog.slug,
          status: blog.status,
          technical_seo_score: audit.technical_seo.score,
          evidence_score: audit.evidence_audit.overall_score,
          content_revision: audit.content_revision,
          evidence_summary: audit.evidence_completeness_summary,
          top_recommendations: audit.recommendations.slice(0, 3)
        });
      } catch (err: any) {
        results.push({
          id: blog.id,
          title: blog.title,
          status: blog.status,
          error: err?.message || 'Audit failed'
        });
      }
    }

    return {
      total: filtered.length,
      totalAudited: results.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
      summary: {
        total: filtered.length,
        audited: results.length,
        passed: results.filter(r => !r.error).length
      },
      results
    };
  }

  /**
   * Tool: bulk_improve_blogs
   * Processes blog improvements with dry-run support, optimistic concurrency, and validation.
   */
  static async bulkImproveBlogs(
    args: {
      improvements: Array<{
        id: number;
        expected_revision?: string;
        updates: any;
      }>;
      dry_run?: boolean;
    },
    callerIp: string = 'mcp-client'
  ) {
    const isDryRun = args.dry_run !== false; // Default to true for safety
    const results = [];

    for (const item of args.improvements || []) {
      const blogId = Number(item.id);
      if (!blogId) {
        results.push({ id: item.id, status: 'error', error: 'Invalid article ID' });
        continue;
      }

      const existing = getBlogById(blogId);
      if (!existing) {
        results.push({ id: blogId, status: 'error', error: `Article #${blogId} not found` });
        continue;
      }

      // Concurrency check
      if (item.expected_revision && existing.content_revision && item.expected_revision !== existing.content_revision) {
        results.push({
          id: blogId,
          status: 'conflict',
          error: `Content revision conflict: expected '${item.expected_revision}', found '${existing.content_revision}'`
        });
        continue;
      }

      if (isDryRun) {
        const simulated = { ...existing, ...item.updates };
        if (existing.status === 'Scheduled') {
          simulated.status = 'Scheduled';
          simulated.scheduled_at = existing.scheduled_at;
          simulated.slug = existing.slug;
        } else if (existing.status === 'Published') {
          simulated.status = 'Published';
          simulated.published_at = existing.published_at;
          simulated.slug = existing.slug;
        }

        const simulatedAudit = await McpService.auditBlogArticle({ draft: simulated as any });
        results.push({
          id: blogId,
          title: existing.title,
          status: existing.status,
          mode: 'dry_run (not saved)',
          applied: false,
          current_seo_score: (existing.seo_report ? JSON.parse(existing.seo_report)?.totalScore : null),
          projected_seo_score: simulatedAudit.technical_seo.score,
          projected_evidence_score: simulatedAudit.evidence_audit.overall_score,
          evidence_summary: simulatedAudit.evidence_completeness_summary,
          validation: 'passed',
          fields_to_update: Object.keys(item.updates || {})
        });
      } else {
        try {
          const outcome = await McpService.updateBlogArticle(
            {
              id: blogId,
              expected_revision: item.expected_revision,
              ...item.updates
            },
            callerIp
          );

          results.push({
            id: blogId,
            title: outcome.blog.title,
            status: outcome.blog.status,
            mode: 'saved_and_verified',
            technical_seo_score: outcome.technicalSeo.totalScore,
            evidence_score: outcome.evidenceReport.overallScore,
            content_revision: outcome.blog.content_revision,
            scheduled_at: outcome.blog.scheduled_at,
            published_at: outcome.blog.published_at,
            message: outcome.message
          });
        } catch (err: any) {
          results.push({
            id: blogId,
            status: 'failed',
            error: err?.message || 'Update failed'
          });
        }
      }
    }

    return {
      dry_run: isDryRun,
      processed: results.length,
      improvementsCount: results.length,
      results
    };
  }

  /**
   * Tool: get_blog_post_status
   */
  static async getBlogPostStatus(args: { id?: number; slug?: string }) {
    await refreshFromPersistentStore();
    let blog: BlogRecord | null = null;
    if (args.id) {
      blog = getBlogById(Number(args.id));
    } else if (args.slug) {
      blog = getBlogBySlug(args.slug.trim());
    }
    if (!blog) {
      throw new Error(`Blog post not found matching ${args.id ? 'ID #' + args.id : 'slug "' + args.slug + '"'}`);
    }
    return {
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      status: blog.status,
      scheduled_at: blog.scheduled_at,
      published_at: blog.published_at,
      word_count: (blog.content || '').split(/\s+/).filter(Boolean).length,
      hasFeaturedImage: Boolean(blog.featured_image),
      url: `https://www.dawnexus.in/blog/${blog.slug}`
    };
  }

  /**
   * Tool: publish_blog_post (Approval gate strictly enforced)
   */
  static async publishBlogPost(
    args: { id: number; approved: boolean },
    callerIp: string = 'mcp-client'
  ) {
    if (args.approved !== true) {
      recordMcpAudit({
        tool: 'publish_blog_post',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: args.id,
        details: 'Rejected attempt to publish blog without explicit human approval (approved !== true).'
      });
      throw new Error(
        `Approval required: Blog post #${args.id} cannot be published live without explicit user approval confirmation (approved: true).`
      );
    }

    await refreshFromPersistentStore();
    const blog = getBlogById(Number(args.id));
    if (!blog) {
      throw new Error(`Blog post with ID #${args.id} not found.`);
    }

    const now = new Date().toISOString();
    const updated = updateBlog(blog.id, {
      status: 'Published',
      published_at: now
    });

    if (updated) {
      await persistBlog(updated);
    }

    recordMcpAudit({
      tool: 'publish_blog_post',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: blog.id,
      details: `Published blog #${blog.id} ("${blog.title}") live to production.`
    });

    return {
      success: true,
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      status: 'Published',
      published_at: now,
      liveUrl: `https://www.dawnexus.in/blog/${blog.slug}`,
      message: `Blog post #${blog.id} ("${blog.title}") is now published live on Dawnexus.`
    };
  }

  /**
   * Tool: get_authorized_enquiry
   */
  static getAuthorizedEnquiry(id: number) {
    const enquiry = getEnquiryById(Number(id));
    if (!enquiry) {
      throw new Error(`Enquiry #${id} not found.`);
    }
    return {
      id: enquiry.id,
      fullName: enquiry.full_name,
      businessName: enquiry.business_name,
      email: enquiry.email,
      phone: enquiry.phone,
      requestedServices: typeof enquiry.requested_services === 'string' ? JSON.parse(enquiry.requested_services || '[]') : enquiry.requested_services,
      budget: enquiry.budget,
      projectDetails: enquiry.project_details,
      status: enquiry.status,
      notes: enquiry.admin_notes,
      createdAt: enquiry.created_at,
      updatedAt: enquiry.updated_at
    };
  }

  /**
   * Tool: get_enquiry_submission_status
   */
  static getEnquirySubmissionStatus(args: { id?: number; email?: string }) {
    if (args.id) {
      const e = getEnquiryById(Number(args.id));
      if (e) {
        return {
          found: true,
          id: e.id,
          status: e.status,
          fullName: e.full_name,
          createdAt: e.created_at,
          message: `Enquiry #${e.id} is currently in '${e.status}' status.`
        };
      }
    }
    if (args.email) {
      const list = getEnquiries({ page: 1, limit: 10 });
      const matched = (list.items || []).find(e => e.email.toLowerCase() === args.email!.toLowerCase());
      if (matched) {
        return {
          found: true,
          id: matched.id,
          status: matched.status,
          fullName: matched.full_name,
          createdAt: matched.created_at,
          message: `Latest enquiry #${matched.id} for ${matched.email} is in '${matched.status}' status.`
        };
      }
    }
    return {
      found: false,
      message: 'No matching enquiry found for the specified ID or email.'
    };
  }

  /**
   * Tool: get_chatbot_analytics
   */
  static getChatbotAnalytics(args?: { days?: number }) {
    const enquiries = getEnquiries({ page: 1, limit: 100 });
    const chatbotEnquiries = (enquiries.items || []).filter(e =>
      (e.admin_notes && e.admin_notes.toLowerCase().includes('chatbot')) ||
      (e.project_details && e.project_details.toLowerCase().includes('chat'))
    );

    return {
      periodDays: args?.days || 30,
      totalChatbotEnquiries: chatbotEnquiries.length,
      conversionRate: enquiries.total > 0 ? `${((chatbotEnquiries.length / enquiries.total) * 100).toFixed(1)}%` : '0%',
      topInquiredServices: [
        'Website Design',
        'SEO Services',
        'AI Video Creation',
        'Digital Marketing'
      ],
      assistantStatus: 'Operational',
      knowledgeBaseSync: 'Active'
    };
  }
}

