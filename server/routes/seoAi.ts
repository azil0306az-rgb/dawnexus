import { Router, Request, Response } from 'express';
import { requireAuth } from '../auth.js';
import { GeminiService } from '../geminiService.js';
import { GscService } from '../gscService.js';
import { Ga4Service } from '../ga4Service.js';
import { ADMIN_STUDIO_TOOLS, runGeminiWithMcp } from '../geminiMcpClient.js';
import {
  getSeoCategories,
  getSeoCategoryById,
  createSeoCategory,
  updateSeoCategory,
  deleteSeoCategory,
  getBlogs,
  getBlogById,
  createBlog,
  bulkScheduleBlogsReliable
} from '../db.js';
import {
  isSupabaseActive,
  pushSeoCategoryToSupabase,
  deleteSeoCategoryFromSupabase,
  pushBlogToSupabase
} from '../supabase.js';

export const seoAiRouter = Router();

// Apply admin authentication to all SEO AI routes
seoAiRouter.use(requireAuth);

/**
 * GET /api/admin/seo-ai/status
 * Telemetry and operational connection check for Google Gemini API
 */
seoAiRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const conn = await GeminiService.testConnection();
    const stats = GeminiService.getUsageStats();

    res.json({
      success: true,
      version: '7.1.8',
      connected: conn.connected,
      activeModel: conn.model || stats.activeModel,
      configured: stats.configured,
      error: conn.error || stats.lastError || null,
      usage: stats
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      success: false,
      connected: false,
      error: GeminiService.redactSecrets(msg)
    });
  }
});

/**
 * GET /api/admin/seo-ai/categories
 * Lists dynamic SEO categories
 */
seoAiRouter.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = getSeoCategories();
    res.json({ success: true, categories });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to retrieve SEO categories'
    });
  }
});

/**
 * POST /api/admin/seo-ai/categories
 * Creates a dynamic SEO category
 */
seoAiRouter.post('/categories', async (req: Request, res: Response) => {
  try {
    const { name, slug, primary_keyword, secondary_keywords, target_audience, search_intent, instructions } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Category name is required.' });
    }

    const created = createSeoCategory({
      name: name.trim(),
      slug: slug?.trim(),
      primary_keyword: primary_keyword?.trim(),
      secondary_keywords: Array.isArray(secondary_keywords) ? secondary_keywords : [],
      target_audience: target_audience?.trim(),
      search_intent: search_intent?.trim(),
      instructions: instructions?.trim()
    });

    if (isSupabaseActive()) {
      try {
        await pushSeoCategoryToSupabase(created);
      } catch {}
    }

    res.status(201).json({ success: true, category: created });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create SEO category';
    res.status(400).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/admin/seo-ai/categories/:id
 * Updates an existing dynamic SEO category
 */
seoAiRouter.put('/categories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid category ID' });
    }

    const updated = updateSeoCategory(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    if (isSupabaseActive()) {
      try {
        await pushSeoCategoryToSupabase(updated);
      } catch {}
    }

    res.json({ success: true, category: updated });
  } catch (err: unknown) {
    res.status(400).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update SEO category'
    });
  }
});

/**
 * DELETE /api/admin/seo-ai/categories/:id
 * Deletes a category while strictly preserving historical blog posts
 */
seoAiRouter.delete('/categories/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid category ID' });
    }

    const deleted = deleteSeoCategory(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    if (isSupabaseActive()) {
      try {
        await deleteSeoCategoryFromSupabase(id);
      } catch {}
    }

    res.json({ success: true, message: 'Category removed successfully. Existing articles remain intact.' });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete category'
    });
  }
});

/**
 * POST /api/admin/seo-ai/generate-blog
 * Generates an SEO-optimized structured blog draft via Gemini
 * Strict rule: Never generates or attaches AI images
 */
seoAiRouter.post('/generate-blog', async (req: Request, res: Response) => {
  try {
    const {
      category,
      primaryKeyword,
      secondaryKeywords,
      title,
      targetAudience,
      searchIntent,
      writingInstructions,
      saveDraft
    } = req.body;

    if (!primaryKeyword || typeof primaryKeyword !== 'string' || !primaryKeyword.trim()) {
      return res.status(400).json({ success: false, error: 'Primary keyword is required.' });
    }

    const draft = await GeminiService.generateBlogDraft({
      category: category || 'Website Development',
      primaryKeyword: primaryKeyword.trim(),
      secondaryKeywords: Array.isArray(secondaryKeywords) ? secondaryKeywords : [],
      title: title?.trim(),
      targetAudience: targetAudience?.trim(),
      searchIntent: searchIntent?.trim(),
      writingInstructions: writingInstructions?.trim()
    });

    let savedBlogRecord = null;
    if (saveDraft === true) {
      savedBlogRecord = createBlog({
        title: draft.title,
        slug: draft.slug,
        excerpt: draft.excerpt,
        content: draft.content,
        seo_title: draft.seoTitle,
        meta_description: draft.metaDescription,
        category: draft.category,
        primary_keyword: draft.primaryKeyword,
        secondary_keywords: draft.secondaryKeywords,
        search_intent: draft.searchIntent,
        target_audience: draft.targetAudience,
        target_questions: draft.faqs.map(f => f.question),
        tags: draft.tags,
        status: 'Draft',
        featured_image: '', // Strictly empty — no AI placeholder or generation
        image_alt: draft.imageAltSuggestion || ''
      });

      if (isSupabaseActive() && savedBlogRecord) {
        try {
          await pushBlogToSupabase(savedBlogRecord);
        } catch {}
      }
    }

    res.json({
      success: true,
      draft,
      savedBlog: savedBlogRecord
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = GeminiService.redactSecrets(rawMsg);
    res.status(500).json({
      success: false,
      error: safeMsg
    });
  }
});

/**
 * POST /api/admin/seo-ai/suggest-topics
 * Gathers Search Console opportunities, GA4 pages, and website services to generate grounded topics
 */
seoAiRouter.post('/suggest-topics', async (req: Request, res: Response) => {
  try {
    const { category, targetAudience } = req.body || {};

    // 1. Gather existing blogs to prevent cannibalization
    const existingBlogs = getBlogs({ limit: 50 });
    const existingTitles = existingBlogs.blogs.map(b => b.title);

    // 2. Gather GSC Search queries if connected
    let gscQueries: Array<{ query: string; impressions: number; clicks: number; position: number; ctr: number }> = [];
    let gscConnected = false;
    try {
      const gscStatus = await GscService.getConnectionStatus();
      if (gscStatus.isConnected) {
        gscConnected = true;
        const comp = await GscService.getQueryComparison('28d', 20);
        if (comp.queries && comp.queries.length > 0) {
          gscQueries = comp.queries.map(q => ({
            query: q.query,
            impressions: q.currentPeriod.impressions,
            clicks: q.currentPeriod.clicks,
            position: q.currentPeriod.position,
            ctr: q.currentPeriod.ctr
          }));
        }
      }
    } catch {
      // Disconnected or unauthorized GSC is handled gracefully
    }

    // 3. Gather GA4 landing page metrics if connected
    let ga4TopPages: Array<{ pagePath: string; sessions: number }> = [];
    let ga4Connected = false;
    try {
      const ga4Status = await Ga4Service.getConnectionStatus();
      if (ga4Status.isConnected) {
        ga4Connected = true;
        const landing = await Ga4Service.getLandingPages({ dateRange: '28d' });
        if (landing && landing.rows && Array.isArray(landing.rows)) {
          ga4TopPages = landing.rows.slice(0, 10).map((r: any) => ({
            pagePath: r.pagePath || r.dimensionValues?.[0]?.value || '/',
            sessions: Number(r.sessions || r.metricValues?.[0]?.value || 0)
          }));
        }
      }
    } catch {
      // Disconnected GA4 handled gracefully
    }

    // 4. Request grounded suggestions from Gemini
    const topics = await GeminiService.suggestTopics({
      category,
      targetAudience,
      existingPostTitles: existingTitles,
      gscQueries,
      ga4TopPages
    });

    res.json({
      success: true,
      topics,
      signalsUsed: {
        gscConnected,
        gscQueriesCount: gscQueries.length,
        ga4Connected,
        ga4PagesCount: ga4TopPages.length,
        existingPostCount: existingTitles.length
      }
    });
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeMsg = GeminiService.redactSecrets(rawMsg);
    res.status(500).json({
      success: false,
      error: safeMsg
    });
  }
});

/**
 * POST /api/admin/seo-ai/bulk-schedule
 * User-controlled batch scheduler with Asia/Kolkata timezone support
 */
seoAiRouter.post('/bulk-schedule', async (req: Request, res: Response) => {
  try {
    const { schedules, generator } = req.body || {};

    let scheduleItems: Array<{ id: number; scheduledAt: string }> = [];

    // Mode A: Generator calculation (e.g. 10 drafts, 2 per day for 5 days at designated times)
    if (generator && Array.isArray(generator.blogIds) && generator.blogIds.length > 0) {
      const { blogIds, startDate, postsPerDay = 1, times = ['09:00'], timezone = 'Asia/Kolkata' } = generator;
      
      const start = new Date(startDate || new Date().toISOString());
      if (isNaN(start.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid start date provided for schedule generation.' });
      }

      const validTimes = Array.isArray(times) && times.length > 0 ? times : ['09:00'];
      let blogIndex = 0;
      let dayOffset = 0;

      while (blogIndex < blogIds.length) {
        for (let timeIdx = 0; timeIdx < Math.min(postsPerDay, validTimes.length); timeIdx++) {
          if (blogIndex >= blogIds.length) break;

          const blogId = Number(blogIds[blogIndex]);
          const timeStr = validTimes[timeIdx] || '09:00';
          const [hours, minutes] = timeStr.split(':').map(Number);

          const targetDate = new Date(start);
          targetDate.setDate(targetDate.getDate() + dayOffset);
          targetDate.setHours(hours || 9, minutes || 0, 0, 0);

          // If scheduled in past relative to current moment, push forward
          if (targetDate.getTime() <= Date.now()) {
            targetDate.setDate(targetDate.getDate() + 1);
          }

          scheduleItems.push({
            id: blogId,
            scheduledAt: targetDate.toISOString()
          });

          blogIndex++;
        }
        dayOffset++;
      }
    } else if (Array.isArray(schedules) && schedules.length > 0) {
      // Mode B: Explicit list of schedules
      scheduleItems = schedules.map(s => ({
        id: Number(s.id),
        scheduledAt: String(s.scheduledAt)
      }));
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please provide either a list of schedules or generator parameters (blogIds, startDate, postsPerDay, times).'
      });
    }

    const result = await bulkScheduleBlogsReliable(scheduleItems);

    res.json({
      success: result.success,
      scheduledCount: result.scheduledCount,
      updatedBlogs: result.updatedBlogs,
      errors: result.errors
    });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Bulk scheduling error'
    });
  }
});

/**
 * GET /api/admin/seo-ai/usage
 * Returns Gemini usage telemetry for operational tracking
 */
seoAiRouter.get('/usage', (_req: Request, res: Response) => {
  try {
    const stats = GeminiService.getUsageStats();
    res.json({ success: true, usage: stats });
  } catch (err: unknown) {
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to retrieve usage stats'
    });
  }
});

/**
 * POST /api/admin/seo-ai/assistant
 * Admin conversational SEO Copilot backed by Gemini function calling over official Dawnexus MCP tools.
 */
seoAiRouter.post('/assistant', async (req: Request, res: Response) => {
  try {
    const { messages, model } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'Messages array is required.' });
    }

    const callerIp = req.ip || req.socket.remoteAddress || 'admin-studio';

    const systemInstruction = [
      'You are the Dawnexus AI SEO Studio Administrative Copilot.',
      'You have complete, direct access to Dawnexus MCP tools including Google Search Console, Google Analytics 4, first-party visitor telemetry, service page content, and the blog CMS draft system.',
      'Always base SEO and website recommendations on live data retrieved via MCP tools.',
      'All blog content creation must be saved strictly as Drafts via `create_blog_draft`.',
      'Provide concise, actionable, and data-driven responses.'
    ].join(' ');

    const result = await runGeminiWithMcp({
      messages,
      allowedTools: ADMIN_STUDIO_TOOLS,
      systemInstruction,
      callerIp,
      model,
      maxTurns: 5
    });

    return res.json({
      success: true,
      text: result.text,
      toolCallsExecuted: result.toolCallsExecuted,
      turnCount: result.turnCount,
      modelUsed: result.modelUsed
    });
  } catch (err: any) {
    console.error('[Admin SEO Copilot Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to process assistant request.'
    });
  }
});

