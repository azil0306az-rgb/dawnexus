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
  VALID_CATEGORIES,
  DAWNEXUS_CORE_URLS,
  SeoAuditReport,
  BlogAuditInput
} from './seoScorer.js';
import { recordMcpAudit } from './mcpAuth.js';
import { decryptPayload } from './routes/seoResearch.js';
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

    if (!conn || !conn.encrypted_tokens) {
      return {
        status: 'diagnostic',
        property: targetProperty,
        hasLiveMetrics: false,
        diagnosticMessage: 'Google Search Console is not connected. Connect your authorized Google Account in Dawnexus Admin > SEO Research.',
        resolution: 'Authenticate Google Search Console via OAuth in the Admin panel to stream live query performance metrics.',
        opportunities: []
      };
    }

    const decrypted = decryptPayload(conn.encrypted_tokens);
    if (!decrypted) {
      return {
        status: 'error',
        property: targetProperty,
        hasLiveMetrics: false,
        diagnosticMessage: 'Stored OAuth token could not be decrypted. Secret key rotation may have occurred.',
        resolution: 'Reconnect Google Search Console in Admin > SEO Research to establish a new encrypted session.',
        opportunities: []
      };
    }

    let tokens: any;
    try {
      tokens = JSON.parse(decrypted);
    } catch {
      return {
        status: 'error',
        property: targetProperty,
        hasLiveMetrics: false,
        diagnosticMessage: 'OAuth token payload corrupted.',
        opportunities: []
      };
    }

    // Attempt real Search Console API query
    try {
      const gscEndpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(targetProperty)}/searchAnalytics/query`;
      const gscRes = await fetch(gscEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dimensions: ['query'],
          rowLimit: 25
        })
      });

      if (!gscRes.ok) {
        const errorText = await gscRes.text();
        return {
          status: 'diagnostic',
          property: targetProperty,
          hasLiveMetrics: false,
          diagnosticMessage: `Google Search Console API returned HTTP ${gscRes.status}: ${errorText.slice(0, 200)}. The connected Google account does not have verified owner/viewer permissions for the property ${targetProperty} in Google Search Console.`,
          resolution: 'Ensure the Google account authorized in Dawnexus Admin has been added as a Verified Owner or Full User in Google Search Console for https://dawnexus.in/.',
          opportunities: []
        };
      }

      const data = await gscRes.json();
      const rows = data.rows || [];
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
        property: targetProperty,
        hasLiveMetrics: true,
        opportunities
      };
    } catch (err: any) {
      return {
        status: 'error',
        property: targetProperty,
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
      contentGuidelines: {
        targetAudience: 'Business owners, founders, CTOs, and marketing directors looking for modern web design, technical SEO, and AI digital growth.',
        tone: 'Authoritative, transparent, highly actionable, forward-looking agency perspective. No generic AI fluff.',
        publicationPolicy: 'Draft first. Human approval and scheduling strictly required through the Dawnexus Admin panel.',
        mandatoryChecks: [
          'Must select from existing CMS categories.',
          'Must link to at least 2 authentic Dawnexus URLs.',
          'No fabricated statistics or unverified client claims.',
          'Must achieve 90/100 or higher on deterministic SEO quality audit.'
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
    const canonicalUrl = input.canonical_url || `https://dawnexus.in/blog/${desiredSlug}`;

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
    const seoReport = calculateSeoScore(
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
      publishedSlugs
    );

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
      blog: created,
      seoReport,
      previewUrl: `https://dawnexus.in/blog/${created.slug}`,
      adminReviewUrl: 'https://dawnexus.in/admin',
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
    const seoReport = calculateSeoScore(
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
      publishedSlugs
    );

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
      blog: updated,
      seoReport,
      message: `Draft #${id} updated successfully.`
    };
  }

  /**
   * Tool 7: attach_blog_image
   * Uploads base64 or hosted image to Supabase Storage and attaches it to a draft.
   */
  static async attachBlogImage(
    input: {
      id: number;
      image: string; // base64 data URL or hosted https URL
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
    const existing = getBlogById(input.id);
    if (!existing) {
      throw new Error(`Article with ID #${input.id} not found.`);
    }

    if (existing.status !== 'Draft') {
      throw new Error(`Cannot attach image to article #${input.id} because its status is '${existing.status}'. Only drafts can be modified.`);
    }

    if (!input.image || typeof input.image !== 'string' || !input.image.trim()) {
      throw new Error('Image data or URL is required.');
    }

    let finalImageUrl = input.image.trim();

    // Check if it's a data URL
    const matches = input.image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 5 * 1024 * 1024) {
        throw new Error('Image file size exceeds 5MB limit.');
      }

      const extension = (mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const safeName = `mcp-blog-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase Storage is not configured on the server.');
      }

      const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      const { data, error } = await supabase.storage
        .from('blog-images')
        .upload(safeName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error || !data) {
        recordMcpAudit({
          tool: 'attach_blog_image',
          action: 'write',
          status: 'failed',
          callerIp,
          targetId: input.id,
          details: `Supabase Storage upload failed: ${error?.message}`
        });
        throw new Error(`Supabase Storage upload failed: ${error?.message || 'No data returned'}`);
      }

      const { data: pubData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(safeName);

      finalImageUrl = pubData.publicUrl;
    } else if (!finalImageUrl.startsWith('http://') && !finalImageUrl.startsWith('https://')) {
      throw new Error('Invalid image format. Provide a valid base64 data URL or hosted HTTPS image URL.');
    }

    const updated = updateBlog(input.id, {
      featured_image: finalImageUrl,
      image_alt: (input.image_alt || existing.image_alt || existing.title).trim()
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
      message: `Featured image successfully uploaded and attached to draft #${input.id}.`
    };
  }

  /**
   * Tool 8: run_seo_quality_check
   * Executes deterministic 100-point audit on draft or input object.
   */
  static runSeoQualityCheck(
    input: { id?: number; draft?: BlogAuditInput },
    callerIp: string = 'mcp-client'
  ): SeoAuditReport {
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

    const report = calculateSeoScore(auditData, publishedSlugs);

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
}
