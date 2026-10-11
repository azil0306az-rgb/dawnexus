import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase, cleanupExpiredSessions, publishDueScheduledBlogs, getPublishedBlogsForSitemap } from './db.js';
import { publicRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';

// Initialize DB schema & tables
initDatabase();

// Clean up expired sessions every hour
setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);

// Check and publish scheduled blogs every 60 seconds (for node server runtime)
setInterval(() => {
  try {
    publishDueScheduledBlogs();
  } catch (err) {
    console.error('[Scheduled Blog Interval Error]:', err);
  }
}, 60 * 1000);

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
    credentials: true
  })
);

// Parse incoming request payloads
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieParser());

// Dynamic Sitemap Generation (includes homepage, all 4 services, blog hub, and all published articles)
app.get('/sitemap.xml', (req, res) => {
  try {
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
    <loc>https://dawnexus.in/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    for (const blog of publishedBlogs) {
      const lastModDate = (blog.updated_at || blog.published_at || today).split('T')[0];
      urlsXml += `\n  <url>
    <loc>https://dawnexus.in/blog/${blog.slug}</loc>
    <lastmod>${lastModDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[Sitemap Generation Error]:', error);
    return res.status(500).send('Error generating sitemap');
  }
});

// API route mounts
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
  app.use(express.static(distPath));

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

export default app;

