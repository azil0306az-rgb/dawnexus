import fs from 'node:fs';
import path from 'node:path';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { validateSsrfSafeUrl } from './ssrfProtection.js';

export interface ScreenshotCaptureResult {
  success: boolean;
  screenshotUrl: string;
  sourceUrl: string;
  capturedAt: string;
  provider: string;
  dimensions?: { width: number; height: number };
}

/**
 * Validates image buffer magic bytes to ensure safe image format
 */
export function validateImageBuffer(buffer: Buffer): { mimeType: string; extension: string } {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'GIF8') {
    return { mimeType: 'image/gif', extension: 'gif' };
  }
  throw new Error('Unsupported or corrupted image format. Only PNG, JPEG, WebP, and GIF images are permitted.');
}

/**
 * Uploads a validated image buffer to persistent storage (Supabase Storage with local filesystem fallback)
 */
export async function persistScreenshotBuffer(
  buffer: Buffer,
  slug: string,
  extension: string,
  mimeType: string
): Promise<string> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim();

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40) || 'showcase';
  const safeFilename = `showcase-${cleanSlug}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${extension}`;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false }
      });

      // Try client-showcase bucket first, fallback to blog-images
      for (const bucket of ['client-showcase', 'blog-images']) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(safeFilename, buffer, {
            contentType: mimeType,
            upsert: true
          });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from(bucket)
            .getPublicUrl(safeFilename);

          if (pubData?.publicUrl) {
            return pubData.publicUrl;
          }
        }
      }
    } catch (storageErr: any) {
      console.warn('[Screenshot Storage Notice]: Remote Supabase upload error:', storageErr?.message);
    }
  }

  // Local filesystem fallback
  const showcasesDir = path.resolve(process.cwd(), 'public', 'showcases');
  if (!fs.existsSync(showcasesDir)) {
    fs.mkdirSync(showcasesDir, { recursive: true });
  }

  const localFilePath = path.join(showcasesDir, safeFilename);
  fs.writeFileSync(localFilePath, buffer);
  return `/showcases/${safeFilename}`;
}

/**
 * Executes a secure website screenshot capture workflow with SSRF protection,
 * browser-grade rendering, magic byte validation, and persistent CDN storage.
 */
export async function captureWebsiteScreenshot(
  targetUrl: string,
  slugHint: string = 'project'
): Promise<ScreenshotCaptureResult> {
  // 1. SSRF Validation
  const ssrfCheck = await validateSsrfSafeUrl(targetUrl);
  if (!ssrfCheck.safe || !ssrfCheck.normalizedUrl) {
    throw new Error(ssrfCheck.error || 'Destination URL failed security validation.');
  }

  const validUrl = ssrfCheck.normalizedUrl;
  let imageBuffer: Buffer | null = null;
  let providerUsed = '';

  // 2. Primary rendering provider: Microlink
  try {
    const microlinkEndpoint = `https://api.microlink.io?url=${encodeURIComponent(
      validUrl
    )}&screenshot=true&meta=false&viewport[width]=1440&viewport[height]=900&viewport[deviceScaleFactor]=1`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const mRes = await fetch(microlinkEndpoint, { signal: controller.signal });
    clearTimeout(timer);

    if (mRes.ok) {
      const data = await mRes.json();
      const directScreenshotUrl = data?.data?.screenshot?.url;
      if (directScreenshotUrl) {
        // Download image buffer directly from temporary render URL
        const imgDownloadRes = await fetch(directScreenshotUrl, { signal: AbortSignal.timeout(8000) });
        if (imgDownloadRes.ok) {
          const arrayBuf = await imgDownloadRes.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuf);
          providerUsed = 'microlink';
        }
      }
    }
  } catch (err: any) {
    console.warn('[ScreenshotService] Microlink provider failed or timed out:', err?.message);
  }

  // 3. Fallback rendering provider: WordPress mShots
  if (!imageBuffer) {
    try {
      const mshotsEndpoint = `https://s0.wp.com/mshots/v1/${encodeURIComponent(validUrl)}?w=1440&h=900`;
      const fallbackRes = await fetch(mshotsEndpoint, { signal: AbortSignal.timeout(10000) });
      if (fallbackRes.ok) {
        const arrayBuf = await fallbackRes.arrayBuffer();
        if (arrayBuf.byteLength > 1000) {
          imageBuffer = Buffer.from(arrayBuf);
          providerUsed = 'mshots';
        }
      }
    } catch (err: any) {
      console.warn('[ScreenshotService] Fallback provider failed:', err?.message);
    }
  }

  if (!imageBuffer || imageBuffer.length < 500) {
    throw new Error(
      'Unable to render automated website preview. The destination site may block headless scrapers or timed out. Please upload a screenshot manually.'
    );
  }

  if (imageBuffer.length > 5 * 1024 * 1024) {
    throw new Error('Captured screenshot exceeded 5MB size limit.');
  }

  // 4. Validate image format magic bytes
  const validated = validateImageBuffer(imageBuffer);

  // 5. Persist to media storage (Supabase or public/showcases)
  const permanentUrl = await persistScreenshotBuffer(
    imageBuffer,
    slugHint,
    validated.extension,
    validated.mimeType
  );

  return {
    success: true,
    screenshotUrl: permanentUrl,
    sourceUrl: validUrl,
    capturedAt: new Date().toISOString(),
    provider: providerUsed,
    dimensions: { width: 1440, height: 900 }
  };
}

