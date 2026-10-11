import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  Target,
  Link2,
  AlertTriangle,
  Info,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  FileText
} from 'lucide-react';

interface Opportunity {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  intent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  score: number;
  rationale: string;
  opportunityType: 'Striking Distance' | 'High Impression Low CTR' | 'Quick Win' | 'Emerging Trend';
  existingCoverage: {
    covered: boolean;
    slug?: string;
    title?: string;
    matchType?: 'Exact Keyword' | 'Partial Title';
  };
  recommendedInternalLinks: Array<{ url: string; anchor: string; title: string }>;
}

interface SeoStatus {
  featureEnabled: boolean;
  hasGoogleCredentials: boolean;
  isConnected: boolean;
  googleEmail: string | null;
  selectedProperty: string;
  isDemoMode: boolean;
  redirectUri: string;
}

export const SeoResearchDashboard: React.FC = () => {
  const [status, setStatus] = useState<SeoStatus | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [overviewStats, setOverviewStats] = useState<{
    totalQueries: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
  } | null>(null);

  const [dateRange, setDateRange] = useState<'28d' | '3m'>('28d');
  const [searchFilter, setSearchFilter] = useState('');
  const [intentFilter, setIntentFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  // Prompt Generator State
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [articleType, setArticleType] = useState('Comprehensive Guide & Strategic Framework');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch connection status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/seo-research/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch SEO status:', err);
    }
  }, []);

  // Fetch opportunities
  const fetchOpportunities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/seo-research/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange })
      });
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities || []);
        setOverviewStats(data.stats || null);
        setIsDemo(Boolean(data.isDemo));
      }
    } catch (err) {
      console.error('Failed to fetch opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchStatus();
    fetchOpportunities();
  }, [fetchStatus, fetchOpportunities]);

  // Open prompt modal for an opportunity
  const handleOpenPromptGenerator = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setArticleType('Comprehensive Guide & Strategic Framework');
    // Pre-populate secondary keywords with variations
    const suggestions = [
      `${opp.query} strategy`,
      `${opp.query} cost`,
      `${opp.query} checklist`
    ].join(', ');
    setSecondaryKeywordsInput(suggestions);
    setGeneratedPrompt('');
    setModalOpen(true);
  };

  // Generate Prompt via server API
  const handleGeneratePrompt = async () => {
    if (!selectedOpportunity) return;
    setIsGeneratingPrompt(true);
    try {
      const secKeywords = secondaryKeywordsInput
        .split(',')
        .map(k => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/seo-research/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetKeyword: selectedOpportunity.query,
          searchIntent: selectedOpportunity.intent,
          articleType,
          secondaryKeywords: secKeywords,
          opportunityRationale: selectedOpportunity.rationale,
          internalLinks: selectedOpportunity.recommendedInternalLinks
        })
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedPrompt(data.prompt);
      }
    } catch (err) {
      console.error('Failed to generate prompt:', err);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = async () => {
    if (!generatedPrompt) return;
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = generatedPrompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opp => {
    const matchesSearch = !searchFilter.trim() || opp.query.toLowerCase().includes(searchFilter.toLowerCase().trim());
    const matchesIntent = intentFilter === 'All' || opp.intent === intentFilter;
    const matchesType = typeFilter === 'All' || opp.opportunityType === typeFilter;
    return matchesSearch && matchesIntent && matchesType;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#252525] pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>SEO Research & Blog Ideas</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30">
                v3.0 Experimental
              </span>
            </h1>
          </div>
          <p className="text-sm text-[#A5A5A5] mt-1.5 max-w-3xl">
            Analyze real search performance from Google Search Console, discover striking-distance keyword opportunities, detect existing coverage to prevent keyword cannibalization, and generate tailored writing prompts for your external AI writing tool.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchStatus();
              fetchOpportunities();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#141414] hover:bg-[#1A1A1A] text-white border border-[#252525] transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#C7FF4D]' : ''}`} />
            <span>Refresh Analytics</span>
          </button>
        </div>
      </div>

      {/* Connection Status Card */}
      <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border ${status?.isConnected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              {status?.isConnected ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-white">
                  {status?.isConnected ? 'Google Search Console Connected' : 'Search Console Data Source: Demo & Simulation Mode'}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${status?.isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {status?.isConnected ? 'Live OAuth Active' : 'Offline Fixtures'}
                </span>
              </div>
              <p className="text-xs text-[#A5A5A5] mt-1">
                {status?.isConnected
                  ? `Authenticated as ${status.googleEmail || 'Authorized Account'}. Analyzing property: ${status.selectedProperty}`
                  : 'Displaying realistic Dawnexus query data. To connect live Google Search Console, configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {status?.isConnected ? (
              <button
                onClick={async () => {
                  if (confirm('Disconnect Google Search Console?')) {
                    await fetch('/api/admin/seo-research/disconnect', { method: 'POST' });
                    fetchStatus();
                    fetchOpportunities();
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 transition-colors"
              >
                Disconnect
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[#A5A5A5] bg-[#141414] px-3.5 py-2 rounded-xl border border-[#252525]">
                <Info className="w-4 h-4 text-[#C7FF4D]" />
                <span>Redirect URI: <code className="font-mono text-zinc-300">/api/admin/seo-research/google/callback</code></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Analytics Bar */}
      {overviewStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
            <div className="text-xs text-[#A5A5A5]">Total Impressions</div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {overviewStats.totalImpressions.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-0.5">Tracked search exposure</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
            <div className="text-xs text-[#A5A5A5]">Organic Clicks</div>
            <div className="text-xl font-bold text-[#C7FF4D] mt-1 font-mono">
              {overviewStats.totalClicks.toLocaleString()}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-0.5">Visits from SERP</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
            <div className="text-xs text-[#A5A5A5]">Average CTR</div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              {overviewStats.avgCtr}%
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-0.5">Click-through efficiency</div>
          </div>
          <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
            <div className="text-xs text-[#A5A5A5]">Average Position</div>
            <div className="text-xl font-bold text-white mt-1 font-mono">
              #{overviewStats.avgPosition}
            </div>
            <div className="text-[11px] text-[#A5A5A5] mt-0.5">Across analyzed queries</div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl bg-[#0B0B0B] border border-[#252525]">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A5A5A5]" />
            <input
              type="text"
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              placeholder="Search query or keyword..."
              className="w-full bg-[#141414] border border-[#252525] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-[#707070] focus:border-[#C7FF4D] focus:outline-none"
            />
          </div>

          <select
            value={intentFilter}
            onChange={e => setIntentFilter(e.target.value)}
            className="bg-[#141414] border border-[#252525] rounded-xl px-3 py-2 text-xs text-white focus:border-[#C7FF4D] focus:outline-none"
          >
            <option value="All">All Search Intents</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Transactional">Transactional</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-[#141414] border border-[#252525] rounded-xl px-3 py-2 text-xs text-white focus:border-[#C7FF4D] focus:outline-none"
          >
            <option value="All">All Opportunity Types</option>
            <option value="Striking Distance">Striking Distance (Pos 8-20)</option>
            <option value="High Impression Low CTR">High Impression Low CTR</option>
            <option value="Quick Win">Quick Win</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateRange('28d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              dateRange === '28d' ? 'bg-[#C7FF4D] text-[#050505] font-bold' : 'text-[#A5A5A5] hover:text-white bg-[#141414]'
            }`}
          >
            Last 28 Days
          </button>
          <button
            onClick={() => setDateRange('3m')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              dateRange === '3m' ? 'bg-[#C7FF4D] text-[#050505] font-bold' : 'text-[#A5A5A5] hover:text-white bg-[#141414]'
            }`}
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Opportunities Table */}
      <div className="rounded-2xl bg-[#0B0B0B] border border-[#252525] overflow-hidden">
        <div className="p-4 border-b border-[#252525] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#C7FF4D]" />
            <h2 className="text-sm font-semibold text-white">
              Prioritized SEO Content Opportunities ({filteredOpportunities.length})
            </h2>
          </div>
          <span className="text-xs text-[#A5A5A5]">
            Ranked by Opportunity Score (0-100)
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-[#C7FF4D]" />
            <span className="text-xs text-[#A5A5A5]">Analyzing Search Console performance metrics...</span>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#A5A5A5]">
            No search queries matched your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-[#A5A5A5] border-b border-[#252525] font-mono uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Search Query</th>
                  <th className="py-3 px-3 text-center">Score</th>
                  <th className="py-3 px-3">Opportunity Type</th>
                  <th className="py-3 px-3 text-center">Intent</th>
                  <th className="py-3 px-3 text-right">Impr.</th>
                  <th className="py-3 px-3 text-right">Avg Pos.</th>
                  <th className="py-3 px-3">Existing Coverage</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredOpportunities.map((opp, idx) => (
                  <tr key={idx} className="hover:bg-[#141414]/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white text-sm">{opp.query}</div>
                      <div className="text-[11px] text-[#A5A5A5] mt-0.5 line-clamp-1">{opp.rationale}</div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#181818] border border-[#2A2A2A] font-mono font-bold text-xs text-[#C7FF4D]">
                        {opp.score}
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {opp.opportunityType}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="text-[11px] font-medium text-zinc-400">
                        {opp.intent}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                      {opp.impressions.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-semibold text-white">
                      #{opp.position}
                    </td>

                    <td className="py-3.5 px-3">
                      {opp.existingCoverage.covered ? (
                        <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[140px]" title={opp.existingCoverage.title}>
                            Existing Post: {opp.existingCoverage.slug}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>No Cannibalization</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenPromptGenerator(opp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53a] transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Build Prompt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Interactive Prompt Generator Modal */}
      {modalOpen && selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#252525] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7FF4D]" />
                  <h3 className="text-base font-bold text-white">
                    SEO Writing Assistant: Prompt Generator
                  </h3>
                </div>
                <p className="text-xs text-[#A5A5A5] mt-0.5">
                  Generates an external AI prompt customized for target keyword: <span className="text-[#C7FF4D] font-mono font-semibold">"{selectedOpportunity.query}"</span>
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[#A5A5A5] hover:text-white p-1 rounded-lg text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A5A5A5] mb-1 font-medium">Article Format & Scope</label>
                  <select
                    value={articleType}
                    onChange={e => setArticleType(e.target.value)}
                    className="w-full bg-[#141414] border border-[#252525] rounded-xl px-3 py-2 text-white focus:border-[#C7FF4D] focus:outline-none"
                  >
                    <option value="Comprehensive Guide & Strategic Framework">Comprehensive Guide & Strategic Framework</option>
                    <option value="Cost Breakdown & Pricing Guide (INR Focus)">Cost Breakdown & Pricing Guide (INR Focus)</option>
                    <option value="Comparison & Decision Matrix">Comparison & Decision Matrix</option>
                    <option value="Step-by-Step Implementation Playbook">Step-by-Step Implementation Playbook</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A5A5A5] mb-1 font-medium">Secondary Keywords (comma separated)</label>
                  <input
                    type="text"
                    value={secondaryKeywordsInput}
                    onChange={e => setSecondaryKeywordsInput(e.target.value)}
                    className="w-full bg-[#141414] border border-[#252525] rounded-xl px-3 py-2 text-white focus:border-[#C7FF4D] focus:outline-none"
                    placeholder="e.g. strategy, cost in coimbatore, b2b tips"
                  />
                </div>
              </div>

              {/* Recommended Internal Links to Inject */}
              <div className="p-3.5 rounded-xl bg-[#141414] border border-[#252525]">
                <div className="flex items-center gap-2 text-white font-semibold mb-2">
                  <Link2 className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>Mandatory Internal Links Injected Into Prompt</span>
                </div>
                <div className="space-y-1.5">
                  {selectedOpportunity.recommendedInternalLinks.map((link, i) => (
                    <div key={i} className="flex items-center justify-between text-[#A5A5A5] text-[11px]">
                      <span>Anchor: <strong className="text-white">"{link.anchor}"</strong></span>
                      <a href={link.url} target="_blank" rel="noreferrer" className="text-[#C7FF4D] hover:underline font-mono">
                        {link.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generate Action Button */}
              {!generatedPrompt && (
                <div className="text-center pt-2">
                  <button
                    onClick={handleGeneratePrompt}
                    disabled={isGeneratingPrompt}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53a] transition-all flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingPrompt ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingPrompt ? 'Generating Structured Prompt...' : 'Generate Full Prompt Template'}</span>
                  </button>
                </div>
              )}

              {/* Output Preview & Copy Box */}
              {generatedPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Generated Prompt (Ready for External AI):</span>
                    <button
                      onClick={handleCopyPrompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7FF4D] text-[#050505] font-bold text-xs hover:bg-[#b8f53a] transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-[#050505] border border-[#252525] text-zinc-300 font-mono text-[11px] whitespace-pre-wrap max-h-72 overflow-y-auto selection:bg-[#C7FF4D] selection:text-black">
                    {generatedPrompt}
                  </pre>
                  <p className="text-[11px] text-[#A5A5A5] italic">
                    Workflow: Copy this prompt into your preferred AI writing tool (Claude, ChatGPT, or Gemini). After reviewing the generated article, navigate to the <strong>Blogs & CMS</strong> tab, create a new post, paste the content, and schedule or publish.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#252525] flex justify-end gap-3 bg-[#111111]">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#A5A5A5] hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
