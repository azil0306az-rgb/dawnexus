/**
 * Dawnexus AI SEO Studio — Model Context Protocol (MCP) Server & Router
 * Implements official MCP SDK (SSE & JSON-RPC) + OpenAPI Bridge for ChatGPT
 */

import { Router, Request, Response } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { McpService } from './mcpService.js';
import { mcpAuthMiddleware, getMcpAuditTrail, getExpectedMcpKey } from './mcpAuth.js';
import { mcpOAuthRouter } from './mcpOAuth.js';
import { refreshFromPersistentStore, getBlogById, getBlogBySlug, getBlogs, getBlogsRequiringReview } from './db.js';
import { assessInformationGain, detectContentOverlap } from './seoQualityService.js';
import { generateServerJsonLd, validateJsonLdStructure } from './jsonLdService.js';
import { auditHtmlPayloads } from './payloadAudit.js';

export const mcpRouter = Router();

// Store active SSE transports by session ID
const activeTransports = new Map<string, SSEServerTransport>();

// Tool definitions for MCP
export const MCP_TOOLS: Tool[] = [
  {
    name: 'get_blog_categories',
    description: 'Retrieve the official categories configured in Dawnexus CMS. Must select one of these categories when proposing blog drafts.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_existing_articles',
    description: 'Retrieve existing published and draft articles, their categories, slugs, keywords, and verified internal-link targets.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_search_console_opportunities',
    description: 'Retrieve real Google Search Console query metrics (clicks, impressions, CTR, average rank) for the authorized Dawnexus property, or diagnostic status.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_weekly_content_context',
    description: 'Retrieve aggregated context for weekly SEO planning: CMS categories, published articles, drafts, internal link targets, and Search Console status.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'create_blog_draft',
    description: "Create a new SEO blog article in Dawnexus as a 'Draft'. Never publishes or schedules directly. Enforces category validation, unique slug, and runs deterministic SEO quality scoring.",
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'SEO article title' },
        category: { type: 'string', description: "Existing CMS category (e.g. 'Website Design', 'SEO Strategy', 'Digital Marketing', 'Digital Strategy', etc.)" },
        content: { type: 'string', description: 'Complete article body in Markdown or HTML' },
        slug: { type: 'string', description: 'URL slug (lowercase kebab-case)' },
        excerpt: { type: 'string', description: 'Article excerpt/summary' },
        primary_keyword: { type: 'string', description: 'Primary target keyword' },
        secondary_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Secondary or related keywords'
        },
        target_location: { type: 'string', description: "Target location (e.g. 'Coimbatore, India' or 'Global')" },
        search_intent: {
          type: 'string',
          enum: ['Informational', 'Commercial Investigation', 'Transactional', 'Navigational'],
          description: 'Search intent'
        },
        target_audience: { type: 'string', description: 'Target audience description' },
        seo_title: { type: 'string', description: 'SERP title tag (under 60 characters)' },
        meta_description: { type: 'string', description: 'Meta description (120-160 characters)' },
        canonical_url: { type: 'string', description: 'Canonical URL (defaults to https://www.dawnexus.in/blog/<slug>)' },
        featured_image: { type: 'string', description: 'Featured image URL or base64 data URL' },
        image_alt: { type: 'string', description: 'Descriptive alt text for featured image' }
      },
      required: ['title', 'category', 'content']
    }
  },
  {
    name: 'update_blog_draft',
    description: 'Update an existing blog draft with content, SEO metadata, E-E-A-T evidence fields, and citation answer blocks. Delegates to update_blog_article with status safeguards.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID to update' },
        title: { type: 'string', description: 'Updated title' },
        category: { type: 'string', description: 'Updated category' },
        content: { type: 'string', description: 'Updated content' },
        slug: { type: 'string', description: 'Updated slug' },
        excerpt: { type: 'string', description: 'Updated excerpt' },
        primary_keyword: { type: 'string', description: 'Updated primary keyword' },
        secondary_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated secondary keywords'
        },
        target_location: { type: 'string', description: 'Updated target location' },
        search_intent: { type: 'string', description: 'Updated search intent' },
        target_audience: { type: 'string', description: 'Updated target audience' },
        target_questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated target questions'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic tags'
        },
        seo_title: { type: 'string', description: 'Updated SEO title' },
        meta_description: { type: 'string', description: 'Updated meta description' },
        canonical_url: { type: 'string', description: 'Updated canonical URL' },
        featured_image: { type: 'string', description: 'Updated featured image URL' },
        image_alt: { type: 'string', description: 'Updated image alt text' },
        caption: { type: 'string', description: 'Updated image caption' },
        firsthand_observations: { type: 'string', description: 'Direct practitioner observations and empirical insights' },
        project_examples: { description: 'Project examples (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        case_studies: { description: 'Case study evidence with metrics (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        original_research_data: { description: 'Original research data, benchmark statistics, or survey findings', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        implementation_process: { type: 'string', description: 'Detailed step-by-step methodology and implementation process' },
        limitations_lessons: { type: 'string', description: 'Trade-offs, limitations, and lessons learned' },
        external_sources: { description: 'Verified external authoritative sources and citations', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        citation_answer_blocks: {
          type: 'array',
          description: 'Direct AI-discovery citation and answer blocks',
          items: {
            type: 'object',
            properties: {
              heading_text: { type: 'string', description: 'Section or question heading' },
              concise_answer: { type: 'string', description: 'Direct 40-60 word quotable answer' },
              key_takeaways: { type: 'array', items: { type: 'string' }, description: 'Bulleted key takeaways' },
              heading_level: { type: 'string', description: 'h2, h3, or h4' }
            }
          }
        },
        author: { type: 'string', description: 'Author name' },
        author_role: { type: 'string', description: 'Author professional role / title' },
        author_bio: { type: 'string', description: 'Author background biography' },
        author_credentials: { type: 'string', description: 'Author qualifications, certifications, industry experience' },
        reviewer_name: { type: 'string', description: 'Expert technical or editorial reviewer name' },
        editorial_notes: { type: 'string', description: 'Internal editorial or revision notes' },
        review_cycle_days: { type: 'number', description: 'Content review frequency in days (default: 90)' }
      },
      required: ['id']
    }
  },
  {
    name: 'update_blog_article',
    description: 'Update any blog article across Draft, Scheduled, or Published statuses with comprehensive metadata, SEO fields, 15+ evidence fields, and structured citation answer blocks. Enforces status-specific safeguards (preserves scheduled_at for Scheduled articles, preserves published_at, live slug, and canonical URL for Published articles unless explicitly updated). Includes optimistic concurrency support via expected_revision.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID to update' },
        expected_revision: { type: 'string', description: 'Optional optimistic concurrency revision string' },
        title: { type: 'string', description: 'Updated title' },
        category: { type: 'string', description: 'Updated category' },
        content: { type: 'string', description: 'Updated content' },
        slug: { type: 'string', description: 'Updated slug' },
        excerpt: { type: 'string', description: 'Updated excerpt' },
        primary_keyword: { type: 'string', description: 'Updated primary keyword' },
        secondary_keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated secondary keywords'
        },
        target_location: { type: 'string', description: 'Updated target location' },
        search_intent: { type: 'string', description: 'Updated search intent' },
        target_audience: { type: 'string', description: 'Updated target audience' },
        target_questions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated target questions'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topic tags'
        },
        seo_title: { type: 'string', description: 'Updated SEO title' },
        meta_description: { type: 'string', description: 'Updated meta description' },
        canonical_url: { type: 'string', description: 'Updated canonical URL' },
        featured_image: { type: 'string', description: 'Updated featured image URL' },
        image_alt: { type: 'string', description: 'Updated image alt text' },
        caption: { type: 'string', description: 'Updated image caption' },
        firsthand_observations: { type: 'string', description: 'Direct practitioner observations and empirical insights' },
        project_examples: { description: 'Project examples (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        case_studies: { description: 'Case study evidence with metrics (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        original_research_data: { description: 'Original research data, benchmark statistics, or survey findings', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        implementation_process: { type: 'string', description: 'Detailed step-by-step methodology and implementation process' },
        limitations_lessons: { type: 'string', description: 'Trade-offs, limitations, and lessons learned' },
        external_sources: { description: 'Verified external authoritative sources and citations', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
        citation_answer_blocks: {
          type: 'array',
          description: 'Direct AI-discovery citation and answer blocks',
          items: {
            type: 'object',
            properties: {
              heading_text: { type: 'string', description: 'Section or question heading' },
              concise_answer: { type: 'string', description: 'Direct 40-60 word quotable answer' },
              key_takeaways: { type: 'array', items: { type: 'string' }, description: 'Bulleted key takeaways' },
              heading_level: { type: 'string', description: 'h2, h3, or h4' }
            }
          }
        },
        author: { type: 'string', description: 'Author name' },
        author_role: { type: 'string', description: 'Author professional role / title' },
        author_bio: { type: 'string', description: 'Author background biography' },
        author_credentials: { type: 'string', description: 'Author qualifications, certifications, industry experience' },
        reviewer_name: { type: 'string', description: 'Expert technical or editorial reviewer name' },
        editorial_notes: { type: 'string', description: 'Internal editorial or revision notes' },
        review_cycle_days: { type: 'number', description: 'Content review frequency in days (default: 90)' }
      },
      required: ['id']
    }
  },
  {
    name: 'upload_blog_image',
    description: "Upload an image (base64 data URL or hosted public HTTPS image URL from ChatGPT) to Supabase Storage ('blog-images' bucket) and return its permanent public CDN URL.",
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'Base64 data URL (e.g. data:image/png;base64,...) or hosted public HTTPS image URL' },
        filename: { type: 'string', description: 'Optional descriptive filename or article slug prefix (e.g. web-architecture-hero)' }
      },
      required: ['image']
    }
  },
  {
    name: 'attach_blog_image',
    description: "Attach an image to an existing blog draft as its featured image. Accepts a permanent image URL (from upload_blog_image or storage) or base64 data URL.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Draft article ID' },
        image_url: { type: 'string', description: 'Permanent public HTTPS image URL (from upload_blog_image or Supabase storage)' },
        image: { type: 'string', description: 'Alternative: Base64 data URL or hosted image URL' },
        image_alt: { type: 'string', description: 'Descriptive alt text for accessibility and SEO' },
        caption: { type: 'string', description: 'Optional image caption' }
      },
      required: ['id', 'image_alt']
    }
  },
  {
    name: 'verify_blog_image',
    description: 'Verify that a blog draft has a valid featured image attached and that the image URL is accessible over HTTP (200 OK).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Draft article ID to verify' }
      },
      required: ['id']
    }
  },
  {
    name: 'update_blog_image_metadata',
    description: 'Update the alt text or caption of an existing blog draft without re-uploading the image file.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Draft article ID' },
        image_alt: { type: 'string', description: 'Updated descriptive alt text' },
        caption: { type: 'string', description: 'Updated caption' }
      },
      required: ['id']
    }
  },
  {
    name: 'schedule_blog_draft',
    description: 'Schedule an approved blog draft for publication using the Dawnexus publication calendar. Requires explicit human user approval confirmation (approved: true), valid future date/time in Asia/Kolkata timezone, complete metadata and featured image, and deterministic SEO quality score >= 90/100.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Draft article ID' },
        scheduled_at: { type: 'string', description: 'Publication date/time in Asia/Kolkata timezone (e.g. 2026-10-25T10:00:00+05:30 or 2026-10-25 10:00:00)' },
        approved: { type: 'boolean', description: 'Must be true confirming the user has reviewed and explicitly approved the draft and publication schedule' }
      },
      required: ['id', 'scheduled_at', 'approved']
    }
  },
  {
    name: 'run_seo_quality_check',
    description: 'Run a deterministic 100-point SEO quality audit against a draft ID or draft payload.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID in database' },
        draft: {
          type: 'object',
          description: 'Draft payload to evaluate directly before or without saving'
        }
      }
    }
  },
  {
    name: 'gsc_get_connection_status',
    description: 'Inspect the live connection and authorization status of Google Search Console.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'gsc_list_properties',
    description: 'List verified Search Console properties accessible by the connected Google account.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'gsc_get_search_analytics',
    description: 'Query Search Console search analytics performance metrics for given dates, dimensions, and filters.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Start date in YYYY-MM-DD' },
        endDate: { type: 'string', description: 'End date in YYYY-MM-DD' },
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dimensions: query, page, date, device, or country'
        },
        rowLimit: { type: 'number', description: 'Row limit (default 100)' },
        property: { type: 'string', description: 'Optional property URL' }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'gsc_get_top_queries',
    description: 'Retrieve top search queries with period-over-period performance comparisons and intent classification.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['7d', '28d', '3m'], description: 'Date range' },
        limit: { type: 'number', description: 'Max queries to return (default 50)' }
      }
    }
  },
  {
    name: 'gsc_get_top_pages',
    description: 'Retrieve top landing pages with impressions, clicks, CTR, and average rankings.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max pages to return (default 25)' }
      }
    }
  },
  {
    name: 'gsc_get_research_status',
    description: 'Inspect SEO research activity, recent research/sync jobs, and job execution counts.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'gsc_run_research_sync',
    description: 'Trigger a fresh synchronization job to ingest Search Console queries into research cache with duplicate-job protection.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['28d', '3m'], description: 'Date range to sync' }
      }
    }
  },
  {
    name: 'gsc_get_research_job',
    description: 'Retrieve status, queries returned, queries saved, API request count, and duration of a specific research job.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', description: 'Job identifier (e.g. sync_1729...)' }
      },
      required: ['jobId']
    }
  },
  {
    name: 'ga4_get_connection_status',
    description: 'Inspect Google Analytics 4 integration status, selected property, last sync timestamp, and sanitized errors. Zero secrets or tokens returned.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'ga4_list_properties',
    description: 'List accessible Google Analytics 4 properties for the authorized Google account.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'ga4_get_overview',
    description: 'Retrieve headline GA4 website traffic metrics (total users, active users, sessions, engagement rate, views, event count, conversions) with previous period comparisons and daily timeline.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'custom'], description: 'Date range (default 28d)' },
        startDate: { type: 'string', description: 'Custom start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Custom end date YYYY-MM-DD' },
        forceRefresh: { type: 'boolean', description: 'Bypass cache and query Google API directly' }
      }
    }
  },
  {
    name: 'ga4_get_traffic_acquisition',
    description: 'Retrieve traffic acquisition breakdown by session default channel group, source, and medium with sessions, users, engagement, and conversions.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'custom'], description: 'Date range (default 28d)' },
        startDate: { type: 'string', description: 'Custom start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Custom end date YYYY-MM-DD' },
        limit: { type: 'number', description: 'Max channels to return (default 25)' }
      }
    }
  },
  {
    name: 'ga4_get_landing_pages',
    description: 'Retrieve landing-page performance with sessions, active users, engagement rate, page views, and conversions.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'custom'], description: 'Date range (default 28d)' },
        startDate: { type: 'string', description: 'Custom start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Custom end date YYYY-MM-DD' },
        limit: { type: 'number', description: 'Max landing pages to return (default 25)' }
      }
    }
  },
  {
    name: 'ga4_get_page_performance',
    description: 'Retrieve top page paths and page titles by views, active users, average engagement time, and event count.',
    inputSchema: {
      type: 'object',
      properties: {
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'custom'], description: 'Date range (default 28d)' },
        startDate: { type: 'string', description: 'Custom start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Custom end date YYYY-MM-DD' },
        limit: { type: 'number', description: 'Max pages to return (default 25)' }
      }
    }
  },
  {
    name: 'ga4_get_realtime',
    description: 'Retrieve real-time website analytics (active users in the last 30 minutes and active screen names).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'ga4_get_report',
    description: 'Execute a validated custom Google Analytics 4 report with supported dimensions and metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        dimensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supported dimensions (e.g. sessionDefaultChannelGroup, pagePath, deviceCategory, country, date)'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Supported metrics (e.g. activeUsers, sessions, screenPageViews, engagementRate, conversions)'
        },
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'custom'], description: 'Standard date range' },
        startDate: { type: 'string', description: 'Custom start date YYYY-MM-DD' },
        endDate: { type: 'string', description: 'Custom end date YYYY-MM-DD' },
        limit: { type: 'number', description: 'Max rows to return (default 50, max 250)' }
      },
      required: ['dimensions', 'metrics']
    }
  },
  {
    name: 'ga4_get_analytics_status',
    description: 'Inspect GA4 analytics activity, job execution counts (attempted, completed, failed), latest retrieval time, and duration.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max recent jobs to return (default 15)' }
      }
    }
  },

  // ==========================================
  // VERSION 6.1.3: VISITOR ANALYTICS TOOLS
  // ==========================================
  {
    name: 'analytics_get_overview',
    description: 'Retrieve high-level visitor behaviour intelligence (visitors, sessions, human/bot ratio, bounce rate, average scroll depth, form abandonment rate).',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days of data to analyze (default 30)' },
        excludeBots: { type: 'boolean', description: 'Whether to exclude identified search crawlers and bots (default true)' }
      }
    }
  },
  {
    name: 'analytics_get_conversion_funnel',
    description: 'Retrieve the 7-step commercial conversion funnel with step drop-offs (visit -> service -> pricing -> cta -> form start -> form step -> enquiry).',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default 30)' },
        excludeBots: { type: 'boolean', description: 'Exclude bots (default true)' }
      }
    }
  },
  {
    name: 'analytics_get_page_performance',
    description: 'Retrieve page-level engagement, click hotzones, and scroll milestone completions for a given path.',
    inputSchema: {
      type: 'object',
      properties: {
        pageUrl: { type: 'string', description: 'Target path (e.g. /services/website-design or /)' },
        days: { type: 'number', description: 'Days of data to analyze (default 30)' }
      }
    }
  },
  {
    name: 'analytics_get_visitor_journeys',
    description: 'Retrieve anonymous path sequences and journey progressions across pages leading to exit or conversion.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days of data to analyze (default 30)' },
        limit: { type: 'number', description: 'Max journeys to return (default 20)' },
        excludeBots: { type: 'boolean', description: 'Exclude bots (default true)' }
      }
    }
  },
  {
    name: 'analytics_get_exit_analysis',
    description: 'Analyze top exit pages and drop-off patterns where visitors leave the website.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default 30)' }
      }
    }
  },
  {
    name: 'analytics_get_click_heatmap',
    description: 'Retrieve aggregated click coordinate hotzones and target elements on a specific URL.',
    inputSchema: {
      type: 'object',
      properties: {
        pageUrl: { type: 'string', description: 'Page path to inspect' },
        days: { type: 'number', description: 'Days of data to aggregate (default 30)' }
      },
      required: ['pageUrl']
    }
  },
  {
    name: 'analytics_get_scroll_depth',
    description: 'Retrieve percentage of visitors reaching 25%, 50%, 75%, and 100% scroll depth on a given page.',
    inputSchema: {
      type: 'object',
      properties: {
        pageUrl: { type: 'string', description: 'Target page path' },
        days: { type: 'number', description: 'Days of data (default 30)' }
      },
      required: ['pageUrl']
    }
  },
  {
    name: 'analytics_get_form_abandonment',
    description: 'Inspect enquiry form engagement, starts, submissions, drop-off fields, and input errors.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to inspect (default 30)' }
      }
    }
  },
  {
    name: 'analytics_get_session_replay_summary',
    description: 'Retrieve privacy-masked cursor and scroll interaction timeline for a specific visitor session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Pseudonymous session ID' }
      },
      required: ['sessionId']
    }
  },
  {
    name: 'analytics_get_bot_filter_stats',
    description: 'Inspect crawler classification statistics and verified bot signatures.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default 30)' }
      }
    }
  },
  {
    name: 'analytics_get_tracking_health',
    description: 'Check first-party ingestion latency, queue health, and 90-day retention status.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },

  // ==========================================
  // VERSION 6.1.3: WEBSITE CONTENT TOOLS
  // ==========================================
  {
    name: 'website_list_editable_pages',
    description: 'List all database-backed service pages and editable content pages in Dawnexus.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'website_get_page_content',
    description: 'Retrieve complete structured content for a service page (hero, capabilities, FAQs, CTA, meta).',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug (e.g. website-design, seo-services, ai-video-creation, digital-marketing)' }
      },
      required: ['slug']
    }
  },
  {
    name: 'website_get_page_metadata',
    description: 'Retrieve SEO meta title, description, canonical URL, and OpenGraph tags for a page.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug' }
      },
      required: ['slug']
    }
  },
  {
    name: 'website_get_content_version_history',
    description: 'Retrieve revision history for a website page with rollback checkpoints.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug' },
        limit: { type: 'number', description: 'Max revisions to retrieve (default 20)' }
      },
      required: ['slug']
    }
  },
  {
    name: 'website_create_optimization_draft',
    description: 'Create an evidence-backed optimization draft for human review. Never publishes immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Target page slug' },
        targetSection: { type: 'string', description: 'Target section (hero, capabilities, faqs, cta)' },
        proposedChanges: { type: 'object', description: 'Proposed section content' },
        reason: { type: 'string', description: 'Evidence-backed rationale for the change' }
      },
      required: ['slug', 'targetSection', 'proposedChanges', 'reason']
    }
  },
  {
    name: 'website_preview_optimization_draft',
    description: 'Preview an optimization draft side-by-side with current live content.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug' },
        versionNumber: { type: 'number', description: 'Specific draft version to preview' }
      },
      required: ['slug']
    }
  },
  {
    name: 'website_get_approval_status',
    description: 'Check the review/approval status of AI optimization proposals.',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: { type: 'number', description: 'Optional proposal ID' },
        slug: { type: 'string', description: 'Optional page slug' }
      }
    }
  },
  {
    name: 'website_publish_approved_changes',
    description: 'Publish an approved optimization proposal live to the website without code redeploy.',
    inputSchema: {
      type: 'object',
      properties: {
        proposalId: { type: 'number', description: 'Proposal ID that has been approved' },
        approvedBy: { type: 'string', description: 'Administrator name or identifier' }
      },
      required: ['proposalId', 'approvedBy']
    }
  },
  {
    name: 'website_rollback_content_version',
    description: 'Immediately restore a previous version of a website page.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug' },
        versionNumber: { type: 'number', description: 'Target version number to restore' },
        reason: { type: 'string', description: 'Reason for rollback' }
      },
      required: ['slug', 'versionNumber']
    }
  },

  // ==========================================
  // VERSION 7.1.8: CHATBOT & ENQUIRY TOOLS
  // ==========================================
  {
    name: 'chatbot_get_public_knowledge',
    description: 'Retrieve public Dawnexus business information, official service catalog, FAQs, pricing models, and published articles for answering visitor questions accurately.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional user search query or topic to retrieve relevant context for' }
      }
    }
  },
  {
    name: 'chatbot_estimate_pricing',
    description: 'Calculate authoritative website design and development cost estimates using official Dawnexus pricing logic.',
    inputSchema: {
      type: 'object',
      properties: {
        websiteType: { type: 'string', description: "Website archetype (e.g. 'corporate-business', 'ecommerce-store', 'custom-web-app')" },
        pageCount: { type: 'number', description: 'Number of pages requested (1 to 20)' },
        designTier: { type: 'string', enum: ['Standard', 'Premium', 'Custom'], description: 'Design tier' },
        maintenanceOption: { type: 'string', enum: ['None', 'Monthly', 'Annual'], description: 'Maintenance plan' },
        selectedFeatures: {
          type: 'array',
          items: { type: 'string' },
          description: "List of addon features (e.g. 'cms-blog', 'seo-optimization', 'whatsapp-integration', 'speed-optimization')"
        }
      }
    }
  },
  {
    name: 'chatbot_submit_enquiry',
    description: 'Submit a new customer project enquiry to Dawnexus. STRICT REQUIREMENT: Only call this tool AFTER the visitor explicitly confirms their details and intention to submit.',
    inputSchema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'Visitor full name' },
        email: { type: 'string', description: 'Visitor contact email' },
        phone: { type: 'string', description: 'Visitor contact phone number' },
        requested_services: {
          type: 'array',
          items: { type: 'string' },
          description: "Services requested (e.g. ['Website Design', 'SEO Services'])"
        },
        budget: { type: 'string', description: "Budget range (e.g. '₹25,000 - ₹50,000')" },
        project_details: { type: 'string', description: 'Summary of project requirements and goals' },
        estimate_ref_id: { type: 'string', description: 'Optional estimate reference ID from chatbot_estimate_pricing' },
        confirmed_by_user: { type: 'boolean', description: 'Must be true confirming the visitor has explicitly reviewed and confirmed submission' }
      },
      required: ['full_name', 'email', 'project_details', 'confirmed_by_user']
    }
  },
  {
    name: 'enquiries_admin_list',
    description: 'Retrieve customer project enquiries with status filtering (Admin studio only).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['All', 'New', 'Contacted', 'Proposal Sent', 'Won', 'Lost'], description: 'Status filter' },
        limit: { type: 'number', description: 'Max enquiries to return (default 20, max 100)' }
      }
    }
  },

  // ==========================================
  // VERSION 8.1.0: CLAUDE CANONICAL TOOLS
  // ==========================================
  {
    name: 'search_website_content',
    description: 'Search Dawnexus website pages, services, business capabilities, FAQs, case studies, and knowledge base.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or question' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_website_page',
    description: 'Retrieve full structured content and metadata for a website page.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Page slug (e.g. website-design, seo-services, ai-video-creation, digital-marketing)' }
      },
      required: ['slug']
    }
  },
  {
    name: 'list_services',
    description: 'List all official Dawnexus engineering and marketing services with summary overviews.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_service_details',
    description: 'Retrieve in-depth specifications, features, deliverables, and tech stack for a specific service.',
    inputSchema: {
      type: 'object',
      properties: {
        service_id: { type: 'string', description: 'Service slug or identifier (e.g. website-design, seo-services)' }
      },
      required: ['service_id']
    }
  },
  {
    name: 'search_published_blogs',
    description: 'Search published blog posts by keyword, category, or search phrase.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', description: 'Optional category filter' },
        limit: { type: 'number', description: 'Max results (default 10)' }
      }
    }
  },
  {
    name: 'get_blog_post',
    description: 'Retrieve complete 360-degree article record including all metadata, author credentials, all 15 evidence fields, citation answer blocks, extracted internal/external links, and audit scores.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID (integer, e.g. 698)' },
        slug: { type: 'string', description: 'Article slug (e.g. website-visitors-few-enquiries-conversion-audit)' }
      }
    }
  },
  {
    name: 'get_approved_business_information',
    description: 'Retrieve verified corporate profile, headquarters address, contact channels, operating hours, and official business details for Dawnexus.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_approved_pricing_information',
    description: 'Retrieve approved pricing ranges, estimation parameters, package tiers, and add-on costs.',
    inputSchema: {
      type: 'object',
      properties: {
        service: { type: 'string', description: 'Optional service category' },
        complexity: { type: 'string', description: 'Optional complexity level' }
      }
    }
  },
  {
    name: 'list_blog_posts',
    description: 'List blog articles with status filtering (all, published, draft, scheduled) and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'published', 'draft', 'scheduled'], description: 'Status filter' },
        category: { type: 'string', description: 'Category filter' },
        limit: { type: 'number', description: 'Max results to return' },
        page: { type: 'number', description: 'Page number' }
      }
    }
  },
  {
    name: 'get_blog_post_status',
    description: 'Retrieve publishing status, publication date, scheduled timestamp, and SEO audit score for a blog post.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID' },
        slug: { type: 'string', description: 'Article slug' }
      }
    }
  },
  {
    name: 'schedule_blog_post',
    description: 'Schedule an approved blog draft for future publication at an IST timestamp. Explicit approval flag (approved: true) is strictly required.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Blog post ID' },
        scheduled_at: { type: 'string', description: 'Target ISO date/time or YYYY-MM-DD HH:mm IST' },
        approved: { type: 'boolean', description: 'Human approval confirmation (must be true)' }
      },
      required: ['id', 'scheduled_at', 'approved']
    }
  },
  {
    name: 'publish_blog_post',
    description: 'Publish an approved blog draft immediately live to the website. Explicit approval flag (approved: true) is strictly required.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Blog post ID' },
        approved: { type: 'boolean', description: 'Human approval confirmation (must be true)' }
      },
      required: ['id', 'approved']
    }
  },
  {
    name: 'audit_blog_article',
    description: 'Run a comprehensive dual SEO & E-E-A-T audit against a blog article (by ID, slug, or draft payload). Evaluates both the 100-point Technical SEO score and the Information Gain / E-E-A-T evidence quality score (firsthand observations, original research, case studies, citations, author credentials, methodology).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID (integer, e.g. 698)' },
        slug: { type: 'string', description: 'Article slug' },
        draft: {
          type: 'object',
          description: 'Draft payload to evaluate directly before or without saving'
        }
      }
    }
  },
  {
    name: 'audit_information_gain',
    description: 'Execute the exact Information Gain & AI readiness audit used by the Dawnexus admin editor. Evaluates 8 E-E-A-T criteria: firsthand observations, original research/case studies, implementation process, limitations/lessons, verified sources, citation answer blocks, filler phrasing penalty, and author credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID (integer, e.g. 698)' },
        slug: { type: 'string', description: 'Article slug' }
      }
    }
  },
  {
    name: 'audit_technical_seo',
    description: 'Run conventional 100-point Technical SEO quality audit against a blog article (alias for run_seo_quality_check).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Article ID (integer, e.g. 698)' },
        slug: { type: 'string', description: 'Article slug' }
      }
    }
  },
  {
    name: 'bulk_audit_blogs',
    description: 'Audit multiple blog articles across the CMS for SEO health, missing evidence fields, citation blocks, and E-E-A-T depth.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'published', 'draft', 'scheduled'], description: 'Filter by article status (default: all)' },
        category: { type: 'string', description: 'Filter by CMS category' },
        limit: { type: 'number', description: 'Max articles to audit (default: 50)' },
        page: { type: 'number', description: 'Page number for pagination' }
      }
    }
  },
  {
    name: 'bulk_improve_blogs',
    description: 'Apply batch improvements or evidence field updates to multiple blog articles with dry-run verification.',
    inputSchema: {
      type: 'object',
      properties: {
        improvements: {
          type: 'array',
          description: 'List of articles to improve with their respective field updates',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', description: 'Article ID' },
              expected_revision: { type: 'string', description: 'Optional optimistic concurrency revision string' },
              updates: { type: 'object', description: 'Fields and evidence to update' }
            },
            required: ['id', 'updates']
          }
        },
        dry_run: { type: 'boolean', description: 'When true (default), validates all improvements and simulates scores without writing changes to the database' }
      },
      required: ['improvements']
    }
  },
  {
    name: 'list_authorized_enquiries',
    description: 'Retrieve authorized customer leads and project enquiries submitted to Dawnexus.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['All', 'New', 'Contacted', 'Proposal Sent', 'Won', 'Lost'], description: 'Enquiry status filter' },
        limit: { type: 'number', description: 'Max records' }
      }
    }
  },
  {
    name: 'get_authorized_enquiry',
    description: 'Retrieve detailed record and communication history for a specific customer enquiry by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Enquiry ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'create_enquiry',
    description: 'Submit a new verified customer enquiry or project consultation request.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Full name' },
        email: { type: 'string', description: 'Contact email' },
        phone: { type: 'string', description: 'Contact phone' },
        service: { type: 'string', description: 'Requested service' },
        message: { type: 'string', description: 'Project requirements and details' },
        budget: { type: 'string', description: 'Estimated budget range' }
      },
      required: ['name', 'email', 'service', 'message']
    }
  },
  {
    name: 'get_enquiry_submission_status',
    description: 'Check delivery, assignment, and status of an enquiry submission.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Enquiry ID' },
        email: { type: 'string', description: 'Customer email' }
      }
    }
  },
  {
    name: 'get_visitor_analytics_overview',
    description: 'Retrieve aggregated visitor volume, sessions, pageviews, and bounce rate metrics.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to aggregate (default 30)' },
        dateRange: { type: 'string', enum: ['7d', '28d', '90d', 'today'], description: 'Date range preset' }
      }
    }
  },
  {
    name: 'get_conversion_funnel',
    description: 'Retrieve commercial conversion funnel drop-offs and milestone completions.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default 30)' }
      }
    }
  },
  {
    name: 'get_page_engagement',
    description: 'Retrieve engagement duration, scroll depth completions, and interaction hotzones for a specific URL.',
    inputSchema: {
      type: 'object',
      properties: {
        pageUrl: { type: 'string', description: 'Page path (e.g. /services/website-design)' },
        days: { type: 'number', description: 'Days to aggregate (default 30)' }
      },
      required: ['pageUrl']
    }
  },
  {
    name: 'get_chatbot_analytics',
    description: 'Retrieve chatbot conversation volume, resolution rate, and common customer query categories.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Days to analyze (default 30)' }
      }
    }
  },
  // ==========================================
  // VERSION 8.3.0: ADVANCED SEO & AI DISCOVERY TOOLS
  // ==========================================
  {
    name: 'seo_audit_content_quality',
    description: 'Audit a published or draft blog post for Information Gain, original evidence pillars, E-E-A-T credentials, direct answers, and boilerplate penalties.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'number', description: 'Blog ID to audit' },
        slug: { type: 'string', description: 'Blog slug to audit if ID is not known' }
      }
    }
  },
  {
    name: 'seo_audit_ai_discovery',
    description: 'Audit an article or draft for AI discovery citation readiness, analyzing concise answer blocks, definition clarity, and factual structure.',
    inputSchema: {
      type: 'object',
      properties: {
        blog_id: { type: 'number', description: 'Blog ID to audit' },
        slug: { type: 'string', description: 'Blog slug to audit if ID is not known' }
      }
    }
  },
  {
    name: 'seo_get_content_freshness',
    description: 'Retrieve editorial freshness status and review maintenance cycles (30/90 days) for all published Dawnexus articles.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'overdue', 'due_soon', 'healthy'],
          description: 'Filter articles by freshness status'
        }
      }
    }
  },
  {
    name: 'seo_validate_structured_data',
    description: 'Validate JSON-LD structured data for a page or article to ensure schema standards compliance and verify zero fabricated review or rating schemas.',
    inputSchema: {
      type: 'object',
      properties: {
        page_type: {
          type: 'string',
          enum: ['home', 'service', 'blog', 'blog_index'],
          description: 'Page type to validate structured data for'
        },
        slug: { type: 'string', description: 'Article or service slug if applicable' }
      },
      required: ['page_type']
    }
  },
  {
    name: 'seo_get_html_payload_report',
    description: 'Audit uncompressed HTML response payload sizes for Dawnexus public routes against the 2 MB operational threshold and inspect Core Web Vitals targets.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Universal MCP Tool Dispatcher
 * Central execution logic for SSE, JSON-RPC, REST /tools/call, and server-side Gemini function calling.
 */
export async function executeMcpTool(name: string, args: any = {}, callerIp: string = 'mcp-system'): Promise<any> {
  await refreshFromPersistentStore();
  const toolArgs = args || {};

  switch (name) {
    // --- Public Chatbot Tools ---
    case 'chatbot_get_public_knowledge':
      return await McpService.chatbotGetPublicKnowledge(toolArgs);

    case 'chatbot_estimate_pricing':
      return McpService.chatbotEstimatePricing(toolArgs);

    case 'chatbot_submit_enquiry':
      return await McpService.chatbotSubmitEnquiry(toolArgs, callerIp);

    // --- Admin Enquiry Tool ---
    case 'enquiries_admin_list':
      return await McpService.enquiriesAdminList(toolArgs);

    // --- Blog CMS Tools ---
    case 'get_blog_categories':
      return McpService.getBlogCategories();

    case 'get_existing_articles':
      return await McpService.getExistingArticles();

    case 'get_search_console_opportunities':
      return await McpService.getSearchConsoleOpportunities();

    case 'get_weekly_content_context':
      return await McpService.getWeeklyContentContext();

    case 'create_blog_draft':
      return await McpService.createBlogDraft(toolArgs, callerIp);

    case 'update_blog_draft': {
      const id = Number(toolArgs.id);
      if (!id) throw new Error('Article ID is required for update_blog_draft.');
      return await McpService.updateBlogDraft(id, toolArgs, callerIp);
    }

    case 'update_blog_article': {
      const id = Number(toolArgs.id);
      if (!id) throw new Error('Article ID is required for update_blog_article.');
      return await McpService.updateBlogArticle({ id, ...toolArgs }, callerIp);
    }

    case 'upload_blog_image':
      return await McpService.uploadBlogImage(toolArgs, callerIp);

    case 'attach_blog_image':
      return await McpService.attachBlogImage(toolArgs, callerIp);

    case 'verify_blog_image': {
      const id = Number(toolArgs.id);
      if (!id) throw new Error('Article ID is required for verify_blog_image.');
      return await McpService.verifyBlogImage(id, callerIp);
    }

    case 'update_blog_image_metadata':
      return await McpService.updateBlogImageMetadata(toolArgs, callerIp);

    case 'schedule_blog_draft':
      return await McpService.scheduleBlogDraft(toolArgs, callerIp);

    case 'run_seo_quality_check':
      return await McpService.runSeoQualityCheck(toolArgs, callerIp);

    // --- Google Search Console Tools ---
    case 'gsc_get_connection_status':
      return await McpService.gscGetConnectionStatus();

    case 'gsc_list_properties':
      return await McpService.gscListProperties();

    case 'gsc_get_search_analytics':
      return await McpService.gscGetSearchAnalytics(toolArgs);

    case 'gsc_get_top_queries':
      return await McpService.gscGetTopQueries(toolArgs);

    case 'gsc_get_top_pages':
      return await McpService.gscGetTopPages(toolArgs);

    case 'gsc_get_research_status':
      return await McpService.gscGetResearchStatus();

    case 'gsc_run_research_sync':
      return await McpService.gscRunResearchSync(toolArgs);

    case 'gsc_get_research_job':
      return await McpService.gscGetResearchJob(toolArgs);

    // --- Google Analytics 4 Tools ---
    case 'ga4_get_connection_status':
      return await McpService.ga4GetConnectionStatus();

    case 'ga4_list_properties':
      return await McpService.ga4ListProperties();

    case 'ga4_get_overview':
      return await McpService.ga4GetOverview(toolArgs);

    case 'ga4_get_traffic_acquisition':
      return await McpService.ga4GetTrafficAcquisition(toolArgs);

    case 'ga4_get_landing_pages':
      return await McpService.ga4GetLandingPages(toolArgs);

    case 'ga4_get_page_performance':
      return await McpService.ga4GetPagePerformance(toolArgs);

    case 'ga4_get_realtime':
      return await McpService.ga4GetRealtime();

    case 'ga4_get_report':
      return await McpService.ga4GetReport(toolArgs);

    case 'ga4_get_analytics_status':
      return await McpService.ga4GetAnalyticsStatus(toolArgs);

    // --- Visitor Analytics Tools ---
    case 'analytics_get_overview':
      return await McpService.analyticsGetOverview(toolArgs);

    case 'analytics_get_conversion_funnel':
      return await McpService.analyticsGetConversionFunnel(toolArgs);

    case 'analytics_get_page_performance':
      return await McpService.analyticsGetPagePerformance(toolArgs);

    case 'analytics_get_visitor_journeys':
      return await McpService.analyticsGetVisitorJourneys(toolArgs);

    case 'analytics_get_exit_analysis':
      return await McpService.analyticsGetExitAnalysis(toolArgs);

    case 'analytics_get_click_heatmap':
      return await McpService.analyticsGetClickHeatmap(toolArgs);

    case 'analytics_get_scroll_depth':
      return await McpService.analyticsGetScrollDepth(toolArgs);

    case 'analytics_get_form_abandonment':
      return await McpService.analyticsGetFormAbandonment(toolArgs);

    case 'analytics_get_session_replay_summary':
      return await McpService.analyticsGetSessionReplaySummary(toolArgs);

    case 'analytics_get_bot_filter_stats':
      return await McpService.analyticsGetBotFilterStats();

    case 'analytics_get_tracking_health':
      return await McpService.analyticsGetTrackingHealth();

    // --- Website Content Tools ---
    case 'website_list_editable_pages':
      return await McpService.websiteListEditablePages();

    case 'website_get_page_content':
      return await McpService.websiteGetPageContent(toolArgs);

    case 'website_get_page_metadata':
      return await McpService.websiteGetPageMetadata(toolArgs);

    case 'website_get_content_version_history':
      return await McpService.websiteGetContentVersionHistory(toolArgs);

    case 'website_create_optimization_draft':
      return await McpService.websiteCreateOptimizationDraft(toolArgs);

    case 'website_preview_optimization_draft':
      return await McpService.websitePreviewOptimizationDraft(toolArgs);

    case 'website_get_approval_status':
      return await McpService.websiteGetApprovalStatus(toolArgs);

    case 'website_publish_approved_changes':
      return await McpService.websitePublishApprovedChanges(toolArgs);

    case 'website_rollback_content_version':
      return await McpService.websiteRollbackContentVersion(toolArgs);

    // ==========================================
    // VERSION 8.1.0: CLAUDE CANONICAL TOOLS
    // ==========================================
    case 'search_website_content':
      return await McpService.chatbotGetPublicKnowledge({ query: toolArgs.query || toolArgs.search });

    case 'get_website_page':
      return await McpService.websiteGetPageContent({ slug: toolArgs.slug });

    case 'list_services':
      return McpService.listServices();

    case 'get_service_details':
      return await McpService.getServiceDetails(toolArgs.service_id || toolArgs.slug || toolArgs.id);

    case 'search_published_blogs':
      return await McpService.searchPublishedBlogs(toolArgs);

    case 'get_blog_post': {
      const argsObj = typeof toolArgs === 'object' && toolArgs !== null ? toolArgs : { id: toolArgs };
      return await McpService.getBlogPost(argsObj);
    }

    case 'get_approved_business_information':
      return McpService.getApprovedBusinessInformation();

    case 'get_approved_pricing_information':
      return McpService.getApprovedPricingInformation(toolArgs);

    case 'list_blog_posts':
      return await McpService.listBlogPosts(toolArgs);

    case 'get_blog_post_status':
      return await McpService.getBlogPostStatus(toolArgs);

    case 'schedule_blog_post': {
      const blogId = Number(toolArgs.id);
      if (!blogId) throw new Error('Blog post ID is required for schedule_blog_post.');
      return await McpService.scheduleBlogDraft(
        {
          id: blogId,
          scheduled_at: toolArgs.scheduled_at,
          approved: toolArgs.approved === true
        },
        callerIp
      );
    }

    case 'publish_blog_post': {
      const blogId = Number(toolArgs.id);
      if (!blogId) throw new Error('Blog post ID is required for publish_blog_post.');
      return await McpService.publishBlogPost(
        {
          id: blogId,
          approved: toolArgs.approved === true
        },
        callerIp
      );
    }

    case 'audit_blog_article':
      return await McpService.auditBlogArticle(toolArgs);

    case 'audit_information_gain': {
      const argsObj = typeof toolArgs === 'object' && toolArgs !== null ? toolArgs : { id: toolArgs };
      return await McpService.auditInformationGain(argsObj);
    }

    case 'audit_technical_seo': {
      const argsObj = typeof toolArgs === 'object' && toolArgs !== null ? toolArgs : { id: toolArgs };
      return await McpService.runSeoQualityCheck(argsObj, callerIp);
    }

    case 'bulk_audit_blogs':
      return await McpService.bulkAuditBlogs(toolArgs);

    case 'bulk_improve_blogs':
      return await McpService.bulkImproveBlogs(toolArgs, callerIp);

    case 'list_authorized_enquiries':
      return await McpService.enquiriesAdminList(toolArgs);

    case 'get_authorized_enquiry':
      return McpService.getAuthorizedEnquiry(Number(toolArgs.id));

    case 'create_enquiry': {
      const requestedServices = Array.isArray(toolArgs.services)
        ? toolArgs.services
        : (toolArgs.service ? [toolArgs.service] : ['General Consultation']);
      return await McpService.chatbotSubmitEnquiry(
        {
          full_name: toolArgs.name || toolArgs.full_name,
          email: toolArgs.email,
          phone: toolArgs.phone || '',
          requested_services: requestedServices,
          budget: toolArgs.budget || 'Flexible',
          project_details: toolArgs.message || toolArgs.project_details || 'Enquiry submitted via Claude Remote MCP',
          confirmed_by_user: true
        },
        callerIp
      );
    }

    case 'get_enquiry_submission_status':
      return McpService.getEnquirySubmissionStatus(toolArgs);

    case 'get_visitor_analytics_overview':
      return await McpService.analyticsGetOverview(toolArgs);

    case 'get_conversion_funnel':
      return await McpService.analyticsGetConversionFunnel(toolArgs);

    case 'get_page_engagement':
      return await McpService.analyticsGetPagePerformance(toolArgs);

    case 'get_chatbot_analytics':
      return McpService.getChatbotAnalytics(toolArgs);

    // ==========================================
    // VERSION 8.3.0: ADVANCED SEO & AI DISCOVERY TOOLS
    // ==========================================
    case 'seo_audit_content_quality': {
      let blog = null;
      if (toolArgs.blog_id) {
        blog = getBlogById(Number(toolArgs.blog_id));
      } else if (toolArgs.slug) {
        blog = getBlogBySlug(String(toolArgs.slug));
      }
      if (!blog) {
        throw new Error('Please provide a valid blog_id or slug to audit.');
      }
      const audit = assessInformationGain(blog);
      const allBlogs = getBlogs();
      const overlap = detectContentOverlap(blog, allBlogs.items);
      return {
        blog_id: blog.id,
        title: blog.title,
        slug: blog.slug,
        audit,
        overlap
      };
    }

    case 'seo_audit_ai_discovery': {
      let blog = null;
      if (toolArgs.blog_id) {
        blog = getBlogById(Number(toolArgs.blog_id));
      } else if (toolArgs.slug) {
        blog = getBlogBySlug(String(toolArgs.slug));
      }
      if (!blog) {
        throw new Error('Please provide a valid blog_id or slug to audit.');
      }
      const audit = assessInformationGain(blog);
      return {
        blog_id: blog.id,
        title: blog.title,
        slug: blog.slug,
        ai_readiness_score: audit.ai_readiness_score,
        answer_blocks_count: audit.answer_blocks_count,
        criteria: audit.criteria.filter((c: any) => c.id.includes('answer') || c.id.includes('research') || c.id.includes('eeat')),
        recommendations: audit.recommendations
      };
    }

    case 'seo_get_content_freshness': {
      const items = getBlogsRequiringReview();
      const filter = toolArgs.filter || 'all';
      let filtered = items;
      if (filter === 'overdue') {
        filtered = items.filter(i => i.is_overdue);
      } else if (filter === 'due_soon') {
        filtered = items.filter(i => !i.is_overdue && (i.review_cycle_days || 90) - i.days_since_review <= 14);
      } else if (filter === 'healthy') {
        filtered = items.filter(i => !i.is_overdue && (i.review_cycle_days || 90) - i.days_since_review > 14);
      }
      return {
        total: items.length,
        filter,
        filtered_count: filtered.length,
        articles: filtered.map(b => ({
          id: b.id,
          title: b.title,
          slug: b.slug,
          review_cycle_days: b.review_cycle_days || 90,
          days_since_review: b.days_since_review,
          is_overdue: b.is_overdue,
          last_reviewed_at: b.last_reviewed_at,
          published_at: b.published_at
        }))
      };
    }

    case 'seo_validate_structured_data': {
      const pageType = toolArgs.page_type || 'home';
      let blog = null;
      if (toolArgs.slug) {
        blog = getBlogBySlug(String(toolArgs.slug));
      }
      const jsonLd = generateServerJsonLd(pageType as any, blog || undefined);
      const validation = validateJsonLdStructure(jsonLd);
      return {
        page_type: pageType,
        is_valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        schema: jsonLd
      };
    }

    case 'seo_get_html_payload_report': {
      return await auditHtmlPayloads();
    }

    default:
      throw new Error(`Tool '${name}' is not recognized or permitted.`);
  }
}

/**
 * Creates and initializes an MCP Server instance with tools
 */
export function createDawnexusMcpServer(): Server {
  const server = new Server(
    {
      name: 'dawnexus-mcp-server',
      version: '8.3.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register tools list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: MCP_TOOLS };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const callerIp = 'mcp-sdk-client';

    try {
      const result = await executeMcpTool(name, args, callerIp);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: err?.message || 'Tool execution encountered an error.',
                tool: name
              },
              null,
              2
            )
          }
        ]
      };
    }
  });

  return server;
}

// --------------------------------------------------------------------------
// MCP Router Endpoints
// --------------------------------------------------------------------------

// 1. Status & Health (Public or authenticated)
mcpRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Dawnexus MCP Server',
    version: '8.3.0',
    transport: ['Streamable HTTP (/mcp)', 'SSE (/api/mcp/sse)', 'JSON-RPC POST (/api/mcp/rpc)', 'REST OpenAPI (/api/mcp/tools)'],
    policy: 'Draft first. Human approval required. Claude MCP Integration.',
    toolsCount: MCP_TOOLS.length,
    timestamp: new Date().toISOString()
  });
});

// 2. OpenAPI 3.1 Specification for ChatGPT Custom GPT Actions
mcpRouter.get('/openapi.json', (req: Request, res: Response) => {
  const host = req.get('host') || 'www.dawnexus.in';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}/api/mcp`;

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Dawnexus MCP API',
      version: '8.3.0',
      description: 'Dawnexus Model Context Protocol (MCP) and Action API for Claude and AI integrations to research, plan, draft, and audit SEO blog posts, inspect Search Console & GA4 analytics, monitor first-party visitor telemetry, and manage approved website content. All content creation is saved strictly as Drafts requiring human approval in the Admin panel.'
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-mcp-api-key',
          description: 'Provide your MCP_API_KEY in the x-mcp-api-key header'
        },
        OAuth2: {
          type: 'oauth2',
          description: 'Standard OAuth 2.0 Authorization for Google Gemini / Vertex AI / Extensions',
          flows: {
            clientCredentials: {
              tokenUrl: `${baseUrl}/oauth/token`,
              scopes: { 'mcp:tools': 'Full tool execution access' }
            },
            authorizationCode: {
              authorizationUrl: `${baseUrl}/oauth/authorize`,
              tokenUrl: `${baseUrl}/oauth/token`,
              scopes: { 'mcp:tools': 'Full tool execution access' }
            }
          }
        }
      },
      schemas: {
        CreateBlogDraftRequest: {
          type: 'object',
          required: ['title', 'category', 'content'],
          properties: {
            title: { type: 'string', description: 'Article title' },
            category: { type: 'string', description: 'Existing CMS category' },
            content: { type: 'string', description: 'Complete article body in Markdown or HTML' },
            slug: { type: 'string', description: 'URL slug' },
            excerpt: { type: 'string', description: 'Article summary' },
            primary_keyword: { type: 'string', description: 'Primary keyword' },
            secondary_keywords: { type: 'array', items: { type: 'string' }, description: 'Secondary keywords' },
            target_location: { type: 'string', description: 'Target location' },
            search_intent: { type: 'string', enum: ['Informational', 'Commercial Investigation', 'Transactional', 'Navigational'] },
            target_audience: { type: 'string', description: 'Target audience' },
            seo_title: { type: 'string', description: 'SERP title tag' },
            meta_description: { type: 'string', description: 'Meta description' },
            canonical_url: { type: 'string', description: 'Canonical URL' },
            featured_image: { type: 'string', description: 'Featured image URL or data URL' },
            image_alt: { type: 'string', description: 'Image alt text' }
          }
        },
        UpdateBlogDraftRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Updated title' },
            category: { type: 'string', description: 'Updated category' },
            content: { type: 'string', description: 'Updated content' },
            slug: { type: 'string', description: 'Updated slug' },
            excerpt: { type: 'string', description: 'Updated excerpt' },
            primary_keyword: { type: 'string', description: 'Updated primary keyword' },
            secondary_keywords: { type: 'array', items: { type: 'string' } },
            target_location: { type: 'string', description: 'Updated target location' },
            search_intent: { type: 'string', description: 'Updated search intent' },
            target_audience: { type: 'string', description: 'Updated target audience' },
            target_questions: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            seo_title: { type: 'string', description: 'Updated SEO title' },
            meta_description: { type: 'string', description: 'Updated meta description' },
            canonical_url: { type: 'string', description: 'Updated canonical URL' },
            featured_image: { type: 'string', description: 'Updated featured image URL' },
            image_alt: { type: 'string', description: 'Updated image alt text' },
            caption: { type: 'string', description: 'Updated caption' },
            firsthand_observations: { type: 'string', description: 'Practitioner insights and empirical observations' },
            project_examples: { description: 'Project examples (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            case_studies: { description: 'Case study evidence with metrics (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            original_research_data: { description: 'Original research data, benchmark statistics, or survey findings', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            implementation_process: { type: 'string', description: 'Detailed step-by-step methodology and implementation process' },
            limitations_lessons: { type: 'string', description: 'Trade-offs, limitations, and lessons learned' },
            external_sources: { description: 'Verified external authoritative sources and citations', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            citation_answer_blocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading_text: { type: 'string' },
                  concise_answer: { type: 'string' },
                  key_takeaways: { type: 'array', items: { type: 'string' } },
                  heading_level: { type: 'string' }
                }
              }
            },
            author: { type: 'string' },
            author_role: { type: 'string' },
            author_bio: { type: 'string' },
            author_credentials: { type: 'string' },
            reviewer_name: { type: 'string' },
            editorial_notes: { type: 'string' },
            review_cycle_days: { type: 'integer' }
          }
        },
        UpdateBlogArticleRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Article ID' },
            expected_revision: { type: 'string', description: 'Optimistic concurrency revision' },
            title: { type: 'string', description: 'Updated title' },
            category: { type: 'string', description: 'Updated category' },
            content: { type: 'string', description: 'Updated content' },
            slug: { type: 'string', description: 'Updated slug' },
            excerpt: { type: 'string', description: 'Updated excerpt' },
            primary_keyword: { type: 'string', description: 'Updated primary keyword' },
            secondary_keywords: { type: 'array', items: { type: 'string' } },
            target_location: { type: 'string', description: 'Updated target location' },
            search_intent: { type: 'string', description: 'Updated search intent' },
            target_audience: { type: 'string', description: 'Updated target audience' },
            target_questions: { type: 'array', items: { type: 'string' } },
            tags: { type: 'array', items: { type: 'string' } },
            seo_title: { type: 'string', description: 'Updated SEO title' },
            meta_description: { type: 'string', description: 'Updated meta description' },
            canonical_url: { type: 'string', description: 'Updated canonical URL' },
            featured_image: { type: 'string', description: 'Updated featured image URL' },
            image_alt: { type: 'string', description: 'Updated image alt text' },
            caption: { type: 'string', description: 'Updated caption' },
            firsthand_observations: { type: 'string', description: 'Practitioner insights and empirical observations' },
            project_examples: { description: 'Project examples (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            case_studies: { description: 'Case study evidence with metrics (Markdown or JSON array)', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            original_research_data: { description: 'Original research data, benchmark statistics, or survey findings', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            implementation_process: { type: 'string', description: 'Detailed step-by-step methodology and implementation process' },
            limitations_lessons: { type: 'string', description: 'Trade-offs, limitations, and lessons learned' },
            external_sources: { description: 'Verified external authoritative sources and citations', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            citation_answer_blocks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading_text: { type: 'string' },
                  concise_answer: { type: 'string' },
                  key_takeaways: { type: 'array', items: { type: 'string' } },
                  heading_level: { type: 'string' }
                }
              }
            },
            author: { type: 'string' },
            author_role: { type: 'string' },
            author_bio: { type: 'string' },
            author_credentials: { type: 'string' },
            reviewer_name: { type: 'string' },
            editorial_notes: { type: 'string' },
            review_cycle_days: { type: 'integer' }
          }
        },
        AuditBlogArticleRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Article ID' },
            slug: { type: 'string', description: 'Article slug' },
            draft: { type: 'object', description: 'Draft payload to evaluate directly without saving' }
          }
        },
        BulkAuditBlogsRequest: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['all', 'published', 'draft', 'scheduled'] },
            category: { type: 'string' },
            limit: { type: 'integer', default: 50 },
            page: { type: 'integer', default: 1 }
          }
        },
        BulkImproveBlogsRequest: {
          type: 'object',
          required: ['improvements'],
          properties: {
            improvements: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'updates'],
                properties: {
                  id: { type: 'integer' },
                  expected_revision: { type: 'string' },
                  updates: { type: 'object' }
                }
              }
            },
            dry_run: { type: 'boolean', default: true }
          }
        },
        UploadImageRequest: {
          type: 'object',
          required: ['image'],
          properties: {
            image: { type: 'string', description: 'Base64 data URL (e.g. data:image/png;base64,...) or hosted public HTTPS image URL' },
            filename: { type: 'string', description: 'Optional descriptive filename or article slug prefix' }
          }
        },
        AttachImageRequest: {
          type: 'object',
          required: ['id', 'image_alt'],
          properties: {
            id: { type: 'integer', description: 'Draft article ID' },
            image_url: { type: 'string', description: 'Permanent public HTTPS image URL (from upload_blog_image or storage)' },
            image: { type: 'string', description: 'Alternative: Base64 data URL or hosted image URL' },
            image_alt: { type: 'string', description: 'Descriptive alt text for image' },
            caption: { type: 'string', description: 'Optional image caption' }
          }
        },
        UpdateImageMetadataRequest: {
          type: 'object',
          properties: {
            image_alt: { type: 'string', description: 'Updated descriptive alt text' },
            caption: { type: 'string', description: 'Updated caption' }
          }
        },
        ScheduleBlogDraftRequest: {
          type: 'object',
          required: ['id', 'scheduled_at', 'approved'],
          properties: {
            id: { type: 'integer', description: 'Draft article ID' },
            scheduled_at: { type: 'string', description: 'Publication date/time in Asia/Kolkata timezone (e.g. 2026-10-25T10:00:00+05:30 or 2026-10-25 10:00:00)' },
            approved: { type: 'boolean', description: 'Must be true confirming the user has reviewed and explicitly approved the draft and publication schedule' }
          }
        },
        SeoCheckRequest: {
          type: 'object',
          properties: {
            id: { type: 'integer', description: 'Draft ID in database' },
            draft: {
              type: 'object',
              description: 'Draft payload to evaluate without saving',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                content: { type: 'string' },
                primary_keyword: { type: 'string' }
              }
            }
          }
        },
        BlogArticleResponse: {
          type: 'object',
          description: 'Full 360-degree blog article record with metadata, SEO scores, and E-E-A-T evidence fields',
          properties: {
            id: { type: 'integer', description: 'Unique article ID' },
            title: { type: 'string', description: 'Article title' },
            slug: { type: 'string', description: 'URL slug' },
            status: { type: 'string', enum: ['Draft', 'Scheduled', 'Published'], description: 'Publication status' },
            scheduled_at: { type: 'string', description: 'Publication schedule timestamp (ISO 8601)' },
            published_at: { type: 'string', description: 'Published timestamp (ISO 8601)' },
            created_at: { type: 'string' },
            updated_at: { type: 'string' },
            content: { type: 'string', description: 'Article body in Markdown or HTML' },
            excerpt: { type: 'string', description: 'Summary excerpt' },
            category: { type: 'string', description: 'CMS category' },
            author: { type: 'string', description: 'Author name' },
            author_role: { type: 'string', description: 'Author professional role' },
            author_bio: { type: 'string', description: 'Author biography' },
            author_credentials: { type: 'string', description: 'Author credentials and certifications' },
            reviewer_name: { type: 'string', description: 'Expert technical/editorial reviewer name' },
            editorial_notes: { type: 'string', description: 'Internal editorial notes' },
            primary_keyword: { type: 'string', description: 'Target primary keyword' },
            secondary_keywords: { type: 'array', items: { type: 'string' }, description: 'Secondary keywords' },
            target_location: { type: 'string', description: 'Target geographic location' },
            search_intent: { type: 'string', description: 'Search intent' },
            target_audience: { type: 'string', description: 'Target audience persona' },
            target_questions: { type: 'array', items: { type: 'string' }, description: 'Target user questions' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Topic tags' },
            seo_title: { type: 'string', description: 'SEO page title tag' },
            meta_description: { type: 'string', description: 'SERP meta description' },
            canonical_url: { type: 'string', description: 'Canonical URL' },
            featured_image: { type: 'string', description: 'Featured image URL' },
            image_alt: { type: 'string', description: 'Featured image alt text' },
            caption: { type: 'string', description: 'Featured image caption' },
            internal_links: { type: 'array', items: { type: 'string' }, description: 'Extracted internal links' },
            external_links: { type: 'array', items: { type: 'string' }, description: 'Extracted external links' },
            firsthand_observations: { type: 'string', description: 'Direct practitioner observations' },
            project_examples: { description: 'Project examples', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            case_studies: { description: 'Case study evidence with metrics', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            original_research_data: { description: 'Original research data or benchmark statistics', anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] },
            implementation_process: { type: 'string', description: 'Detailed implementation methodology' },
            limitations_lessons: { type: 'string', description: 'Trade-offs, limitations, and lessons learned' },
            external_sources: { type: 'array', items: { type: 'object' }, description: 'Authoritative external citations' },
            citation_answer_blocks: {
              type: 'array',
              description: 'Direct AI-discovery citation and answer blocks',
              items: {
                type: 'object',
                properties: {
                  heading_text: { type: 'string' },
                  concise_answer: { type: 'string' },
                  key_takeaways: { type: 'array', items: { type: 'string' } },
                  heading_level: { type: 'string' }
                }
              }
            },
            review_cycle_days: { type: 'integer', description: 'Review cycle period in days' },
            last_reviewed_at: { type: 'string', description: 'Timestamp of last audit/review' },
            content_revision: { type: 'string', description: 'Content revision identifier' },
            revision: { type: 'string', description: 'Current article revision' },
            technical_seo_score: { type: 'number', description: 'Deterministic 100-point Technical SEO score' },
            information_gain_score: { type: 'number', description: 'Information Gain & E-E-A-T depth score (0-100)' },
            admin_notes: { type: 'string', description: 'Administrative notes' },
            url: { type: 'string', description: 'Full canonical live URL' }
          }
        },
        BlogListResponse: {
          type: 'object',
          description: 'Paginated list of blog articles with status summary',
          properties: {
            countsByStatus: {
              type: 'object',
              properties: {
                all: { type: 'integer' },
                published: { type: 'integer' },
                draft: { type: 'integer' },
                scheduled: { type: 'integer' }
              }
            },
            total: { type: 'integer' },
            page: { type: 'integer' },
            totalPages: { type: 'integer' },
            items: {
              type: 'array',
              items: { $ref: '#/components/schemas/BlogArticleResponse' }
            }
          }
        }
      }
    },
    security: [
      { ApiKeyAuth: [] }
    ],
    paths: {
      '/tools/call': {
        post: {
          operationId: 'execute_mcp_tool',
          summary: 'Execute any Dawnexus MCP tool',
          description: 'Universal execution endpoint to run any visitor telemetry, website optimization, or SEO tool by name.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Name of the MCP tool to execute',
                      enum: MCP_TOOLS.map(t => t.name)
                    },
                    arguments: {
                      type: 'object',
                      description: 'Arguments for the tool'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Tool execution result' },
            '400': { description: 'Execution failed' },
            '404': { description: 'Tool not found' }
          }
        }
      },
      '/tools/categories': {
        get: {
          operationId: 'get_blog_categories',
          summary: 'Get configured blog categories',
          description: 'Returns the exact categories supported by the Dawnexus blog CMS.',
          responses: { '200': { description: 'Categories list' } }
        }
      },
      '/tools/articles': {
        get: {
          operationId: 'get_existing_articles',
          summary: 'Get existing articles and link targets',
          description: 'Returns published/draft articles and verified internal link targets.',
          responses: { '200': { description: 'Articles and link targets' } }
        }
      },
      '/tools/search-console': {
        get: {
          operationId: 'get_search_console_opportunities',
          summary: 'Get Search Console performance metrics',
          description: 'Returns queries, CTR, impressions, and ranking positions or diagnostic status.',
          responses: { '200': { description: 'GSC metrics or diagnostics' } }
        }
      },
      '/tools/weekly-context': {
        get: {
          operationId: 'get_weekly_content_context',
          summary: 'Get weekly content planning context',
          description: 'Aggregates categories, published articles, drafts, and link targets.',
          responses: { '200': { description: 'Weekly planning context' } }
        }
      },
      '/tools/drafts': {
        post: {
          operationId: 'create_blog_draft',
          summary: 'Create a new blog draft',
          description: 'Saves a new article as a Draft in Supabase and returns SEO audit report.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateBlogDraftRequest'
                }
              }
            }
          },
          responses: { '201': { description: 'Draft created' }, '400': { description: 'Validation failed' } }
        }
      },
      '/tools/drafts/{id}': {
        get: {
          operationId: 'get_blog_draft',
          summary: 'Get draft or article details by ID',
          description: 'Returns the full 360-degree blog record including all metadata, author info, and evidence fields.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': {
              description: 'Blog details',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BlogArticleResponse'
                  }
                }
              }
            },
            '404': { description: 'Blog not found' }
          }
        },
        patch: {
          operationId: 'update_blog_draft',
          summary: 'Update an existing draft',
          description: 'Revises an existing Draft with SEO and E-E-A-T evidence fields.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateBlogDraftRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Draft updated' } }
        }
      },
      '/tools/blogs': {
        get: {
          operationId: 'list_blog_posts',
          summary: 'List blog articles with status and category filtering or retrieve single article by id/slug',
          description: 'Returns articles, pagination metadata, and counts by status (all, published, draft, scheduled). If id or slug query parameter is provided, returns the complete 360-degree article record.',
          parameters: [
            { name: 'id', in: 'query', schema: { type: 'integer' }, description: 'Optional article ID to retrieve single complete article' },
            { name: 'slug', in: 'query', schema: { type: 'string' }, description: 'Optional article slug to retrieve single complete article' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['all', 'published', 'draft', 'scheduled'] } },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }
          ],
          responses: {
            '200': {
              description: 'List of blog articles and status counts, or single article if id/slug query passed',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BlogListResponse'
                  }
                }
              }
            }
          }
        }
      },
      '/tools/blogs/{id}': {
        get: {
          operationId: 'get_blog_post',
          summary: 'Get 360-degree blog article details',
          description: 'Returns full article content, SEO metadata, 15+ evidence fields, citation answer blocks, extracted links, and audit scores.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Article ID (e.g. 698) or slug' }],
          responses: {
            '200': {
              description: 'Complete article record',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/BlogArticleResponse'
                  }
                }
              }
            },
            '404': { description: 'Article not found' }
          }
        },
        patch: {
          operationId: 'update_blog_article',
          summary: 'Update blog article across any status',
          description: 'Safely updates Draft, Scheduled, or Published articles with status safeguards and dual scoring persistence.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateBlogArticleRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Article successfully updated' } }
        },
        put: {
          operationId: 'replace_blog_article',
          summary: 'Update or replace blog article',
          description: 'Alias for update_blog_article allowing full replacement of article content and evidence.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateBlogArticleRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Article successfully updated' } }
        }
      },
      '/tools/blogs/audit': {
        post: {
          operationId: 'audit_blog_article',
          summary: 'Comprehensive dual SEO & E-E-A-T audit',
          description: 'Audits Technical SEO (100-pt) and Information Gain / E-E-A-T depth for a blog article or payload.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuditBlogArticleRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Audit report' } }
        }
      },
      '/tools/blogs/information-gain': {
        get: {
          operationId: 'audit_information_gain',
          summary: 'Information Gain & AI Readiness Audit',
          description: 'Evaluates the 8 E-E-A-T criteria used by the Dawnexus admin editor.',
          parameters: [
            { name: 'id', in: 'query', schema: { type: 'integer' }, description: 'Article ID' },
            { name: 'slug', in: 'query', schema: { type: 'string' }, description: 'Article slug' }
          ],
          responses: { '200': { description: 'Information Gain audit report' } }
        },
        post: {
          operationId: 'audit_information_gain_post',
          summary: 'Information Gain & AI Readiness Audit via POST',
          description: 'Evaluates the 8 E-E-A-T criteria for an article ID or payload.',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    slug: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Information Gain audit report' } }
        }
      },
      '/tools/blogs/bulk-audit': {
        post: {
          operationId: 'bulk_audit_blogs',
          summary: 'Batch audit multiple blog articles',
          description: 'Audits all or filtered blog articles for evidence gaps, missing citation blocks, and SEO score.',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BulkAuditBlogsRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Batch audit summary and itemized issues' } }
        }
      },
      '/tools/blogs/bulk-improve': {
        post: {
          operationId: 'bulk_improve_blogs',
          summary: 'Batch improve articles with dry-run support',
          description: 'Applies updates across multiple blog articles with dry-run verification and concurrency checks.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/BulkImproveBlogsRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Batch improvement results' } }
        }
      },
      '/tools/upload-image': {
        post: {
          operationId: 'upload_blog_image',
          summary: 'Upload image to Supabase Storage',
          description: 'Uploads an image to the Supabase Storage blog-images bucket and returns the permanent CDN URL.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UploadImageRequest'
                }
              }
            }
          },
          responses: { '201': { description: 'Image uploaded' }, '400': { description: 'Invalid image payload' } }
        }
      },
      '/tools/attach-image': {
        post: {
          operationId: 'attach_blog_image',
          summary: 'Attach image to blog draft',
          description: 'Attaches permanent image URL or uploads image to Supabase Storage and updates draft featured image.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AttachImageRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Image attached' } }
        }
      },
      '/tools/verify-image/{id}': {
        get: {
          operationId: 'verify_blog_image',
          summary: 'Verify draft featured image exists and is accessible',
          description: 'Checks that the draft has a featured image and that the image URL is reachable over HTTP (200 OK).',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { '200': { description: 'Image is accessible' }, '422': { description: 'Image inaccessible' } }
        }
      },
      '/tools/image-metadata/{id}': {
        patch: {
          operationId: 'update_blog_image_metadata',
          summary: 'Update draft image alt text or caption',
          description: 'Updates alt text or caption on an existing draft without re-uploading the image.',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/UpdateImageMetadataRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Metadata updated' } }
        }
      },
      '/tools/analytics/funnel': {
        get: {
          operationId: 'analytics_get_conversion_funnel',
          summary: 'Get 7-step commercial conversion funnel',
          description: 'Retrieves visit-to-enquiry conversion stages, visitor drop-offs, and funnel conversion rates.',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Days to analyze' }
          ],
          responses: { '200': { description: 'Conversion funnel stages' } }
        }
      },
      '/tools/analytics/form-abandonment': {
        get: {
          operationId: 'analytics_get_form_abandonment',
          summary: 'Get form abandonment metrics',
          description: 'Returns form starts, completions, overall abandonment rate, and drop-offs by field or step.',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Days to analyze' }
          ],
          responses: { '200': { description: 'Form abandonment telemetry' } }
        }
      },
      '/tools/analytics/overview': {
        get: {
          operationId: 'analytics_get_overview',
          summary: 'Get visitor behaviour intelligence overview',
          description: 'High-level visitor metrics, total sessions, bounce rate, and human vs bot metrics.',
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 }, description: 'Days to analyze' }
          ],
          responses: { '200': { description: 'Overview telemetry' } }
        }
      },
      '/tools/website/pages': {
        get: {
          operationId: 'website_list_editable_pages',
          summary: 'List editable website service pages',
          description: 'Returns current editable service pages (website-design, seo-services, ai-video-creation, digital-marketing) and published versions.',
          responses: { '200': { description: 'List of editable pages' } }
        }
      },
      '/tools/website/content': {
        get: {
          operationId: 'website_get_page_content',
          summary: 'Get structured content for editable website page',
          description: 'Returns structured page content (hero, features, process, FAQ, meta) for the specified service slug.',
          parameters: [
            {
              name: 'slug',
              in: 'query',
              required: true,
              schema: { type: 'string', enum: ['website-design', 'seo-services', 'ai-video-creation', 'digital-marketing'] },
              description: 'Service page slug'
            }
          ],
          responses: { '200': { description: 'Structured page content' } }
        }
      },
      '/tools/website/proposals/draft': {
        post: {
          operationId: 'website_create_optimization_draft',
          summary: 'Create AI website content optimization draft',
          description: 'Saves an evidence-backed optimization proposal as a draft requiring human admin review and approval.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['slug', 'proposedChanges'],
                  properties: {
                    slug: { type: 'string', enum: ['website-design', 'seo-services', 'ai-video-creation', 'digital-marketing'] },
                    proposedChanges: { type: 'object', description: 'Updated sections (e.g. hero, faq, features)' },
                    rationale: { type: 'string', description: 'Explanation backed by visitor telemetry' },
                    evidenceAnalytics: { type: 'object', description: 'Telemetry metrics supporting this change' }
                  }
                }
              }
            }
          },
          responses: { '201': { description: 'Optimization draft proposal created' } }
        }
      },
      '/tools/schedule': {
        post: {
          operationId: 'schedule_blog_draft',
          summary: 'Schedule approved draft for publication',
          description: 'Schedules an approved draft for publication in the Dawnexus publication calendar. Requires approved: true and SEO score >= 90.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ScheduleBlogDraftRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'Article scheduled' }, '400': { description: 'Validation failed' } }
        }
      },
      '/tools/seo-check': {
        post: {
          operationId: 'run_seo_quality_check',
          summary: 'Run 100-point SEO quality audit',
          description: 'Performs deterministic quality check on saved draft or proposed content.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SeoCheckRequest'
                }
              }
            }
          },
          responses: { '200': { description: 'SEO audit report' } }
        }
      },
      '/tools/gsc/status': {
        get: {
          operationId: 'gsc_get_connection_status',
          summary: 'Inspect Search Console connection status',
          description: 'Returns live connection status, Google email, selected property, and sync telemetry.',
          responses: { '200': { description: 'Connection status' } }
        }
      },
      '/tools/gsc/search-analytics': {
        post: {
          operationId: 'gsc_get_search_analytics',
          summary: 'Query Search Console search performance',
          description: 'Queries GSC search analytics for given dates and dimensions.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['startDate', 'endDate'],
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' },
                    dimensions: { type: 'array', items: { type: 'string' } },
                    rowLimit: { type: 'integer' },
                    property: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: { '200': { description: 'Search analytics rows' } }
        }
      },
      '/tools/gsc/top-queries': {
        get: {
          operationId: 'gsc_get_top_queries',
          summary: 'Get top search queries with period comparison',
          description: 'Returns top queries with period-over-period delta comparison and search intent.',
          parameters: [
            { name: 'dateRange', in: 'query', schema: { type: 'string', enum: ['7d', '28d', '3m'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } }
          ],
          responses: { '200': { description: 'Top queries with comparisons' } }
        }
      },
      '/tools/gsc/top-pages': {
        get: {
          operationId: 'gsc_get_top_pages',
          summary: 'Get top landing pages',
          description: 'Returns top landing pages with impressions, clicks, CTR, and average position.',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer' } }
          ],
          responses: { '200': { description: 'Top landing pages' } }
        }
      },
      '/tools/ga4/status': {
        get: {
          operationId: 'ga4_get_connection_status',
          summary: 'Inspect GA4 connection status',
          description: 'Returns live connection status, authorized Google email, selected GA4 property, and sync telemetry.',
          responses: { '200': { description: 'Connection status' } }
        }
      },
      '/tools/ga4/overview': {
        get: {
          operationId: 'ga4_get_overview',
          summary: 'Get GA4 overview traffic metrics',
          description: 'Returns headline metrics with period comparison and daily timeline.',
          parameters: [
            { name: 'dateRange', in: 'query', schema: { type: 'string', enum: ['7d', '28d', '90d', 'custom'] } },
            { name: 'startDate', in: 'query', schema: { type: 'string' } },
            { name: 'endDate', in: 'query', schema: { type: 'string' } }
          ],
          responses: { '200': { description: 'Overview metrics' } }
        }
      },
      '/tools/ga4/landing-pages': {
        get: {
          operationId: 'ga4_get_landing_pages',
          summary: 'Get landing pages performance',
          description: 'Returns sessions, users, engagement rate, views, and conversions for landing pages.',
          parameters: [
            { name: 'dateRange', in: 'query', schema: { type: 'string', enum: ['7d', '28d', '90d', 'custom'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer' } }
          ],
          responses: { '200': { description: 'Landing pages' } }
        }
      },
      '/tools/ga4/realtime': {
        get: {
          operationId: 'ga4_get_realtime',
          summary: 'Get realtime active users',
          description: 'Returns active users in the last 30 minutes and active screen names.',
          responses: { '200': { description: 'Realtime report' } }
        }
      }
    }
  };

  res.json(spec);
});

// 2b. Standard OAuth 2.0 Endpoints for Google Gemini / Vertex AI / Extensions
mcpRouter.use('/oauth', mcpOAuthRouter);
mcpRouter.use(mcpOAuthRouter);

// Apply authentication middleware to all MCP operations below
mcpRouter.use(mcpAuthMiddleware);

// 3. SSE Transport for MCP Clients (ChatGPT Developer Mode / Desktop)
mcpRouter.get('/sse', async (req: Request, res: Response) => {
  console.log('[MCP Server] Incoming SSE client connection.');

  const transport = new SSEServerTransport('/api/mcp/messages', res);
  const server = createDawnexusMcpServer();

  const sessionId = transport.sessionId;
  activeTransports.set(sessionId, transport);

  req.on('close', () => {
    console.log(`[MCP Server] SSE client disconnected: ${sessionId}`);
    activeTransports.delete(sessionId);
  });

  await server.connect(transport);
});

// 4. Messages endpoint for SSE sessions
mcpRouter.post('/messages', async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId query parameter.' });
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    return res.status(404).json({ error: 'Active SSE transport session not found or expired.' });
  }

  await transport.handlePostMessage(req, res);
});

// 5. Direct Stateless JSON-RPC POST Endpoint (/api/mcp/rpc)
mcpRouter.post('/rpc', async (req: Request, res: Response) => {
  const { jsonrpc, id, method, params } = req.body;
  if (jsonrpc !== '2.0') {
    return res.status(400).json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: jsonrpc version must be 2.0' } });
  }

  const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rpc-client';

  try {
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'dawnexus-mcp-server',
            version: '8.3.0'
          }
        }
      });
    }

    if (method === 'notifications/initialized') {
      return res.status(204).end();
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { tools: MCP_TOOLS }
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const resultData = await executeMcpTool(toolName, toolArgs, callerIp);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(resultData, null, 2)
              }
            ]
          }
        });
      } catch (err: any) {
        const isNotFound = err?.message?.includes('not recognized');
        return res.status(isNotFound ? 404 : 400).json({
          jsonrpc: '2.0',
          id,
          error: { code: isNotFound ? -32601 : -32602, message: err?.message || `Execution of tool '${toolName}' failed.` }
        });
      }
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method '${method}' not found.` }
    });
  } catch (err: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err?.message || 'Server error during RPC handling.' }
    });
  }
});

// 5b. Direct tool execution endpoint for ChatGPT Custom GPT Actions
mcpRouter.post('/tools/call', async (req: Request, res: Response) => {
  const toolName = req.body?.name || req.body?.tool;
  const toolArgs = req.body?.arguments || req.body?.args || {};
  const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest-direct';

  if (!toolName) {
    return res.status(400).json({ error: 'Missing tool name in request body.' });
  }

  try {
    const resultData = await executeMcpTool(toolName, toolArgs, callerIp);
    return res.json(resultData);
  } catch (err: any) {
    const isNotFound = err?.message?.includes('not recognized');
    return res.status(isNotFound ? 404 : 400).json({ error: err?.message || 'Failed to execute tool' });
  }
});

// 6. REST Bridge Endpoints for ChatGPT Custom Actions & Direct Webhooks

mcpRouter.get('/tools/categories', (req: Request, res: Response) => {
  const result = McpService.getBlogCategories();
  res.json(result);
});

mcpRouter.get('/tools/articles', async (req: Request, res: Response) => {
  const result = await McpService.getExistingArticles();
  res.json(result);
});

mcpRouter.get('/tools/search-console', async (req: Request, res: Response) => {
  const result = await McpService.getSearchConsoleOpportunities();
  res.json(result);
});

mcpRouter.get('/tools/weekly-context', async (req: Request, res: Response) => {
  const result = await McpService.getWeeklyContentContext();
  res.json(result);
});

mcpRouter.post('/tools/drafts', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.createBlogDraft(req.body, callerIp);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to create draft' });
  }
});

mcpRouter.get('/tools/drafts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const result = await McpService.getBlogPost({ id });
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err?.message || 'Draft not found' });
  }
});

mcpRouter.patch('/tools/drafts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.updateBlogDraft(id, req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update draft' });
  }
});

mcpRouter.get('/tools/blogs', async (req: Request, res: Response) => {
  try {
    if (req.query.id || req.query.slug) {
      const rawId = req.query.id !== undefined ? String(req.query.id).trim() : '';
      const rawSlug = req.query.slug !== undefined ? String(req.query.slug).trim() : '';
      const numId = parseInt(rawId, 10);
      const result = await McpService.getBlogPost(
        !isNaN(numId) && String(numId) === rawId ? { id: numId } : { slug: rawSlug || rawId }
      );
      return res.json(result);
    }
    const result = await McpService.listBlogPosts(req.query);
    res.json(result);
  } catch (err: any) {
    const isNotFound = err?.message?.includes('not found');
    res.status(isNotFound ? 404 : 400).json({ error: err?.message || 'Failed to retrieve blogs' });
  }
});

mcpRouter.get('/tools/blogs/:id', async (req: Request, res: Response) => {
  try {
    const rawId = String(req.params.id);
    const numId = parseInt(rawId, 10);
    const result = await McpService.getBlogPost(!isNaN(numId) && String(numId) === rawId ? { id: numId } : { slug: rawId });
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err?.message || 'Article not found' });
  }
});

mcpRouter.patch('/tools/blogs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!id || isNaN(id)) throw new Error('A valid numeric article ID is required.');
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.updateBlogArticle({ id, ...req.body }, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update article' });
  }
});

mcpRouter.put('/tools/blogs/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!id || isNaN(id)) throw new Error('A valid numeric article ID is required.');
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.updateBlogArticle({ id, ...req.body }, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update article' });
  }
});

mcpRouter.post('/tools/blogs/audit', async (req: Request, res: Response) => {
  try {
    const result = await McpService.auditBlogArticle(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to audit blog article' });
  }
});

mcpRouter.get('/tools/blogs/information-gain', async (req: Request, res: Response) => {
  try {
    const rawId = req.query.id ? Number(req.query.id) : undefined;
    const slug = req.query.slug ? String(req.query.slug) : undefined;
    const result = await McpService.auditInformationGain({ id: rawId, slug });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to audit Information Gain' });
  }
});

mcpRouter.post('/tools/blogs/information-gain', async (req: Request, res: Response) => {
  try {
    const result = await McpService.auditInformationGain(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to audit Information Gain' });
  }
});

mcpRouter.post('/tools/blogs/bulk-audit', async (req: Request, res: Response) => {
  try {
    const result = await McpService.bulkAuditBlogs(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to bulk audit blogs' });
  }
});

mcpRouter.post('/tools/blogs/bulk-improve', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.bulkImproveBlogs(req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to bulk improve blogs' });
  }
});

mcpRouter.post('/tools/upload-image', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.uploadBlogImage(req.body, callerIp);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to upload image' });
  }
});

mcpRouter.post('/tools/attach-image', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.attachBlogImage(req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to attach image' });
  }
});

mcpRouter.get('/tools/verify-image/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.verifyBlogImage(id, callerIp);
    if (!result.accessible) {
      return res.status(422).json(result);
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to verify image' });
  }
});

mcpRouter.patch('/tools/image-metadata/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.updateBlogImageMetadata({ id, ...req.body }, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update image metadata' });
  }
});

mcpRouter.post('/tools/schedule', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.scheduleBlogDraft(req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to schedule draft' });
  }
});

mcpRouter.post('/tools/seo-check', (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = McpService.runSeoQualityCheck(req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to run SEO check' });
  }
});

// Visitor Analytics Dedicated REST Endpoints
mcpRouter.get('/tools/analytics/funnel', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    const result = await McpService.analyticsGetConversionFunnel({ days });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get conversion funnel' });
  }
});

mcpRouter.get('/tools/analytics/form-abandonment', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    const result = await McpService.analyticsGetFormAbandonment({ days });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get form abandonment' });
  }
});

mcpRouter.get('/tools/analytics/overview', async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
    const result = await McpService.analyticsGetOverview({ days });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get analytics overview' });
  }
});

// Website Content Dedicated REST Endpoints
mcpRouter.get('/tools/website/pages', async (req: Request, res: Response) => {
  try {
    const result = await McpService.websiteListEditablePages();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to list editable pages' });
  }
});

mcpRouter.get('/tools/website/content', async (req: Request, res: Response) => {
  try {
    const slug = String(req.query.slug || 'website-design');
    const result = await McpService.websiteGetPageContent({ slug });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get page content' });
  }
});

mcpRouter.post('/tools/website/proposals/draft', async (req: Request, res: Response) => {
  try {
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.websiteCreateOptimizationDraft({ ...req.body, createdBy: `mcp-${callerIp}` });
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to create optimization draft' });
  }
});

// GSC Specific REST Bridge endpoints
mcpRouter.get('/tools/gsc/status', async (req: Request, res: Response) => {
  try {
    const result = await McpService.gscGetConnectionStatus();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get GSC status' });
  }
});

mcpRouter.get('/tools/gsc/properties', async (req: Request, res: Response) => {
  try {
    const result = await McpService.gscListProperties();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list properties' });
  }
});

mcpRouter.post('/tools/gsc/search-analytics', async (req: Request, res: Response) => {
  try {
    const result = await McpService.gscGetSearchAnalytics(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to query analytics' });
  }
});

mcpRouter.get('/tools/gsc/top-queries', async (req: Request, res: Response) => {
  try {
    const dateRange = (req.query.dateRange as '7d' | '28d' | '3m') || '28d';
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const result = await McpService.gscGetTopQueries({ dateRange, limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get top queries' });
  }
});

mcpRouter.get('/tools/gsc/top-pages', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const result = await McpService.gscGetTopPages({ limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get top pages' });
  }
});

mcpRouter.get('/tools/gsc/research-status', async (req: Request, res: Response) => {
  try {
    const result = await McpService.gscGetResearchStatus();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get research status' });
  }
});

mcpRouter.post('/tools/gsc/sync', async (req: Request, res: Response) => {
  try {
    const { dateRange = '28d' } = req.body || {};
    const result = await McpService.gscRunResearchSync({ dateRange, triggeredBy: 'mcp-rest' });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to run sync job' });
  }
});

mcpRouter.get('/tools/gsc/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const result = await McpService.gscGetResearchJob({ jobId: String(req.params.jobId) });
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err?.message || 'Job not found' });
  }
});

// GA4 REST Bridge Endpoints
mcpRouter.get('/tools/ga4/status', async (req: Request, res: Response) => {
  try {
    const result = await McpService.ga4GetConnectionStatus();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get GA4 status' });
  }
});

mcpRouter.get('/tools/ga4/properties', async (req: Request, res: Response) => {
  try {
    const result = await McpService.ga4ListProperties();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to list GA4 properties' });
  }
});

mcpRouter.get('/tools/ga4/overview', async (req: Request, res: Response) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const forceRefresh = req.query.forceRefresh === 'true';
    const result = await McpService.ga4GetOverview({ dateRange, startDate, endDate, forceRefresh });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get GA4 overview' });
  }
});

mcpRouter.get('/tools/ga4/traffic-acquisition', async (req: Request, res: Response) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const result = await McpService.ga4GetTrafficAcquisition({ dateRange, startDate, endDate, limit });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get traffic acquisition' });
  }
});

mcpRouter.get('/tools/ga4/landing-pages', async (req: Request, res: Response) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const result = await McpService.ga4GetLandingPages({ dateRange, startDate, endDate, limit });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get landing pages' });
  }
});

mcpRouter.get('/tools/ga4/page-performance', async (req: Request, res: Response) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const startDate = req.query.startDate ? String(req.query.startDate) : undefined;
    const endDate = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
    const result = await McpService.ga4GetPagePerformance({ dateRange, startDate, endDate, limit });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get page performance' });
  }
});

mcpRouter.get('/tools/ga4/realtime', async (req: Request, res: Response) => {
  try {
    const result = await McpService.ga4GetRealtime();
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to get realtime data' });
  }
});

mcpRouter.post('/tools/ga4/report', async (req: Request, res: Response) => {
  try {
    const result = await McpService.ga4GetReport(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to execute custom report' });
  }
});

mcpRouter.get('/tools/ga4/analytics-status', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;
    const result = await McpService.ga4GetAnalyticsStatus({ limit });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to get analytics status' });
  }
});

// 7. MCP Audit Log Trail
mcpRouter.get('/audit', (req: Request, res: Response) => {
  res.json({
    total: getMcpAuditTrail().length,
    trail: getMcpAuditTrail()
  });
});
