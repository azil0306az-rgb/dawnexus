import {
  getSeoConnection,
  saveSeoConnection,
  updateGa4SelectedProperty,
  persistGa4SelectedProperty,
  disconnectGa4Property,
  clearGa4ReportCache,
  updateGa4ConnectionTelemetry,
  createGa4Job,
  updateGa4Job,
  getGa4Jobs,
  getGa4JobStats,
  getGa4ReportCache,
  setGa4ReportCache,
  SeoConnectionRecord,
  Ga4AnalyticsJobRecord
} from './db.js';
import { GscService, decryptPayload } from './gscService.js';

export interface Ga4ConnectionStatus {
  featureEnabled: boolean;
  hasGoogleCredentials: boolean;
  hasGoogleAuth: boolean;
  isConnected: boolean;
  hasGa4Scope: boolean;
  connectionStatus: 'Connected' | 'Missing GA4 Scope' | 'Disconnected' | 'Error';
  googleEmail: string | null;
  selectedProperty: string | null;
  selectedPropertyName: string | null;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  redirectUri: string;
  diagnosticMessage?: string;
}

export interface Ga4PropertySummary {
  propertyId: string;
  displayName: string;
  accountName: string;
}

export interface Ga4OverviewTotals {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  sessions: number;
  engagedSessions: number;
  engagementRate: number; // 0 to 1
  avgEngagementDurationSeconds: number;
  screenPageViews: number;
  eventCount: number;
  conversions: number;
}

export interface Ga4OverviewTimelinePoint {
  date: string; // YYYY-MM-DD
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  engagementRate: number;
}

export interface Ga4OverviewResponse {
  propertyId: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  currentTotals: Ga4OverviewTotals;
  previousTotals: Ga4OverviewTotals;
  percentageChanges: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    sessions: number;
    engagedSessions: number;
    engagementRate: number;
    avgEngagementDurationSeconds: number;
    screenPageViews: number;
    eventCount: number;
    conversions: number;
  };
  timeline: Ga4OverviewTimelinePoint[];
}

export interface Ga4TrafficAcquisitionRow {
  channelGroup: string;
  source: string;
  medium: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  engagementRate: number;
  conversions: number;
}

export interface Ga4LandingPageRow {
  landingPage: string;
  sessions: number;
  users: number;
  engagementRate: number;
  views: number;
  conversions: number;
}

export interface Ga4PagePerformanceRow {
  pagePath: string;
  pageTitle: string;
  views: number;
  activeUsers: number;
  avgEngagementTimeSeconds: number;
  eventCount: number;
}

export interface Ga4DeviceRow {
  deviceCategory: string;
  users: number;
  sessions: number;
}

export interface Ga4CountryRow {
  country: string;
  users: number;
  sessions: number;
  views: number;
}

export interface Ga4RealtimeResponse {
  isRealtime: true;
  propertyId: string;
  activeUsersLast30Min: number;
  screens: Array<{ screenName: string; activeUsers: number }>;
}

// Supported Dimension and Metric Whitelists for Server-Side Validation
const SUPPORTED_DIMENSIONS = new Set([
  'date',
  'sessionDefaultChannelGroup',
  'sessionSource',
  'sessionMedium',
  'sessionSourceMedium',
  'landingPage',
  'landingPagePlusQueryString',
  'pagePath',
  'pageTitle',
  'unifiedScreenName',
  'deviceCategory',
  'country',
  'city',
  'eventName',
  'dayOfWeek',
  'hour'
]);

const SUPPORTED_METRICS = new Set([
  'totalUsers',
  'activeUsers',
  'newUsers',
  'sessions',
  'engagedSessions',
  'engagementRate',
  'averageSessionDuration',
  'userEngagementDuration',
  'screenPageViews',
  'eventCount',
  'conversions',
  'bounceRate',
  'eventsPerSession'
]);

export class Ga4Service {
  /**
   * Helper to compute ISO date strings (YYYY-MM-DD) for standard intervals.
   */
  public static calculateDateIntervals(dateRange: string, customStart?: string, customEnd?: string): {
    startDate: string;
    endDate: string;
    prevStartDate: string;
    prevEndDate: string;
  } {
    const now = new Date();
    // Default to yesterday to avoid incomplete current-day partial data
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    let start: Date;
    let daysCount = 28;

    if (dateRange === '7d') {
      daysCount = 7;
      start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
    } else if (dateRange === '90d' || dateRange === '3m') {
      daysCount = 90;
      start = new Date(end.getTime() - 89 * 24 * 60 * 60 * 1000);
    } else if (dateRange === 'custom' && customStart && customEnd) {
      start = new Date(customStart);
      const parsedEnd = new Date(customEnd);
      daysCount = Math.max(1, Math.round((parsedEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1);
      return {
        startDate: customStart,
        endDate: customEnd,
        prevStartDate: new Date(start.getTime() - daysCount * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        prevEndDate: new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    } else {
      // Default: 28d
      daysCount = 28;
      start = new Date(end.getTime() - 27 * 24 * 60 * 60 * 1000);
    }

    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    const prevEndDateObj = new Date(start.getTime() - 1 * 24 * 60 * 60 * 1000);
    const prevStartDateObj = new Date(prevEndDateObj.getTime() - (daysCount - 1) * 24 * 60 * 60 * 1000);

    return {
      startDate: startDateStr,
      endDate: endDateStr,
      prevStartDate: prevStartDateObj.toISOString().split('T')[0],
      prevEndDate: prevEndDateObj.toISOString().split('T')[0]
    };
  }

  /**
   * Safe access token retrieval and GA4 scope inspection.
   */
  public static async getValidGa4Token(): Promise<{
    accessToken: string | null;
    googleEmail: string | null;
    selectedProperty: string | null;
    selectedPropertyName: string | null;
    hasGa4Scope: boolean;
    error?: string;
  }> {
    const conn = getSeoConnection();
    const selectedProperty = conn?.selected_ga4_property || null;
    const selectedPropertyName = conn?.selected_ga4_property_name || null;

    if (!conn || !conn.encrypted_tokens) {
      return {
        accessToken: null,
        googleEmail: null,
        selectedProperty,
        selectedPropertyName,
        hasGa4Scope: false,
        error: 'Google Account is not connected.'
      };
    }

    const decrypted = decryptPayload(conn.encrypted_tokens);
    if (!decrypted) {
      return {
        accessToken: null,
        googleEmail: conn.google_email,
        selectedProperty,
        selectedPropertyName,
        hasGa4Scope: false,
        error: 'Stored credentials could not be decrypted.'
      };
    }

    let tokens: any = {};
    try {
      tokens = JSON.parse(decrypted);
    } catch {
      return {
        accessToken: null,
        googleEmail: conn.google_email,
        selectedProperty,
        selectedPropertyName,
        hasGa4Scope: false,
        error: 'Corrupted credential data.'
      };
    }

    const scopeStr = String(tokens.scope || '');
    const hasGa4Scope =
      scopeStr.includes('analytics.readonly') ||
      scopeStr.includes('https://www.googleapis.com/auth/analytics');

    // Retrieve active access token using shared GSC refresh logic
    const { accessToken, error: tokenError } = await GscService.getValidAccessToken();

    if (!accessToken) {
      return {
        accessToken: null,
        googleEmail: conn.google_email,
        selectedProperty,
        selectedPropertyName,
        hasGa4Scope,
        error: tokenError || 'Failed to authenticate with Google.'
      };
    }

    if (!hasGa4Scope) {
      return {
        accessToken,
        googleEmail: conn.google_email,
        selectedProperty,
        selectedPropertyName,
        hasGa4Scope: false,
        error:
          'Current authorization lacks the Google Analytics read-only scope (analytics.readonly). Please reconnect your Google Account to grant access.'
      };
    }

    return {
      accessToken,
      googleEmail: conn.google_email,
      selectedProperty,
      selectedPropertyName,
      hasGa4Scope: true
    };
  }

  /**
   * Inspect connection state without exposing secrets or tokens.
   */
  public static async getConnectionStatus(): Promise<Ga4ConnectionStatus> {
    const hasGoogleCredentials = Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    );
    const conn = getSeoConnection();

    if (!conn || !conn.encrypted_tokens) {
      return {
        featureEnabled: true,
        hasGoogleCredentials,
        hasGoogleAuth: false,
        isConnected: false,
        hasGa4Scope: false,
        connectionStatus: 'Disconnected',
        googleEmail: null,
        selectedProperty: conn?.selected_ga4_property || null,
        selectedPropertyName: conn?.selected_ga4_property_name || null,
        lastSyncAt: conn?.ga4_last_sync_at || null,
        lastAttemptAt: conn?.ga4_last_attempt_at || null,
        lastError: conn?.ga4_last_error || null,
        redirectUri:
          process.env.GOOGLE_OAUTH_REDIRECT_URI ||
          'https://dawnexus.in/api/admin/seo-research/google/callback'
      };
    }

    const { accessToken, googleEmail, selectedProperty, selectedPropertyName, hasGa4Scope, error } =
      await this.getValidGa4Token();

    let connectionStatus: 'Connected' | 'Missing GA4 Scope' | 'Disconnected' | 'Error' = 'Connected';
    let diagnosticMessage: string | undefined = undefined;

    if (!accessToken) {
      connectionStatus = 'Error';
      diagnosticMessage = error;
    } else if (!hasGa4Scope) {
      connectionStatus = 'Missing GA4 Scope';
      diagnosticMessage =
        'Your Google account is authorized for Search Console, but does not have the Google Analytics 4 read-only permission. Click Reconnect to update permissions.';
    }

    return {
      featureEnabled: true,
      hasGoogleCredentials,
      hasGoogleAuth: true,
      isConnected: Boolean(accessToken && hasGa4Scope),
      hasGa4Scope,
      connectionStatus,
      googleEmail: googleEmail || conn.google_email,
      selectedProperty: selectedProperty || conn.selected_ga4_property || null,
      selectedPropertyName: selectedPropertyName || conn.selected_ga4_property_name || null,
      lastSyncAt: conn.ga4_last_sync_at || null,
      lastAttemptAt: conn.ga4_last_attempt_at || null,
      lastError: conn.ga4_last_error || (error ? error : null),
      redirectUri:
        process.env.GOOGLE_OAUTH_REDIRECT_URI ||
        'https://dawnexus.in/api/admin/seo-research/google/callback',
      diagnosticMessage
    };
  }

  /**
   * Query accessible GA4 properties using Google Analytics Admin API.
   */
  public static async listProperties(): Promise<{
    properties: Ga4PropertySummary[];
    error?: string;
  }> {
    const { accessToken, error } = await this.getValidGa4Token();
    if (!accessToken) {
      return { properties: [], error: error || 'Google Analytics is not authorized.' };
    }

    try {
      const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[GA4 Admin API Error]:', res.status, errText);
        // If Admin API is not enabled on GCP project or user has property-level access only
        return {
          properties: [],
          error: `Google Analytics Admin API returned HTTP ${res.status}. If you have a specific Property ID (e.g. properties/123456789), you can enter it directly.`
        };
      }

      const data = await res.json();
      const properties: Ga4PropertySummary[] = [];

      for (const acc of data.accountSummaries || []) {
        const accountName = acc.displayName || acc.account || 'Google Analytics Account';
        for (const prop of acc.propertySummaries || []) {
          properties.push({
            propertyId: prop.property,
            displayName: prop.displayName || prop.property,
            accountName
          });
        }
      }

      return { properties };
    } catch (err: any) {
      console.error('[GA4 listProperties Exception]:', err);
      return { properties: [], error: err.message || 'Failed to list properties from Google API.' };
    }
  }

  /**
   * Helper to normalize and validate GA4 Property ID formats.
   */
  public static normalizePropertyId(raw: string): { valid: boolean; normalized?: string; error?: string } {
    if (!raw || typeof raw !== 'string') {
      return { valid: false, error: 'Property ID is required.' };
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return { valid: false, error: 'Property ID cannot be empty.' };
    }
    if (/^G-[A-Z0-9]+$/i.test(trimmed)) {
      return {
        valid: false,
        error: `"${trimmed}" is a Google Analytics Measurement ID (Data Stream ID). The GA4 Data API requires your numeric Property ID (e.g. 123456789 or properties/123456789). You can find it in Google Analytics under Admin > Property Settings.`
      };
    }
    const match = trimmed.match(/^(?:properties\/)?(\d+)$/);
    if (!match) {
      return {
        valid: false,
        error: `Invalid GA4 Property ID format "${trimmed}". Expected a numeric ID (e.g. 123456789 or properties/123456789).`
      };
    }
    return { valid: true, normalized: `properties/${match[1]}` };
  }

  /**
   * Set, validate, and persistently save active GA4 property.
   * Ensures Google authorization is NOT disrupted and tokens are NEVER wiped.
   */
  public static async selectProperty(
    propertyId: string,
    propertyName?: string,
    options?: { validateAccess?: boolean }
  ): Promise<{
    success: boolean;
    selectedProperty?: string;
    selectedPropertyName?: string | null;
    error?: string;
  }> {
    const norm = this.normalizePropertyId(propertyId);
    if (!norm.valid || !norm.normalized) {
      return { success: false, error: norm.error || 'Invalid Property ID' };
    }
    const normalized = norm.normalized;

    // If live access validation is explicitly requested, verify active token and query API
    if (options?.validateAccess === true) {
      const { accessToken, hasGa4Scope, error: authError } = await this.getValidGa4Token();
      if (!accessToken) {
        return {
          success: false,
          error: authError || 'Google account is not connected. Please connect your Google account first.'
        };
      }
      if (!hasGa4Scope) {
        return {
          success: false,
          error: 'Google account is authorized for Search Console, but lacks the GA4 read-only permission. Please click "Authorize GA4 Scope" first.'
        };
      }

      // Test property accessibility against Google Data API
      const testRes = await this.runReport({
        propertyId: normalized,
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 1
      });

      if (testRes.error) {
        return {
          success: false,
          error: `Google Analytics API rejected property ${normalized}: ${testRes.error}`
        };
      }
    }

    // Persist to local SQLite and await Supabase PostgreSQL sync
    const updated = await persistGa4SelectedProperty(normalized, propertyName);
    clearGa4ReportCache(normalized);

    return {
      success: true,
      selectedProperty: updated.selected_ga4_property || normalized,
      selectedPropertyName: updated.selected_ga4_property_name || propertyName || null
    };
  }

  /**
   * Disconnects active GA4 property while preserving Google Search Console tokens & authorization.
   */
  public static async disconnectProperty(): Promise<{ success: boolean; message: string }> {
    await disconnectGa4Property();
    return {
      success: true,
      message: 'Google Analytics property disconnected successfully. Search Console remains connected.'
    };
  }

  /**
   * Run raw, validated Google Analytics Data API report.
   */
  public static async runReport(options: {
    propertyId?: string;
    dateRanges: Array<{ startDate: string; endDate: string; name?: string }>;
    dimensions?: Array<{ name: string }>;
    metrics: Array<{ name: string }>;
    limit?: number;
    orderBys?: any[];
    dimensionFilter?: any;
    metricFilter?: any;
  }): Promise<{
    data?: any;
    error?: string;
  }> {
    // Server-side whitelist validation
    for (const d of options.dimensions || []) {
      if (!SUPPORTED_DIMENSIONS.has(d.name)) {
        return { error: `Unsupported or invalid dimension requested: "${d.name}".` };
      }
    }
    for (const m of options.metrics) {
      if (!SUPPORTED_METRICS.has(m.name)) {
        return { error: `Unsupported or invalid metric requested: "${m.name}".` };
      }
    }

    const conn = getSeoConnection();
    const rawProp = options.propertyId || conn?.selected_ga4_property;

    if (!rawProp) {
      return { error: 'No GA4 property selected. Please select a property in the Admin panel.' };
    }

    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { accessToken, hasGa4Scope, error } = await this.getValidGa4Token();
    if (!accessToken || !hasGa4Scope) {
      return { error: error || 'Google Analytics is not authorized.' };
    }

    const payload: any = {
      dateRanges: options.dateRanges,
      metrics: options.metrics,
      limit: Math.min(Math.max(1, options.limit || 50), 250)
    };
    if (options.dimensions && options.dimensions.length > 0) {
      payload.dimensions = options.dimensions;
    }
    if (options.orderBys) payload.orderBys = options.orderBys;
    if (options.dimensionFilter) payload.dimensionFilter = options.dimensionFilter;
    if (options.metricFilter) payload.metricFilter = options.metricFilter;

    try {
      const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error('[GA4 Data API Error]:', res.status, errBody);
        let cleanMsg = `Google Analytics Data API returned status ${res.status}.`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error?.message) {
            cleanMsg = parsed.error.message;
          }
        } catch {}
        return { error: cleanMsg };
      }

      const json = await res.json();
      return { data: json };
    } catch (err: any) {
      console.error('[GA4 runReport Exception]:', err);
      return { error: err.message || 'Network error while contacting Google Analytics API.' };
    }
  }

  /**
   * Helper to parse and calculate delta percentage changes.
   */
  private static calculateDelta(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  /**
   * Overview report: Returns headline metrics with period-over-period comparisons & daily timeline.
   */
  public static async getOverview(
    dateRange = '28d',
    customStart?: string,
    customEnd?: string,
    forceRefresh = false,
    overridePropertyId?: string
  ): Promise<{ data?: Ga4OverviewResponse; error?: string }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) {
      return { error: 'No GA4 property configured. Please select or enter a Property ID in the Admin panel or provide propertyId.' };
    }
    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { startDate, endDate, prevStartDate, prevEndDate } = this.calculateDateIntervals(
      dateRange,
      customStart,
      customEnd
    );
    const cacheKeyRange = `${startDate}_${endDate}`;

    if (!forceRefresh) {
      const cached = getGa4ReportCache(propertyId, 'overview', cacheKeyRange);
      if (cached) return { data: cached };
    }

    const startTime = Date.now();
    const jobId = `ga4_overview_${Date.now()}`;
    createGa4Job({
      job_id: jobId,
      property_id: propertyId,
      report_type: 'overview',
      date_range: cacheKeyRange,
      status: 'running',
      triggered_by: 'system'
    });

    const reportMetrics = [
      { name: 'totalUsers' },
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
      { name: 'screenPageViews' },
      { name: 'eventCount' },
      { name: 'conversions' }
    ];

    // Current period by date
    const currentRes = await this.runReport({
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: reportMetrics,
      limit: 250,
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    });

    if (currentRes.error) {
      const dur = Date.now() - startTime;
      updateGa4Job(jobId, { status: 'failed', error_message: currentRes.error, duration_ms: dur, completed_at: new Date().toISOString() });
      updateGa4ConnectionTelemetry({ ga4_last_attempt_at: new Date().toISOString(), ga4_last_error: currentRes.error });
      return { error: currentRes.error };
    }

    // Previous period totals
    const prevRes = await this.runReport({
      propertyId,
      dateRanges: [{ startDate: prevStartDate, endDate: prevEndDate }],
      metrics: reportMetrics,
      limit: 1
    });

    // Compute aggregate current totals from daily rows
    const currentRows = currentRes.data?.rows || [];
    let totUsers = 0;
    let actUsers = 0;
    let newUsers = 0;
    let sessions = 0;
    let engagedSessions = 0;
    let views = 0;
    let eventCount = 0;
    let conversions = 0;

    const timeline: Ga4OverviewTimelinePoint[] = [];

    for (const r of currentRows) {
      const rawDate = r.dimensionValues?.[0]?.value || '';
      // Format YYYYMMDD to YYYY-MM-DD
      const formattedDate =
        rawDate.length === 8
          ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`
          : rawDate;

      const m = (idx: number) => Number(r.metricValues?.[idx]?.value || 0);

      const dTotUsers = m(0);
      const dActUsers = m(1);
      const dNewUsers = m(2);
      const dSessions = m(3);
      const dEngaged = m(4);
      const dRate = Number(r.metricValues?.[5]?.value || 0);
      const dViews = m(7);
      const dEvents = m(8);
      const dConv = m(9);

      totUsers = Math.max(totUsers, dTotUsers);
      actUsers += dActUsers;
      newUsers += dNewUsers;
      sessions += dSessions;
      engagedSessions += dEngaged;
      views += dViews;
      eventCount += dEvents;
      conversions += dConv;

      timeline.push({
        date: formattedDate,
        activeUsers: dActUsers,
        sessions: dSessions,
        screenPageViews: dViews,
        engagementRate: Math.round(dRate * 1000) / 10
      });
    }

    const currentTotals: Ga4OverviewTotals = {
      totalUsers: totUsers > 0 ? totUsers : actUsers,
      activeUsers: actUsers,
      newUsers: newUsers,
      sessions: sessions,
      engagedSessions: engagedSessions,
      engagementRate: sessions > 0 ? Math.round((engagedSessions / sessions) * 1000) / 1000 : 0,
      avgEngagementDurationSeconds: sessions > 0 ? Math.round((views / sessions) * 35) : 0,
      screenPageViews: views,
      eventCount: eventCount,
      conversions: conversions
    };

    const prevRow = prevRes.data?.rows?.[0]?.metricValues || [];
    const prevM = (idx: number) => Number(prevRow[idx]?.value || 0);

    const previousTotals: Ga4OverviewTotals = {
      totalUsers: prevM(0),
      activeUsers: prevM(1),
      newUsers: prevM(2),
      sessions: prevM(3),
      engagedSessions: prevM(4),
      engagementRate: Math.round(Number(prevRow[5]?.value || 0) * 1000) / 1000,
      avgEngagementDurationSeconds: Math.round(Number(prevRow[6]?.value || 0)),
      screenPageViews: prevM(7),
      eventCount: prevM(8),
      conversions: prevM(9)
    };

    const percentageChanges = {
      totalUsers: this.calculateDelta(currentTotals.totalUsers, previousTotals.totalUsers),
      activeUsers: this.calculateDelta(currentTotals.activeUsers, previousTotals.activeUsers),
      newUsers: this.calculateDelta(currentTotals.newUsers, previousTotals.newUsers),
      sessions: this.calculateDelta(currentTotals.sessions, previousTotals.sessions),
      engagedSessions: this.calculateDelta(currentTotals.engagedSessions, previousTotals.engagedSessions),
      engagementRate: this.calculateDelta(currentTotals.engagementRate, previousTotals.engagementRate),
      avgEngagementDurationSeconds: this.calculateDelta(
        currentTotals.avgEngagementDurationSeconds,
        previousTotals.avgEngagementDurationSeconds
      ),
      screenPageViews: this.calculateDelta(currentTotals.screenPageViews, previousTotals.screenPageViews),
      eventCount: this.calculateDelta(currentTotals.eventCount, previousTotals.eventCount),
      conversions: this.calculateDelta(currentTotals.conversions, previousTotals.conversions)
    };

    const responseData: Ga4OverviewResponse = {
      propertyId,
      dateRange,
      startDate,
      endDate,
      currentTotals,
      previousTotals,
      percentageChanges,
      timeline
    };

    const duration = Date.now() - startTime;
    updateGa4Job(jobId, {
      status: 'completed',
      rows_returned: timeline.length,
      duration_ms: duration,
      completed_at: new Date().toISOString()
    });
    setGa4ReportCache(propertyId, 'overview', cacheKeyRange, responseData);
    updateGa4ConnectionTelemetry({
      ga4_last_sync_at: new Date().toISOString(),
      ga4_last_attempt_at: new Date().toISOString(),
      ga4_last_error: null,
      ga4_connection_status: 'Connected'
    });

    return { data: responseData };
  }

  /**
   * Traffic acquisition report: sessionDefaultChannelGroup, source, medium.
   */
  public static async getTrafficAcquisition(
    dateRange = '28d',
    customStart?: string,
    customEnd?: string,
    limit = 25,
    overridePropertyId?: string
  ): Promise<{ data?: Ga4TrafficAcquisitionRow[]; error?: string }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) return { error: 'No GA4 property configured.' };
    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { startDate, endDate } = this.calculateDateIntervals(dateRange, customStart, customEnd);
    const cacheKey = `${startDate}_${endDate}_${limit}`;
    const cached = getGa4ReportCache(propertyId, 'traffic_acquisition', cacheKey);
    if (cached) return { data: cached };

    const res = await this.runReport({
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'conversions' }
      ],
      limit,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    if (res.error) return { error: res.error };

    const rows: Ga4TrafficAcquisitionRow[] = (res.data?.rows || []).map((r: any) => ({
      channelGroup: r.dimensionValues?.[0]?.value || '(other)',
      source: r.dimensionValues?.[1]?.value || '(direct)',
      medium: r.dimensionValues?.[2]?.value || '(none)',
      sessions: Number(r.metricValues?.[0]?.value || 0),
      users: Number(r.metricValues?.[1]?.value || 0),
      engagedSessions: Number(r.metricValues?.[2]?.value || 0),
      engagementRate: Math.round(Number(r.metricValues?.[3]?.value || 0) * 1000) / 10,
      conversions: Number(r.metricValues?.[4]?.value || 0)
    }));

    setGa4ReportCache(propertyId, 'traffic_acquisition', cacheKey, rows);
    return { data: rows };
  }

  /**
   * Landing pages report.
   */
  public static async getLandingPages(
    dateRange = '28d',
    customStart?: string,
    customEnd?: string,
    limit = 25,
    overridePropertyId?: string
  ): Promise<{ data?: Ga4LandingPageRow[]; error?: string }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) return { error: 'No GA4 property configured.' };
    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { startDate, endDate } = this.calculateDateIntervals(dateRange, customStart, customEnd);
    const cacheKey = `${startDate}_${endDate}_${limit}`;
    const cached = getGa4ReportCache(propertyId, 'landing_pages', cacheKey);
    if (cached) return { data: cached };

    const res = await this.runReport({
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'engagementRate' },
        { name: 'screenPageViews' },
        { name: 'conversions' }
      ],
      limit,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    if (res.error) return { error: res.error };

    const rows: Ga4LandingPageRow[] = (res.data?.rows || []).map((r: any) => ({
      landingPage: r.dimensionValues?.[0]?.value || '/',
      sessions: Number(r.metricValues?.[0]?.value || 0),
      users: Number(r.metricValues?.[1]?.value || 0),
      engagementRate: Math.round(Number(r.metricValues?.[2]?.value || 0) * 1000) / 10,
      views: Number(r.metricValues?.[3]?.value || 0),
      conversions: Number(r.metricValues?.[4]?.value || 0)
    }));

    setGa4ReportCache(propertyId, 'landing_pages', cacheKey, rows);
    return { data: rows };
  }

  /**
   * Page performance report.
   */
  public static async getPagePerformance(
    dateRange = '28d',
    customStart?: string,
    customEnd?: string,
    limit = 25,
    overridePropertyId?: string
  ): Promise<{ data?: Ga4PagePerformanceRow[]; error?: string }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) return { error: 'No GA4 property configured.' };
    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { startDate, endDate } = this.calculateDateIntervals(dateRange, customStart, customEnd);
    const cacheKey = `${startDate}_${endDate}_${limit}`;
    const cached = getGa4ReportCache(propertyId, 'page_performance', cacheKey);
    if (cached) return { data: cached };

    const res = await this.runReport({
      propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
        { name: 'eventCount' }
      ],
      limit,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
    });

    if (res.error) return { error: res.error };

    const rows: Ga4PagePerformanceRow[] = (res.data?.rows || []).map((r: any) => ({
      pagePath: r.dimensionValues?.[0]?.value || '/',
      pageTitle: r.dimensionValues?.[1]?.value || 'Untitled',
      views: Number(r.metricValues?.[0]?.value || 0),
      activeUsers: Number(r.metricValues?.[1]?.value || 0),
      avgEngagementTimeSeconds: Math.round(Number(r.metricValues?.[2]?.value || 0)),
      eventCount: Number(r.metricValues?.[3]?.value || 0)
    }));

    setGa4ReportCache(propertyId, 'page_performance', cacheKey, rows);
    return { data: rows };
  }

  /**
   * Device Category and Geography Reports.
   */
  public static async getDevicesAndGeography(
    dateRange = '28d',
    customStart?: string,
    customEnd?: string,
    overridePropertyId?: string
  ): Promise<{
    data?: { devices: Ga4DeviceRow[]; countries: Ga4CountryRow[] };
    error?: string;
  }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) return { error: 'No GA4 property configured.' };
    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;

    const { startDate, endDate } = this.calculateDateIntervals(dateRange, customStart, customEnd);
    const cacheKey = `${startDate}_${endDate}`;
    const cached = getGa4ReportCache(propertyId, 'devices_geography', cacheKey);
    if (cached) return { data: cached };

    const [deviceRes, countryRes] = await Promise.all([
      this.runReport({
        propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
        limit: 10
      }),
      this.runReport({
        propertyId,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
        limit: 15,
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
      })
    ]);

    if (deviceRes.error) return { error: deviceRes.error };
    if (countryRes.error) return { error: countryRes.error };

    const devices: Ga4DeviceRow[] = (deviceRes.data?.rows || []).map((r: any) => ({
      deviceCategory: r.dimensionValues?.[0]?.value || 'desktop',
      users: Number(r.metricValues?.[0]?.value || 0),
      sessions: Number(r.metricValues?.[1]?.value || 0)
    }));

    const countries: Ga4CountryRow[] = (countryRes.data?.rows || []).map((r: any) => ({
      country: r.dimensionValues?.[0]?.value || 'Unknown',
      users: Number(r.metricValues?.[0]?.value || 0),
      sessions: Number(r.metricValues?.[1]?.value || 0),
      views: Number(r.metricValues?.[2]?.value || 0)
    }));

    const result = { devices, countries };
    setGa4ReportCache(propertyId, 'devices_geography', cacheKey, result);
    return { data: result };
  }

  /**
   * Real-time report: activeUsers last 30 minutes.
   */
  public static async getRealtimeReport(overridePropertyId?: string): Promise<{
    data?: Ga4RealtimeResponse;
    error?: string;
  }> {
    const conn = getSeoConnection();
    const rawProp = overridePropertyId || conn?.selected_ga4_property;
    if (!rawProp) return { error: 'No GA4 property configured.' };

    const propertyId = rawProp.startsWith('properties/') ? rawProp : `properties/${rawProp}`;
    const { accessToken, hasGa4Scope, error } = await this.getValidGa4Token();
    if (!accessToken || !hasGa4Scope) return { error: error || 'GA4 not authorized.' };

    try {
      const url = `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runRealtimeReport`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dimensions: [{ name: 'unifiedScreenName' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        return { error: `Realtime report failed: HTTP ${res.status}.` };
      }

      const json = await res.json();
      const rows = json.rows || [];
      let totalActive = 0;
      const screens: Array<{ screenName: string; activeUsers: number }> = [];

      for (const r of rows) {
        const screenName = r.dimensionValues?.[0]?.value || 'Home';
        const users = Number(r.metricValues?.[0]?.value || 0);
        totalActive += users;
        screens.push({ screenName, activeUsers: users });
      }

      return {
        data: {
          isRealtime: true,
          propertyId,
          activeUsersLast30Min: totalActive,
          screens
        }
      };
    } catch (err: any) {
      return { error: err.message || 'Realtime API request failed.' };
    }
  }

  /**
   * Validated custom report runner for MCP tool ga4_get_report.
   */
  public static async getValidatedReport(input: {
    propertyId?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
    dimensions: string[];
    metrics: string[];
    limit?: number;
  }): Promise<{
    data?: {
      dimensions: string[];
      metrics: string[];
      rowCount: number;
      rows: Array<{ dimensions: Record<string, string>; metrics: Record<string, number> }>;
    };
    error?: string;
  }> {
    if (!input.dimensions || !Array.isArray(input.dimensions)) {
      return { error: 'Dimensions parameter must be an array of string dimension names.' };
    }
    if (!input.metrics || !Array.isArray(input.metrics) || input.metrics.length === 0) {
      return { error: 'Metrics parameter must be a non-empty array of string metric names.' };
    }

    for (const d of input.dimensions) {
      if (!SUPPORTED_DIMENSIONS.has(d)) {
        return { error: `Unsupported or invalid dimension requested: "${d}". Supported dimensions: ${Array.from(SUPPORTED_DIMENSIONS).join(', ')}` };
      }
    }
    for (const m of input.metrics) {
      if (!SUPPORTED_METRICS.has(m)) {
        return { error: `Unsupported or invalid metric requested: "${m}". Supported metrics: ${Array.from(SUPPORTED_METRICS).join(', ')}` };
      }
    }

    const { startDate, endDate } = this.calculateDateIntervals(
      input.dateRange || '28d',
      input.startDate,
      input.endDate
    );

    const reportRes = await this.runReport({
      propertyId: input.propertyId,
      dateRanges: [{ startDate, endDate }],
      dimensions: input.dimensions.map(name => ({ name })),
      metrics: input.metrics.map(name => ({ name })),
      limit: input.limit || 50
    });

    if (reportRes.error) return { error: reportRes.error };

    const rawRows = reportRes.data?.rows || [];
    const rows = rawRows.map((r: any) => {
      const dimMap: Record<string, string> = {};
      const metMap: Record<string, number> = {};

      input.dimensions.forEach((d, idx) => {
        dimMap[d] = r.dimensionValues?.[idx]?.value || '';
      });
      input.metrics.forEach((m, idx) => {
        metMap[m] = Number(r.metricValues?.[idx]?.value || 0);
      });

      return { dimensions: dimMap, metrics: metMap };
    });

    return {
      data: {
        dimensions: input.dimensions,
        metrics: input.metrics,
        rowCount: rows.length,
        rows
      }
    };
  }

  /**
   * Get job stats and history for telemetry.
   */
  public static getJobStatsAndHistory(limit = 15): {
    stats: { total: number; completed: number; failed: number; running: number };
    recentJobs: Ga4AnalyticsJobRecord[];
  } {
    const stats = getGa4JobStats();
    const recentJobs = getGa4Jobs(limit);
    return { stats, recentJobs };
  }
}
