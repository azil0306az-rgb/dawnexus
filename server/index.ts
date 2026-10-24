import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase, cleanupExpiredSessions, publishDueScheduledBlogsReliable, getPublishedBlogsForSitemap, refreshFromPersistentStore, getBlogRedirect } from './db.js';
import { publicRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';
import { handleGoogleOAuthCallback } from './routes/seoResearch.js';
import { performDatabaseHealthCheck } from './dbHealth.js';
import { mcpRouter } from './mcpServer.js';
import { mcpStreamableRouter } from './mcpStreamable.js';
import { getOAuthServerMetadata, getOAuthProtectedResourceMetadata, mcpOAuthRouter } from './mcpOAuth.js';
import { resolvePageMetadata, injectPageMetadata } from './ssrRenderer.js';
import { ensurePostgresV830Schema } from './scripts/migrate_v830_postgres.js';

// Initialize DB schema & tables
initDatabase();
ensurePostgresV830Schema().catch((err: any) => {
  console.warn('[Postgres v8.3.0 Schema Notice]:', err?.message || err);
});

// Clean up expired sessions every hour
const sessionTimer = setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);
sessionTimer.unref();

// Check and publish scheduled blogs every 60 seconds (for node server runtime)
const blogTimer = setInterval(() => {
  publishDueScheduledBlogsReliable().catch((err: unknown) => {
    console.error('[Scheduled Blog Interval Error]:', err);
  });
}, 60 * 1000);
blogTimer.unref();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Trust proxy headers from Vercel / reverse proxy (enables accurate req.protocol & req.ip)
app.set('trust proxy', 1);

// Enforce single canonical host (https://www.dawnexus.in) and single-hop 301 redirects
app.use((req, res, next) => {
  const host = (req.get('x-forwarded-host') || req.get('host') || '').toLowerCase().split(':')[0];
  if (host === 'dawnexus.in') {
    return res.redirect(301, `https://www.dawnexus.in${req.originalUrl}`);
  }

  // Handle dynamic blog 301 redirects (e.g. /blog/local-seo-google-maps-playbook)
  if (req.path.startsWith('/blog/')) {
    const redirectRecord = getBlogRedirect(req.path);
    if (redirectRecord) {
      return res.redirect(redirectRecord.status_code || 301, redirectRecord.new_path);
    }
  }

  next();
});

// Basic security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite inline script compatibility
    crossOriginEmbedderPolicy: false,
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);

// Explicit permissions policy header
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Trusted CORS origins (enforces origin whitelist for credentialed browser fetches)
const ALLOWED_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/(www\.)?dawnexus\.in$/,
  /^https:\/\/dawnexus(-[a-z0-9-]+)?\.vercel\.app$/,
  /^http:\/\/localhost(:[0-9]+)?$/,
  /^http:\/\/127\.0.0\.1(:[0-9]+)?$/
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Server-to-server, curl, non-browser clients
  try {
    const url = new URL(origin);
    const host = `${url.protocol}//${url.host}`;
    return ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(host));
  } catch {
    return false;
  }
}

// CORS configuration (allow credentials for session cookie only for trusted origins)
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'authorization',
      'x-mcp-api-key',
      'x-api-key',
      'idempotency-key',
      'x-idempotency-key'
    ]
  })
);

// Parse incoming request payloads (10mb to accommodate image uploads & screenshot data)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Dynamic Sitemap Generation (includes homepage, all 4 services, blog hub, and all published articles)
const handleSitemapRequest = async (req: express.Request, res: express.Response) => {
  try {
    await refreshFromPersistentStore();
    // Lazily publish any due scheduled blogs
    try {
      await publishDueScheduledBlogsReliable();
    } catch {
      // Non-fatal
    }

    const today = new Date().toISOString().split('T')[0];
    const publishedBlogs = getPublishedBlogsForSitemap();

    const baseUrl = 'https://www.dawnexus.in';
    let urlsXml = `  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/services/website-design</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/services/seo-services</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/services/ai-video-creation</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/services/digital-marketing</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/website-cost-calculator</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const blog of publishedBlogs) {
      const lastModDate = (blog.updated_at || blog.published_at || today).split('T')[0];
      urlsXml += `\n  <url>
    <loc>${baseUrl}/blog/${escapeXml(blog.slug)}</loc>
    <lastmod>${lastModDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[Sitemap Generation Error]:', error);
    return res.status(500).send('Error generating sitemap');
  }
};

app.get('/sitemap.xml', handleSitemapRequest);
app.get('/api/sitemap.xml', handleSitemapRequest);

// Explicit robots.txt handler
app.get('/robots.txt', (req: express.Request, res: express.Response) => {
  const robotsPath = path.resolve('public', 'robots.txt');
  const distRobotsPath = path.resolve('dist', 'robots.txt');
  const target = fs.existsSync(robotsPath) ? robotsPath : distRobotsPath;
  if (fs.existsSync(target)) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(target);
  }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin/\n\nSitemap: https://www.dawnexus.in/sitemap.xml\n`);
});

// Explicit llms.txt and llms-full.txt handlers for AI crawlers
app.get(['/llms.txt', '/.well-known/llms.txt'], (req: express.Request, res: express.Response) => {
  const candidates = [
    path.resolve('public', 'llms.txt'),
    path.resolve('dist', 'llms.txt')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.sendFile(c);
    }
  }
  return res.status(404).send('# Not Found');
});

app.get(['/llms-full.txt', '/.well-known/llms-full.txt'], (req: express.Request, res: express.Response) => {
  const candidates = [
    path.resolve('public', 'llms-full.txt'),
    path.resolve('dist', 'llms-full.txt')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      return res.sendFile(c);
    }
  }
  return res.status(404).send('# Not Found');
});


// Google OAuth 2.0 callback endpoint (needs to be reachable by Google redirection without requiring pre-existing admin cookie)
app.get('/api/admin/seo-research/google/callback', handleGoogleOAuthCallback);

// RFC 8414 OAuth 2.0 Authorization Server Metadata Discovery
const handleOAuthDiscovery = (req: any, res: any) => {
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host') || 'www.dawnexus.in';
  res.json(getOAuthServerMetadata(`${protocol}://${host}`));
};
app.get('/.well-known/oauth-authorization-server', handleOAuthDiscovery);
app.get('/.well-known/openid-configuration', handleOAuthDiscovery);

// RFC 9728 OAuth 2.0 Protected Resource Metadata Discovery
app.get('/.well-known/oauth-protected-resource', (req: any, res: any) => {
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host') || 'www.dawnexus.in';
  res.json(getOAuthProtectedResourceMetadata(`${protocol}://${host}`));
});

// MCP Remote Server (Streamable HTTP for Claude) & API route mounts
app.use('/mcp', mcpStreamableRouter);
app.use('/oauth', mcpOAuthRouter);
app.use('/api/oauth', mcpOAuthRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'Dawnexus',
    version: '8.4.0',
    release: '8.4.0 — Dynamic Products & Showcases CMS',
    timestamp: new Date().toISOString()
  });
});

// Production: Serve static client build if dist directory exists
const distPath = path.resolve('dist');
if (fs.existsSync(distPath)) {
  console.log(`[Server] Serving production static files from ${distPath}`);
  app.use(express.static(distPath, {
    maxAge: '7d',
    setHeaders: (res, filePath) => {
      if (filePath.includes(path.sep + 'assets' + path.sep)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  }));
}

// In-memory cache for base HTML template
let cachedIndexHtml: string | null = null;
const getIndexHtml = (): string | null => {
  if (cachedIndexHtml) return cachedIndexHtml;
  const candidates = [
    path.join(distPath, 'index.html'),
    path.resolve(process.cwd(), 'dist', 'index.html'),
    path.resolve(process.cwd(), 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      cachedIndexHtml = fs.readFileSync(p, 'utf-8');
      return cachedIndexHtml;
    }
  }
  return null;
};

// Dynamic SSR meta & canonical injection for frontend routes and crawlers
export const handlePageHtmlRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (
    req.path.startsWith('/api') ||
    req.path === '/mcp' ||
    req.path.startsWith('/mcp/') ||
    req.path.startsWith('/.well-known') ||
    req.path.startsWith('/oauth') ||
    req.path === '/robots.txt' ||
    req.path === '/llms.txt' ||
    req.path === '/llms-full.txt' ||
    req.path === '/sitemap.xml'
  ) {
    return next();
  }

  // Ensure persistent store is hydrated from Supabase for blog post routes
  if (req.path.startsWith('/blog/')) {
    await refreshFromPersistentStore().catch(() => {});
  }

  const rawHtml = getIndexHtml();
  if (!rawHtml) {
    return res.status(200).send('<!DOCTYPE html><html><head><title>Dawnexus</title></head><body><div id="root"></div></body></html>');
  }

  const meta = resolvePageMetadata(req.path);
  const renderedHtml = injectPageMetadata(rawHtml, meta);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
  return res.status(meta.status || 200).send(renderedHtml);
};

// Mount HTML handler for all frontend routes
app.use(handlePageHtmlRequest);

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    return res.status(400).json({ error: 'Invalid JSON payload in request body.' });
  }
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal server error occurred.'
  });
});

// Start listening if not running in a serverless environment (like Vercel) or test suite
export let server: ReturnType<typeof app.listen> | undefined;

const isTestEnv = process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some(arg => arg.includes('test')) ||
  process.env.npm_lifecycle_event === 'test';

if (!process.env.VERCEL && !isTestEnv) {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  DAWNEXUS BACKEND RUNNING ON http://localhost:${PORT}`);
    console.log(`  Initial Dev Admin Password: ${process.env.ADMIN_PASSWORD || '9566'}`);
    console.log(`=======================================================`);
  });
}

// Perform initial database health check on startup and schedule every 4 hours
performDatabaseHealthCheck('startup').catch(err => {
  console.warn('[DB Health Startup Check Notice]:', err?.message || err);
});

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
const healthTimer = setInterval(() => {
  performDatabaseHealthCheck('scheduled').catch(err => {
    console.warn('[DB Health Scheduled Check Notice]:', err?.message || err);
  });
}, FOUR_HOURS_MS);
healthTimer.unref();

export default app;

