import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Activity,
  Globe,
  Smartphone,
  Layers,
  Clock,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Search,
  Target,
  FileText,
  Radio,
  Calendar,
  Check,
  Edit3,
  Trash2,
  HelpCircle,
  X
} from 'lucide-react';

interface Ga4Status {
  featureEnabled: boolean;
  hasGoogleCredentials: boolean;
  hasGoogleAuth?: boolean;
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

interface OverviewTotals {
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
}

interface TimelinePoint {
  date: string;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  engagementRate: number;
}

interface OverviewData {
  propertyId: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  currentTotals: OverviewTotals;
  previousTotals: OverviewTotals;
  percentageChanges: Record<string, number>;
  timeline: TimelinePoint[];
}

interface TrafficChannel {
  channelGroup: string;
  source: string;
  medium: string;
  sessions: number;
  users: number;
  engagedSessions: number;
  engagementRate: number;
  conversions: number;
}

interface LandingPage {
  landingPage: string;
  sessions: number;
  users: number;
  engagementRate: number;
  views: number;
  conversions: number;
}

interface PagePerformance {
  pagePath: string;
  pageTitle: string;
  views: number;
  activeUsers: number;
  avgEngagementTimeSeconds: number;
  eventCount: number;
}

interface DeviceRow {
  deviceCategory: string;
  users: number;
  sessions: number;
}

interface CountryRow {
  country: string;
  users: number;
  sessions: number;
  views: number;
}

interface JobRecord {
  id: number;
  job_id: string;
  property_id: string;
  report_type: string;
  date_range: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  rows_returned: number;
  api_requests_count: number;
  duration_ms: number;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
}

export const Ga4Dashboard: React.FC = () => {
  const [status, setStatus] = useState<Ga4Status | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '28d' | '90d' | 'custom'>('28d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [channels, setChannels] = useState<TrafficChannel[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [pages, setPages] = useState<PagePerformance[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [realtime, setRealtime] = useState<{ activeUsersLast30Min: number; screens: Array<{ screenName: string; activeUsers: number }> } | null>(null);

  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [jobStats, setJobStats] = useState<{ total: number; completed: number; failed: number; running: number }>({
    total: 0,
    completed: 0,
    failed: 0,
    running: 0
  });

  const [availableProps, setAvailableProps] = useState<Array<{ propertyId: string; displayName: string; accountName: string }>>([]);
  const [manualPropertyInput, setManualPropertyInput] = useState('');

  const [activeReportTab, setActiveReportTab] = useState<'traffic' | 'landing' | 'pages' | 'devices' | 'realtime' | 'activity'>('traffic');
  const [searchFilter, setSearchFilter] = useState('');

  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [isDisconnectingProperty, setIsDisconnectingProperty] = useState(false);
  const [propertyError, setPropertyError] = useState<string | null>(null);
  const [propertySuccess, setPropertySuccess] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load Status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.selectedProperty) {
          setManualPropertyInput(data.selectedProperty);
        }
      }
    } catch (err) {
      console.error('Failed to fetch GA4 status:', err);
    }
  }, []);

  // Load Accessible Properties
  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/analytics/properties');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.properties)) {
          setAvailableProps(data.properties);
        }
      }
    } catch (err) {
      console.error('Failed to list properties:', err);
    }
  }, []);

  // Load Reports
  const fetchReports = useCallback(async (refresh = false) => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({ dateRange });
      if (dateRange === 'custom' && customStart && customEnd) {
        queryParams.set('startDate', customStart);
        queryParams.set('endDate', customEnd);
      }
      if (refresh) queryParams.set('refresh', 'true');

      const [ovRes, chRes, lpRes, pgRes, devRes, rtRes, jbRes] = await Promise.all([
        fetch(`/api/admin/analytics/overview?${queryParams.toString()}`),
        fetch(`/api/admin/analytics/traffic-acquisition?${queryParams.toString()}`),
        fetch(`/api/admin/analytics/landing-pages?${queryParams.toString()}`),
        fetch(`/api/admin/analytics/page-performance?${queryParams.toString()}`),
        fetch(`/api/admin/analytics/devices-geography?${queryParams.toString()}`),
        fetch('/api/admin/analytics/realtime'),
        fetch('/api/admin/analytics/jobs')
      ]);

      if (ovRes.ok) setOverview(await ovRes.json());
      if (chRes.ok) {
        const chData = await chRes.json();
        setChannels(chData.channels || []);
      }
      if (lpRes.ok) {
        const lpData = await lpRes.json();
        setLandingPages(lpData.landingPages || []);
      }
      if (pgRes.ok) {
        const pgData = await pgRes.json();
        setPages(pgData.pages || []);
      }
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData.devices || []);
        setCountries(devData.countries || []);
      }
      if (rtRes.ok) {
        const rtData = await rtRes.json();
        setRealtime({
          activeUsersLast30Min: rtData.activeUsersLast30Min || 0,
          screens: rtData.screens || []
        });
      }
      if (jbRes.ok) {
        const jbData = await jbRes.json();
        setJobs(jbData.recentJobs || []);
        if (jbData.stats) setJobStats(jbData.stats);
      }
    } catch (err) {
      console.error('Failed to load GA4 reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchStatus();
    fetchProperties();
  }, [fetchStatus, fetchProperties]);

  useEffect(() => {
    if (status?.isConnected && status?.selectedProperty) {
      fetchReports();
    }
  }, [status?.isConnected, status?.selectedProperty, fetchReports]);

  // Connect / Reconnect Google OAuth
  const handleConnect = async () => {
    try {
      const res = await fetch('/api/admin/seo-research/google/auth-url');
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      }
    } catch (err) {
      console.error('Failed to get auth URL:', err);
    }
  };

  // Property Selection
  const handleSelectProperty = async (propId: string, name?: string) => {
    setPropertyError(null);
    setPropertySuccess(null);
    setIsSavingProperty(true);
    try {
      const res = await fetch('/api/admin/analytics/select-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: propId, propertyName: name })
      });
      const data = await res.json();
      if (!res.ok) {
        setPropertyError(data.error || 'Failed to select property.');
        return;
      }
      setPropertySuccess(`Property set to ${data.selectedPropertyName || data.selectedProperty}`);
      setIsEditingProperty(false);
      await fetchStatus();
      fetchReports(true);
    } catch (err: any) {
      setPropertyError(err.message || 'Network error while selecting property.');
    } finally {
      setIsSavingProperty(false);
    }
  };

  // Disconnect GA4 Property
  const handleDisconnectProperty = async () => {
    if (!window.confirm('Disconnect this Google Analytics 4 property? Google Search Console and OAuth tokens will remain intact.')) {
      return;
    }
    setIsDisconnectingProperty(true);
    setPropertyError(null);
    try {
      const res = await fetch('/api/admin/analytics/disconnect', { method: 'POST' });
      if (res.ok) {
        setPropertySuccess('Google Analytics property disconnected.');
        setOverview(null);
        setChannels([]);
        setLandingPages([]);
        setPages([]);
        setDevices([]);
        setCountries([]);
        setRealtime(null);
        setManualPropertyInput('');
        setIsEditingProperty(true);
        await fetchStatus();
      } else {
        const data = await res.json();
        setPropertyError(data.error || 'Failed to disconnect property.');
      }
    } catch (err: any) {
      setPropertyError(err.message || 'Error disconnecting property.');
    } finally {
      setIsDisconnectingProperty(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/analytics/test-connection', { method: 'POST' });
      const data = await res.json();
      setTestResult({ success: Boolean(data.success), message: data.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    }
  };

  // Sync Data
  const handleSyncData = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/analytics/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange })
      });
      if (res.ok) {
        await fetchReports(true);
        await fetchStatus();
      }
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins}m ${remainder < 10 ? '0' : ''}${remainder}s`;
  };

  const renderDelta = (delta: number) => {
    if (delta > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-400">
          <ArrowUpRight className="w-3.5 h-3.5" /> +{delta}%
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-xs font-medium text-rose-400">
          <ArrowDownRight className="w-3.5 h-3.5" /> {delta}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  };

  // Filter lists based on search
  const filteredChannels = channels.filter(c =>
    c.channelGroup.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.source.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.medium.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredLandingPages = landingPages.filter(l =>
    l.landingPage.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredPages = pages.filter(p =>
    p.pagePath.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.pageTitle.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner / Integration Status */}
      <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#252525]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#C7FF4D]/10 text-[#C7FF4D]">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  Google Analytics 4 (GA4)
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#1A1A1A] text-[#C7FF4D] border border-[#252525]">
                    Studio Analytics
                  </span>
                </h2>
                <p className="text-sm text-[#A5A5A5]">
                  Live website traffic, visitor engagement, acquisition sources, and performance telemetry.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#252525] bg-[#141414]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status?.connectionStatus === 'Connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : status?.connectionStatus === 'Missing GA4 Scope'
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="font-medium text-gray-200">
                  {status?.connectionStatus || 'Checking...'}
                </span>
              </span>

              {status?.googleEmail && (
                <span className="text-[#A5A5A5] flex items-center gap-1">
                  Account: <strong className="text-white">{status.googleEmail}</strong>
                </span>
              )}

              {status?.selectedProperty && (
                <span className="text-[#A5A5A5] flex items-center gap-1">
                  Property:{' '}
                  <strong className="text-white">
                    {status.selectedPropertyName || status.selectedProperty}
                  </strong>
                </span>
              )}

              {status?.lastSyncAt && (
                <span className="text-[#7A7A7A] flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Last synced:{' '}
                  {new Date(status.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSyncData}
              disabled={isSyncing || !status?.isConnected || !status?.selectedProperty}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1A1A] hover:bg-[#252525] text-white border border-[#333] transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Refresh Data'}
            </button>

            <button
              onClick={handleTestConnection}
              disabled={!status?.isConnected}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1A1A1A] hover:bg-[#252525] text-gray-300 border border-[#333] transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C7FF4D]" />
              Test API
            </button>

            <button
              onClick={handleConnect}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                status?.connectionStatus === 'Connected'
                  ? 'bg-[#181818] text-[#A5A5A5] border border-[#2B2B2B] hover:text-white'
                  : status?.connectionStatus === 'Missing GA4 Scope'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : status?.googleEmail
                  ? 'bg-[#181818] text-rose-300 border border-rose-800/40 hover:text-white'
                  : 'bg-[#C7FF4D] text-black hover:bg-[#B5EB38] shadow-lg shadow-[#C7FF4D]/20'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {status?.connectionStatus === 'Connected'
                ? 'Reconnect Google'
                : status?.connectionStatus === 'Missing GA4 Scope'
                ? 'Authorize GA4 Scope'
                : status?.googleEmail
                ? 'Reconnect Google (Fix Auth)'
                : 'Connect Google Account'}
            </button>
          </div>
        </div>

        {/* Warning if missing GA4 scope */}
        {status?.connectionStatus === 'Missing GA4 Scope' && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Google Analytics Scope Required</p>
              <p>
                Your Google account is currently authenticated for Search Console only. To enable GA4 traffic reporting, click <strong>"Authorize GA4 Scope"</strong> above to grant read-only analytics permission.
              </p>
            </div>
          </div>
        )}

        {/* Diagnostic Error Message */}
        {status?.diagnosticMessage && status?.connectionStatus === 'Error' && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-white">Authentication Diagnostic</p>
              <p>{status.diagnosticMessage}</p>
            </div>
          </div>
        )}

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center justify-between ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            <span>{testResult.message}</span>
            <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Persistent Property Management Card / Bar */}
        <div className="mt-4 pt-4 border-t border-[#202020] space-y-3">
          {/* Success Banner */}
            {propertySuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {propertySuccess}
                </span>
                <button onClick={() => setPropertySuccess(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            {/* Error Banner */}
            {propertyError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  {propertyError}
                </span>
                <button onClick={() => setPropertyError(null)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>
            )}

            {status?.selectedProperty && !isEditingProperty ? (
              // Current Saved Property Display
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#141414] border border-[#262626]">
                <div className="flex items-center gap-3 text-xs">
                  <div className="p-1.5 rounded-lg bg-[#C7FF4D]/10 text-[#C7FF4D]">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[#888]">Active Property: </span>
                    <strong className="text-white font-medium ml-1">
                      {status.selectedPropertyName || status.selectedProperty}
                    </strong>
                    <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1E1E] text-[#C7FF4D] border border-[#333]">
                      {status.selectedProperty}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsEditingProperty(true);
                      setPropertyError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333] transition flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    Change Property
                  </button>

                  <button
                    onClick={handleDisconnectProperty}
                    disabled={isDisconnectingProperty}
                    title="Disconnect GA4 property (preserves Google Search Console)"
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1C1C] hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-[#333] hover:border-rose-800/40 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isDisconnectingProperty ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                </div>
              </div>
            ) : (
              // Property Editor Form
              <div className="p-4 rounded-xl bg-[#141414] border border-[#2B2B2B] space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-[#C7FF4D] font-semibold">
                    <Target className="w-4 h-4 shrink-0" />
                    <span>{status?.selectedProperty ? 'Change Google Analytics Property' : 'Select Target GA4 Property'}</span>
                  </div>

                  {status?.selectedProperty && (
                    <button
                      onClick={() => {
                        setIsEditingProperty(false);
                        setPropertyError(null);
                      }}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 self-end md:self-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  )}
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                  {availableProps.length > 0 && (
                    <div className="flex-1">
                      <select
                        defaultValue=""
                        onChange={e => {
                          if (e.target.value) {
                            const sel = availableProps.find(p => p.propertyId === e.target.value);
                            handleSelectProperty(e.target.value, sel?.displayName);
                          }
                        }}
                        disabled={isSavingProperty}
                        className="w-full bg-[#0D0D0D] border border-[#333] text-white rounded-lg px-3 py-2 text-xs focus:border-[#C7FF4D] outline-none disabled:opacity-50"
                      >
                        <option value="">-- Or Choose Auto-Discovered Property --</option>
                        {availableProps.map(p => (
                          <option key={p.propertyId} value={p.propertyId}>
                            {p.displayName} ({p.propertyId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 123456789 or properties/123456789"
                      value={manualPropertyInput}
                      onChange={e => setManualPropertyInput(e.target.value)}
                      disabled={isSavingProperty}
                      className="flex-1 bg-[#0D0D0D] border border-[#333] text-white text-xs rounded-lg px-3 py-2 focus:border-[#C7FF4D] outline-none disabled:opacity-50 font-mono"
                    />
                    <button
                      onClick={() => handleSelectProperty(manualPropertyInput.trim())}
                      disabled={!manualPropertyInput.trim() || isSavingProperty}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-[#C7FF4D] text-black hover:bg-[#B5EB38] transition disabled:opacity-40 shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      {isSavingProperty ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Set Property
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>
                    Enter your <strong>9-digit numeric GA4 Property ID</strong> (found in Google Analytics under <em>Admin &gt; Property Settings</em>). Do not enter Measurement ID (<code>G-XXXXXX</code>).
                  </span>
                </p>
              </div>
            )}
          </div>
      </div>

      {/* Empty State when No Property is Configured */}
      {!status?.selectedProperty && (
        <div className="p-8 rounded-2xl bg-[#0F0F0F] border border-[#252525] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#C7FF4D]/10 text-[#C7FF4D] mx-auto flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No GA4 Property Selected</h3>
            <p className="text-xs text-[#8A8A8A] max-w-md mx-auto">
              Select or enter your numeric Google Analytics 4 Property ID in the banner above to load live traffic reports, audience channels, landing pages, and real-time visitor telemetry.
            </p>
          </div>
        </div>
      )}

      {/* Date Range Selector & Realtime Indicator */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-xl bg-[#0F0F0F] border border-[#252525] p-1">
          {(['7d', '28d', '90d', 'custom'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                dateRange === range
                  ? 'bg-[#C7FF4D] text-black shadow-sm'
                  : 'text-[#A5A5A5] hover:text-white'
              }`}
            >
              {range === '7d'
                ? 'Last 7 Days'
                : range === '28d'
                ? 'Last 28 Days'
                : range === '90d'
                ? 'Last 90 Days'
                : 'Custom Range'}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-[#121212] border border-[#2B2B2B] text-white rounded-lg px-2.5 py-1 text-xs outline-none"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-[#121212] border border-[#2B2B2B] text-white rounded-lg px-2.5 py-1 text-xs outline-none"
            />
          </div>
        )}

        {realtime && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-[#A5A5A5]">Live Users (30m):</span>
            <strong className="text-white font-mono text-sm">{realtime.activeUsersLast30Min}</strong>
          </div>
        )}
      </div>

      {/* KPI Headline Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Total Users</span>
              <Users className="w-3.5 h-3.5 text-[#C7FF4D]" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.totalUsers.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.totalUsers)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Active Users</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.activeUsers.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.activeUsers)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Sessions</span>
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.sessions.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.sessions)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Engagement Rate</span>
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {(overview.currentTotals.engagementRate * 100).toFixed(1)}%
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.engagementRate)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Avg Engagement</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {formatSeconds(overview.currentTotals.avgEngagementDurationSeconds)}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.avgEngagementDurationSeconds)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>New Users</span>
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.newUsers.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.newUsers)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Engaged Sessions</span>
              <Layers className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.engagedSessions.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.engagedSessions)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Page Views</span>
              <FileText className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.screenPageViews.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.screenPageViews)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Event Count</span>
              <Activity className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.eventCount.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.eventCount)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0F0F0F] border border-[#252525]">
            <div className="flex items-center justify-between text-xs text-[#8A8A8A] mb-1">
              <span>Key Events / Conv.</span>
              <Target className="w-3.5 h-3.5 text-[#C7FF4D]" />
            </div>
            <div className="text-xl font-bold font-mono text-white">
              {overview.currentTotals.conversions.toLocaleString()}
            </div>
            <div className="mt-1">
              {renderDelta(overview.percentageChanges.conversions)}
            </div>
          </div>
        </div>
      )}

      {/* SVG Trend Chart */}
      {overview && overview.timeline.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#252525] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#C7FF4D]" />
              Traffic Trend (Sessions & Active Users Over Time)
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-3 h-1 rounded bg-[#C7FF4D]" /> Sessions
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <span className="w-3 h-1 rounded bg-cyan-400" /> Active Users
              </span>
            </div>
          </div>

          {/* Responsive SVG Chart */}
          <div className="w-full h-48 overflow-hidden">
            <svg viewBox="0 0 1000 200" className="w-full h-full">
              <defs>
                <linearGradient id="sessionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C7FF4D" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#C7FF4D" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="1000" y2="40" stroke="#1F1F1F" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="1000" y2="100" stroke="#1F1F1F" strokeDasharray="4 4" />
              <line x1="0" y1="160" x2="1000" y2="160" stroke="#1F1F1F" strokeDasharray="4 4" />

              {/* Path calculation */}
              {(() => {
                const points = overview.timeline;
                const maxVal = Math.max(1, ...points.map(p => Math.max(p.sessions, p.activeUsers)));
                const step = points.length > 1 ? 1000 / (points.length - 1) : 1000;

                const sessionCoords = points.map((p, idx) => {
                  const x = idx * step;
                  const y = 180 - (p.sessions / maxVal) * 150;
                  return `${x},${y}`;
                });

                const userCoords = points.map((p, idx) => {
                  const x = idx * step;
                  const y = 180 - (p.activeUsers / maxVal) * 150;
                  return `${x},${y}`;
                });

                const areaPath = `M0,180 L${sessionCoords.join(' L')} L1000,180 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#sessionGrad)" />
                    <polyline
                      fill="none"
                      stroke="#C7FF4D"
                      strokeWidth="2.5"
                      points={sessionCoords.join(' ')}
                    />
                    <polyline
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                      points={userCoords.join(' ')}
                    />
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex justify-between text-[11px] text-[#6A6A6A] font-mono px-1">
            <span>{overview.timeline[0]?.date}</span>
            <span>{overview.timeline[Math.floor(overview.timeline.length / 2)]?.date}</span>
            <span>{overview.timeline[overview.timeline.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Report Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#202020] pb-2">
          {[
            { id: 'traffic', label: 'Traffic Acquisition', icon: Layers },
            { id: 'landing', label: 'Landing Pages', icon: Target },
            { id: 'pages', label: 'Page Performance', icon: FileText },
            { id: 'devices', label: 'Device & Geography', icon: Globe },
            { id: 'realtime', label: 'Real-Time Activity', icon: Radio },
            { id: 'activity', label: 'Job History & Telemetry', icon: Clock }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveReportTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  activeReportTab === tab.id
                    ? 'bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30'
                    : 'text-[#A5A5A5] hover:text-white hover:bg-[#141414]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {['traffic', 'landing', 'pages'].includes(activeReportTab) && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search table rows..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="bg-[#121212] border border-[#262626] text-white text-xs rounded-xl pl-9 pr-3 py-1.5 focus:border-[#C7FF4D] outline-none w-56"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Traffic Acquisition Table */}
      {activeReportTab === 'traffic' && (
        <div className="rounded-2xl bg-[#0F0F0F] border border-[#252525] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#888] font-mono border-b border-[#252525]">
                <tr>
                  <th className="px-4 py-3">Channel Group</th>
                  <th className="px-4 py-3">Source / Medium</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Users</th>
                  <th className="px-4 py-3 text-right">Engaged</th>
                  <th className="px-4 py-3 text-right">Engagement Rate</th>
                  <th className="px-4 py-3 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredChannels.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No traffic acquisition data found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredChannels.map((c, i) => (
                    <tr key={i} className="hover:bg-[#141414]/50 transition">
                      <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C7FF4D]" />
                        {c.channelGroup}
                      </td>
                      <td className="px-4 py-3 text-[#A5A5A5] font-mono">
                        {c.source} / {c.medium}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {c.sessions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {c.users.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {c.engagedSessions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#C7FF4D]">
                        {c.engagementRate}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white font-bold">
                        {c.conversions.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Landing Pages Table */}
      {activeReportTab === 'landing' && (
        <div className="rounded-2xl bg-[#0F0F0F] border border-[#252525] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#888] font-mono border-b border-[#252525]">
                <tr>
                  <th className="px-4 py-3">Landing Page</th>
                  <th className="px-4 py-3 text-right">Sessions</th>
                  <th className="px-4 py-3 text-right">Active Users</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Engagement Rate</th>
                  <th className="px-4 py-3 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredLandingPages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No landing page data found for this period.
                    </td>
                  </tr>
                ) : (
                  filteredLandingPages.map((l, i) => (
                    <tr key={i} className="hover:bg-[#141414]/50 transition">
                      <td className="px-4 py-3 font-mono text-white max-w-md truncate">
                        {l.landingPage}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white">
                        {l.sessions.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {l.users.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {l.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#C7FF4D]">
                        {l.engagementRate}%
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white font-bold">
                        {l.conversions.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Page Performance Table */}
      {activeReportTab === 'pages' && (
        <div className="rounded-2xl bg-[#0F0F0F] border border-[#252525] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#888] font-mono border-b border-[#252525]">
                <tr>
                  <th className="px-4 py-3">Page Path</th>
                  <th className="px-4 py-3">Page Title</th>
                  <th className="px-4 py-3 text-right">Views</th>
                  <th className="px-4 py-3 text-right">Active Users</th>
                  <th className="px-4 py-3 text-right">Avg Duration</th>
                  <th className="px-4 py-3 text-right">Events</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredPages.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No page performance data recorded.
                    </td>
                  </tr>
                ) : (
                  filteredPages.map((p, i) => (
                    <tr key={i} className="hover:bg-[#141414]/50 transition">
                      <td className="px-4 py-3 font-mono text-cyan-400 max-w-xs truncate">
                        {p.pagePath}
                      </td>
                      <td className="px-4 py-3 text-white max-w-sm truncate">
                        {p.pageTitle}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-white font-bold">
                        {p.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {p.activeUsers.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-400">
                        {formatSeconds(p.avgEngagementTimeSeconds)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#A5A5A5]">
                        {p.eventCount.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Device & Geography */}
      {activeReportTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Device breakdown */}
          <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-[#252525] space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[#C7FF4D]" />
              Device Category Share
            </h4>
            <div className="space-y-3">
              {devices.map((d, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="capitalize text-white font-medium">{d.deviceCategory}</span>
                    <span className="font-mono text-gray-400">
                      {d.users.toLocaleString()} users ({d.sessions} sessions)
                    </span>
                  </div>
                  <div className="w-full bg-[#1A1A1A] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#C7FF4D] h-full rounded-full"
                      style={{
                        width: `${
                          Math.round(
                            (d.users / Math.max(1, ...devices.map(x => x.users))) * 100
                          )
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Country breakdown */}
          <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-[#252525] space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Top Geographic Regions
            </h4>
            <div className="space-y-3">
              {countries.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#141414]">
                  <span className="text-white font-medium flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-500">#{i + 1}</span>
                    {c.country}
                  </span>
                  <span className="font-mono text-gray-300">
                    {c.users.toLocaleString()} users · {c.views.toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Real-time Activity */}
      {activeReportTab === 'realtime' && (
        <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#252525] space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                {realtime?.activeUsersLast30Min || 0}
              </div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mt-1">
                Active Users (30m)
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">Live Real-Time Stream</h4>
              <p className="text-xs text-[#A5A5A5]">
                Real-time active users and top pages currently being browsed on dawnexus.in.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-gray-300">Top Active Screen Titles:</h5>
            {realtime?.screens && realtime.screens.length > 0 ? (
              <div className="divide-y divide-[#202020] border border-[#202020] rounded-xl overflow-hidden">
                {realtime.screens.map((s, idx) => (
                  <div key={idx} className="p-3 bg-[#141414] flex justify-between items-center text-xs">
                    <span className="text-white font-mono">{s.screenName}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {s.activeUsers} active
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic p-4 bg-[#141414] rounded-xl text-center">
                No active sessions recorded in the last 30 minutes.
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: Job History & Telemetry */}
      {activeReportTab === 'activity' && (
        <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-[#252525] space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#252525] text-center">
              <div className="text-xl font-bold font-mono text-white">{jobStats.total}</div>
              <div className="text-[11px] text-gray-400">Total Jobs Attempted</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#252525] text-center">
              <div className="text-xl font-bold font-mono text-emerald-400">{jobStats.completed}</div>
              <div className="text-[11px] text-gray-400">Completed Successfully</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#252525] text-center">
              <div className="text-xl font-bold font-mono text-rose-400">{jobStats.failed}</div>
              <div className="text-[11px] text-gray-400">Failed / Errors</div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#141414] border border-[#252525] text-center">
              <div className="text-xl font-bold font-mono text-amber-400">{jobStats.running}</div>
              <div className="text-[11px] text-gray-400">Running / In Flight</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-300">Recent Report Execution Jobs:</h4>
            <div className="rounded-xl border border-[#202020] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141414] text-gray-400 font-mono">
                  <tr>
                    <th className="p-2.5">Job ID</th>
                    <th className="p-2.5">Report Type</th>
                    <th className="p-2.5">Range</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Rows</th>
                    <th className="p-2.5 text-right">Duration</th>
                    <th className="p-2.5">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#202020]">
                  {jobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-gray-500">
                        No report jobs tracked yet.
                      </td>
                    </tr>
                  ) : (
                    jobs.map(j => (
                      <tr key={j.id} className="hover:bg-[#151515]">
                        <td className="p-2.5 font-mono text-gray-300 text-[11px]">{j.job_id}</td>
                        <td className="p-2.5 text-white capitalize">{j.report_type}</td>
                        <td className="p-2.5 text-gray-400">{j.date_range}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              j.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : j.status === 'failed'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {j.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-gray-300">{j.rows_returned}</td>
                        <td className="p-2.5 text-right font-mono text-gray-400">{j.duration_ms}ms</td>
                        <td className="p-2.5 text-gray-500 text-[11px]">
                          {new Date(j.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

