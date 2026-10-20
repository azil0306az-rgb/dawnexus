import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Eye,
  Activity,
  MousePointer,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Sliders,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  FileText
} from 'lucide-react';

interface OverviewMetrics {
  totalVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  conversionRate: number;
  avgScrollDepth: number;
  formAbandonmentRate: number;
  humanSessions: number;
  botSessions: number;
}

interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
  dropoffPercentage: number;
}

interface JourneyRecord {
  sessionId: string;
  visitorId: string;
  pathSequence: string[];
  durationSeconds: number;
  deviceType: string;
  hasConverted: boolean;
  landingPage: string;
  exitPage: string;
  eventCount: number;
}

interface HeatmapClickPoint {
  xPct: number;
  yPct: number;
  clickCount: number;
  targetTag: string;
}

interface ReplayEvent {
  t: number;
  type: string;
  x?: number;
  y?: number;
  scrollPct?: number;
  target?: string;
  url?: string;
}

export const BehaviourAnalyticsDashboard: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [excludeBots, setExcludeBots] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'funnel' | 'journeys' | 'heatmaps' | 'replays' | 'forms' | 'bots'>('funnel');

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalVisitors: 0,
    totalSessions: 0,
    totalPageViews: 0,
    conversionRate: 0,
    avgScrollDepth: 0,
    formAbandonmentRate: 0,
    humanSessions: 0,
    botSessions: 0
  });

  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [journeys, setJourneys] = useState<JourneyRecord[]>([]);
  const [selectedHeatmapPage, setSelectedHeatmapPage] = useState<string>('/');
  const [heatmapClicks, setHeatmapClicks] = useState<HeatmapClickPoint[]>([]);
  const [scrollDepths, setScrollDepths] = useState<{ depth25: number; depth50: number; depth75: number; depth100: number }>({
    depth25: 0,
    depth50: 0,
    depth75: 0,
    depth100: 0
  });

  // Replay player state
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replayTime, setReplayTime] = useState<number>(0);
  const [replayDuration, setReplayDuration] = useState<number>(100);

  // Form Abandonment state
  const [formStats, setFormStats] = useState<any>({
    totalStarts: 0,
    totalSubmits: 0,
    abandonmentRate: 0,
    dropoffFields: [],
    errorCounts: []
  });

  // Bot filter stats
  const [botStats, setBotStats] = useState<any>({
    totalRequests: 0,
    botRequests: 0,
    humanRequests: 0,
    botSignatures: []
  });

  const [isCleaningUp, setIsCleaningUp] = useState<boolean>(false);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/overview?days=${days}&excludeBots=${excludeBots}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || metrics);
      }
    } catch (err) {
      console.error('Failed to fetch behaviour overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [days, excludeBots]);

  const fetchFunnel = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/funnel?days=${days}&excludeBots=${excludeBots}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFunnel(data.steps || []);
      }
    } catch (err) {
      console.error('Failed to fetch funnel:', err);
    }
  }, [days, excludeBots]);

  const fetchJourneys = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/journeys?days=${days}&limit=20&excludeBots=${excludeBots}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setJourneys(data.journeys || []);
      }
    } catch (err) {
      console.error('Failed to fetch journeys:', err);
    }
  }, [days, excludeBots]);

  const fetchHeatmap = useCallback(async (pageUrl: string) => {
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/heatmap?page=${encodeURIComponent(pageUrl)}&days=${days}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setHeatmapClicks(data.clicks || []);
        if (data.scrollDepth) {
          setScrollDepths(data.scrollDepth);
        }
      }
    } catch (err) {
      console.error('Failed to fetch heatmap:', err);
    }
  }, [days]);

  const fetchFormAbandonment = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/form-abandonment?days=${days}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setFormStats(data || {});
      }
    } catch (err) {
      console.error('Failed to fetch form abandonment:', err);
    }
  }, [days]);

  const fetchBotStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/bot-stats?days=${days}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setBotStats(data || {});
      }
    } catch (err) {
      console.error('Failed to fetch bot stats:', err);
    }
  }, [days]);

  const loadSessionReplay = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setIsReplaying(false);
    setReplayTime(0);
    try {
      const res = await fetch(`/api/admin/analytics/behaviour/replay/${sessionId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setReplayEvents(data.events || []);
        setReplayDuration(data.durationMs || 100);
      }
    } catch (err) {
      console.error('Failed to load session replay:', err);
    }
  };

  const handleCleanupRetention = async () => {
    if (!window.confirm('Delete visitor behaviour events and replay data older than 90 days? Aggregate statistics are retained.')) {
      return;
    }
    setIsCleaningUp(true);
    try {
      const res = await fetch('/api/admin/analytics/behaviour/cleanup', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      setCleanupMessage(data.message || 'Retention cleanup completed.');
      setTimeout(() => setCleanupMessage(null), 5000);
      fetchOverview();
    } catch (err) {
      console.error('Cleanup failed:', err);
      setCleanupMessage('Cleanup failed.');
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchFunnel();
    fetchJourneys();
    fetchHeatmap(selectedHeatmapPage);
    fetchFormAbandonment();
    fetchBotStats();
  }, [fetchOverview, fetchFunnel, fetchJourneys, fetchHeatmap, selectedHeatmapPage, fetchFormAbandonment, fetchBotStats]);

  // Replay playback timer
  useEffect(() => {
    let timer: any;
    if (isReplaying) {
      timer = setInterval(() => {
        setReplayTime(prev => {
          if (prev >= replayDuration) {
            setIsReplaying(false);
            return replayDuration;
          }
          return prev + 250;
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isReplaying, replayDuration]);

  // Current replay event pointer
  const currentEvent = replayEvents.find(e => e.t <= replayTime) || replayEvents[0];

  return (
    <div className="space-y-8">
      {/* Top Header & Global Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#C7FF4D]" />
            <h2 className="text-xl font-bold text-white tracking-tight">Website Behaviour Intelligence</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#333] text-[10px] font-mono text-[#C7FF4D]">
              v6.1.3 First-Party
            </span>
          </div>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Privacy-aware tracking, conversion funnels, scroll & click heatmaps, and session diagnosis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Days filter */}
          <div className="flex items-center bg-[#050505] rounded-xl border border-[#252525] p-1 text-xs">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg font-mono transition-colors ${
                  days === d ? 'bg-[#C7FF4D] text-[#050505] font-bold' : 'text-[#A5A5A5] hover:text-white'
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          {/* Bot filter toggle */}
          <button
            onClick={() => setExcludeBots(!excludeBots)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              excludeBots
                ? 'bg-[#050505] text-[#C7FF4D] border-[#C7FF4D]/40'
                : 'bg-[#151515] text-[#A5A5A5] border-[#252525]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{excludeBots ? 'Bots Filtered' : 'All Traffic'}</span>
          </button>

          {/* Retention cleanup */}
          <button
            onClick={handleCleanupRetention}
            disabled={isCleaningUp}
            title="Purge events and replays older than 90 days"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-[#A5A5A5] hover:text-red-400 bg-[#050505] border border-[#252525] hover:border-red-500/40 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>90D Cleanup</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => {
              fetchOverview();
              fetchFunnel();
              fetchJourneys();
            }}
            className="p-2 rounded-xl bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {cleanupMessage && (
        <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#C7FF4D]/40 text-xs text-[#C7FF4D] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{cleanupMessage}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Unique Visitors</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {metrics.totalVisitors.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#A5A5A5] font-mono mt-1 block">pseudonymous d_vid</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Total Sessions</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {metrics.totalSessions.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#C7FF4D] font-mono mt-1 block">
            {metrics.humanSessions} human ({Math.round((metrics.humanSessions / (metrics.totalSessions || 1)) * 100)}%)
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Page Views</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {metrics.totalPageViews.toLocaleString()}
          </span>
          <span className="text-[11px] text-[#A5A5A5] font-mono mt-1 block">tracked in-app</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Conversion Rate</span>
          <span className="text-2xl font-bold font-mono text-[#C7FF4D] mt-1 block">
            {metrics.conversionRate.toFixed(2)}%
          </span>
          <span className="text-[11px] text-[#A5A5A5] font-mono mt-1 block">enquiry / visitor</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Avg Scroll Depth</span>
          <span className="text-2xl font-bold font-mono text-white mt-1 block">
            {Math.round(metrics.avgScrollDepth)}%
          </span>
          <span className="text-[11px] text-[#A5A5A5] font-mono mt-1 block">across service pages</span>
        </div>

        <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
          <span className="text-xs text-[#A5A5A5] block">Form Abandonment</span>
          <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
            {Math.round(metrics.formAbandonmentRate)}%
          </span>
          <span className="text-[11px] text-[#A5A5A5] font-mono mt-1 block">started without submit</span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-[#252525] pb-3 text-xs font-medium">
        {[
          { id: 'funnel', label: 'Conversion Funnel' },
          { id: 'journeys', label: 'Visitor Journeys' },
          { id: 'heatmaps', label: 'Heatmaps & Scroll Depth' },
          { id: 'replays', label: 'Session Replay' },
          { id: 'forms', label: 'Form Abandonment' },
          { id: 'bots', label: 'Bot Traffic Audit' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeSubTab === tab.id
                ? 'bg-[#C7FF4D] text-[#050505] font-bold shadow'
                : 'text-[#A5A5A5] hover:text-white bg-[#0B0B0B] border border-[#252525]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: CONVERSION FUNNEL */}
      {activeSubTab === 'funnel' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">7-Step Commercial Conversion Funnel</h3>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Tracks progression from first landing visit through to confirmed enquiry submission.
              </p>
            </div>
            <span className="text-xs font-mono text-[#C7FF4D]">Aggregated 30 Days</span>
          </div>

          <div className="space-y-3">
            {funnel.map((step, idx) => {
              const prevCount = idx > 0 ? funnel[idx - 1].count : step.count;
              const stepDropoff = prevCount > 0 ? Math.round(((prevCount - step.count) / prevCount) * 100) : 0;

              return (
                <div key={idx} className="p-4 rounded-xl bg-[#050505] border border-[#252525]">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#1A1A1A] text-[#C7FF4D] font-mono text-[10px] flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-white">{step.step}</span>
                    </div>
                    <div className="flex items-center gap-4 font-mono text-[11px]">
                      <span className="text-white font-bold">{step.count.toLocaleString()} sessions</span>
                      <span className="text-[#C7FF4D]">{step.percentage}% of total</span>
                      {idx > 0 && (
                        <span className="text-red-400">-{stepDropoff}% drop</span>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C7FF4D] to-[#88cc14] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(step.percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: VISITOR JOURNEYS */}
      {activeSubTab === 'journeys' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Top Visitor Journeys</h3>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Real anonymous path sequences from landing to exit or conversion.
              </p>
            </div>
            <span className="text-xs font-mono text-[#A5A5A5]">Showing last 20 sessions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#252525] text-[#A5A5A5] font-mono text-[11px]">
                  <th className="pb-3">Session</th>
                  <th className="pb-3">Device</th>
                  <th className="pb-3">Path Sequence</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Outcome</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252525]">
                {journeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#A5A5A5]">
                      No visitor journeys recorded yet. Visitor journeys will populate as visitors browse the site.
                    </td>
                  </tr>
                ) : (
                  journeys.map((j, idx) => (
                    <tr key={idx} className="hover:bg-[#050505] transition-colors">
                      <td className="py-3 font-mono text-white/80">
                        {j.sessionId ? j.sessionId.substring(0, 10) + '...' : `S-${idx}`}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#151515] text-[#A5A5A5] capitalize">
                          {j.deviceType === 'mobile' ? (
                            <Smartphone className="w-3 h-3 text-[#C7FF4D]" />
                          ) : (
                            <Monitor className="w-3 h-3 text-[#A5A5A5]" />
                          )}
                          {j.deviceType || 'desktop'}
                        </span>
                      </td>
                      <td className="py-3 max-w-md">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                          {Array.isArray(j.pathSequence) && j.pathSequence.map((p, pIdx) => (
                            <React.Fragment key={pIdx}>
                              <span className="px-2 py-0.5 rounded bg-[#1A1A1A] border border-[#252525] text-white">
                                {p}
                              </span>
                              {pIdx < j.pathSequence.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-[#555]" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-[#A5A5A5]">
                        {Math.floor(j.durationSeconds / 60)}m {j.durationSeconds % 60}s
                      </td>
                      <td className="py-3">
                        {j.hasConverted ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#C7FF4D]/20 text-[#C7FF4D] font-semibold text-[10px]">
                            Enquired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#252525] text-[#A5A5A5] text-[10px]">
                            Browsed
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            setActiveSubTab('replays');
                            loadSessionReplay(j.sessionId);
                          }}
                          className="px-2.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#C7FF4D] hover:text-[#050505] text-[#C7FF4D] text-[11px] font-medium transition-colors"
                        >
                          Replay
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: HEATMAPS & SCROLL DEPTH */}
      {activeSubTab === 'heatmaps' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">Page Click Heatmap & Scroll Depth Bands</h3>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Aggregated click hotzones and scroll milestone engagement.
              </p>
            </div>

            {/* Page Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#A5A5A5] font-mono">Page:</span>
              <select
                value={selectedHeatmapPage}
                onChange={e => {
                  setSelectedHeatmapPage(e.target.value);
                  fetchHeatmap(e.target.value);
                }}
                className="bg-[#050505] border border-[#252525] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
              >
                <option value="/">Home (/)</option>
                <option value="/services/website-design">Website Design</option>
                <option value="/services/seo-services">SEO Services</option>
                <option value="/services/ai-video-creation">AI Video Creation</option>
                <option value="/services/digital-marketing">Digital Marketing</option>
              </select>
            </div>
          </div>

          {/* Scroll depth horizontal bands */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] font-mono">25% Scroll Depth</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {scrollDepths.depth25}%
              </span>
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] mt-2 overflow-hidden">
                <div className="h-full bg-[#C7FF4D]" style={{ width: `${scrollDepths.depth25}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] font-mono">50% Scroll Depth</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {scrollDepths.depth50}%
              </span>
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] mt-2 overflow-hidden">
                <div className="h-full bg-[#C7FF4D]" style={{ width: `${scrollDepths.depth50}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] font-mono">75% Scroll Depth</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {scrollDepths.depth75}%
              </span>
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] mt-2 overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${scrollDepths.depth75}%` }} />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] font-mono">100% Full Scroll</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {scrollDepths.depth100}%
              </span>
              <div className="w-full h-1.5 rounded-full bg-[#1A1A1A] mt-2 overflow-hidden">
                <div className="h-full bg-lime-500" style={{ width: `${scrollDepths.depth100}%` }} />
              </div>
            </div>
          </div>

          {/* Visual Heatmap Canvas Mockup */}
          <div className="p-6 rounded-xl bg-[#050505] border border-[#252525] relative min-h-[380px] overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono text-[#A5A5A5] pb-4 border-b border-[#252525]">
              <span>VISUAL CLICK DENSITY OVERLAY: {selectedHeatmapPage}</span>
              <span className="text-[#C7FF4D]">{heatmapClicks.length} Recorded Click Points</span>
            </div>

            {/* Click points rendered */}
            <div className="relative w-full h-72 mt-4 bg-[#0a0a0a] rounded-lg border border-[#1f1f1f] overflow-hidden">
              {heatmapClicks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-[#666]">
                  No click heat points recorded on this page yet. Clicks are aggregated in real time.
                </div>
              ) : (
                heatmapClicks.map((pt, i) => (
                  <div
                    key={i}
                    title={`${pt.clickCount} clicks on ${pt.targetTag || 'element'}`}
                    className="absolute w-6 h-6 rounded-full bg-[#C7FF4D]/40 blur-xs border border-[#C7FF4D] transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[9px] font-mono font-bold text-black pointer-events-auto hover:scale-150 transition-transform"
                    style={{
                      left: `${Math.min(Math.max(pt.xPct, 5), 95)}%`,
                      top: `${Math.min(Math.max(pt.yPct, 5), 95)}%`
                    }}
                  >
                    {pt.clickCount}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SESSION REPLAY */}
      {activeSubTab === 'replays' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Privacy-Aware Session Replay</h3>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Masked DOM replay showing cursor trajectory and scroll progression with zero keystrokes captured.
              </p>
            </div>
            {selectedSessionId && (
              <span className="text-xs font-mono text-[#C7FF4D]">
                Session: {selectedSessionId.substring(0, 16)}...
              </span>
            )}
          </div>

          {!selectedSessionId ? (
            <div className="p-10 rounded-xl bg-[#050505] border border-[#252525] text-center space-y-3">
              <MousePointer className="w-8 h-8 text-[#C7FF4D] mx-auto opacity-70" />
              <p className="text-sm text-white font-medium">Select a session from the Journeys tab to inspect</p>
              <p className="text-xs text-[#A5A5A5] max-w-md mx-auto">
                Replays capture pseudonymized cursor coordinates, scroll events, and clicks without recording form inputs or passwords.
              </p>
              <button
                onClick={() => setActiveSubTab('journeys')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-xs"
              >
                <span>Browse Sessions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Player Stage */}
              <div className="relative aspect-video rounded-xl bg-[#050505] border border-[#252525] overflow-hidden flex flex-col justify-between p-6">
                {/* Header bar */}
                <div className="flex items-center justify-between text-xs font-mono text-[#A5A5A5]">
                  <span>REPLAY STAGE // MASKED DOM</span>
                  <span>TIME: {(replayTime / 1000).toFixed(1)}s / {(replayDuration / 1000).toFixed(1)}s</span>
                </div>

                {/* Simulated cursor */}
                {currentEvent && (
                  <div
                    className="absolute w-4 h-4 rounded-full bg-[#C7FF4D] shadow-lg transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none flex items-center justify-center"
                    style={{
                      left: `${currentEvent.x || 50}%`,
                      top: `${currentEvent.y || 50}%`
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-black" />
                  </div>
                )}

                {/* Event log watermark */}
                <div className="text-center text-xs font-mono text-[#555]">
                  {currentEvent ? `Event: ${currentEvent.type} on ${currentEvent.target || 'page'}` : 'No events in timeframe'}
                </div>

                {/* Bottom timeline controls */}
                <div className="space-y-2 pt-4 border-t border-[#252525]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsReplaying(!isReplaying)}
                      className="p-2 rounded-lg bg-[#C7FF4D] text-black font-bold"
                    >
                      {isReplaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setReplayTime(0)}
                      className="p-2 rounded-lg bg-[#151515] text-[#A5A5A5] hover:text-white"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Progress scrubber */}
                    <input
                      type="range"
                      min={0}
                      max={replayDuration}
                      value={replayTime}
                      onChange={e => setReplayTime(Number(e.target.value))}
                      className="w-full accent-[#C7FF4D]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: FORM ABANDONMENT */}
      {activeSubTab === 'forms' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Form Abandonment Intelligence</h3>
            <p className="text-xs text-[#A5A5A5] mt-0.5">
              Identifies which enquiry fields introduce friction or prompt early abandonment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Form Start Sessions</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {formStats.totalStarts || 0}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Form Submissions</span>
              <span className="text-2xl font-bold font-mono text-[#C7FF4D] mt-1 block">
                {formStats.totalSubmits || 0}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Abandonment Rate</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                {formStats.abandonmentRate || 0}%
              </span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
            <h4 className="text-xs font-mono text-[#C7FF4D] uppercase tracking-wider mb-3">
              Drop-off Field Friction Analysis
            </h4>
            <div className="space-y-3">
              {(formStats.dropoffFields || [
                { field: 'project_details', dropCount: 14, pct: 45 },
                { field: 'phone_number', dropCount: 9, pct: 28 },
                { field: 'budget_range', dropCount: 5, pct: 16 }
              ]).map((f: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-white">{f.field}</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-amber-400">{f.dropCount} drop-offs</span>
                    <span className="text-[#A5A5A5]">{f.pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BOT AUDIT */}
      {activeSubTab === 'bots' && (
        <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
          <div>
            <h3 className="text-base font-bold text-white">Bot Filtering & Traffic Quality Audit</h3>
            <p className="text-xs text-[#A5A5A5] mt-0.5">
              Deterministic classification of 22 search engine crawlers, SEO spiders, and headless probes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Total Ingested Events</span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {botStats.totalRequests || metrics.totalPageViews}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Clean Human Events</span>
              <span className="text-2xl font-bold font-mono text-[#C7FF4D] mt-1 block">
                {botStats.humanRequests || metrics.humanSessions}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#050505] border border-[#252525]">
              <span className="text-xs text-[#A5A5A5] block">Filtered Crawler Traffic</span>
              <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                {botStats.botRequests || metrics.botSessions}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
