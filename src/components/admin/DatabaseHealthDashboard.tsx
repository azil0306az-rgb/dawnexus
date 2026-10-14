import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Database,
  ShieldCheck,
  Server,
  Zap,
  ArrowUpRight,
  Info
} from 'lucide-react';

interface HealthCheckRecord {
  id: number;
  status: 'Healthy' | 'Degraded' | 'Unavailable' | 'Unknown';
  response_time_ms: number;
  source: 'scheduled' | 'manual' | 'startup';
  check_type: string;
  error_category: string | null;
  error_message: string | null;
  checked_at: string;
}

interface HealthStats {
  currentStatus: 'Healthy' | 'Degraded' | 'Unavailable' | 'Unknown';
  lastCheck: HealthCheckRecord | null;
  lastSuccessfulCheck: HealthCheckRecord | null;
  consecutiveFailures: number;
  recentHistory: HealthCheckRecord[];
  failedHistory: HealthCheckRecord[];
  supabaseConfigured: boolean;
  maskedConnectionString: string;
  timezone: string;
  scheduleDescription: string;
}

export const DatabaseHealthDashboard: React.FC = () => {
  const [stats, setStats] = useState<HealthStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'failures'>('all');
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchHealthStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/db-health', {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch health stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealthStats();
    const interval = setInterval(fetchHealthStats, 30000); // refresh UI every 30s
    return () => clearInterval(interval);
  }, [fetchHealthStats]);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/db-health/check', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.stats) {
          setStats(data.stats);
        }
        setFeedback('Live database health check completed successfully.');
      } else {
        setFeedback('Health check request returned an error status.');
      }
    } catch (err) {
      setFeedback('Failed to execute health check query.');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C7FF4D]/15 text-[#C7FF4D] border border-[#C7FF4D]/30">
            <span className="w-2 h-2 rounded-full bg-[#C7FF4D] animate-pulse" />
            Healthy
          </span>
        );
      case 'Degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Degraded Latency
          </span>
        );
      case 'Unavailable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Unavailable
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-400">
            Unknown
          </span>
        );
    }
  };

  const formatIST = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' IST';
    } catch {
      return isoString;
    }
  };

  const timeAgo = (isoString?: string | null) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#252525]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[#C7FF4D] text-xs font-mono font-semibold uppercase tracking-wider">
              System Diagnostics
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
              Supabase 6x Daily
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Database Health & Reliability
          </h1>
          <p className="text-sm text-[#A5A5A5] mt-1 font-normal">
            Continuous PostgreSQL health verification running every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 IST).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-semibold text-xs hover:bg-[#b8f53b] transition-all disabled:opacity-50 shadow-md cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Executing Ping...' : 'Run Health Check Now'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-xs text-[#C7FF4D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C7FF4D]" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-neutral-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Status & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Card */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider">
                Current Status
              </span>
              <Activity className="w-4 h-4 text-[#C7FF4D]" />
            </div>
            <div className="mt-3">
              {getStatusBadge(stats?.currentStatus || 'Unknown')}
            </div>
          </div>
          <div className="text-[11px] text-[#A5A5A5] font-mono mt-4 pt-3 border-t border-[#1a1a1a]">
            {stats?.lastCheck ? `Last checked ${timeAgo(stats.lastCheck.checked_at)}` : 'Awaiting check'}
          </div>
        </div>

        {/* Latency Card */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider">
                Round-trip Latency
              </span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-2 font-mono">
              {stats?.lastCheck ? `${stats.lastCheck.response_time_ms} ms` : '—'}
            </div>
          </div>
          <div className="text-[11px] text-[#A5A5A5] font-mono mt-4 pt-3 border-t border-[#1a1a1a]">
            Target threshold: &lt; 2000 ms
          </div>
        </div>

        {/* Last Successful Check */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider">
                Last Successful Ping
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-sm font-semibold text-white mt-2 font-mono">
              {formatIST(stats?.lastSuccessfulCheck?.checked_at)}
            </div>
          </div>
          <div className="text-[11px] text-[#A5A5A5] font-mono mt-4 pt-3 border-t border-[#1a1a1a]">
            Verified PostgreSQL query
          </div>
        </div>

        {/* Consecutive Failures */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider">
                Consecutive Failures
              </span>
              <ShieldCheck className="w-4 h-4 text-[#C7FF4D]" />
            </div>
            <div className={`text-2xl font-bold mt-2 font-mono ${(stats?.consecutiveFailures || 0) > 0 ? 'text-red-400' : 'text-[#C7FF4D]'}`}>
              {stats?.consecutiveFailures || 0}
            </div>
          </div>
          <div className="text-[11px] text-[#A5A5A5] font-mono mt-4 pt-3 border-t border-[#1a1a1a]">
            {(stats?.consecutiveFailures || 0) === 0 ? 'Zero downtime detected' : 'Alert: failures pending'}
          </div>
        </div>
      </div>

      {/* Connectivity & Configuration Panel */}
      <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Server className="w-4 h-4 text-[#C7FF4D]" />
          <span>Active Database Configuration</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#050505] rounded-xl border border-[#202020]">
            <span className="text-neutral-500 block mb-1">Target Engine & Host</span>
            <span className="text-neutral-200">Supabase South Asia (Mumbai, aws-0-ap-south-1)</span>
          </div>
          <div className="p-3 bg-[#050505] rounded-xl border border-[#202020]">
            <span className="text-neutral-500 block mb-1">Connection Protocol</span>
            <span className="text-neutral-200">Supavisor Transaction Pooler (Port 6543 / 5432)</span>
          </div>
          <div className="p-3 bg-[#050505] rounded-xl border border-[#202020]">
            <span className="text-neutral-500 block mb-1">Monitoring Schedule</span>
            <span className="text-[#C7FF4D]">Every 4 Hours: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 IST</span>
          </div>
          <div className="p-3 bg-[#050505] rounded-xl border border-[#202020]">
            <span className="text-neutral-500 block mb-1">Masked Connection String</span>
            <span className="text-neutral-400 truncate block">{stats?.maskedConnectionString}</span>
          </div>
        </div>
      </div>

      {/* Check History Table */}
      <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-[#252525] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Recent Check History ({stats?.recentHistory?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('failures')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'failures'
                  ? 'bg-[#050505] text-red-400 border border-[#252525]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Failed Checks Log ({stats?.failedHistory?.length || 0})
            </button>
          </div>

          <span className="text-[11px] text-neutral-500 font-mono">
            Showing last {activeTab === 'all' ? (stats?.recentHistory?.length || 0) : (stats?.failedHistory?.length || 0)} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#050505] text-neutral-400 border-b border-[#252525]">
              <tr>
                <th className="py-3 px-5 font-semibold">Timestamp (IST)</th>
                <th className="py-3 px-5 font-semibold">Trigger Source</th>
                <th className="py-3 px-5 font-semibold">Latency</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold">Diagnostics / Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {(activeTab === 'all' ? stats?.recentHistory : stats?.failedHistory)?.map((item) => (
                <tr key={item.id} className="hover:bg-[#101010] transition-colors">
                  <td className="py-3 px-5 text-white whitespace-nowrap">
                    {formatIST(item.checked_at)}
                  </td>
                  <td className="py-3 px-5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#1a1a1a] text-neutral-300 uppercase">
                      {item.source}
                    </span>
                  </td>
                  <td className="py-3 px-5 font-bold text-white">
                    {item.response_time_ms} ms
                  </td>
                  <td className="py-3 px-5">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="py-3 px-5 text-neutral-400 max-w-xs truncate">
                    {item.error_message || (
                      <span className="text-emerald-500/80">Query completed without errors</span>
                    )}
                  </td>
                </tr>
              ))}

              {(!stats || (activeTab === 'all' ? stats.recentHistory.length : stats.failedHistory.length) === 0) && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-neutral-500">
                    {activeTab === 'failures'
                      ? 'No failed health checks recorded. All pings have executed cleanly.'
                      : 'No health check records available yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

