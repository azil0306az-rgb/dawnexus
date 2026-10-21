import 'dotenv/config';
import { getDb } from './db.js';

export interface GenerateBlogParams {
  category: string;
  primaryKeyword: string;
  secondaryKeywords?: string[];
  title?: string;
  targetAudience?: string;
  searchIntent?: string;
  writingInstructions?: string;
  verifiedInternalLinks?: Array<{ title: string; url: string }>;
}

export interface GeneratedBlogDraft {
  title: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  content: string;
  faqs: Array<{ question: string; answer: string }>;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  searchIntent: string;
  targetAudience: string;
  suggestedInternalLinks: Array<{ anchor: string; url: string }>;
  tags: string[];
  imageAltSuggestion?: string;
}

export interface SuggestTopicsParams {
  category?: string;
  targetAudience?: string;
  existingPostTitles?: string[];
  gscQueries?: Array<{ query: string; impressions: number; clicks: number; position: number; ctr: number }>;
  ga4TopPages?: Array<{ pagePath: string; sessions: number; engagementRate?: number }>;
  servicePages?: Array<{ title: string; path: string; description: string }>;
}

export interface TopicSuggestion {
  id: string;
  title: string;
  primaryKeyword: string;
  category: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  reason: string;
  supportingMetrics?: {
    impressions?: number;
    clicks?: number;
    avgPosition?: number;
    organicSessions?: number;
  };
  relatedPages: string[];
  suggestedOutline: string[];
}

export interface GeminiUsageSummary {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokens: number;
  promptTokens: number;
  candidateTokens: number;
  activeModel: string;
  configured: boolean;
  lastError: string | null;
}

export class GeminiService {
  private static readonly DEFAULT_MODELS = [
    process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
    'gemini-flash-latest'
  ];

  /**
   * Safe retrieval of API key
   */
  private static getApiKey(): string {
    return process.env.GEMINI_API_KEY?.trim() || '';
  }

  /**
   * Redacts sensitive keys from any error message or output string
   */
  public static redactSecrets(message: string): string {
    const key = this.getApiKey();
    if (!key) return message;
    return message.split(key).join('[REDACTED_GEMINI_KEY]');
  }

  /**
   * Record operational telemetry into gemini_usage_logs
   */
  private static recordUsage(
    action: string,
    model: string,
    promptTokens: number,
    candidateTokens: number,
    totalTokens: number,
    status: 'success' | 'error',
    errorMessage: string = ''
  ): void {
    try {
      const db = getDb();
      const safeError = this.redactSecrets(errorMessage).slice(0, 500);
      const now = new Date().toISOString();
      db.prepare(`
        INSERT INTO gemini_usage_logs 
        (action, model, prompt_tokens, candidate_tokens, total_tokens, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(action, model, promptTokens, candidateTokens, totalTokens, status, safeError, now);
    } catch (err) {
      // Non-fatal telemetry logging
      console.warn('[GeminiService] Could not log usage metric:', err instanceof Error ? err.message : err);
    }
  }

  /**
   * Dispatches generation to Gemini API with automatic model fallback and retry
   */
  public static async callGemini(
    prompt: string,
    action: string = 'general',
    jsonMode: boolean = true
  ): Promise<{ text: string; modelUsed: string; usage?: any }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY on the server.');
    }

    const models = this.DEFAULT_MODELS;
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const bodyPayload: any = {
          contents: [{ parts: [{ text: prompt }] }]
        };

        if (jsonMode) {
          bodyPayload.generationConfig = {
            temperature: 0.4,
            responseMimeType: 'application/json'
          };
        } else {
          bodyPayload.generationConfig = {
            temperature: 0.6
          };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        const data: any = await res.json();

        if (!res.ok) {
          const rawErrMsg = data?.error?.message || `HTTP ${res.status} ${res.statusText}`;
          const safeErrMsg = this.redactSecrets(rawErrMsg);
          
          // If model is busy, deprecated, or rate limited, try next candidate with brief backoff
          if (res.status === 404 || res.status === 429 || res.status === 503 || safeErrMsg.includes('high demand')) {
            console.warn(`[GeminiService] Model ${model} returned ${res.status} (${safeErrMsg}). Trying fallback...`);
            lastError = new Error(safeErrMsg);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
          
          this.recordUsage(action, model, 0, 0, 0, 'error', safeErrMsg);
          throw new Error(`Gemini API error: ${safeErrMsg}`);
        }

        const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!candidateText) {
          throw new Error('Gemini returned an empty response candidate.');
        }

        const usage = data?.usageMetadata || {};
        const promptTokens = usage.promptTokenCount || 0;
        const candidateTokens = usage.candidatesTokenCount || 0;
        const totalTokens = usage.totalTokenCount || (promptTokens + candidateTokens);

        this.recordUsage(action, model, promptTokens, candidateTokens, totalTokens, 'success');

        return {
          text: candidateText,
          modelUsed: model,
          usage
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastError = new Error(this.redactSecrets(msg));
      }
    }

    throw lastError || new Error('All configured Gemini models failed to respond.');
  }

  /**
   * Health check for Gemini connection
   */
  public static async testConnection(): Promise<{ connected: boolean; model: string; error?: string }> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return { connected: false, model: '', error: 'GEMINI_API_KEY is not configured in server environment.' };
    }

    try {
      const result = await this.callGemini('Respond with {"status":"online"} in valid JSON', 'health_check', true);
      const parsed = JSON.parse(result.text);
      if (parsed.status === 'online') {
        return { connected: true, model: result.modelUsed };
      }
      return { connected: true, model: result.modelUsed };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { connected: false, model: '', error: this.redactSecrets(msg) };
    }
  }

  /**
   * Generates a complete, structured SEO blog draft
   * Strict rule: Never generate or attach images or watermarks.
   */
  public static async generateBlogDraft(params: GenerateBlogParams): Promise<GeneratedBlogDraft> {
    const primary = params.primaryKeyword.trim();
    if (!primary) {
      throw new Error('Primary keyword is required to generate a blog draft.');
    }

    const category = params.category?.trim() || 'Website Development';
    const secondaryList = (params.secondaryKeywords || []).map(s => s.trim()).filter(Boolean);
    const audience = params.targetAudience?.trim() || 'Modern business owners, marketing managers, and technical decision makers';
    const intent = params.searchIntent?.trim() || 'Commercial';
    const customInstructions = params.writingInstructions?.trim() || '';
    const internalLinks = params.verifiedInternalLinks || [
      { title: 'Custom Website Design & Development', url: '/services/website-design' },
      { title: 'Technical SEO & Performance Optimization', url: '/services/seo' },
      { title: 'Google Business Profile & Local 3-Pack Growth', url: '/services/google-business-profile' },
      { title: 'Full-Funnel Digital Marketing Agency', url: '/services/digital-marketing' },
      { title: 'Cost Estimator & Quotation Calculator', url: '/calculator' }
    ];

    const prompt = `
You are a senior technical SEO copywriter and full-stack software strategist at Dawnexus (https://www.dawnexus.in).
Generate a comprehensive, high-value, highly engaging SEO blog article grounded in practical technical accuracy and actionable insights.

ARTICLE SPECIFICATIONS:
- Category: ${category}
- Primary Target Keyword: "${primary}"
- Secondary Keywords: ${secondaryList.length > 0 ? secondaryList.map(k => `"${k}"`).join(', ') : 'Relevant industry terms'}
- Target Audience: ${audience}
- Search Intent: ${intent}
${params.title ? `- Proposed Working Title: "${params.title}"` : ''}
${customInstructions ? `- Writing Instructions: ${customInstructions}` : ''}

VERIFIED DAWNEXUS INTERNAL LINKS AVAILABLE:
${internalLinks.map(l => `- "${l.title}" -> ${l.url}`).join('\n')}

STRICT PRODUCTION RULES:
1. DO NOT GENERATE IMAGES, DO NOT OUTPUT IMAGE MARKDOWN (![...]), DO NOT GENERATE AI THUMBNAILS, WATERMARKS, OR EXTERNAL PLACEHOLDERS. Text only.
2. Structure the content cleanly in Markdown format with clear hierarchy: # Title (or start with H2s for the body), ## Section Headings, ### Subsections, bullet points, and code/tip callouts.
3. Word count: High-depth, between 1,200 and 1,800 words with rich actionable detail.
4. Natural keyword placement: Include the primary keyword in the first 100 words, naturally in 2-3 H2 headings, and in the conclusion. Avoid keyword stuffing.
5. Include a dedicated FAQ section with 3-5 real, practical questions and authoritative answers.
6. Naturally weave in 2 to 4 of the verified internal links provided above.
7. Tone: Authoritative, modern, insightful, professional, and clear. Avoid fluffy clichés like "In today's fast-paced digital world".

OUTPUT FORMAT:
Respond with a strict JSON object with EXACTLY the following keys:
{
  "title": "Compelling, click-worthy article headline",
  "seoTitle": "SEO title tag between 50-60 characters including primary keyword | Dawnexus",
  "metaDescription": "Concise meta description between 145-160 characters with clear call-to-action",
  "slug": "url-friendly-lowercase-slug-without-special-characters",
  "excerpt": "A 2-3 sentence punchy summary of the article's core thesis",
  "content": "Full markdown content with ## headings, rich body paragraphs, bullet points, and callouts",
  "faqs": [
    { "question": "Question 1", "answer": "Detailed authoritative answer" }
  ],
  "primaryKeyword": "${primary}",
  "secondaryKeywords": ${JSON.stringify(secondaryList)},
  "category": "${category}",
  "searchIntent": "${intent}",
  "targetAudience": "${audience}",
  "suggestedInternalLinks": [
    { "anchor": "Descriptive anchor text used", "url": "/services/..." }
  ],
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4"],
  "imageAltSuggestion": "Recommended descriptive alt text if the editor uploads a hero image later"
}
`;

    const response = await this.callGemini(prompt, 'generate_blog', true);
    
    try {
      const parsed = JSON.parse(response.text);

      // Validate required fields
      if (!parsed.title || !parsed.content) {
        throw new Error('Generated response is missing title or content');
      }

      // Ensure slug is clean
      const cleanSlug = (parsed.slug || parsed.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);

      // Sanitize: enforce NO image markdown tags in content
      const sanitizedContent = String(parsed.content)
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .trim();

      return {
        title: String(parsed.title).trim(),
        seoTitle: String(parsed.seoTitle || parsed.title).slice(0, 70).trim(),
        metaDescription: String(parsed.metaDescription || parsed.excerpt || '').slice(0, 170).trim(),
        slug: cleanSlug,
        excerpt: String(parsed.excerpt || '').trim(),
        content: sanitizedContent,
        faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
        primaryKeyword: String(parsed.primaryKeyword || primary).trim(),
        secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : secondaryList,
        category: String(parsed.category || category).trim(),
        searchIntent: String(parsed.searchIntent || intent).trim(),
        targetAudience: String(parsed.targetAudience || audience).trim(),
        suggestedInternalLinks: Array.isArray(parsed.suggestedInternalLinks) ? parsed.suggestedInternalLinks : [],
        tags: Array.isArray(parsed.tags) ? parsed.tags : [category, primary],
        imageAltSuggestion: parsed.imageAltSuggestion ? String(parsed.imageAltSuggestion).trim() : undefined
      };
    } catch (err: unknown) {
      console.error('[GeminiService] Failed to parse generated blog JSON:', response.text.slice(0, 300));
      throw new Error(`Failed to parse structured blog output from Gemini: ${err instanceof Error ? err.message : err}`);
    }
  }

  /**
   * Suggests high-value, data-grounded blog topics using GSC queries, GA4 data, and website service pages
   */
  public static async suggestTopics(params: SuggestTopicsParams = {}): Promise<TopicSuggestion[]> {
    const existingTitles = params.existingPostTitles || [];
    const gscQueries = params.gscQueries || [];
    const ga4Pages = params.ga4TopPages || [];
    const category = params.category || 'All Categories';
    const audience = params.targetAudience || 'Indian and international businesses looking for website design, SEO, and digital growth';

    const prompt = `
You are an expert SEO strategist at Dawnexus. Recommend 6 to 8 high-impact, grounded blog topic suggestions.

BUSINESS FOCUS:
Dawnexus is a premium Digital Growth & Engineering agency providing:
1. Website Design & Modern Web Development (/services/website-design)
2. Advanced Technical SEO & Organic Visibility (/services/seo)
3. Google Business Profile & Local 3-Pack Optimization (/services/google-business-profile)
4. Full-Funnel Performance Digital Marketing (/services/digital-marketing)
5. Interactive 3D Real Estate & AI Automations

DATA SIGNALS AVAILABLE:
- Selected Category Focus: ${category}
- Target Audience: ${audience}
- Real Google Search Console Query Opportunities:
${gscQueries.length > 0 
  ? gscQueries.slice(0, 15).map(q => `  * Query: "${q.query}" | Impr: ${q.impressions} | Clicks: ${q.clicks} | Pos: ${q.position.toFixed(1)} | CTR: ${(q.ctr * 100).toFixed(1)}%`).join('\n') 
  : '  * No Search Console connection active. Fallback to high-intent commercial keywords.'}
- GA4 Top Landing Pages:
${ga4Pages.length > 0
  ? ga4Pages.slice(0, 6).map(p => `  * Path: ${p.pagePath} | Sessions: ${p.sessions}`).join('\n')
  : '  * GA4 not active. Focus on core service pillars.'}
- Existing Published Post Titles (AVOID DUPLICATING THESE):
${existingTitles.length > 0 ? existingTitles.slice(0, 20).map(t => `  - "${t}"`).join('\n') : '  (None yet)'}

OBJECTIVE:
Suggest 6 to 8 fresh, highly targeted topics that:
1. Capture high-intent queries with strong conversion potential.
2. Bridge real content gaps between Dawnexus service offerings and user search behavior.
3. Avoid generic fluff or duplicated coverage.
4. Ground each suggestion in a clear commercial rationale.

OUTPUT FORMAT:
Respond with a strict JSON array of objects:
[
  {
    "id": "topic-1",
    "title": "Suggested Engaging Headline",
    "primaryKeyword": "target primary keyword",
    "category": "Website Development | SEO Services | Google Business Profile Optimization | Digital Marketing | AI and Automation",
    "searchIntent": "Informational | Commercial | Transactional",
    "reason": "Concrete justification referencing query signals, content gaps, or buyer journey stage",
    "supportingMetrics": {
      "impressions": 120,
      "avgPosition": 8.4
    },
    "relatedPages": ["/services/website-design"],
    "suggestedOutline": [
      "Introduction: Problem statement",
      "Core Strategy Breakdown",
      "Implementation Blueprint",
      "Common Mistakes to Avoid",
      "How Dawnexus Accelerates Results"
    ]
  }
]
`;

    let responseText = '';
    try {
      const response = await this.callGemini(prompt, 'suggest_topics', true);
      responseText = response.text;
    } catch (apiErr) {
      console.warn('[GeminiService] Live topic suggestions encountered provider spike. Serving grounded fallback topics:', apiErr instanceof Error ? apiErr.message : apiErr);
      return this.generateGroundedFallbackTopics(params);
    }

    try {
      const parsed = JSON.parse(responseText);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array of topic suggestions');
      }

      return parsed.map((item: any, idx: number) => ({
        id: item.id || `topic-${Date.now()}-${idx}`,
        title: String(item.title || '').trim(),
        primaryKeyword: String(item.primaryKeyword || '').trim(),
        category: String(item.category || category).trim(),
        searchIntent: ['Informational', 'Commercial', 'Transactional', 'Navigational'].includes(item.searchIntent)
          ? item.searchIntent
          : 'Commercial',
        reason: String(item.reason || 'High conversion opportunity grounded in service offering').trim(),
        supportingMetrics: item.supportingMetrics || undefined,
        relatedPages: Array.isArray(item.relatedPages) ? item.relatedPages : ['/services/seo'],
        suggestedOutline: Array.isArray(item.suggestedOutline) ? item.suggestedOutline : []
      }));
    } catch (err: unknown) {
      console.warn('[GeminiService] Failed to parse suggested topics JSON, using grounded fallback topics:', err);
      return this.generateGroundedFallbackTopics(params);
    }
  }

  /**
   * Deterministic grounded topic generator when AI provider is rate-limited or offline
   */
  public static generateGroundedFallbackTopics(params: SuggestTopicsParams = {}): TopicSuggestion[] {
    const category = params.category || 'Website Development';
    const gscTop = params.gscQueries && params.gscQueries.length > 0 ? params.gscQueries[0] : null;

    const baseTopics: TopicSuggestion[] = [
      {
        id: 'topic-fallback-1',
        title: 'Modern Custom Web Architecture: Driving High-Converting Lead Flow',
        primaryKeyword: gscTop ? gscTop.query : 'custom website development services',
        category: 'Website Development',
        searchIntent: 'Commercial',
        reason: gscTop 
          ? `Grounded in real Search Console query "${gscTop.query}" with ${gscTop.impressions} impressions at position ${gscTop.position.toFixed(1)}.`
          : 'High commercial intent topic addressing corporate web modernization content gaps.',
        supportingMetrics: gscTop ? { impressions: gscTop.impressions, avgPosition: gscTop.position } : undefined,
        relatedPages: ['/services/website-design'],
        suggestedOutline: [
          'The Cost of Slow, Outdated Websites in 2026',
          'Component Architecture vs Legacy Monoliths',
          'Core Web Vitals That Drive Real Conversion Lift',
          'Client Case Study Blueprint',
          'How Dawnexus Builds High-Speed Web Solutions'
        ]
      },
      {
        id: 'topic-fallback-2',
        title: 'Technical SEO Audit Checklist: Maximizing Crawl Budget & Rankings',
        primaryKeyword: 'technical seo audit checklist',
        category: 'SEO Services',
        searchIntent: 'Commercial',
        reason: 'Targeting core technical SEO services to bridge indexability and organic visibility gaps.',
        relatedPages: ['/services/seo'],
        suggestedOutline: [
          'Indexability & Canonical Hygiene',
          'JavaScript Rendering & Hydration Traps',
          'Schema Markup & Rich Snippet Opportunities',
          'Log File Analysis Strategies',
          'Ongoing Algorithmic Defense'
        ]
      },
      {
        id: 'topic-fallback-3',
        title: 'Google Business Profile 3-Pack Blueprint: Winning Local Search',
        primaryKeyword: 'google business profile optimization',
        category: 'Google Business Profile Optimization',
        searchIntent: 'Commercial',
        reason: 'Captures commercial intent for multi-location and local business customers seeking local map pack supremacy.',
        relatedPages: ['/services/google-business-profile'],
        suggestedOutline: [
          'How Google Determines Local 3-Pack Rankings',
          'Citation Consistency and NAP Hygiene',
          'Review Velocity & Sentiment Analysis',
          'Geotagged Media and Category Signals',
          'Automating Review Workflows'
        ]
      },
      {
        id: 'topic-fallback-4',
        title: 'Full-Funnel Digital Marketing: Lowering CAC with Organic Synergy',
        primaryKeyword: 'performance digital marketing agency',
        category: 'Digital Marketing',
        searchIntent: 'Commercial',
        reason: 'Addresses modern B2B attribution challenges by combining organic content with paid customer acquisition.',
        relatedPages: ['/services/digital-marketing'],
        suggestedOutline: [
          'Why Paid Ads Alone Erode Profit Margins',
          'Aligning Paid Landing Pages with Search Intent',
          'Multi-Touch Attribution Modeling',
          'Retargeting with High-Value Technical Content',
          'The Dawnexus Growth Framework'
        ]
      },
      {
        id: 'topic-fallback-5',
        title: 'AI Workflow Automation for Modern Agencies: Eliminating Repetitive Overhead',
        primaryKeyword: 'business ai workflow automation',
        category: 'AI and Automation',
        searchIntent: 'Informational',
        reason: 'Fulfills customer interest in practical AI automations and system integrations.',
        relatedPages: ['/services/website-design', '/calculator'],
        suggestedOutline: [
          'Identifying Bottlenecks in Daily Operations',
          'Custom AI Integration vs Off-the-Shelf Tools',
          'Automating Inquiries and Project Estimations',
          'Security & Data Isolation Best Practices',
          'Deploying Scalable Agentic Workflows'
        ]
      }
    ];

    return baseTopics;
  }

  /**
   * Retrieves operational usage statistics for Admin visibility
   */
  public static getUsageStats(): GeminiUsageSummary {
    const configured = Boolean(this.getApiKey());
    const activeModel = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';

    try {
      const db = getDb();
      const row = db.prepare(`
        SELECT 
          COUNT(*) as total_calls,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_calls,
          SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failed_calls,
          SUM(total_tokens) as total_tokens,
          SUM(prompt_tokens) as prompt_tokens,
          SUM(candidate_tokens) as candidate_tokens
        FROM gemini_usage_logs
      `).get() as any;

      const lastErrorRow = db.prepare(`
        SELECT error_message FROM gemini_usage_logs 
        WHERE status = 'error' AND error_message != '' 
        ORDER BY id DESC LIMIT 1
      `).get() as any;

      return {
        totalCalls: Number(row?.total_calls || 0),
        successfulCalls: Number(row?.successful_calls || 0),
        failedCalls: Number(row?.failed_calls || 0),
        totalTokens: Number(row?.total_tokens || 0),
        promptTokens: Number(row?.prompt_tokens || 0),
        candidateTokens: Number(row?.candidate_tokens || 0),
        activeModel,
        configured,
        lastError: lastErrorRow?.error_message || null
      };
    } catch {
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        totalTokens: 0,
        promptTokens: 0,
        candidateTokens: 0,
        activeModel,
        configured,
        lastError: null
      };
    }
  }
}
