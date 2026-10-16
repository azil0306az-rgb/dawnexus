import { Router } from 'express';
import { Ga4Service } from '../ga4Service.js';

export const analyticsRouter = Router();

// GET /api/admin/analytics/status
// Check GA4 connection, authorized email, selected property, telemetry
analyticsRouter.get('/status', async (req, res) => {
  try {
    const status = await Ga4Service.getConnectionStatus();
    return res.json(status);
  } catch (err: any) {
    console.error('[Analytics Status Route Error]:', err);
    return res.status(500).json({ error: 'Failed to inspect Google Analytics status' });
  }
});

// GET /api/admin/analytics/properties
// List GA4 properties accessible to authorized Google account
analyticsRouter.get('/properties', async (req, res) => {
  try {
    const result = await Ga4Service.listProperties();
    return res.json(result);
  } catch (err: any) {
    console.error('[Analytics Properties Route Error]:', err);
    return res.status(500).json({ properties: [], error: 'Failed to list properties' });
  }
});

// POST /api/admin/analytics/select-property
// Set the active GA4 property ID and optional display name
analyticsRouter.post('/select-property', (req, res) => {
  try {
    const { propertyId, propertyName } = req.body;
    if (!propertyId || typeof propertyId !== 'string') {
      return res.status(400).json({ error: 'propertyId is required' });
    }
    const updated = Ga4Service.selectProperty(propertyId.trim(), propertyName);
    return res.json({
      success: true,
      selectedProperty: updated.selected_ga4_property,
      selectedPropertyName: updated.selected_ga4_property_name
    });
  } catch (err: any) {
    console.error('[Analytics Select Property Route Error]:', err);
    return res.status(500).json({ error: 'Failed to select property' });
  }
});

// GET /api/admin/analytics/overview
// Headline metrics, comparison totals, and daily timeline
analyticsRouter.get('/overview', async (req, res) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const customStart = req.query.startDate ? String(req.query.startDate) : undefined;
    const customEnd = req.query.endDate ? String(req.query.endDate) : undefined;
    const forceRefresh = req.query.refresh === 'true';

    const result = await Ga4Service.getOverview(dateRange, customStart, customEnd, forceRefresh);
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    return res.json(result.data);
  } catch (err: any) {
    console.error('[Analytics Overview Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

// GET /api/admin/analytics/traffic-acquisition
// Detailed traffic acquisition breakdown by channel, source, and medium
analyticsRouter.get('/traffic-acquisition', async (req, res) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const customStart = req.query.startDate ? String(req.query.startDate) : undefined;
    const customEnd = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

    const result = await Ga4Service.getTrafficAcquisition(dateRange, customStart, customEnd, limit);
    if (result.error) {
      return res.status(400).json({ error: result.error, channels: [] });
    }
    return res.json({ channels: result.data || [] });
  } catch (err: any) {
    console.error('[Analytics Traffic Acquisition Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch traffic acquisition', channels: [] });
  }
});

// GET /api/admin/analytics/landing-pages
// Landing page performance table
analyticsRouter.get('/landing-pages', async (req, res) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const customStart = req.query.startDate ? String(req.query.startDate) : undefined;
    const customEnd = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

    const result = await Ga4Service.getLandingPages(dateRange, customStart, customEnd, limit);
    if (result.error) {
      return res.status(400).json({ error: result.error, landingPages: [] });
    }
    return res.json({ landingPages: result.data || [] });
  } catch (err: any) {
    console.error('[Analytics Landing Pages Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch landing pages', landingPages: [] });
  }
});

// GET /api/admin/analytics/page-performance
// Top pages by views and engagement
analyticsRouter.get('/page-performance', async (req, res) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const customStart = req.query.startDate ? String(req.query.startDate) : undefined;
    const customEnd = req.query.endDate ? String(req.query.endDate) : undefined;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

    const result = await Ga4Service.getPagePerformance(dateRange, customStart, customEnd, limit);
    if (result.error) {
      return res.status(400).json({ error: result.error, pages: [] });
    }
    return res.json({ pages: result.data || [] });
  } catch (err: any) {
    console.error('[Analytics Page Performance Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch page performance', pages: [] });
  }
});

// GET /api/admin/analytics/devices-geography
// Device category and country metrics
analyticsRouter.get('/devices-geography', async (req, res) => {
  try {
    const dateRange = String(req.query.dateRange || '28d');
    const customStart = req.query.startDate ? String(req.query.startDate) : undefined;
    const customEnd = req.query.endDate ? String(req.query.endDate) : undefined;

    const result = await Ga4Service.getDevicesAndGeography(dateRange, customStart, customEnd);
    if (result.error) {
      return res.status(400).json({ error: result.error, devices: [], countries: [] });
    }
    return res.json(result.data || { devices: [], countries: [] });
  } catch (err: any) {
    console.error('[Analytics Devices Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch device and geography data', devices: [], countries: [] });
  }
});

// GET /api/admin/analytics/realtime
// Real-time active users
analyticsRouter.get('/realtime', async (req, res) => {
  try {
    const result = await Ga4Service.getRealtimeReport();
    if (result.error) {
      return res.status(400).json({ error: result.error, isRealtime: true, activeUsersLast30Min: 0, screens: [] });
    }
    return res.json(result.data);
  } catch (err: any) {
    console.error('[Analytics Realtime Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch realtime data', isRealtime: true, activeUsersLast30Min: 0, screens: [] });
  }
});

// POST /api/admin/analytics/sync
// Trigger on-demand cache refresh for core reports
analyticsRouter.post('/sync', async (req, res) => {
  try {
    const dateRange = String(req.body.dateRange || '28d');
    const overviewRes = await Ga4Service.getOverview(dateRange, undefined, undefined, true);
    if (overviewRes.error) {
      return res.status(400).json({ success: false, error: overviewRes.error });
    }
    return res.json({ success: true, message: 'Google Analytics data synchronized successfully.' });
  } catch (err: any) {
    console.error('[Analytics Sync Route Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to synchronize analytics data' });
  }
});

// GET /api/admin/analytics/jobs
// Retrieval activity and sanitized job stats
analyticsRouter.get('/jobs', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;
    const data = Ga4Service.getJobStatsAndHistory(limit);
    return res.json(data);
  } catch (err: any) {
    console.error('[Analytics Jobs Route Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch job activity' });
  }
});

// POST /api/admin/analytics/test-connection
// Validate connection and permissions
analyticsRouter.post('/test-connection', async (req, res) => {
  try {
    const status = await Ga4Service.getConnectionStatus();
    if (!status.isConnected || !status.hasGa4Scope) {
      return res.json({
        success: false,
        status: status.connectionStatus,
        message: status.diagnosticMessage || 'Google Analytics is not fully connected.'
      });
    }

    if (!status.selectedProperty) {
      return res.json({
        success: false,
        status: 'Needs Property',
        message: 'Google Analytics is authenticated, but no Property ID has been selected.'
      });
    }

    const testRes = await Ga4Service.runReport({
      propertyId: status.selectedProperty,
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [{ name: 'activeUsers' }],
      limit: 1
    });

    if (testRes.error) {
      return res.json({
        success: false,
        status: 'Error',
        message: testRes.error
      });
    }

    return res.json({
      success: true,
      status: 'Connected',
      message: `Successfully connected to GA4 property: ${status.selectedPropertyName || status.selectedProperty}`
    });
  } catch (err: any) {
    console.error('[Analytics Test Route Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Connection test failed' });
  }
});

