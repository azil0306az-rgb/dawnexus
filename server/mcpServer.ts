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
        canonical_url: { type: 'string', description: 'Canonical URL (defaults to https://dawnexus.in/blog/<slug>)' },
        featured_image: { type: 'string', description: 'Featured image URL or base64 data URL' },
        image_alt: { type: 'string', description: 'Descriptive alt text for featured image' }
      },
      required: ['title', 'category', 'content']
    }
  },
  {
    name: 'update_blog_draft',
    description: 'Update an existing blog draft. Editing published, scheduled, or archived articles through MCP is strictly prohibited.',
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
        seo_title: { type: 'string', description: 'Updated SEO title' },
        meta_description: { type: 'string', description: 'Updated meta description' },
        canonical_url: { type: 'string', description: 'Updated canonical URL' },
        featured_image: { type: 'string', description: 'Updated featured image URL' },
        image_alt: { type: 'string', description: 'Updated image alt text' }
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
  }
];

/**
 * Creates and initializes an MCP Server instance with tools
 */
export function createDawnexusMcpServer(): Server {
  const server = new Server(
    {
      name: 'dawnexus-ai-seo-studio',
      version: '1.0.0'
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
      let result: any;

      switch (name) {
        case 'get_blog_categories': {
          result = McpService.getBlogCategories();
          break;
        }

        case 'get_existing_articles': {
          result = await McpService.getExistingArticles();
          break;
        }

        case 'get_search_console_opportunities': {
          result = await McpService.getSearchConsoleOpportunities();
          break;
        }

        case 'get_weekly_content_context': {
          result = await McpService.getWeeklyContentContext();
          break;
        }

        case 'create_blog_draft': {
          result = await McpService.createBlogDraft(args as any, callerIp);
          break;
        }

        case 'update_blog_draft': {
          const { id, ...updates } = (args || {}) as any;
          if (!id) throw new Error('Article ID is required for update_blog_draft.');
          result = await McpService.updateBlogDraft(Number(id), updates, callerIp);
          break;
        }

        case 'upload_blog_image': {
          result = await McpService.uploadBlogImage(args as any, callerIp);
          break;
        }

        case 'attach_blog_image': {
          result = await McpService.attachBlogImage(args as any, callerIp);
          break;
        }

        case 'verify_blog_image': {
          const id = Number((args as any)?.id);
          if (!id) throw new Error('Article ID is required for verify_blog_image.');
          result = await McpService.verifyBlogImage(id, callerIp);
          break;
        }

        case 'update_blog_image_metadata': {
          result = await McpService.updateBlogImageMetadata(args as any, callerIp);
          break;
        }

        case 'schedule_blog_draft': {
          result = await McpService.scheduleBlogDraft(args as any, callerIp);
          break;
        }

        case 'run_seo_quality_check': {
          result = McpService.runSeoQualityCheck(args as any, callerIp);
          break;
        }

        default:
          throw new Error(`Tool '${name}' is not recognized or permitted.`);
      }

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
    service: 'Dawnexus AI SEO Studio MCP Server',
    version: '1.0.0',
    transport: ['SSE (/api/mcp/sse)', 'JSON-RPC POST (/api/mcp/rpc)', 'REST OpenAPI (/api/mcp/tools)'],
    policy: 'Draft first. Human approval required. No Generative AI API.',
    toolsCount: MCP_TOOLS.length,
    timestamp: new Date().toISOString()
  });
});

// 2. OpenAPI 3.1 Specification for ChatGPT Custom GPT Actions
mcpRouter.get('/openapi.json', (req: Request, res: Response) => {
  const host = req.get('host') || 'dawnexus.in';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}/api/mcp`;

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'Dawnexus AI SEO Studio API',
      version: '1.0.0',
      description: 'Custom MCP & Action interface for ChatGPT to research, plan, draft, and audit SEO blog posts for Dawnexus. All created content is strictly saved as Drafts in Supabase and requires human approval in the Admin panel.'
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-mcp-api-key',
          description: 'Provide your MCP_API_KEY in the x-mcp-api-key header'
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
            seo_title: { type: 'string', description: 'Updated SEO title' },
            meta_description: { type: 'string', description: 'Updated meta description' },
            canonical_url: { type: 'string', description: 'Updated canonical URL' },
            featured_image: { type: 'string', description: 'Updated featured image URL' },
            image_alt: { type: 'string', description: 'Updated image alt text' }
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
        }
      }
    },
    security: [
      { ApiKeyAuth: [] }
    ],
    paths: {
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
        patch: {
          operationId: 'update_blog_draft',
          summary: 'Update an existing draft',
          description: 'Revises an existing Draft. Rejects modifying published or scheduled articles.',
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
      }
    }
  };

  res.json(spec);
});

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
            name: 'dawnexus-ai-seo-studio',
            version: '1.0.0'
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

      let resultData: any;
      switch (toolName) {
        case 'get_blog_categories':
          resultData = McpService.getBlogCategories();
          break;
        case 'get_existing_articles':
          resultData = await McpService.getExistingArticles();
          break;
        case 'get_search_console_opportunities':
          resultData = await McpService.getSearchConsoleOpportunities();
          break;
        case 'get_weekly_content_context':
          resultData = await McpService.getWeeklyContentContext();
          break;
        case 'create_blog_draft':
          resultData = await McpService.createBlogDraft(toolArgs, callerIp);
          break;
        case 'update_blog_draft':
          resultData = await McpService.updateBlogDraft(Number(toolArgs.id), toolArgs, callerIp);
          break;
        case 'upload_blog_image':
          resultData = await McpService.uploadBlogImage(toolArgs, callerIp);
          break;
        case 'attach_blog_image':
          resultData = await McpService.attachBlogImage(toolArgs, callerIp);
          break;
        case 'verify_blog_image':
          resultData = await McpService.verifyBlogImage(Number(toolArgs.id), callerIp);
          break;
        case 'update_blog_image_metadata':
          resultData = await McpService.updateBlogImageMetadata(toolArgs, callerIp);
          break;
        case 'schedule_blog_draft':
          resultData = await McpService.scheduleBlogDraft(toolArgs, callerIp);
          break;
        case 'run_seo_quality_check':
          resultData = McpService.runSeoQualityCheck(toolArgs, callerIp);
          break;
        default:
          return res.status(404).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool '${toolName}' not found.` }
          });
      }

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

mcpRouter.patch('/tools/drafts/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const callerIp = req.ip || req.socket.remoteAddress || 'mcp-rest';
    const result = await McpService.updateBlogDraft(id, req.body, callerIp);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update draft' });
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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

// 7. MCP Audit Log Trail
mcpRouter.get('/audit', (req: Request, res: Response) => {
  res.json({
    total: getMcpAuditTrail().length,
    trail: getMcpAuditTrail()
  });
});
