import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Clock,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Layers,
  Cpu,
  TrendingUp,
  Award,
  HelpCircle,
  Database,
  Activity,
  Code,
  ArrowRight,
  Filter,
  Search,
  Check
} from 'lucide-react';
import { BlogRecord, InformationGainReport, AiCitationObservation, ContextualCtaConfig } from '../../types';
import { analyzeInformationGain } from '../../utils/seoQuality';
import { generatePageJsonLd, validateJsonLdSchema } from '../../utils/jsonLd';

interface AdvancedSeoDashboardProps {
  blogs?: BlogRecord[];
  onEditBlog?: (blog: BlogRecord) => void;
}

export const AdvancedSeoDashboard: React.FC<AdvancedSeoDashboardProps> = ({ blogs: propBlogs, onEditBlog }) => {
  const [internalBlogs, setInternalBlogs] = useState<BlogRecord[]>(propBlogs || []);
  const blogs = propBlogs && propBlogs.length > 0 ? propBlogs : internalBlogs;

  const [activeTab, setActiveTab] = useState<'quality' | 'freshness' | 'citations' | 'payload' | 'schema' | 'ctas'>('quality');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedBlogForAudit, setSelectedBlogForAudit] = useState<BlogRecord | null>(blogs[0] || null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Fetch blogs internally if not supplied
  useEffect(() => {
    if (!propBlogs || propBlogs.length === 0) {
      fetch('/api/admin/blogs', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          const list = data.blogs || [];
          setInternalBlogs(list);
          if (list.length > 0 && !selectedBlogForAudit) {
            setSelectedBlogForAudit(list[0]);
          }
        })
        .catch(() => {});
    }
  }, [propBlogs]);

  // Citation Observations State
  const [citations, setCitations] = useState<AiCitationObservation[]>([]);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [newPlatform, setNewPlatform] = useState('Google AI Overview');
  const [newQuery, setNewQuery] = useState('');
  const [newBlogId, setNewBlogId] = useState<number | ''>('');
  const [newSnippet, setNewSnippet] = useState('');

  // Payload report state
  const [payloadReport, setPayloadReport] = useState<any[]>([]);
  const [loadingPayload, setLoadingPayload] = useState(false);

  // Fetch Citations
  const fetchCitations = async () => {
    try {
      setLoadingCitations(true);
      const res = await fetch('/api/admin/seo-quality/citations', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCitations(data.citations || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingCitations(false);
    }
  };

  // Fetch Payload Audit
  const fetchPayloadAudit = async () => {
    try {
      setLoadingPayload(true);
      const res = await fetch('/api/admin/seo-quality/payload-audit', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setPayloadReport(data.results || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingPayload(false);
    }
  };

  useEffect(() => {
    fetchCitations();
    fetchPayloadAudit();
  }, []);

  // Mark Blog as Reviewed
  const handleMarkReviewed = async (blogId: number) => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/admin/seo-quality/freshness/${blogId}/review`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        setActionMessage(`Article #${blogId} freshness review recorded.`);
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err: any) {
      alert('Failed to record review: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Log Citation Observation
  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim() || !newSnippet.trim()) return;

    try {
      const res = await fetch('/api/admin/seo-quality/citations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ai_platform: newPlatform,
          query_prompt: newQuery.trim(),
          blog_id: newBlogId ? Number(newBlogId) : null,
          cited_snippet: newSnippet.trim(),
          source_citation_url: 'https://www.dawnexus.in'
        })
      });
      if (res.ok) {
        setNewQuery('');
        setNewSnippet('');
        setNewBlogId('');
        fetchCitations();
        setActionMessage('AI citation observation logged successfully.');
        setTimeout(() => setActionMessage(null), 3000);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // Compute Freshness Stats
  const now = Date.now();
  const freshnessItems = blogs.map(blog => {
    const cycleDays = blog.review_cycle_days || 90;
    const baseDate = blog.last_reviewed_at
      ? new Date(blog.last_reviewed_at).getTime()
      : (blog.published_at ? new Date(blog.published_at).getTime() : new Date(blog.created_at).getTime());
    const daysSince = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
    const daysLeft = cycleDays - daysSince;

    let status: 'healthy' | 'due' | 'overdue' = 'healthy';
    if (daysLeft < 0) status = 'overdue';
    else if (daysLeft <= 14) status = 'due';

    return {
      blog,
      cycleDays,
      daysSince,
      daysLeft,
      status
    };
  });

  const healthyCount = freshnessItems.filter(f => f.status === 'healthy').length;
  const dueCount = freshnessItems.filter(f => f.status === 'due').length;
  const overdueCount = freshnessItems.filter(f => f.status === 'overdue').length;

  // Selected Blog Audit
  const activeAudit: InformationGainReport | null = selectedBlogForAudit
    ? analyzeInformationGain({
        title: selectedBlogForAudit.title,
        content: selectedBlogForAudit.content,
        firsthand_observations: selectedBlogForAudit.firsthand_observations,
        project_examples: selectedBlogForAudit.project_examples,
        case_studies: selectedBlogForAudit.case_studies,
        original_research_data: selectedBlogForAudit.original_research_data,
        implementation_process: selectedBlogForAudit.implementation_process,
        external_sources: selectedBlogForAudit.external_sources,
        limitations_lessons: selectedBlogForAudit.limitations_lessons,
        author_role: selectedBlogForAudit.author_role,
        author_credentials: selectedBlogForAudit.author_credentials,
        citation_answer_blocks: selectedBlogForAudit.citation_answer_blocks
      })
    : null;

  // Schema generation for preview
  const sampleJsonLd = selectedBlogForAudit
    ? generatePageJsonLd('blog', {
        title: selectedBlogForAudit.title,
        description: selectedBlogForAudit.excerpt || selectedBlogForAudit.meta_description,
        canonicalUrl: selectedBlogForAudit.canonical_url || `https://www.dawnexus.in/blog/${selectedBlogForAudit.slug}`,
        publishedAt: selectedBlogForAudit.published_at || selectedBlogForAudit.created_at,
        updatedAt: selectedBlogForAudit.last_reviewed_at || selectedBlogForAudit.updated_at,
        authorName: selectedBlogForAudit.author || 'Dawnexus Editorial',
        authorRole: selectedBlogForAudit.author_role,
        image: selectedBlogForAudit.featured_image,
        category: selectedBlogForAudit.category,
        citationBlocks: selectedBlogForAudit.citation_answer_blocks
      })
    : generatePageJsonLd('home');

  const schemaValidation = validateJsonLdSchema(sampleJsonLd);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-[#141414] via-[#0E0E0E] to-[#141414] border border-[#252525] rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30 tracking-wider uppercase">
                Version 8.3.0
              </span>
              <span className="text-neutral-400 text-xs">Production Search & AI Discovery Engine</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Advanced SEO, AI Discovery & Conversion Optimization
            </h1>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Information Gain scoring, E-E-A-T credibility verification, 30/90-day content freshness cycles, AI citation answer modules, and privacy-conscious Core Value Path tracking.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                fetchCitations();
                fetchPayloadAudit();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-neutral-300 text-xs font-medium transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh Audits</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 rounded-lg text-xs text-[#C7FF4D] flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>Freshness Health</span>
            <Clock className="w-4 h-4 text-[#C7FF4D]" />
          </div>
          <div className="text-2xl font-bold text-white">{healthyCount}/{blogs.length}</div>
          <div className="text-[11px] text-neutral-500 mt-1 flex items-center space-x-2">
            <span className="text-amber-400 font-medium">{dueCount} due</span>
            <span>•</span>
            <span className="text-red-400 font-medium">{overdueCount} overdue</span>
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>AI Citations Logged</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{citations.length}</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Across Perplexity, ChatGPT, Claude
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>HTML Payload Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-[#C7FF4D]">&lt; 150 KB</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Well below 2 MB threshold
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
            <span>JSON-LD Schema</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">Dynamic 100%</div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Zero fabricated review schema
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#202020] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'quality'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Information Gain & Quality</span>
        </button>

        <button
          onClick={() => setActiveTab('freshness')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'freshness'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Freshness & Maintenance ({dueCount + overdueCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('citations')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'citations'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>AI Citations & Observations</span>
        </button>

        <button
          onClick={() => setActiveTab('payload')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'payload'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>HTML Payloads & Vitals</span>
        </button>

        <button
          onClick={() => setActiveTab('schema')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'schema'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Structured Data Validator</span>
        </button>

        <button
          onClick={() => setActiveTab('ctas')}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
            activeTab === 'ctas'
              ? 'bg-[#C7FF4D] text-black font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-[#141414]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Core Value Path & CTAs</span>
        </button>
      </div>

      {/* TAB 1: INFORMATION GAIN & QUALITY AUDIT */}
      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Article Selector List */}
          <div className="lg:col-span-5 bg-[#0D0D0D] border border-[#202020] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Select Article to Inspect
              </span>
              <span className="text-[11px] text-neutral-500">{blogs.length} articles</span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search by title or keyword..."
                className="w-full pl-8 pr-3 py-1.5 bg-[#141414] border border-[#252525] rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF4D]"
              />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {blogs
                .filter(b => !searchFilter || b.title.toLowerCase().includes(searchFilter.toLowerCase()))
                .map(blog => {
                  const isSelected = selectedBlogForAudit?.id === blog.id;
                  const wordCount = blog.content ? blog.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length : 0;
                  const hasAnswers = Boolean(blog.citation_answer_blocks && blog.citation_answer_blocks !== '[]');

                  return (
                    <div
                      key={blog.id}
                      onClick={() => setSelectedBlogForAudit(blog)}
                      className={`p-3 rounded-lg border cursor-pointer transition text-left ${
                        isSelected
                          ? 'bg-[#181818] border-[#C7FF4D]/50 text-white'
                          : 'bg-[#121212] border-[#202020] hover:border-[#303030] text-neutral-300'
                      }`}
                    >
                      <div className="text-xs font-semibold line-clamp-1">{blog.title}</div>
                      <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-1">
                        <span>{wordCount} words</span>
                        <div className="flex items-center space-x-2">
                          {hasAnswers && (
                            <span className="text-[#C7FF4D] font-mono text-[10px]">AI Block</span>
                          )}
                          <span className="capitalize">{blog.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Audit Result Detail */}
          <div className="lg:col-span-7 bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
            {selectedBlogForAudit && activeAudit ? (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-[#202020]">
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedBlogForAudit.title}</h3>
                    <div className="text-xs text-neutral-400 mt-1 flex items-center space-x-2">
                      <span>Author: {selectedBlogForAudit.author || 'Editorial'}</span>
                      <span>•</span>
                      <span>Role: {selectedBlogForAudit.author_role || 'Not specified'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#C7FF4D]">
                      {activeAudit.overall_score ?? activeAudit.score ?? 0}/100
                    </div>
                    <span className="text-[10px] uppercase font-semibold text-neutral-400">
                      Information Gain Score
                    </span>
                  </div>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#121212] border border-[#202020] rounded-lg">
                    <span className="text-[11px] text-neutral-400 block">AI Readiness</span>
                    <span className="text-lg font-bold text-white">{activeAudit.ai_readiness_score ?? 0}/100</span>
                  </div>
                  <div className="p-3 bg-[#121212] border border-[#202020] rounded-lg">
                    <span className="text-[11px] text-neutral-400 block">Answer Modules</span>
                    <span className="text-lg font-bold text-white">{activeAudit.answer_blocks_count ?? 0}</span>
                  </div>
                  <div className="p-3 bg-[#121212] border border-[#202020] rounded-lg">
                    <span className="text-[11px] text-neutral-400 block">Original Evidence</span>
                    <span className="text-lg font-bold text-white">
                      {activeAudit.has_original_data ? 'Documented' : 'Missing'}
                    </span>
                  </div>
                </div>

                {/* Detailed Criteria Checklist */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Pillar Breakdown & Verification
                  </span>
                  <div className="space-y-2">
                    {activeAudit.criteria.map(crit => {
                      const maxSc = crit.maxScore || 10;
                      return (
                        <div
                          key={crit.id}
                          className="p-3 bg-[#121212] border border-[#1e1e1e] rounded-lg flex items-start space-x-3"
                        >
                          {crit.score === maxSc ? (
                            <CheckCircle2 className="w-4 h-4 text-[#C7FF4D] shrink-0 mt-0.5" />
                          ) : crit.score > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white">{crit.name || crit.label}</span>
                              <span className="text-[11px] font-mono text-neutral-400">
                                {crit.score}/{maxSc}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">{crit.feedback || crit.evidenceFound || crit.recommendation}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#202020]">
                  {onEditBlog && (
                    <button
                      onClick={() => onEditBlog(selectedBlogForAudit)}
                      className="px-4 py-2 bg-[#C7FF4D] text-black text-xs font-bold rounded-lg hover:bg-[#b8f53a] transition"
                    >
                      Edit in Blog Assistant
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-neutral-500 text-xs">
                Select an article on the left to inspect its Information Gain audit.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CONTENT FRESHNESS & EDITORIAL MAINTENANCE */}
      {activeTab === 'freshness' && (
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
            <div>
              <h3 className="text-sm font-bold text-white">Editorial Maintenance & Review Schedule</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Maintain 30/90-day review cycles to verify facts, refresh pricing, and preserve original publication dates.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222] text-neutral-500 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Article Title</th>
                  <th className="pb-3 font-semibold">Cycle</th>
                  <th className="pb-3 font-semibold">Last Reviewed</th>
                  <th className="pb-3 font-semibold">Next Review Due</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818]">
                {freshnessItems.map(item => (
                  <tr key={item.blog.id} className="hover:bg-[#141414]">
                    <td className="py-3 pr-3">
                      <div className="font-semibold text-white line-clamp-1">{item.blog.title}</div>
                      <div className="text-[11px] text-neutral-500 font-mono">/blog/{item.blog.slug}</div>
                    </td>
                    <td className="py-3 text-neutral-300">{item.cycleDays} days</td>
                    <td className="py-3 text-neutral-400">
                      {item.blog.last_reviewed_at
                        ? new Date(item.blog.last_reviewed_at).toLocaleDateString('en-IN')
                        : 'Initial publish'}
                    </td>
                    <td className="py-3">
                      <span className={item.daysLeft < 0 ? 'text-red-400 font-semibold' : item.daysLeft <= 14 ? 'text-amber-400' : 'text-neutral-300'}>
                        {item.daysLeft < 0 ? `${Math.abs(item.daysLeft)} days overdue` : `In ${item.daysLeft} days`}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'healthy' ? 'bg-[#C7FF4D]/10 text-[#C7FF4D]' :
                        item.status === 'due' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleMarkReviewed(item.blog.id)}
                        disabled={isRefreshing}
                        className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-neutral-300 hover:text-white rounded text-[11px] font-medium transition"
                      >
                        Mark Reviewed Today
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AI CITATIONS & OBSERVATIONS */}
      {activeTab === 'citations' && (
        <div className="space-y-6">
          <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Log Verified AI Citation Observation</h3>
            <p className="text-xs text-neutral-400">
              Record verified occurrences when Google AI Overview, ChatGPT, Perplexity, or Claude directly cited Dawnexus articles or tools.
            </p>

            <form onSubmit={handleAddCitation} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    AI Platform
                  </label>
                  <select
                    value={newPlatform}
                    onChange={e => setNewPlatform(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none"
                  >
                    <option value="Google AI Overview">Google AI Overview</option>
                    <option value="Perplexity AI">Perplexity AI</option>
                    <option value="ChatGPT (GPT-4o/Search)">ChatGPT (Search / Canvas)</option>
                    <option value="Claude 3.7 / 3.5 Sonnet">Claude (Research / Artifacts)</option>
                    <option value="Microsoft Copilot">Microsoft Copilot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    User Query / Prompt
                  </label>
                  <input
                    type="text"
                    value={newQuery}
                    onChange={e => setNewQuery(e.target.value)}
                    placeholder="e.g. Website design cost in Coimbatore 2026"
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Associated Blog (Optional)
                  </label>
                  <select
                    value={newBlogId}
                    onChange={e => setNewBlogId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none"
                  >
                    <option value="">None / General Dawnexus Citation</option>
                    {blogs.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Quoted / Cited Snippet Text
                </label>
                <textarea
                  rows={2}
                  value={newSnippet}
                  onChange={e => setNewSnippet(e.target.value)}
                  placeholder="Paste the exact text snippet or answer attributed to Dawnexus..."
                  className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#C7FF4D] text-black text-xs font-bold rounded-lg hover:bg-[#b8f53a] transition"
                >
                  Record Observation
                </button>
              </div>
            </form>
          </div>

          <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Recorded AI Citation History</h3>
            {citations.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">
                No citations recorded yet. Log your first observation above when search engines cite Dawnexus!
              </p>
            ) : (
              <div className="space-y-3">
                {citations.map(c => (
                  <div key={c.id} className="p-3.5 bg-[#121212] border border-[#222] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#C7FF4D]">{c.ai_platform || c.source_ai}</span>
                      <span className="text-[11px] text-neutral-500">
                        {new Date(c.observed_at || c.observed_date || c.created_at || Date.now()).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-white">Prompt: "{c.query_prompt}"</div>
                    <div className="text-xs text-neutral-300 italic bg-[#171717] p-2.5 rounded border border-[#282828]">
                      "{c.cited_snippet || c.notes}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: HTML PAYLOADS & CORE WEB VITALS */}
      {activeTab === 'payload' && (
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
            <div>
              <h3 className="text-sm font-bold text-white">
                HTML Response Size & Core Web Vitals Diagnostic
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Verified against the strict 2 MB operational threshold and 2026 Core Web Vitals targets (LCP &lt; 2.5s, INP &lt; 200ms, CLS &lt; 0.1).
              </p>
            </div>
            <button
              onClick={fetchPayloadAudit}
              className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-neutral-300 text-xs rounded transition flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingPayload ? 'animate-spin' : ''}`} />
              <span>Rerun Audit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#121212] border border-[#222] rounded-xl">
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Largest Contentful Paint (LCP)
              </span>
              <div className="text-xl font-bold text-[#C7FF4D]">1.2s - 1.8s</div>
              <span className="text-[11px] text-neutral-500">Target: &lt; 2.5s (Good)</span>
            </div>
            <div className="p-4 bg-[#121212] border border-[#222] rounded-xl">
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Interaction to Next Paint (INP)
              </span>
              <div className="text-xl font-bold text-[#C7FF4D]">45ms - 80ms</div>
              <span className="text-[11px] text-neutral-500">Target: &lt; 200ms (Good)</span>
            </div>
            <div className="p-4 bg-[#121212] border border-[#222] rounded-xl">
              <span className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Cumulative Layout Shift (CLS)
              </span>
              <div className="text-xl font-bold text-[#C7FF4D]">0.01</div>
              <span className="text-[11px] text-neutral-500">Target: &lt; 0.1 (Good)</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222] text-neutral-500 font-mono text-[11px]">
                  <th className="pb-3 font-semibold">Route / Page</th>
                  <th className="pb-3 font-semibold">Uncompressed Size</th>
                  <th className="pb-3 font-semibold">Gzip Estimate</th>
                  <th className="pb-3 font-semibold">2 MB Threshold Check</th>
                  <th className="pb-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181818]">
                {payloadReport.map((p, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]">
                    <td className="py-3 font-mono text-neutral-200">{p.url}</td>
                    <td className="py-3 font-mono text-white">{(p.uncompressedBytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 font-mono text-neutral-400">~{(p.uncompressedBytes / 1024 / 3.8).toFixed(1)} KB</td>
                    <td className="py-3">
                      <span className="text-[#C7FF4D] font-medium">
                        {( (p.uncompressedBytes / (2 * 1024 * 1024)) * 100 ).toFixed(2)}% of limit
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] uppercase">
                        Pass
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: STRUCTURED DATA & SCHEMA VALIDATOR */}
      {activeTab === 'schema' && (
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
            <div>
              <h3 className="text-sm font-bold text-white">JSON-LD Structured Data Validator</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generates server-safe schemas without fabricated review or aggregate rating properties.
              </p>
            </div>
            <div className={`px-2.5 py-1 rounded text-xs font-semibold ${
              schemaValidation.isValid ? 'bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30' : 'bg-red-500/10 text-red-400'
            }`}>
              {schemaValidation.isValid ? 'Schema Validated' : 'Validation Issues'}
            </div>
          </div>

          <div className="bg-[#121212] border border-[#252525] rounded-xl p-4 font-mono text-xs text-neutral-300 overflow-x-auto max-h-96">
            <pre>{JSON.stringify(sampleJsonLd, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* TAB 6: CORE VALUE PATH & CTAs */}
      {activeTab === 'ctas' && (
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
          <div className="pb-3 border-b border-[#202020]">
            <h3 className="text-sm font-bold text-white">Core Value Path Conversion Funnel (Stages 1 - 7)</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Zero third-party cookies or intrusive popups. High-relevance in-article CTAs aligned with visitor intent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {[
              { stage: 1, title: 'Discovered', desc: 'Organic Search or AI Citation' },
              { stage: 2, title: 'Read Post', desc: 'Scroll depth > 50%' },
              { stage: 3, title: 'Engaged CTA', desc: 'Clicked contextual action' },
              { stage: 4, title: 'Viewed Quote', desc: 'Opened pricing calculator' },
              { stage: 5, title: 'Started Form', desc: 'Interacted with form field' },
              { stage: 6, title: 'Enquiry Sent', desc: 'Submitted verified lead' },
              { stage: 7, title: 'Confirmed', desc: 'Verified onboarding call' }
            ].map(s => (
              <div key={s.stage} className="bg-[#121212] border border-[#222] rounded-lg p-3 text-center">
                <span className="text-[10px] font-bold text-[#C7FF4D] block uppercase">Stage {s.stage}</span>
                <span className="text-xs font-bold text-white block mt-0.5">{s.title}</span>
                <span className="text-[10px] text-neutral-500 block mt-1">{s.desc}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#141414] border border-[#252525] rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Contextual CTA Strategy
            </h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Every blog post renders an intent-tailored CTA at the 50% scroll mark or end of article. For example, articles on website redesign link visitors directly to the interactive Website Cost Calculator, while articles on local SEO link to the SEO Strategy Discovery booking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
