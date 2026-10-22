import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Inbox,
  LogOut,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Trash2,
  Archive,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Bell,
  Sparkles,
  Briefcase,
  Activity,
  Calculator,
  BarChart3,
  Shield
} from 'lucide-react';
import type { EnquiryRecord, EnquiryStats } from '../../types';
import { EnquiryDetailModal } from './EnquiryDetailModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { BlogManager } from './BlogManager';
import { NotificationSettings } from './NotificationSettings';
import { ClientShowcaseManager } from './ClientShowcaseManager';
import { DatabaseHealthDashboard } from './DatabaseHealthDashboard';
import { CalculatorSettings } from './CalculatorSettings';
import { GscDashboard } from './GscDashboard';
import { Ga4Dashboard } from './Ga4Dashboard';
import { BehaviourAnalyticsDashboard } from './BehaviourAnalyticsDashboard';
import { ContentEditor } from './ContentEditor';
import { IntegrationDiagnostics } from './IntegrationDiagnostics';

interface AdminDashboardProps {
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'enquiries' | 'clients' | 'blogs' | 'gsc' | 'analytics' | 'behaviour' | 'content-editor' | 'calculator' | 'notifications' | 'db-health' | 'diagnostics'>('overview');
  const [stats, setStats] = useState<EnquiryStats>({
    total: 0,
    new: 0,
    inProgress: 0,
    contacted: 0,
    completed: 0,
    archived: 0
  });

  const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [serviceFilter, setServiceFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EnquiryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch stats from DB
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // Fetch enquiries with search & filters
  const fetchEnquiries = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy,
        _t: Date.now().toString()
      });

      if (search.trim()) queryParams.set('search', search.trim());
      if (statusFilter !== 'All') queryParams.set('status', statusFilter);
      if (serviceFilter !== 'All') queryParams.set('service', serviceFilter);

      const res = await fetch(`/api/admin/enquiries?${queryParams.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setEnquiries(data.items || []);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch enquiries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, serviceFilter, sortBy]);

  useEffect(() => {
    fetchStats();
    fetchEnquiries();

    // Gracefully handle legacy deep-links to retired AI Studio tabs
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'seo-ai' || tabParam === 'ai-optimization') {
        setActiveTab('blogs');
        window.history.replaceState({}, '', '/admin');
      }
    }
  }, [fetchStats, fetchEnquiries]);

  // Automatic periodic polling every 15s to keep leads and stats up to date
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStats();
      fetchEnquiries();
    }, 15000);
    return () => clearInterval(timer);
  }, [fetchStats, fetchEnquiries]);

  // Handle single enquiry update
  const handleUpdateEnquiry = async (id: number, updates: { status?: string; admin_notes?: string }) => {
    try {
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        // Update local state
        setEnquiries(prev => prev.map(item => (item.id === id ? data.enquiry : item)));
        if (selectedEnquiry && selectedEnquiry.id === id) {
          setSelectedEnquiry(data.enquiry);
        }
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to update enquiry:', err);
    }
  };

  // Handle deletion confirmation
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/enquiries/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setEnquiries(prev => prev.filter(item => item.id !== deleteTarget.id));
        if (selectedEnquiry && selectedEnquiry.id === deleteTarget.id) {
          setIsDetailOpen(false);
          setSelectedEnquiry(null);
        }
        setDeleteTarget(null);
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to delete enquiry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Archive shortcut
  const handleArchive = async (item: EnquiryRecord) => {
    await handleUpdateEnquiry(item.id, { status: 'Archived' });
  };

  // Export CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/export', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().split('T')[0];
        a.download = `dawnexus-enquiries-${today}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#C7FF4D]/20 text-[#C7FF4D] border border-[#C7FF4D]/30">New</span>;
      case 'In Progress':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">In Progress</span>;
      case 'Contacted':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Contacted</span>;
      case 'Completed':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Completed</span>;
      case 'Archived':
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">Archived</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800 text-white">{status}</span>;
    }
  };

  const servicesFilterList = [
    'All',
    'Website Design & Development',
    'AI Video Creation',
    'AI-Integrated Advertising',
    'Search Engine Optimization',
    'Google Business Profile Optimization'
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col md:flex-row">
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0B0B0B] border-r border-[#252525] p-5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Logo in Sidebar */}
          <div className="pb-6 mb-6 border-b border-[#252525]">
            <a href="/" className="block">
              <img
                src="/brand/dawnexus-horizontal.png"
                alt="Dawnexus Logo"
                className="h-8 w-auto object-contain"
              />
            </a>
            <div className="mt-2 text-[11px] font-mono text-[#A5A5A5] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C7FF4D]" />
              <span>Admin Dashboard • v8.0.0</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('enquiries')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'enquiries'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Inbox className="w-4 h-4" />
                <span>Enquiries</span>
              </div>
              {stats.new > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#C7FF4D] text-[#050505] text-xs font-bold font-mono">
                  {stats.new}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'clients'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4" />
                <span>Our Work (Clients)</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                v3.5
              </span>
            </button>

            <button
              onClick={() => setActiveTab('blogs')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'blogs'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Blogs & CMS</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('gsc')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'gsc'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4" />
                <span>Google Search Console</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                SEO
              </span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                <span>Google Analytics 4</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                GA4
              </span>
            </button>

            <button
              onClick={() => setActiveTab('behaviour')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'behaviour'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4" />
                <span>Visitor Behaviour</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                v6.1.3
              </span>
            </button>

            <button
              onClick={() => setActiveTab('content-editor')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'content-editor'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" />
                <span>Website Content</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                CMS
              </span>
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'calculator'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-4 h-4" />
                <span>Cost Estimator</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                v5.8
              </span>
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'notifications'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4" />
                <span>Notification Email</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('db-health')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'db-health'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4" />
                <span>Database Health</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                4h
              </span>
            </button>

            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'bg-[#050505] text-[#C7FF4D] border border-[#252525]'
                  : 'text-[#A5A5A5] hover:text-white hover:bg-[#050505]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4" />
                <span>Diagnostics</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                MCP
              </span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-6 border-t border-[#252525] space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-[#A5A5A5] hover:text-white hover:bg-[#050505] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Website</span>
          </a>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
        
        {activeTab === 'clients' ? (
          <ClientShowcaseManager />
        ) : activeTab === 'blogs' ? (
          <BlogManager />
        ) : activeTab === 'gsc' ? (
          <GscDashboard />
        ) : activeTab === 'analytics' ? (
          <Ga4Dashboard />
        ) : activeTab === 'behaviour' ? (
          <BehaviourAnalyticsDashboard />
        ) : activeTab === 'content-editor' ? (
          <ContentEditor />
        ) : activeTab === 'calculator' ? (
          <CalculatorSettings />
        ) : activeTab === 'notifications' ? (
          <NotificationSettings />
        ) : activeTab === 'db-health' ? (
          <DatabaseHealthDashboard />
        ) : activeTab === 'diagnostics' ? (
          <IntegrationDiagnostics />
        ) : (
          <>
            {/* Top Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 mb-8 border-b border-[#252525]">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {activeTab === 'overview' ? 'Dashboard Overview' : 'Customer Enquiries'}
                </h1>
            <p className="text-sm text-[#A5A5A5] mt-1 font-normal">
              {activeTab === 'overview'
                ? 'High-level enquiry acquisition performance & live database activity.'
                : 'Filter, review, manage, and respond to incoming project leads.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchStats(); fetchEnquiries(); }}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#C7FF4D] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C7FF4D]' : ''}`} />
            </button>

            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B0B0B] text-white hover:text-[#C7FF4D] border border-[#252525] hover:border-[#C7FF4D] text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          </div>
        </div>

        {/* Real DB Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5">
            <span className="text-xs font-mono text-[#A5A5A5] uppercase tracking-wider block">
              Total Enquiries
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.total}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-1 font-mono">
              All time submitted
            </div>
          </div>

          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#C7FF4D]/10 blur-xl rounded-full" />
            <span className="text-xs font-mono text-[#C7FF4D] uppercase tracking-wider block">
              New Leads
            </span>
            <div className="text-3xl font-extrabold text-[#C7FF4D] mt-2">
              {stats.new}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-1 font-mono">
              Pending review
            </div>
          </div>

          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5">
            <span className="text-xs font-mono text-blue-400 uppercase tracking-wider block">
              In Progress
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.inProgress}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-1 font-mono">
              Scope / Proposal
            </div>
          </div>

          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-wider block">
              Contacted
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.contacted}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-1 font-mono">
              In communication
            </div>
          </div>

          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-5">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">
              Completed
            </span>
            <div className="text-3xl font-extrabold text-white mt-2">
              {stats.completed}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-1 font-mono">
              Converted / Closed
            </div>
          </div>
        </div>

        {/* Filter Toolbar for Enquiries */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            
            {/* Search Input */}
            <div className="lg:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
              <input
                type="text"
                placeholder="Search name, business, email, details..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full bg-[#050505] border border-[#252525] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#C7FF4D]"
              />
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-3">
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
              >
                <option value="All">All Statuses</option>
                <option value="New">Status: New</option>
                <option value="Contacted">Status: Contacted</option>
                <option value="In Progress">Status: In Progress</option>
                <option value="Completed">Status: Completed</option>
                <option value="Archived">Status: Archived</option>
              </select>
            </div>

            {/* Service Filter */}
            <div className="lg:col-span-2">
              <select
                value={serviceFilter}
                onChange={e => { setServiceFilter(e.target.value); setPage(1); }}
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
              >
                {servicesFilterList.map(s => (
                  <option key={s} value={s}>{s === 'All' ? 'All Services' : s}</option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="lg:col-span-2">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as 'newest' | 'oldest')}
                className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
              </select>
            </div>

          </div>
        </div>

        {/* Enquiries Table or Empty State */}
        <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#C7FF4D] mb-3" />
              <p className="text-xs text-[#A5A5A5] font-mono">Loading enquiries from SQLite...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-[#050505] border border-[#252525] flex items-center justify-center mx-auto mb-4 text-[#A5A5A5]">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No enquiries found</h3>
              <p className="text-xs text-[#A5A5A5] max-w-sm mx-auto mt-1">
                {search || statusFilter !== 'All'
                  ? 'No enquiries match the current filters. Try resetting search criteria.'
                  : 'Customer submissions will automatically appear here once visitors submit the public enquiry form.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050505] border-b border-[#252525] text-[#A5A5A5] uppercase font-mono text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Business</th>
                    <th className="py-3.5 px-4">Services</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252525]">
                  {enquiries.map((enquiry) => {
                    let servicesPreview: string[] = [];
                    try {
                      const parsed = JSON.parse(enquiry.requested_services);
                      if (Array.isArray(parsed)) servicesPreview = parsed;
                    } catch {
                      // fallback
                    }

                    return (
                      <tr
                        key={enquiry.id}
                        className="hover:bg-[#0e0e0e] transition-colors group cursor-pointer"
                        onClick={() => { setSelectedEnquiry(enquiry); setIsDetailOpen(true); }}
                      >
                        <td className="py-4 px-4 font-mono text-[#A5A5A5]">
                          #{enquiry.id}
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-white group-hover:text-[#C7FF4D] transition-colors">
                            {enquiry.full_name}
                          </div>
                          <div className="text-[11px] text-[#A5A5A5]">
                            {enquiry.email}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[#A5A5A5]">
                          {enquiry.business_name || '—'}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {servicesPreview.slice(0, 2).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-[#050505] border border-[#252525] text-[10px] text-[#C7FF4D]"
                              >
                                {s}
                              </span>
                            ))}
                            {servicesPreview.length > 2 && (
                              <span className="px-1.5 py-0.5 rounded bg-[#050505] text-[10px] text-[#A5A5A5]">
                                +{servicesPreview.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          {getStatusBadge(enquiry.status)}
                        </td>

                        <td className="py-4 px-4 text-[#A5A5A5] font-mono text-[11px]">
                          {new Date(enquiry.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedEnquiry(enquiry); setIsDetailOpen(true); }}
                              className="p-1.5 rounded-lg bg-[#050505] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#C7FF4D] transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleArchive(enquiry)}
                              className="p-1.5 rounded-lg bg-[#050505] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-amber-400 transition-colors"
                              title="Archive Enquiry"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeleteTarget(enquiry)}
                              className="p-1.5 rounded-lg bg-[#050505] border border-[#252525] text-red-400 hover:text-red-300 hover:border-red-500 transition-colors"
                              title="Delete Enquiry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-[#050505] border-t border-[#252525] flex items-center justify-between text-xs text-[#A5A5A5]">
              <div>
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalItems} enquiries)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
          </>
        )}

      </main>

      {/* Enquiry Detail Modal */}
      <EnquiryDetailModal
        enquiry={selectedEnquiry}
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setSelectedEnquiry(null); }}
        onUpdate={handleUpdateEnquiry}
        onDeleteRequest={(item) => setDeleteTarget(item)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        enquiry={deleteTarget}
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

    </div>
  );
};

