import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import app from '../index.js';
import { getExpectedMcpKey } from '../mcpAuth.js';
import { Ga4Service } from '../ga4Service.js';
import { McpService } from '../mcpService.js';
import { GscService } from '../gscService.js';
import {
  getSeoConnection,
  updateGa4SelectedProperty,
  updateGa4ConnectionTelemetry,
  createGa4Job,
  getGa4Jobs,
  getGa4JobStats,
  setGa4ReportCache,
  getGa4ReportCache
} from '../db.js';

let server: http.Server;
let baseUrl: string;
let sessionCookie = '';
let mcpToken: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  mcpToken = getExpectedMcpKey();

  // Obtain admin session cookie
  const loginRes = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '9566' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  if (cookie) {
    sessionCookie = cookie.split(';')[0];
  }
});

test.after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  process.exit(0);
});

// ----------------------------------------------------
// 1. ADMIN PANEL GA4 ROUTES & SECURITY
// ----------------------------------------------------

test('Admin GA4: /api/admin/analytics/status requires admin authentication', async () => {
  const res = await fetch(`${baseUrl}/api/admin/analytics/status`);
  assert.equal(res.status, 401);
});

test('Admin GA4: /api/admin/analytics/status returns sanitized connection structure with admin session', async () => {
  const res = await fetch(`${baseUrl}/api/admin/analytics/status`, {
    headers: { Cookie: sessionCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.ok(typeof data.featureEnabled === 'boolean');
  assert.ok(typeof data.hasGoogleCredentials === 'boolean');
  assert.ok(typeof data.isConnected === 'boolean');
  assert.ok(typeof data.hasGa4Scope === 'boolean');
  assert.ok(['Connected', 'Missing GA4 Scope', 'Disconnected', 'Error'].includes(data.connectionStatus));
  assert.ok(data.redirectUri);

  // CRITICAL SECURITY ASSERTIONS: Never expose tokens or secrets
  assert.equal(data.encrypted_tokens, undefined);
  assert.equal(data.accessToken, undefined);
  assert.equal(data.refreshToken, undefined);
  assert.equal(data.client_secret, undefined);
});

test('Admin GA4: /api/admin/analytics/select-property sets and normalizes GA4 property ID in DB', async () => {
  const testPropId = 'properties/987654321';
  const testPropName = 'Dawnexus Production GA4';

  const res = await fetch(`${baseUrl}/api/admin/analytics/select-property`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: sessionCookie
    },
    body: JSON.stringify({
      propertyId: testPropId,
      propertyName: testPropName
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.selectedProperty, testPropId);
  assert.equal(data.selectedPropertyName, testPropName);

  // Verify in SQLite database
  const conn = getSeoConnection();
  assert.equal(conn?.selected_ga4_property, testPropId);
  assert.equal(conn?.selected_ga4_property_name, testPropName);
});

test('Admin GA4: calculateDateIntervals accurately computes standard and custom intervals', () => {
  const intervals7d = Ga4Service.calculateDateIntervals('7d');
  assert.ok(intervals7d.startDate);
  assert.ok(intervals7d.endDate);
  assert.ok(intervals7d.prevStartDate);
  assert.ok(intervals7d.prevEndDate);

  const start7 = new Date(intervals7d.startDate).getTime();
  const end7 = new Date(intervals7d.endDate).getTime();
  const daysDiff7 = Math.round((end7 - start7) / (24 * 60 * 60 * 1000)) + 1;
  assert.equal(daysDiff7, 7);

  const intervalsCustom = Ga4Service.calculateDateIntervals('custom', '2026-09-01', '2026-09-15');
  assert.equal(intervalsCustom.startDate, '2026-09-01');
  assert.equal(intervalsCustom.endDate, '2026-09-15');
  assert.equal(intervalsCustom.prevEndDate, '2026-08-31');
  assert.equal(intervalsCustom.prevStartDate, '2026-08-17');
});

test('Admin GA4: /api/admin/analytics/overview returns structured metrics or clean diagnostic', async () => {
  // Prime cache so that test runs deterministically in offline/mock environment
  const mockOverview = {
    propertyId: 'properties/987654321',
    dateRange: '28d',
    startDate: '2026-09-18',
    endDate: '2026-10-15',
    currentTotals: {
      totalUsers: 1420,
      activeUsers: 1250,
      newUsers: 980,
      sessions: 2150,
      engagedSessions: 1480,
      engagementRate: 0.688,
      avgEngagementDurationSeconds: 78,
      screenPageViews: 4890,
      eventCount: 15420,
      conversions: 35
    },
    previousTotals: {
      totalUsers: 1200,
      activeUsers: 1050,
      newUsers: 820,
      sessions: 1850,
      engagedSessions: 1200,
      engagementRate: 0.648,
      avgEngagementDurationSeconds: 65,
      screenPageViews: 4100,
      eventCount: 12800,
      conversions: 28
    },
    percentageChanges: {
      totalUsers: 18.3,
      activeUsers: 19.0,
      newUsers: 19.5,
      sessions: 16.2,
      engagedSessions: 23.3,
      engagementRate: 6.2,
      avgEngagementDurationSeconds: 20.0,
      screenPageViews: 19.3,
      eventCount: 20.5,
      conversions: 25.0
    },
    timeline: [
      { date: '2026-10-14', activeUsers: 45, sessions: 75, screenPageViews: 180, engagementRate: 68.5 },
      { date: '2026-10-15', activeUsers: 52, sessions: 84, screenPageViews: 210, engagementRate: 70.2 }
    ]
  };

  const intervals = Ga4Service.calculateDateIntervals('28d');
  setGa4ReportCache('properties/987654321', 'overview', `${intervals.startDate}_${intervals.endDate}`, mockOverview);

  const res = await fetch(`${baseUrl}/api/admin/analytics/overview?dateRange=28d`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.propertyId, 'properties/987654321');
  assert.equal(data.currentTotals.sessions, 2150);
  assert.equal(data.currentTotals.activeUsers, 1250);
  assert.equal(data.currentTotals.conversions, 35);
  assert.ok(Array.isArray(data.timeline));
  assert.equal(data.timeline.length, 2);
});

test('Admin GA4: /api/admin/analytics/traffic-acquisition returns structured channel array', async () => {
  const mockChannels = [
    {
      channelGroup: 'Organic Search',
      source: 'google',
      medium: 'organic',
      sessions: 1250,
      users: 980,
      engagedSessions: 920,
      engagementRate: 73.6,
      conversions: 22
    },
    {
      channelGroup: 'Direct',
      source: '(direct)',
      medium: '(none)',
      sessions: 520,
      users: 410,
      engagedSessions: 340,
      engagementRate: 65.4,
      conversions: 8
    }
  ];

  const intervals = Ga4Service.calculateDateIntervals('28d');
  setGa4ReportCache('properties/987654321', 'traffic_acquisition', `${intervals.startDate}_${intervals.endDate}_25`, mockChannels);

  const res = await fetch(`${baseUrl}/api/admin/analytics/traffic-acquisition?dateRange=28d`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.channels));
  assert.equal(data.channels[0].channelGroup, 'Organic Search');
  assert.equal(data.channels[0].sessions, 1250);
  assert.equal(data.channels[0].conversions, 22);
});

test('Admin GA4: /api/admin/analytics/landing-pages returns structured landing pages', async () => {
  const mockLanding = [
    {
      landingPage: '/services/website-design',
      sessions: 480,
      users: 410,
      engagementRate: 75.2,
      views: 920,
      conversions: 14
    },
    {
      landingPage: '/website-cost-calculator',
      sessions: 350,
      users: 310,
      engagementRate: 82.5,
      views: 740,
      conversions: 18
    }
  ];

  const intervals = Ga4Service.calculateDateIntervals('28d');
  setGa4ReportCache('properties/987654321', 'landing_pages', `${intervals.startDate}_${intervals.endDate}_25`, mockLanding);

  const res = await fetch(`${baseUrl}/api/admin/analytics/landing-pages?dateRange=28d`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.landingPages));
  assert.equal(data.landingPages[0].landingPage, '/services/website-design');
  assert.equal(data.landingPages[1].conversions, 18);
});

test('Admin GA4: /api/admin/analytics/page-performance returns pages array', async () => {
  const mockPages = [
    {
      pagePath: '/services/seo-services',
      pageTitle: 'SEO Services — Dawnexus',
      views: 650,
      activeUsers: 480,
      avgEngagementTimeSeconds: 95,
      eventCount: 2100
    }
  ];

  const intervals = Ga4Service.calculateDateIntervals('28d');
  setGa4ReportCache('properties/987654321', 'page_performance', `${intervals.startDate}_${intervals.endDate}_25`, mockPages);

  const res = await fetch(`${baseUrl}/api/admin/analytics/page-performance?dateRange=28d`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.pages));
  assert.equal(data.pages[0].pagePath, '/services/seo-services');
  assert.equal(data.pages[0].avgEngagementTimeSeconds, 95);
});

test('Admin GA4: /api/admin/analytics/devices-geography returns devices and countries', async () => {
  const mockDevGeo = {
    devices: [
      { deviceCategory: 'desktop', users: 850, sessions: 1450 },
      { deviceCategory: 'mobile', users: 380, sessions: 680 }
    ],
    countries: [
      { country: 'India', users: 950, sessions: 1650, views: 3800 },
      { country: 'United States', users: 180, sessions: 280, views: 620 }
    ]
  };

  const intervals = Ga4Service.calculateDateIntervals('28d');
  setGa4ReportCache('properties/987654321', 'devices_geography', `${intervals.startDate}_${intervals.endDate}`, mockDevGeo);

  const res = await fetch(`${baseUrl}/api/admin/analytics/devices-geography?dateRange=28d`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.devices.length, 2);
  assert.equal(data.countries.length, 2);
  assert.equal(data.devices[0].deviceCategory, 'desktop');
  assert.equal(data.countries[0].country, 'India');
});

test('Admin GA4: /api/admin/analytics/jobs records jobs accurately without fabricating counts', async () => {
  createGa4Job({
    job_id: 'ga4_test_job_1',
    property_id: 'properties/987654321',
    report_type: 'overview',
    date_range: '28d',
    status: 'running',
    triggered_by: 'unit-test'
  });

  const res = await fetch(`${baseUrl}/api/admin/analytics/jobs`, {
    headers: { Cookie: sessionCookie }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.stats);
  assert.ok(data.stats.total >= 1);
  assert.ok(Array.isArray(data.recentJobs));
  assert.ok(data.recentJobs.some((j: any) => j.job_id === 'ga4_test_job_1'));
});

// ----------------------------------------------------
// 2. SERVER-SIDE VALIDATION & WHITELISTS
// ----------------------------------------------------

test('Server-Side Whitelist: Rejects dangerous or unsupported dimensions', async () => {
  const res = await Ga4Service.getValidatedReport({
    dimensions: ['drop_table_users', 'sessionDefaultChannelGroup'],
    metrics: ['sessions']
  });

  assert.ok(res.error);
  assert.ok(res.error.includes('Unsupported or invalid dimension'));
});

test('Server-Side Whitelist: Rejects dangerous or unsupported metrics', async () => {
  const res = await Ga4Service.getValidatedReport({
    dimensions: ['date'],
    metrics: ['system_exec_payload']
  });

  assert.ok(res.error);
  assert.ok(res.error.includes('Unsupported or invalid metric'));
});

// ----------------------------------------------------
// 3. MCP TOOLS EXTENSION FOR GA4
// ----------------------------------------------------

test('MCP Tool: ga4_get_connection_status returns sanitized connection object without secrets', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/status`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(['Connected', 'Missing GA4 Scope', 'Disconnected', 'Error'].includes(data.connectionStatus));
  assert.equal(data.selectedProperty, 'properties/987654321');
  assert.equal(data.encrypted_tokens, undefined);
  assert.equal(data.accessToken, undefined);
});

test('MCP Tool: ga4_get_overview returns overview data', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/overview?dateRange=28d`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.propertyId, 'properties/987654321');
  assert.equal(data.currentTotals.sessions, 2150);
});

test('MCP Tool: ga4_get_traffic_acquisition returns channel metrics', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/traffic-acquisition?dateRange=28d`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.channels));
  assert.equal(data.channels[0].channelGroup, 'Organic Search');
});

test('MCP Tool: ga4_get_landing_pages returns landing pages', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/landing-pages?dateRange=28d`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.landingPages));
  assert.equal(data.landingPages[0].landingPage, '/services/website-design');
});

test('MCP Tool: ga4_get_page_performance returns page views', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/page-performance?dateRange=28d`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(Array.isArray(data.pages));
  assert.equal(data.pages[0].pagePath, '/services/seo-services');
});

test('MCP Tool: ga4_get_report enforces validation on custom reports', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/report`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mcpToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      dimensions: ['malicious_injected_dimension'],
      metrics: ['sessions']
    })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.error.includes('Unsupported or invalid dimension'));
});

test('MCP Tool: ga4_get_analytics_status returns job telemetry', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/ga4/analytics-status`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.connection);
  assert.ok(data.jobStats);
  assert.ok(Array.isArray(data.recentJobs));
});

test('MCP Weekly Context: Incorporates both Search Console and GA4 status while keeping them distinct', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/weekly-context`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.searchConsoleStatus);
  assert.ok(data.googleAnalyticsStatus);

  // Must have clear separation in guidelines
  const guidelines = data.contentGuidelines.mandatoryChecks;
  assert.ok(guidelines.some((g: string) => g.includes('Google Search Console data') && g.includes('Google Analytics 4 data')));
});

// ----------------------------------------------------
// 4. REGRESSION VERIFICATION: SEARCH CONSOLE REMAINS 100% OPERATIONAL
// ----------------------------------------------------

test('Regression Check: Google Search Console status endpoint remains healthy', async () => {
  const res = await fetch(`${baseUrl}/api/admin/seo-research/status`, {
    headers: { Cookie: sessionCookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(['Connected', 'Disconnected', 'Error'].includes(data.connectionStatus));
});

test('Regression Check: MCP Search Console opportunities tool continues working', async () => {
  const res = await fetch(`${baseUrl}/api/mcp/tools/search-console`, {
    headers: { Authorization: `Bearer ${mcpToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(['connected', 'diagnostic', 'error'].includes(data.status));
});
