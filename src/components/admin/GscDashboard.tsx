import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Check,
  Copy,
  FileText
} from 'lucide-react';

interface TimelinePoint {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PeriodTotals {
  clicks: number;
  impressions: number;
  avgCtr: number;
  avgPosition: number;
}

interface QueryComparisonRow {
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

interface TopPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface JobRecord {
  id: number;
  job_id: string;
  property: string;
  date_range: string;
  dimensions: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queries_returned: number;
  queries_saved: number;
  api_requests_count: number;
  duration_ms: number;
  error_message: string | null;
  triggered_by: string;
  created_at: string;
  completed_at: string | null;
}

interface ConnectionStatus {
  featureEnabled: boolean;
  hasGoogleCredentials: boolean;
  isConnected: boolean;
  connectionStatus: string;
  googleEmail: string | null;
  selectedProperty: string;
  lastSyncAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  redirectUri: string;
}

export const GscDashboard: React.FC = () => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '28d' | '3m'>('28d');
  const [timelineData, setTimelineData] = useState<TimelinePoint[]>([]);
  const [currentTotals, setCurrentTotals] = useState<PeriodTotals>({ clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 });
  const [previousTotals, setPreviousTotals] = useState<PeriodTotals>({ clicks: 0, impressions: 0, avgCtr: 0, avgPosition: 0 });
  const [queries, setQueries] = useState<QueryComparisonRow[]>([]);
  const [topPages, setTopPages] = useState<TopPageRow[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [properties, setProperties] = useState<Array<{ siteUrl: string; permissionLevel: string }>>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [intentFilter, setIntentFilter] = useState('All');
  const [queryPage, setQueryPage] = useState(1);
  const pageSize = 15;

  // Prompt Generator Modal State
  const [selectedQueryRow, setSelectedQueryRow] = useState<QueryComparisonRow | null>(null);
  const [promptText, setPromptText] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/seo-research/status', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  }, []);

  // Fetch properties
  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/seo-research/properties', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties || []);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    }
  }, []);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/seo-research/jobs?limit=10', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!status?.isConnected) return;
    setIsLoading(true);
    setApiError(null);
    try {
      // 1. Timeline & totals
      const timelineRes = await fetch(`/api/admin/seo-research/timeline?dateRange=${dateRange}`, { credentials: 'include' });
      const timelineJson = await timelineRes.json();
      if (!timelineRes.ok) {
        setApiError(timelineJson.error || 'Failed to fetch timeline metrics');
      } else {
        setTimelineData(timelineJson.timeline || []);
        if (timelineJson.currentTotals) setCurrentTotals(timelineJson.currentTotals);
        if (timelineJson.previousTotals) setPreviousTotals(timelineJson.previousTotals);
      }

      // 2. Query Comparison
      const queriesRes = await fetch(`/api/admin/seo-research/query-comparison?dateRange=${dateRange}&limit=100`, { credentials: 'include' });
      if (queriesRes.ok) {
        const queriesJson = await queriesRes.json();
        setQueries(queriesJson.queries || []);
      }

      // 3. Top Pages
      const pagesRes = await fetch('/api/admin/seo-research/top-pages?limit=20', { credentials: 'include' });
      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        setTopPages(pagesJson.pages || []);
      }

      // 4. Jobs
      fetchJobs();
    } catch (err: any) {
      setApiError(err?.message || 'Error fetching Search Console metrics');
    } finally {
      setIsLoading(false);
    }
  }, [status?.isConnected, dateRange, fetchJobs]);

  useEffect(() => {
    fetchStatus();
    fetchProperties();
    fetchJobs();
  }, [fetchStatus, fetchProperties, fetchJobs]);

  useEffect(() => {
    if (status?.isConnected) {
      fetchData();
    }
  }, [status?.isConnected, fetchData]);

  // Connect Google Search Console via OAuth
  const handleConnect = async () => {
    try {
      const res = await fetch('/api/admin/seo-research/google/auth-url', { credentials: 'include' });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || 'Failed to initiate Google authentication.');
      }
    } catch {
      alert('Network error initiating Google OAuth.');
    }
  };

  // Disconnect Google Search Console
  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Search Console? Live performance metrics will no longer be retrieved.')) return;
    try {
      const res = await fetch('/api/admin/seo-research/disconnect', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        fetchStatus();
        setTimelineData([]);
        setQueries([]);
        setTopPages([]);
      }
    } catch {
      alert('Error disconnecting Google Search Console.');
    }
  };

  // Switch Property
  const handleSwitchProperty = async (newProp: string) => {
    if (!newProp || newProp === status?.selectedProperty) return;
    try {
      const res = await fetch('/api/admin/seo-research/select-property', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyUrl: newProp })
      });
      if (res.ok) {
        await fetchStatus();
        fetchData();
      }
    } catch {
      alert('Failed to switch property.');
    }
  };

  // Manual Trigger Sync
  const handleRunSync = async () => {
    setIsSyncing(true);
    setApiError(null);
    try {
      const res = await fetch('/api/admin/seo-research/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange: dateRange === '3m' ? '3m' : '28d' })
      });
      const data = await res.json();
      if (res.ok) {
        await fetchStatus();
        await fetchData();
      } else {
        setApiError(data.error || 'Sync failed.');
      }
    } catch (err: any) {
      setApiError(err?.message || 'Sync error.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Generate Prompt
  const handleGeneratePrompt = async (row: QueryComparisonRow) => {
    setSelectedQueryRow(row);
    setIsGeneratingPrompt(true);
    setPromptText('');
    try {
      const res = await fetch('/api/admin/seo-research/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetKeyword: row.query,
          searchIntent: row.intent,
          articleType: 'Comprehensive Strategic Guide & Practical Framework',
          secondaryKeywords: [`${row.query} best practices`, `${row.query} checklist 2026`, `${row.query} pricing`],
          opportunityRationale: `Ranked #${row.position} with ${row.impressions} impressions and ${(row.ctr * 100).toFixed(1)}% CTR.`
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPromptText(data.prompt);
      }
    } catch (err) {
      console.error('Failed to generate prompt:', err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Filter queries
  const filteredQueries = queries.filter(q => {
    const matchesSearch = !searchQuery.trim() || q.query.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesIntent = intentFilter === 'All' || q.intent === intentFilter;
    return matchesSearch && matchesIntent;
  });

  const totalQueryPages = Math.ceil(filteredQueries.length / pageSize) || 1;
  const paginatedQueries = filteredQueries.slice((queryPage - 1) * pageSize, queryPage * pageSize);

  // Calculate Deltas for Summary Cards
  const clicksDelta = currentTotals.clicks - previousTotals.clicks;
  const impressionsDelta = currentTotals.impressions - previousTotals.impressions;
  const ctrDelta = Number((currentTotals.avgCtr - previousTotals.avgCtr).toFixed(2));
  const posDelta = Number((previousTotals.avgPosition - currentTotals.avgPosition).toFixed(1)); // rank improvement is positive

  // Simple SVG Line Chart generator
  const renderSvgTimeline = () => {
    if (timelineData.length === 0) return null;
    const width = 800;
    const height = 180;
    const padding = 20;

    const maxClicks = Math.max(...timelineData.map(d => d.clicks), 10);
    const maxImp = Math.max(...timelineData.map(d => d.impressions), 50);

    const getX = (idx: number) => padding + (idx / (timelineData.length - 1 || 1)) * (width - 2 * padding);
    const getClicksY = (val: number) => height - padding - (val / maxClicks) * (height - 2 * padding);
    const getImpY = (val: number) => height - padding - (val / maxImp) * (height - 2 * padding);

    const clicksPoints = timelineData.map((d, i) => `${getX(i)},${getClicksY(d.clicks)}`).join(' ');
    const impPoints = timelineData.map((d, i) => `${getX(i)},${getImpY(d.impressions)}`).join(' ');

    return (
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44">
          <defs>
            <linearGradient id="gscClicksGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C7FF4D" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C7FF4D" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#252525" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#252525" strokeWidth="1" strokeDasharray="3,3" />
          
          {/* Impressions line (Cyan/Grey) */}
          <polyline fill="none" stroke="#60A5FA" strokeWidth="1.5" strokeOpacity="0.6" points={impPoints} />
          {/* Clicks line (Lime green) */}
          <polyline fill="none" stroke="#C7FF4D" strokeWidth="2.5" points={clicksPoints} />
          
          {/* End markers */}
          {timelineData.map((d, i) => (
            i % 4 === 0 || i === timelineData.length - 1 ? (
              <g key={i}>
                <circle cx={getX(i)} cy={getClicksY(d.clicks)} r="3" fill="#C7FF4D" />
                <text x={getX(i)} y={height - 4} fontSize="9" fill="#707070" textAnchor="middle">
                  {d.date.slice(5)}
                </text>
              </g>
            ) : null
          ))}
        </svg>
        <div className="flex items-center justify-end gap-6 text-xs text-[#A5A5A5] pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#C7FF4D]" />
            <span>Organic Clicks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#60A5FA]" />
            <span>Search Impressions</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Connection Status Box */}
      <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#252525]">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#C7FF4D]/10 text-[#C7FF4D]">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Google Search Console Dashboard</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    status?.isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {status?.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </h2>
                <p className="text-xs text-[#A5A5A5] mt-1">
                  Expose live Google SERP analytics, keyword rankings, period deltas, and sync jobs to the admin dashboard and ChatGPT MCP server.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {status?.isConnected ? (
              <>
                <button
                  onClick={handleRunSync}
                  disabled={isSyncing}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] text-white flex items-center gap-2 transition-colors disabled:opacity-50"
                  title="Run Search Console ingestion job"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#C7FF4D]' : ''}`} />
                  <span>{isSyncing ? 'Synchronizing...' : 'Sync Search Data'}</span>
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/20 border border-red-900/30 transition-colors"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] shadow-md shadow-[#C7FF4D]/10 flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Connect Google Search Console</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry and Property Bar */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-[#707070]">Connected Account:</span>
            <div className="font-mono text-white mt-0.5 truncate">
              {status?.googleEmail || 'None (Requires Google OAuth)'}
            </div>
          </div>

          <div>
            <span className="text-[#707070]">Selected Property:</span>
            {properties.length > 0 ? (
              <select
                value={status?.selectedProperty || ''}
                onChange={e => handleSwitchProperty(e.target.value)}
                className="w-full mt-0.5 bg-[#141414] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
              >
                {properties.map(p => (
                  <option key={p.siteUrl} value={p.siteUrl}>
                    {p.siteUrl} ({p.permissionLevel.toLowerCase()})
                  </option>
                ))}
              </select>
            ) : (
              <div className="font-mono text-white mt-0.5">
                {status?.selectedProperty || 'https://dawnexus.in/'}
              </div>
            )}
          </div>

          <div>
            <span className="text-[#707070]">Last Successful Sync:</span>
            <div className="font-mono text-[#A5A5A5] mt-0.5">
              {status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'No sync recorded yet'}
            </div>
          </div>
        </div>

        {apiError && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{apiError}</span>
          </div>
        )}
      </div>

      {/* Date Range Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#A5A5A5]">Analysis Period:</span>
          {(['7d', '28d', '3m'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition-colors ${
                dateRange === range
                  ? 'bg-[#C7FF4D] text-[#050505]'
                  : 'bg-[#0B0B0B] text-[#A5A5A5] hover:text-white border border-[#252525]'
              }`}
            >
              {range === '7d' ? 'Last 7 Days' : range === '28d' ? 'Last 28 Days' : 'Last 3 Months'}
            </button>
          ))}
        </div>

        <button
          onClick={fetchData}
          disabled={isLoading || !status?.isConnected}
          className="p-2 rounded-xl bg-[#0B0B0B] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#C7FF4D] transition-colors self-end"
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C7FF4D]' : ''}`} />
        </button>
      </div>

      {/* Overview Cards with Comparison Deltas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organic Clicks */}
        <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] relative overflow-hidden">
          <div className="text-xs text-[#A5A5A5]">Organic SERP Clicks</div>
          <div className="text-2xl font-extrabold text-[#C7FF4D] mt-1 font-mono">
            {currentTotals.clicks.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {clicksDelta > 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{clicksDelta.toLocaleString()}
              </span>
            ) : clicksDelta < 0 ? (
              <span className="text-red-400 flex items-center gap-0.5 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> {clicksDelta.toLocaleString()}
              </span>
            ) : (
              <span className="text-[#707070] flex items-center gap-0.5">
                <Minus className="w-3 h-3" /> 0
              </span>
            )}
            <span className="text-[#707070]">vs previous period</span>
          </div>
        </div>

        {/* Impressions */}
        <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          <div className="text-xs text-[#A5A5A5]">Search Impressions</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">
            {currentTotals.impressions.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {impressionsDelta > 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{impressionsDelta.toLocaleString()}
              </span>
            ) : impressionsDelta < 0 ? (
              <span className="text-red-400 flex items-center gap-0.5 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> {impressionsDelta.toLocaleString()}
              </span>
            ) : (
              <span className="text-[#707070] flex items-center gap-0.5">
                <Minus className="w-3 h-3" /> 0
              </span>
            )}
            <span className="text-[#707070]">vs previous period</span>
          </div>
        </div>

        {/* Average CTR */}
        <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          <div className="text-xs text-[#A5A5A5]">Average CTR</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">
            {currentTotals.avgCtr}%
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {ctrDelta > 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{ctrDelta}%
              </span>
            ) : ctrDelta < 0 ? (
              <span className="text-red-400 flex items-center gap-0.5 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> {ctrDelta}%
              </span>
            ) : (
              <span className="text-[#707070] flex items-center gap-0.5">
                <Minus className="w-3 h-3" /> 0%
              </span>
            )}
            <span className="text-[#707070]">vs previous period</span>
          </div>
        </div>

        {/* Average Position */}
        <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          <div className="text-xs text-[#A5A5A5]">Average SERP Position</div>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">
            #{currentTotals.avgPosition}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs">
            {posDelta > 0 ? (
              <span className="text-emerald-400 flex items-center gap-0.5 font-semibold">
                <ArrowUpRight className="w-3.5 h-3.5" /> +{posDelta} ranks
              </span>
            ) : posDelta < 0 ? (
              <span className="text-red-400 flex items-center gap-0.5 font-semibold">
                <ArrowDownRight className="w-3.5 h-3.5" /> {posDelta} ranks
              </span>
            ) : (
              <span className="text-[#707070] flex items-center gap-0.5">
                <Minus className="w-3 h-3" /> 0
              </span>
            )}
            <span className="text-[#707070]">rank change</span>
          </div>
        </div>
      </div>

      {/* Performance Timeline SVG Chart */}
      <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C7FF4D]" />
            <span>Search Performance Timeline (SERP Clicks & Impressions)</span>
          </h3>
          <span className="text-xs text-[#707070]">Daily aggregated metrics</span>
        </div>
        {timelineData.length > 0 ? (
          renderSvgTimeline()
        ) : (
          <div className="py-12 text-center text-xs text-[#707070]">
            {status?.isConnected
              ? 'No timeline points returned for the selected date range. Ensure the selected Search Console property has active search queries.'
              : 'Connect Google Search Console above to render live search trend graphs.'}
          </div>
        )}
      </div>

      {/* Top Search Queries Table with Period Comparison */}
      <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-[#C7FF4D]" />
              <span>Search Queries Performance & Period Deltas</span>
            </h3>
            <p className="text-xs text-[#707070] mt-0.5">
              Detailed breakdown of queries driving clicks and impressions, with rank changes and search intent.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter search queries..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setQueryPage(1); }}
                className="bg-[#141414] border border-[#252525] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#707070] focus:outline-none focus:border-[#C7FF4D]"
              />
            </div>

            <select
              value={intentFilter}
              onChange={e => { setIntentFilter(e.target.value); setQueryPage(1); }}
              className="bg-[#141414] border border-[#252525] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
            >
              <option value="All">All Intents</option>
              <option value="Informational">Informational</option>
              <option value="Commercial">Commercial</option>
              <option value="Transactional">Transactional</option>
              <option value="Navigational">Navigational</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-[#252525]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141414] text-[#A5A5A5] border-b border-[#252525] font-mono">
              <tr>
                <th className="py-3 px-4">Search Query</th>
                <th className="py-3 px-3">Intent</th>
                <th className="py-3 px-3 text-right">Clicks (Delta)</th>
                <th className="py-3 px-3 text-right">Impressions (Delta)</th>
                <th className="py-3 px-3 text-right">CTR</th>
                <th className="py-3 px-3 text-right">Position</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f1f1f]">
              {paginatedQueries.length > 0 ? (
                paginatedQueries.map((q, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                      {q.query}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        q.intent === 'Commercial'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : q.intent === 'Transactional'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : q.intent === 'Navigational'
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {q.intent}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      <span>{q.clicks}</span>
                      {q.clicksChange !== 0 && (
                        <span className={`text-[10px] ml-1.5 ${q.clicksChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ({q.clicksChange > 0 ? `+${q.clicksChange}` : q.clicksChange})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[#A5A5A5]">
                      <span>{q.impressions.toLocaleString()}</span>
                      {q.impressionsChange !== 0 && (
                        <span className={`text-[10px] ml-1.5 ${q.impressionsChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ({q.impressionsChange > 0 ? `+${q.impressionsChange}` : q.impressionsChange})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-white">
                      {(q.ctr * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      <span className="text-white">#{q.position}</span>
                      {q.positionChange !== 0 && (
                        <span className={`text-[10px] ml-1.5 ${q.positionChange > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          ({q.positionChange > 0 ? `+${q.positionChange}` : q.positionChange})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleGeneratePrompt(q)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#C7FF4D]/10 hover:bg-[#C7FF4D]/20 text-[#C7FF4D] transition-colors"
                      >
                        Create Blog
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#707070]">
                    {status?.isConnected ? 'No queries match your search filter.' : 'Search Console is not connected.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalQueryPages > 1 && (
          <div className="flex items-center justify-between text-xs text-[#A5A5A5] pt-2">
            <div>
              Showing {((queryPage - 1) * pageSize) + 1} to {Math.min(queryPage * pageSize, filteredQueries.length)} of {filteredQueries.length} queries
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQueryPage(p => Math.max(1, p - 1))}
                disabled={queryPage === 1}
                className="px-3 py-1 rounded-lg bg-[#141414] border border-[#252525] disabled:opacity-30 hover:text-white"
              >
                Previous
              </button>
              <span className="font-mono">{queryPage} / {totalQueryPages}</span>
              <button
                onClick={() => setQueryPage(p => Math.min(totalQueryPages, p + 1))}
                disabled={queryPage === totalQueryPages}
                className="px-3 py-1 rounded-lg bg-[#141414] border border-[#252525] disabled:opacity-30 hover:text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Landing Pages & Research Job Feed Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Landing Pages */}
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C7FF4D]" />
            <span>Top Performing Landing Pages</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-[#252525]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#A5A5A5] border-b border-[#252525] font-mono">
                <tr>
                  <th className="py-2.5 px-3">Page URL</th>
                  <th className="py-2.5 px-3 text-right">Clicks</th>
                  <th className="py-2.5 px-3 text-right">Impressions</th>
                  <th className="py-2.5 px-3 text-right">CTR</th>
                  <th className="py-2.5 px-3 text-right">Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f1f1f]">
                {topPages.length > 0 ? (
                  topPages.map((p, idx) => (
                    <tr key={idx} className="hover:bg-[#141414]/50">
                      <td className="py-2.5 px-3 font-mono text-white truncate max-w-[200px]" title={p.page}>
                        {p.page.replace('https://dawnexus.in', '') || '/'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#C7FF4D] font-bold">
                        {p.clicks}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#A5A5A5]">
                        {p.impressions.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-white">
                        {(p.ctr * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[#A5A5A5]">
                        #{p.position}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#707070]">
                      No pages recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Research Sync Activity Feed */}
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C7FF4D]" />
              <span>Research Synchronization Feed</span>
            </h3>
            <span className="text-[11px] text-[#707070] font-mono">Recent 10 runs</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {jobs.length > 0 ? (
              jobs.map(j => (
                <div key={j.id} className="p-3.5 rounded-xl bg-[#141414] border border-[#252525] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-white">{j.job_id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      j.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : j.status === 'running'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {j.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#A5A5A5] pt-1 border-t border-[#1f1f1f]">
                    <div>API Calls: <span className="font-mono text-white">{j.api_requests_count}</span></div>
                    <div>Queries Saved: <span className="font-mono text-white">{j.queries_saved}</span></div>
                    <div>Duration: <span className="font-mono text-white">{j.duration_ms}ms</span></div>
                    <div>Trigger: <span className="font-mono text-[#C7FF4D]">{j.triggered_by}</span></div>
                  </div>

                  {j.error_message && (
                    <div className="text-[11px] text-red-400 pt-1">
                      Error: {j.error_message}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-[#707070]">
                No research sync jobs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Generator Modal */}
      {selectedQueryRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#252525] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C7FF4D]" />
                <h3 className="text-base font-bold text-white">
                  Generate SEO Blog Prompt for ChatGPT
                </h3>
              </div>
              <button
                onClick={() => setSelectedQueryRow(null)}
                className="text-[#707070] hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="text-xs text-[#707070]">Target Search Query:</div>
              <div className="text-sm font-bold text-[#C7FF4D] font-mono mt-0.5">
                "{selectedQueryRow.query}"
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#141414] border border-[#252525] max-h-72 overflow-y-auto">
              {isGeneratingPrompt ? (
                <div className="flex items-center justify-center py-10 gap-2 text-xs text-[#A5A5A5]">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#C7FF4D]" />
                  <span>Drafting authoritative SEO prompt structure...</span>
                </div>
              ) : (
                <pre className="text-xs text-white font-mono whitespace-pre-wrap">
                  {promptText || 'Failed to render prompt.'}
                </pre>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-[#707070]">
                Paste this into ChatGPT or run via AI SEO Studio MCP
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedQueryRow(null)}
                  className="px-4 py-2 rounded-xl text-xs text-[#A5A5A5] hover:text-white"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(promptText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  disabled={!promptText}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

