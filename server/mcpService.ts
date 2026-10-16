/**
 * Dawnexus AI SEO Studio — Core MCP Service
 * Encapsulates all read and write business logic for the MCP Tools
 */

import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  persistBlog,
  ensureUniqueSlug,
  slugify,
  getSeoConnection,
  refreshFromPersistentStore,
  BlogRecord
} from './db.js';
import {
  calculateSeoScore,
  normalizeSeoReport,
  computeContentRevision,
  VALID_CATEGORIES,
  DAWNEXUS_CORE_URLS,
  SeoAuditReport,
  BlogAuditInput
} from './seoScorer.js';
import { recordMcpAudit } from './mcpAuth.js';
import { GscService, decryptPayload } from './gscService.js';
import { Ga4Service } from './ga4Service.js';
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
    targetServices: ['https://dawnexus.in/services/website-design', 'https://dawnexus.in/website-cost-calculator']
  },
  {
    id: 'seo-strategy',
    name: 'SEO Strategy',
    description: 'Technical SEO, search ranking signals, search intent, topical authority, local visibility, and organic search growth.',
    targetServices: ['https://dawnexus.in/services/seo-services']
  },
  {
    id: 'ai-creative',
    name: 'AI Creative',
    description: 'Generative media workflows, AI commercial video production, interactive 3D visualizations, and modern creative technology.',
    targetServices: ['https://dawnexus.in/services/ai-video-creation']
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    description: 'Paid search, social acquisition, performance funnels, multi-channel growth campaigns, and customer journey optimization.',
    targetServices: ['https://dawnexus.in/services/digital-marketing']
  },
  {
    id: 'digital-strategy',
    name: 'Digital Strategy',
    description: 'Executive business transformation, digital ROI planning, technology roadmaps, and competitive market positioning.',
    targetServices: ['https://dawnexus.in/']
  },
  {
    id: 'conversion-optimization',
    name: 'Conversion Optimization',
    description: 'Landing page conversion rate optimization (CRO), user journey analytics, heatmaps, and funnel drop-off mitigation.',
    targetServices: ['https://dawnexus.in/services/website-design', 'https://dawnexus.in/website-cost-calculator']
  },
  {
    id: 'case-studies',
    name: 'Case Studies',
    description: 'Deep-dive client implementation analyses, architectural walkthroughs, and measurable verified outcomes.',
    targetServices: ['https://dawnexus.in/']
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
      { title: 'Dawnexus Homepage', url: 'https://dawnexus.in/', category: 'Core' },
      { title: 'Website Design & Development', url: 'https://dawnexus.in/services/website-design', category: 'Services' },
      { title: 'Search Engine Optimization', url: 'https://dawnexus.in/services/seo-services', category: 'Services' },
      { title: 'AI Video Creation & Marketing', url: 'https://dawnexus.in/services/ai-video-creation', category: 'Services' },
      { title: 'Digital Marketing & Growth', url: 'https://dawnexus.in/services/digital-marketing', category: 'Services' },
      { title: 'Interactive Website Cost Calculator', url: 'https://dawnexus.in/website-cost-calculator', category: 'Tools' },
      { title: 'Dawnexus Insights & Knowledge Hub', url: 'https://dawnexus.in/blog', category: 'Blog' }
    ];

    const publishedBlogTargets = items
      .filter(b => b.status === 'Published')
      .map(b => ({
        title: b.title,
        url: `https://dawnexus.in/blog/${b.slug}`,
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
    const targetProperty = conn?.selected_property || 'https://dawnexus.in/';

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
          resolution: 'Ensure the Google account authorized in Dawnexus Admin has been added as a Verified Owner or Full User in Google Search Console for https://dawnexus.in/.',
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
      { title: 'Dawnexus Homepage', url: 'https://dawnexus.in/', category: 'Core' },
      { title: 'Website Design & Development', url: 'https://dawnexus.in/services/website-design', category: 'Services' },
      { title: 'Search Engine Optimization', url: 'https://dawnexus.in/services/seo-services', category: 'Services' },
      { title: 'AI Video Creation & Marketing', url: 'https://dawnexus.in/services/ai-video-creation', category: 'Services' },
      { title: 'Digital Marketing & Growth', url: 'https://dawnexus.in/services/digital-marketing', category: 'Services' },
      { title: 'Interactive Website Cost Calculator', url: 'https://dawnexus.in/website-cost-calculator', category: 'Tools' },
      { title: 'Dawnexus Insights & Knowledge Hub', url: 'https://dawnexus.in/blog', category: 'Blog' },
      ...publishedArticles.map(p => ({
        title: p.title,
        url: `https://dawnexus.in/blog/${p.slug}`,
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
   * Tool 6: update_blog_draft
   * Modifies an existing draft only. Rejects modification of published articles.
   */
  static async updateBlogDraft(
    id: number,
    updates: {
      title?: string;
      category?: string;
      content?: string;
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
    message: string;
  }> {
    await refreshFromPersistentStore();
    const existing = getBlogById(id);
    if (!existing) {
      recordMcpAudit({
        tool: 'update_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: id,
        details: `Article #${id} not found.`
      });
      throw new Error(`Article with ID #${id} not found.`);
    }

    // Strict constraint: Only Draft records may be edited through MCP
    if (existing.status !== 'Draft') {
      recordMcpAudit({
        tool: 'update_blog_draft',
        action: 'write',
        status: 'rejected',
        callerIp,
        targetId: id,
        details: `Rejected attempt to modify article #${id} with status '${existing.status}'. Only 'Draft' articles can be modified via MCP.`
      });
      throw new Error(
        `Action prohibited: Article #${id} has status '${existing.status}'. The MCP connector is strictly prohibited from modifying published, scheduled, or archived articles. Edits must be made directly in the Dawnexus Admin panel.`
      );
    }

    // Prohibit status alteration to Published or Scheduled
    if (updates.status && updates.status !== 'Draft') {
      throw new Error(
        `Action prohibited: Cannot change article status to '${updates.status}' via MCP. Articles must be approved and scheduled by an admin in the Admin panel.`
      );
    }

    // Validate category if updating category
    if (updates.category) {
      const cleanCat = updates.category.trim();
      if (!(VALID_CATEGORIES as readonly string[]).includes(cleanCat)) {
        throw new Error(
          `Validation error: Category '${cleanCat}' is invalid. Must be one of: ${VALID_CATEGORIES.join(', ')}.`
        );
      }
    }

    const updated = updateBlog(id, {
      ...updates,
      status: 'Draft',
      admin_notes: `${existing.admin_notes || ''}\n[MCP AI SEO Studio] Updated via ChatGPT connector on ${new Date().toISOString()}`.trim()
    });

    if (!updated) {
      throw new Error(`Failed to update draft #${id}.`);
    }

    // Persist synchronously to Supabase
    try {
      await persistBlog(updated);
    } catch (persistErr: any) {
      recordMcpAudit({
        tool: 'update_blog_draft',
        action: 'write',
        status: 'failed',
        callerIp,
        targetId: id,
        details: `Supabase persistence failed on update: ${persistErr?.message}`
      });
      throw new Error(`Supabase persistence failed on update: ${persistErr?.message}`);
    }

    const { items: allBlogs } = getBlogs({ limit: 100 });
    const publishedSlugs = allBlogs.filter(b => b.status === 'Published').map(b => b.slug);
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

    const withSeo = updateBlog(id, {
      seo_report: JSON.stringify(seoReport),
      content_revision: seoReport.contentRevision
    }) || updated;

    try {
      await persistBlog(withSeo);
    } catch {
      // Non-fatal
    }

    recordMcpAudit({
      tool: 'update_blog_draft',
      action: 'write',
      status: 'success',
      callerIp,
      targetId: id,
      details: `Updated draft #${id}. New SEO score: ${seoReport.totalScore}/100.`
    });

    return {
      success: true,
      blog: withSeo,
      seoReport,
      message: `Draft #${id} updated successfully.`
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
      testUrl = `https://dawnexus.in${testUrl}`;
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
}

