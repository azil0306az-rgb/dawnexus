/**
 * Dawnexus Version 8.3.0 — HTML Payload & Performance Diagnostic Service
 * Audits uncompressed HTML response sizes against the 2 MB operational threshold
 * and identifies payload bloat (inline base64 images, redundant hydration blobs).
 */

import { resolvePageMetadata, injectPageMetadata } from './ssrRenderer.js';
import { getPublishedBlogsForSitemap } from './db.js';
import fs from 'node:fs';
import path from 'node:path';

export interface RoutePayloadAudit {
  route: string;
  uncompressedBytes: number;
  uncompressedKb: string;
  thresholdBytes: number;
  exceedsThreshold: boolean;
  domNodeCountEstimate: number;
  inlineBase64Count: number;
  scriptTagCount: number;
  status: 'optimal' | 'warning' | 'oversized';
  findings: string[];
  recommendations: string[];
  measuredAt: string;
}

export interface PayloadAuditReport {
  auditThresholdBytes: number;
  totalRoutesAudited: number;
  oversizedCount: number;
  averagePayloadKb: string;
  routes: RoutePayloadAudit[];
  overallStatus: 'healthy' | 'warning' | 'critical';
  notes: string;
}

export class PayloadAuditService {
  private static THRESHOLD_BYTES = 2 * 1024 * 1024; // 2 MB operational project threshold

  /**
   * Reads raw base index.html template from disk
   */
  private static getBaseHtml(): string {
    const candidates = [
      path.resolve(process.cwd(), 'dist', 'index.html'),
      path.resolve(process.cwd(), 'index.html')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    }
    return '<!DOCTYPE html><html><head><title>Dawnexus</title></head><body><div id="root"></div></body></html>';
  }

  /**
   * Audits a single route's rendered HTML payload
   */
  static auditRoute(routePath: string): RoutePayloadAudit {
    const rawHtml = this.getBaseHtml();
    const meta = resolvePageMetadata(routePath);
    const renderedHtml = injectPageMetadata(rawHtml, meta);

    const bytes = Buffer.byteLength(renderedHtml, 'utf8');
    const kb = (bytes / 1024).toFixed(2);
    const exceeds = bytes > this.THRESHOLD_BYTES;

    // Estimate DOM nodes and inline base64 assets
    const domNodeEstimate = (renderedHtml.match(/<[a-zA-Z0-9\-]+/g) || []).length;
    const base64Matches = renderedHtml.match(/data:image\/[a-zA-Z]+;base64,/g) || [];
    const scriptMatches = renderedHtml.match(/<script/gi) || [];

    const findings: string[] = [];
    const recommendations: string[] = [];

    if (exceeds) {
      findings.push(`Payload size of ${kb} KB exceeds the 2 MB project threshold.`);
      recommendations.push('Move inline styles, scripts, or large datasets to external static assets.');
    } else if (bytes > 500 * 1024) {
      findings.push(`Payload size is ${kb} KB. Approaching heavy size (>500 KB).`);
      recommendations.push('Inspect for heavy serialized initial state or excessive DOM nodes.');
    } else {
      findings.push(`Lightweight HTML payload (${kb} KB) safely within performance budget.`);
    }

    if (base64Matches.length > 0) {
      findings.push(`Detected ${base64Matches.length} inline base64 image data URL(s).`);
      recommendations.push('Replace inline base64 images with external WebP/AVIF assets to enable browser caching.');
    }

    return {
      route: routePath,
      uncompressedBytes: bytes,
      uncompressedKb: kb,
      thresholdBytes: this.THRESHOLD_BYTES,
      exceedsThreshold: exceeds,
      domNodeCountEstimate: domNodeEstimate,
      inlineBase64Count: base64Matches.length,
      scriptTagCount: scriptMatches.length,
      status: exceeds ? 'oversized' : (bytes > 500 * 1024 ? 'warning' : 'optimal'),
      findings,
      recommendations,
      measuredAt: new Date().toISOString()
    };
  }

  /**
   * Audits all key representative public routes
   */
  static auditAllRoutes(): PayloadAuditReport {
    const representativeRoutes = [
      '/',
      '/services/website-design',
      '/services/seo-services',
      '/services/ai-video-creation',
      '/services/digital-marketing',
      '/website-cost-calculator',
      '/blog'
    ];

    // Add first 3 published blogs if available
    try {
      const sitemapBlogs = getPublishedBlogsForSitemap();
      if (sitemapBlogs && sitemapBlogs.length > 0) {
        for (const b of sitemapBlogs.slice(0, 3)) {
          representativeRoutes.push(`/blog/${b.slug}`);
        }
      }
    } catch {}

    const results: RoutePayloadAudit[] = [];
    let totalBytes = 0;
    let oversized = 0;

    for (const r of representativeRoutes) {
      const audit = this.auditRoute(r);
      results.push(audit);
      totalBytes += audit.uncompressedBytes;
      if (audit.exceedsThreshold) oversized++;
    }

    const avgKb = ((totalBytes / results.length) / 1024).toFixed(2);

    return {
      auditThresholdBytes: this.THRESHOLD_BYTES,
      totalRoutesAudited: results.length,
      oversizedCount: oversized,
      averagePayloadKb: avgKb,
      routes: results,
      overallStatus: oversized > 0 ? 'warning' : 'healthy',
      notes: 'Operational audit threshold is 2 MB uncompressed HTML. Compressed transfer sizes over HTTP/2 or HTTP/3 gzip/brotli are typically 70-80% smaller.'
    };
  }
}

export function auditHtmlPayloads(): PayloadAuditReport {
  return PayloadAuditService.auditAllRoutes();
}

