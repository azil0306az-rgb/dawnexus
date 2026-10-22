import crypto from 'node:crypto';
import {
  getSeoConnection,
  saveSeoConnection,
  updateSeoConnectionTelemetry,
  updateSeoSelectedProperty,
  clearSeoConnection,
  createSeoResearchJob,
  updateSeoResearchJob,
  getSeoResearchJobById,
  getLatestSeoResearchJobs,
  saveGscSearchAnalyticsCache,
  getGscSearchAnalyticsCache,
  getBlogs
} from './db.js';

// Encryption configuration (AES-256-GCM)
const ENCRYPTION_ALGO = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const secret = process.env.SEO_RESEARCH_ENCRYPTION_KEY || process.env.ADMIN_PASSWORD_HASH || 'dawnexus-seo-secret-key-salt-32chars!!';
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptPayload(text: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGO, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptPayload(cipherString: string): string | null {
  try {
    const parts = cipherString.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[GscService] Decryption failed:', err);
    return null;
  }
}

export interface GscTokenData {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  expires_in?: number;
}

export interface GscSearchRow {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscTimelinePoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryComparisonRow {
  query: string;
  clicks: number;
  previousClicks: number;
  clicksChange: number;
  impressions: number;
  previousImpressions: number;
  impressionsChange: number;
  ctr: number;
  previousCtr: number;
  position: number;
  previousPosition: number;
  positionChange: number;
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
}

export class GscService {
  private static isSyncRunning = false;

  /**
   * Safe access token retrieval with Google OAuth token refresh
   */
  public static async getValidAccessToken(): Promise<{
    accessToken: string | null;
    googleEmail: string | null;
    selectedProperty: string;
    error?: string;
  }> {
    const conn = getSeoConnection();
    const selectedProperty = conn?.selected_property || 'https://dawnexus.in/';

    if (!conn || !conn.encrypted_tokens) {
      return {
        accessToken: null,
        googleEmail: null,
        selectedProperty,
        error: 'Google Search Console is not connected.'
      };
    }

    const decrypted = decryptPayload(conn.encrypted_tokens);
    if (!decrypted) {
      updateSeoConnectionTelemetry({
        connection_status: 'Error',
        last_error: 'Stored tokens could not be decrypted.'
      });
      return {
        accessToken: null,
        googleEmail: conn.google_email,
        selectedProperty,
        error: 'Stored OAuth token could not be decrypted.'
      };
    }

    let tokens: GscTokenData;
    try {
      tokens = JSON.parse(decrypted);
    } catch {
      return {
        accessToken: null,
        googleEmail: conn.google_email,
        selectedProperty,
        error: 'Corrupted token data.'
      };
    }

    // Lightweight verification of existing access token
    try {
      const testRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (testRes.ok) {
        return {
          accessToken: tokens.access_token,
          googleEmail: conn.google_email,
          selectedProperty
        };
      }
    } catch {
      // Continue to refresh
    }

    // Token expired or invalid; perform token refresh if refresh_token exists
    if (tokens.refresh_token && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      try {
        const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token'
          })
        });

        if (refreshRes.ok) {
          const refreshed = await refreshRes.json();
          const updatedTokens: GscTokenData = {
            ...tokens,
            access_token: refreshed.access_token,
            expires_in: refreshed.expires_in
          };
          saveSeoConnection(
            conn.google_email || 'Authorized Google Account',
            encryptPayload(JSON.stringify(updatedTokens)),
            conn.selected_property || undefined,
            { connection_status: 'Connected', last_error: null }
          );
          return {
            accessToken: refreshed.access_token,
            googleEmail: conn.google_email,
            selectedProperty
          };
        } else {
          const errBody = await refreshRes.text();
          console.error('[GscService] Token refresh failed response:', errBody);
          updateSeoConnectionTelemetry({
            connection_status: 'Expired',
            last_error: 'Token refresh failed. Google session expired.'
          });
          return {
            accessToken: null,
            googleEmail: conn.google_email,
            selectedProperty,
            error: 'Google session expired. Please reconnect your Google account.'
          };
        }
      } catch (err: any) {
        console.error('[GscService] Token refresh exception:', err);
        return {
          accessToken: null,
          googleEmail: conn.google_email,
          selectedProperty,
          error: err?.message || 'Token refresh error'
        };
      }
    }

    return {
      accessToken: tokens.access_token || null,
      googleEmail: conn.google_email,
      selectedProperty,
      error: 'Access token expired and no refresh token available.'
    };
  }

  /**
   * Get overall connection status for Admin & MCP
   */
  public static async getConnectionStatus(): Promise<{
    isConnected: boolean;
    connectionStatus: string;
    googleEmail: string | null;
    selectedProperty: string;
    hasCredentials: boolean;
    lastSyncAt: string | null;
    lastAttemptAt: string | null;
    lastError: string | null;
  }> {
    const hasCredentials = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const conn = getSeoConnection();

    if (!conn || !conn.encrypted_tokens) {
      return {
        isConnected: false,
        connectionStatus: 'Disconnected',
        googleEmail: null,
        selectedProperty: 'https://dawnexus.in/',
        hasCredentials,
        lastSyncAt: conn?.last_sync_at || null,
        lastAttemptAt: conn?.last_attempt_at || null,
        lastError: conn?.last_error || null
      };
    }

    const { accessToken, error } = await this.getValidAccessToken();
    const isConnected = Boolean(accessToken);

    return {
      isConnected,
      connectionStatus: isConnected ? 'Connected' : (conn.connection_status || 'Disconnected'),
      googleEmail: conn.google_email,
      selectedProperty: conn.selected_property || 'https://dawnexus.in/',
      hasCredentials,
      lastSyncAt: conn.last_sync_at || null,
      lastAttemptAt: conn.last_attempt_at || null,
      lastError: error || conn.last_error || null
    };
  }

  /**
   * List accessible GSC properties for the authorized account
   */
  public static async listProperties(): Promise<{
    properties: Array<{ siteUrl: string; permissionLevel: string }>;
    selectedProperty: string;
    isConnected: boolean;
    error?: string;
  }> {
    const { accessToken, selectedProperty, error } = await this.getValidAccessToken();
    if (!accessToken) {
      return {
        properties: [],
        selectedProperty,
        isConnected: false,
        error: error || 'Google Search Console is not connected.'
      };
    }

    try {
      const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) {
        const errText = await res.text();
        return {
          properties: [],
          selectedProperty,
          isConnected: true,
          error: `Google API returned ${res.status}: ${errText.slice(0, 200)}`
        };
      }
      const data = await res.json();
      return {
        properties: data.siteEntry || [],
        selectedProperty,
        isConnected: true
      };
    } catch (err: any) {
      return {
        properties: [],
        selectedProperty,
        isConnected: false,
        error: err?.message || 'Failed to list properties'
      };
    }
  }

  /**
   * Core query executor against Search Console API v3
   */
  public static async executeSearchAnalyticsQuery(params: {
    property?: string;
    startDate: string;
    endDate: string;
    dimensions: string[];
    rowLimit?: number;
    startRow?: number;
  }): Promise<{ rows: GscSearchRow[]; apiRequestsCount: number; error?: string }> {
    const { accessToken, selectedProperty, error } = await this.getValidAccessToken();
    if (!accessToken) {
      return { rows: [], apiRequestsCount: 0, error: error || 'Not authenticated' };
    }

    const targetProp = params.property || selectedProperty;
    const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(targetProp)}/searchAnalytics/query`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: params.startDate,
          endDate: params.endDate,
          dimensions: params.dimensions,
          rowLimit: params.rowLimit || 100,
          startRow: params.startRow || 0
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        let message = `Google Search Console returned ${res.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) message = parsed.error.message;
        } catch {}
        try {
          updateSeoConnectionTelemetry({
            last_attempt_at: new Date().toISOString(),
            last_error: message,
            connection_status: 'Error'
          });
        } catch {}
        return { rows: [], apiRequestsCount: 1, error: message };
      }

      const data = await res.json();
      try {
        updateSeoConnectionTelemetry({
          last_sync_at: new Date().toISOString(),
          last_attempt_at: new Date().toISOString(),
          last_error: null,
          connection_status: 'Connected'
        });
      } catch {}
      return {
        rows: data.rows || [],
        apiRequestsCount: 1
      };
    } catch (err: any) {
      try {
        updateSeoConnectionTelemetry({
          last_attempt_at: new Date().toISOString(),
          last_error: err?.message || 'Network error',
          connection_status: 'Error'
        });
      } catch {}
      return { rows: [], apiRequestsCount: 1, error: err?.message || 'Network error' };
    }
  }

  /**
   * Retrieve timeline data (dimensions: ['date'])
   */
  public static async getTimelineMetrics(dateRange: '7d' | '28d' | '3m' = '28d'): Promise<{
    timeline: GscTimelinePoint[];
    currentTotals: { clicks: number; impressions: number; avgCtr: number; avgPosition: number };
    previousTotals: { clicks: number; impressions: number; avgCtr: number; avgPosition: number };
    error?: string;
  }> {
    const days = dateRange === '7d' ? 7 : dateRange === '3m' ? 90 : 28;
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago (GSC data delay)
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const prevEnd = new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const currentRes = await this.executeSearchAnalyticsQuery({
      startDate: formatDate(start),
      endDate: formatDate(end),
      dimensions: ['date'],
      rowLimit: 100
    });

    if (currentRes.error) {
      return {
        timeline: [],
        currentTotals: { clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 },
        previousTotals: { clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 },
        error: currentRes.error
      };
    }

    const prevRes = await this.executeSearchAnalyticsQuery({
      startDate: formatDate(prevStart),
      endDate: formatDate(prevEnd),
      dimensions: ['date'],
      rowLimit: 100
    });

    const timeline: GscTimelinePoint[] = (currentRes.rows || []).map(r => ({
      date: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Math.round((r.ctr || 0) * 10000) / 10000,
      position: Math.round((r.position || 0) * 10) / 10
    })).sort((a, b) => a.date.localeCompare(b.date));

    const curClicks = timeline.reduce((s, p) => s + p.clicks, 0);
    const curImp = timeline.reduce((s, p) => s + p.impressions, 0);
    const curCtr = curImp > 0 ? curClicks / curImp : 0;
    const curPos = timeline.length > 0 ? timeline.reduce((s, p) => s + p.position, 0) / timeline.length : 0;

    const prevRows = prevRes.rows || [];
    const prevClicks = prevRows.reduce((s, p) => s + p.clicks, 0);
    const prevImp = prevRows.reduce((s, p) => s + p.impressions, 0);
    const prevCtr = prevImp > 0 ? prevClicks / prevImp : 0;
    const prevPos = prevRows.length > 0 ? prevRows.reduce((s, p) => s + p.position, 0) / prevRows.length : 0;

    return {
      timeline,
      currentTotals: {
        clicks: curClicks,
        impressions: curImp,
        avgCtr: Math.round(curCtr * 10000) / 100,
        avgPosition: Math.round(curPos * 10) / 10
      },
      previousTotals: {
        clicks: prevClicks,
        impressions: prevImp,
        avgCtr: Math.round(prevCtr * 10000) / 100,
        avgPosition: Math.round(prevPos * 10) / 10
      }
    };
  }

  /**
   * Retrieve top pages (dimensions: ['page'])
   */
  public static async getTopPages(limit = 25): Promise<{ pages: GscPageRow[]; error?: string }> {
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 28 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const res = await this.executeSearchAnalyticsQuery({
      startDate: formatDate(start),
      endDate: formatDate(end),
      dimensions: ['page'],
      rowLimit: limit
    });

    if (res.error) {
      return { pages: [], error: res.error };
    }

    const pages: GscPageRow[] = res.rows.map(r => ({
      page: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Math.round((r.ctr || 0) * 10000) / 10000,
      position: Math.round((r.position || 0) * 10) / 10
    }));

    return { pages };
  }

  /**
   * Full search query comparison (current vs previous period)
   */
  public static async getQueryComparison(dateRange: '7d' | '28d' | '3m' = '28d', limit = 100): Promise<{
    queries: GscQueryComparisonRow[];
    error?: string;
  }> {
    const days = dateRange === '7d' ? 7 : dateRange === '3m' ? 90 : 28;
    const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    const prevEnd = new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000);
    const prevStart = new Date(prevEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Current period
    const curRes = await this.executeSearchAnalyticsQuery({
      startDate: formatDate(start),
      endDate: formatDate(end),
      dimensions: ['query'],
      rowLimit: limit
    });

    if (curRes.error) {
      return { queries: [], error: curRes.error };
    }

    // Previous period
    const prevRes = await this.executeSearchAnalyticsQuery({
      startDate: formatDate(prevStart),
      endDate: formatDate(prevEnd),
      dimensions: ['query'],
      rowLimit: limit
    });

    const prevMap = new Map<string, GscSearchRow>();
    for (const r of prevRes.rows || []) {
      const q = r.keys?.[0] || '';
      if (q) prevMap.set(q.toLowerCase(), r);
    }

    const queries: GscQueryComparisonRow[] = (curRes.rows || []).map(r => {
      const q = r.keys?.[0] || '';
      const prev = prevMap.get(q.toLowerCase());
      const clicks = r.clicks || 0;
      const prevClicks = prev?.clicks || 0;
      const imp = r.impressions || 0;
      const prevImp = prev?.impressions || 0;
      const pos = Math.round((r.position || 0) * 10) / 10;
      const prevPos = prev ? Math.round((prev.position || 0) * 10) / 10 : pos;

      // Intent classification
      let intent: GscQueryComparisonRow['intent'] = 'Informational';
      const qLower = q.toLowerCase();
      if (/\b(buy|hire|price|pricing|cost|quote|agency|company|services|packages)\b/.test(qLower)) {
        intent = 'Commercial';
      } else if (/\b(download|order|book|checkout|apply|contact)\b/.test(qLower)) {
        intent = 'Transactional';
      } else if (/\b(dawnexus|login|portal|careers)\b/.test(qLower)) {
        intent = 'Navigational';
      }

      return {
        query: q,
        clicks,
        previousClicks: prevClicks,
        clicksChange: clicks - prevClicks,
        impressions: imp,
        previousImpressions: prevImp,
        impressionsChange: imp - prevImp,
        ctr: Math.round((r.ctr || 0) * 10000) / 10000,
        previousCtr: Math.round((prev?.ctr || 0) * 10000) / 10000,
        position: pos,
        previousPosition: prevPos,
        positionChange: Math.round((prevPos - pos) * 10) / 10, // Positive delta means rank improved
        intent
      };
    });

    return { queries };
  }

  /**
   * Run synchronization job with duplicate-protection lock
   */
  public static async runSyncJob(triggeredBy = 'admin', dateRange: '28d' | '3m' = '28d'): Promise<{
    job: any;
    queriesReturned: number;
    queriesSaved: number;
    apiRequestsCount: number;
    durationMs: number;
  }> {
    if (this.isSyncRunning) {
      throw new Error('A synchronization job is already actively executing. Please wait for it to complete.');
    }

    const startTime = Date.now();
    this.isSyncRunning = true;
    const jobId = `sync_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const conn = getSeoConnection();
    const property = conn?.selected_property || 'https://dawnexus.in/';

    // Record job in SQLite & Supabase
    const job = createSeoResearchJob({
      job_id: jobId,
      property,
      date_range: dateRange,
      dimensions: 'query,date',
      status: 'running',
      triggered_by: triggeredBy
    });

    updateSeoConnectionTelemetry({
      last_attempt_at: new Date().toISOString()
    });

    try {
      const days = dateRange === '3m' ? 90 : 28;
      const end = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      const formatDate = (d: Date) => d.toISOString().split('T')[0];

      let apiRequestsCount = 0;

      // 1. Fetch search queries for cache
      const queryRes = await this.executeSearchAnalyticsQuery({
        property,
        startDate: formatDate(start),
        endDate: formatDate(end),
        dimensions: ['query'],
        rowLimit: 250
      });
      apiRequestsCount += queryRes.apiRequestsCount;

      if (queryRes.error) {
        throw new Error(queryRes.error);
      }

      const rowsToCache = (queryRes.rows || []).map(r => ({
        property,
        query: r.keys?.[0] || '',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
        period_type: 'current' as const,
        start_date: formatDate(start),
        end_date: formatDate(end)
      }));

      const queriesSaved = saveGscSearchAnalyticsCache(rowsToCache);
      const durationMs = Date.now() - startTime;
      const nowIso = new Date().toISOString();

      const updatedJob = updateSeoResearchJob(jobId, {
        status: 'completed',
        queries_returned: queryRes.rows.length,
        queries_saved: queriesSaved,
        api_requests_count: apiRequestsCount,
        duration_ms: durationMs,
        completed_at: nowIso
      });

      updateSeoConnectionTelemetry({
        last_sync_at: nowIso,
        last_error: null,
        connection_status: 'Connected'
      });

      return {
        job: updatedJob,
        queriesReturned: queryRes.rows.length,
        queriesSaved,
        apiRequestsCount,
        durationMs
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errMsg = err?.message || 'Synchronization failed';

      updateSeoResearchJob(jobId, {
        status: 'failed',
        error_message: errMsg,
        duration_ms: durationMs,
        completed_at: new Date().toISOString()
      });

      updateSeoConnectionTelemetry({
        last_error: errMsg,
        connection_status: 'Error'
      });

      throw err;
    } finally {
      this.isSyncRunning = false;
    }
  }

  /**
   * Get recent research/sync jobs
   */
  public static getJobs(limit = 10) {
    return getLatestSeoResearchJobs(limit);
  }

  /**
   * Get job by ID
   */
  public static getJobById(jobId: string) {
    return getSeoResearchJobById(jobId);
  }
}

