import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase, cleanupExpiredSessions, publishDueScheduledBlogsReliable, getPublishedBlogsForSitemap, refreshFromPersistentStore } from './db.js';
import { publicRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';
import { handleGoogleOAuthCallback } from './routes/seoResearch.js';
import { performDatabaseHealthCheck } from './dbHealth.js';
import { mcpRouter } from './mcpServer.js';

// Initialize DB schema & tables
initDatabase();

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

// Basic security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Vite inline script compatibility
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration (allow credentials for session cookie)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow localhost dev origins
      callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'authorization', 'x-mcp-api-key', 'x-api-key']
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

    let urlsXml = `  <url>
    <loc>https://dawnexus.in/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/services/website-design</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/services/seo-services</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/services/ai-video-creation</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/services/digital-marketing</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/website-cost-calculator</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://dawnexus.in/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const blog of publishedBlogs) {
      const lastModDate = (blog.updated_at || blog.published_at || today).split('T')[0];
      urlsXml += `\n  <url>
    <loc>https://dawnexus.in/blog/${escapeXml(blog.slug)}</loc>
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


// Google OAuth 2.0 callback endpoint (needs to be reachable by Google redirection without requiring pre-existing admin cookie)
app.get('/api/admin/seo-research/google/callback', handleGoogleOAuthCallback);

// API route mounts
app.use('/api/mcp', mcpRouter);
app.use('/api', publicRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'Dawnexus',
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

  // SPA fallback for /admin and any frontend routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal server error occurred.'
  });
});

// Start listening if not running in a serverless environment (like Vercel)
export let server: ReturnType<typeof app.listen> | undefined;

if (!process.env.VERCEL) {
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

