import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase, cleanupExpiredSessions } from './db.js';
import { publicRouter } from './routes/api.js';
import { adminRouter } from './routes/admin.js';

// Initialize DB schema & tables
initDatabase();

// Clean up expired sessions every hour
setInterval(() => {
  cleanupExpiredSessions();
}, 60 * 60 * 1000);

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

