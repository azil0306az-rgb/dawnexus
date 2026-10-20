import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  Eye,
  Sliders
} from 'lucide-react';

interface Proposal {
  id: number;
  page_slug: string;
  target_section: string;
  problem_statement: string;
  evidence_metrics: any;
  current_content: any;
  proposed_content: any;
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export const AiOptimizationStudio: React.FC = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/ai-optimization/proposals', {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/ai-optimization/generate', {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setActionMessage({
          type: 'success',
          text: data.message || `Synthesized ${data.generatedCount || 0} optimization proposals based on visitor behaviour.`
        });
        fetchProposals();
      } else {
        setActionMessage({ type: 'error', text: 'Failed to generate proposals.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error generating proposals.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm('Approve and publish this proposal to the live website immediately?')) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/ai-optimization/proposals/${id}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Proposal approved and published live!' });
        fetchProposals();
      } else {
        setActionMessage({ type: 'error', text: 'Approval failed.' });
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Network error during approval.' });
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt('Reason for rejection (optional):') || 'Rejected by administrator';
    try {
      const res = await fetch(`/api/admin/ai-optimization/proposals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Proposal marked as rejected.' });
        fetchProposals();
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: 'Rejection failed.' });
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const filteredProposals = proposals.filter(p => {
    if (activeFilter === 'all') return true;
    return p.status === activeFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C7FF4D]" />
            <h2 className="text-xl font-bold text-white tracking-tight">AI Website Optimization Studio</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#333] text-[10px] font-mono text-[#C7FF4D]">
              Evidence-Backed Recommendations
            </span>
          </div>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Data-backed content improvements synthesized from funnel drop-offs and heatmaps. Human approval required before publishing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#C7FF4D] text-black hover:bg-[#d4ff70] transition-colors shadow"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Analyzing Metrics...' : 'Synthesize New Proposals'}</span>
          </button>

          <button
            onClick={fetchProposals}
            className="p-2 rounded-xl bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-[#0B0B0B] border-[#C7FF4D]/40 text-[#C7FF4D]'
              : 'bg-[#0B0B0B] border-red-500/40 text-red-400'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {[
          { id: 'all', label: `All Proposals (${proposals.length})` },
          { id: 'pending_review', label: `Pending Review (${proposals.filter(p => p.status === 'pending_review').length})` },
          { id: 'approved', label: `Approved / Live (${proposals.filter(p => p.status === 'approved' || p.status === 'published').length})` },
          { id: 'rejected', label: `Rejected (${proposals.filter(p => p.status === 'rejected').length})` }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition-all ${
              activeFilter === f.id
                ? 'bg-[#1A1A1A] text-white border border-[#333] font-semibold'
                : 'text-[#A5A5A5] hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Proposals list */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-[#A5A5A5] rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          Loading optimization proposals...
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#A5A5A5] rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-3">
          <Sparkles className="w-8 h-8 text-[#C7FF4D] mx-auto opacity-70" />
          <p className="text-sm text-white font-medium">No proposals matching filter</p>
          <p className="text-xs text-[#A5A5A5]">
            Click "Synthesize New Proposals" above to analyze recent visitor sessions, heatmaps, and funnel drop-offs.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProposals.map(p => (
            <div
              key={p.id}
              className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5"
            >
              {/* Proposal Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#252525]">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded bg-[#1A1A1A] border border-[#333] text-xs font-mono text-[#C7FF4D]">
                    /services/{p.page_slug}
                  </span>
                  <span className="text-xs font-mono text-[#A5A5A5] uppercase">
                    Target: {p.target_section}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                      p.status === 'pending_review'
                        ? 'bg-amber-400/20 text-amber-400'
                        : p.status === 'approved' || p.status === 'published'
                        ? 'bg-[#C7FF4D]/20 text-[#C7FF4D]'
                        : 'bg-red-400/20 text-red-400'
                    }`}
                  >
                    {p.status.replace('_', ' ')}
                  </span>
                  <span className="text-[11px] font-mono text-[#A5A5A5]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Problem statement & evidence */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8 space-y-2">
                  <span className="text-xs font-mono text-[#C7FF4D] uppercase block">
                    Diagnostic Finding
                  </span>
                  <p className="text-sm text-white leading-relaxed font-medium">
                    {p.problem_statement}
                  </p>
                </div>

                <div className="md:col-span-4 p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-1 text-xs">
                  <span className="text-[#A5A5A5] font-mono block">Supporting Evidence:</span>
                  <div className="font-mono text-white text-[11px] space-y-0.5">
                    {p.evidence_metrics && typeof p.evidence_metrics === 'object' ? (
                      Object.entries(p.evidence_metrics).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-[#A5A5A5]">{k}:</span>
                          <span className="text-[#C7FF4D]">{String(v)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[#A5A5A5]">Funnel drop-off metrics</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current */}
                <div className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-2">
                  <span className="text-xs font-mono text-[#A5A5A5] uppercase block">
                    Current Live Copy
                  </span>
                  <div className="text-xs text-white/80 whitespace-pre-wrap font-mono p-3 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
                    {typeof p.current_content === 'string'
                      ? p.current_content
                      : JSON.stringify(p.current_content, null, 2)}
                  </div>
                </div>

                {/* Proposed */}
                <div className="p-4 rounded-xl bg-[#050505] border border-[#C7FF4D]/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-[#C7FF4D] uppercase block">
                      Proposed Optimization
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  </div>
                  <div className="text-xs text-[#C7FF4D] whitespace-pre-wrap font-mono p-3 rounded bg-[#0a0a0a] border border-[#1f1f1f]">
                    {typeof p.proposed_content === 'string'
                      ? p.proposed_content
                      : JSON.stringify(p.proposed_content, null, 2)}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending proposals */}
              {p.status === 'pending_review' && (
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#252525]">
                  <button
                    onClick={() => handleReject(p.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#151515] text-red-400 hover:bg-red-950/40 border border-red-500/20 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApprove(p.id)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#C7FF4D] text-black hover:bg-[#d4ff70] transition-colors shadow"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Publish Live</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
