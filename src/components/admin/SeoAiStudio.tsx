import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Calendar,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Edit2,
  Trash2,
  FileText,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Eye,
  Sliders,
  BarChart2,
  ExternalLink,
  ChevronRight,
  Bot,
  Terminal
} from 'lucide-react';
import { BlogRecord } from '../../types';

interface SeoCategory {
  id: number;
  name: string;
  slug: string;
  primary_keyword: string;
  secondary_keywords: string[];
  target_audience: string;
  search_intent: string;
  instructions: string;
}

interface TopicSuggestion {
  id: string;
  title: string;
  primaryKeyword: string;
  category: string;
  searchIntent: 'Informational' | 'Commercial' | 'Transactional' | 'Navigational';
  reason: string;
  supportingMetrics?: {
    impressions?: number;
    clicks?: number;
    avgPosition?: number;
    organicSessions?: number;
  };
  relatedPages: string[];
  suggestedOutline: string[];
}

interface GeneratedDraft {
  title: string;
  seoTitle: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  content: string;
  faqs: Array<{ question: string; answer: string }>;
  primaryKeyword: string;
  secondaryKeywords: string[];
  category: string;
  searchIntent: string;
  targetAudience: string;
  suggestedInternalLinks: Array<{ anchor: string; url: string }>;
  tags: string[];
  imageAltSuggestion?: string;
}

interface GeminiTelemetry {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalTokens: number;
  promptTokens: number;
  candidateTokens: number;
  activeModel: string;
  configured: boolean;
  lastError: string | null;
}

export const SeoAiStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'copilot' | 'generator' | 'topics' | 'scheduler' | 'categories' | 'telemetry'>('copilot');
  const [status, setStatus] = useState<{ connected: boolean; activeModel: string; error: string | null } | null>(null);
  const [categories, setCategories] = useState<SeoCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [telemetry, setTelemetry] = useState<GeminiTelemetry | null>(null);

  // MCP AI Copilot State
  const [copilotMessages, setCopilotMessages] = useState<Array<{ id: string; role: 'user' | 'assistant'; content: string; toolCalls?: any[]; timestamp: string }>>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Welcome to the Dawnexus MCP Copilot! I have direct function-calling access to official Dawnexus tools: Google Search Console performance, GA4 analytics, first-party visitor funnels, CMS drafts, and website content optimization. What would you like to inspect or execute?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [copilotInput, setCopilotInput] = useState('');
  const [isCopilotLoading, setIsCopilotLoading] = useState(false);

  // AI Generator Form State
  const [genCategory, setGenCategory] = useState('');
  const [genPrimaryKeyword, setGenPrimaryKeyword] = useState('');
  const [genSecondaryKeywords, setGenSecondaryKeywords] = useState('');
  const [genTitle, setGenTitle] = useState('');
  const [genAudience, setGenAudience] = useState('Modern business owners, marketing managers, and technical decision makers');
  const [genIntent, setGenIntent] = useState('Commercial');
  const [genInstructions, setGenInstructions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState<GeneratedDraft | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Topic Suggestions State
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicSignals, setTopicSignals] = useState<{ gscConnected: boolean; ga4Connected: boolean; gscQueriesCount: number } | null>(null);

  // Bulk Scheduler State
  const [draftBlogs, setDraftBlogs] = useState<BlogRecord[]>([]);
  const [selectedBlogIds, setSelectedBlogIds] = useState<number[]>([]);
  const [schedStartDate, setSchedStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [schedPostsPerDay, setSchedPostsPerDay] = useState(2);
  const [schedTime1, setSchedTime1] = useState('09:00');
  const [schedTime2, setSchedTime2] = useState('15:00');
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleResult, setScheduleResult] = useState<{ success: boolean; scheduledCount: number; errors: any[] } | null>(null);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SeoCategory | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormPrimary, setCatFormPrimary] = useState('');
  const [catFormSecondary, setCatFormSecondary] = useState('');
  const [catFormAudience, setCatFormAudience] = useState('');
  const [catFormIntent, setCatFormIntent] = useState('Commercial');
  const [catFormInstructions, setCatFormInstructions] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchStatus();
    fetchCategories();
    fetchDraftBlogs();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/seo-ai/status');
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: data.connected, activeModel: data.activeModel, error: data.error });
        setTelemetry(data.usage);
      }
    } catch {
      setStatus({ connected: false, activeModel: 'gemini-3.6-flash', error: 'Could not contact server API.' });
    }
  };

  const fetchCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const res = await fetch('/api/admin/seo-ai/categories');
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !genCategory) {
          setGenCategory(data.categories[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load SEO categories', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const fetchDraftBlogs = async () => {
    try {
      const res = await fetch('/api/admin/blogs?limit=100');
      const data = await res.json();
      if (data.blogs && Array.isArray(data.blogs)) {
        // Filter for Drafts and Scheduled
        const eligible = data.blogs.filter((b: BlogRecord) => b.status === 'Draft' || b.status === 'Scheduled');
        setDraftBlogs(eligible);
      }
    } catch (err) {
      console.error('Failed to load blogs for scheduler', err);
    }
  };

  // Generate Blog with Gemini
  const handleGenerateBlog = async (saveDirectly = false) => {
    if (!genPrimaryKeyword.trim()) {
      setGenError('Please specify a primary keyword for the article.');
      return;
    }

    setIsGenerating(true);
    setGenError(null);
    setSaveSuccessMsg(null);

    try {
      const secondaryArr = genSecondaryKeywords
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/admin/seo-ai/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: genCategory || 'Website Development',
          primaryKeyword: genPrimaryKeyword.trim(),
          secondaryKeywords: secondaryArr,
          title: genTitle.trim() || undefined,
          targetAudience: genAudience.trim(),
          searchIntent: genIntent,
          writingInstructions: genInstructions.trim(),
          saveDraft: saveDirectly
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gemini blog generation failed');
      }

      setGeneratedDraft(data.draft);
      if (saveDirectly && data.savedBlog) {
        setSaveSuccessMsg(`Blog draft #${data.savedBlog.id} ("${data.savedBlog.title}") saved to CMS drafts!`);
        fetchDraftBlogs();
      }
      fetchStatus();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Error generating blog');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save current generated draft to CMS
  const handleSaveDraftToCms = async () => {
    if (!generatedDraft) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: generatedDraft.title,
          slug: generatedDraft.slug,
          excerpt: generatedDraft.excerpt,
          content: generatedDraft.content,
          seo_title: generatedDraft.seoTitle,
          meta_description: generatedDraft.metaDescription,
          category: generatedDraft.category,
          primary_keyword: generatedDraft.primaryKeyword,
          secondary_keywords: generatedDraft.secondaryKeywords,
          search_intent: generatedDraft.searchIntent,
          target_audience: generatedDraft.targetAudience,
          target_questions: generatedDraft.faqs.map(f => f.question),
          tags: generatedDraft.tags,
          status: 'Draft',
          featured_image: '',
          image_alt: generatedDraft.imageAltSuggestion || ''
        })
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        throw new Error(data.error || 'Failed to save blog draft to CMS');
      }
      setSaveSuccessMsg(`Draft article #${data.id} successfully saved to CMS!`);
      fetchDraftBlogs();
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copilot Message Dispatcher
  const handleSendCopilotMessage = async (customText?: string) => {
    const text = (customText || copilotInput).trim();
    if (!text || isCopilotLoading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user' as const,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setCopilotMessages(prev => [...prev, userMsg]);
    setCopilotInput('');
    setIsCopilotLoading(true);

    try {
      const historyForApi = [...copilotMessages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/admin/seo-ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: historyForApi })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCopilotMessages(prev => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: data.text,
            toolCalls: data.toolCallsExecuted,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setCopilotMessages(prev => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            content: data.error || 'Failed to execute Copilot request.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch {
      setCopilotMessages(prev => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: 'Network communication error.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsCopilotLoading(false);
    }
  };

  // Fetch Topic Suggestions Grounded in GSC & GA4
  const handleFetchTopics = async () => {
    setIsLoadingTopics(true);
    try {
      const res = await fetch('/api/admin/seo-ai/suggest-topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: genCategory || undefined,
          targetAudience: genAudience || undefined
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.topics)) {
        setTopics(data.topics);
        setTopicSignals(data.signalsUsed);
      }
      fetchStatus();
    } catch (err) {
      console.error('Failed to suggest topics', err);
    } finally {
      setIsLoadingTopics(false);
    }
  };

  // Apply a topic to the generator form
  const handleUseTopic = (topic: TopicSuggestion) => {
    setGenCategory(topic.category);
    setGenPrimaryKeyword(topic.primaryKeyword);
    setGenTitle(topic.title);
    setGenIntent(topic.searchIntent);
    if (topic.suggestedOutline && topic.suggestedOutline.length > 0) {
      setGenInstructions(`Key Outline Requirements:\n- ${topic.suggestedOutline.join('\n- ')}`);
    }
    setActiveTab('generator');
  };

  // Bulk Scheduling Action
  const handleBulkSchedule = async () => {
    if (selectedBlogIds.length === 0) {
      alert('Please select at least one draft to schedule.');
      return;
    }

    setIsScheduling(true);
    setScheduleResult(null);

    try {
      const times = [schedTime1, schedTime2].filter(Boolean);
      const res = await fetch('/api/admin/seo-ai/bulk-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generator: {
            blogIds: selectedBlogIds,
            startDate: schedStartDate,
            postsPerDay: schedPostsPerDay,
            times,
            timezone: 'Asia/Kolkata'
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete batch schedule');
      }

      setScheduleResult({
        success: data.success,
        scheduledCount: data.scheduledCount,
        errors: data.errors || []
      });
      setSelectedBlogIds([]);
      fetchDraftBlogs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Scheduling error');
    } finally {
      setIsScheduling(false);
    }
  };

  // Category Modal Handlers
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatFormName('');
    setCatFormPrimary('');
    setCatFormSecondary('');
    setCatFormAudience('Business owners and technical managers');
    setCatFormIntent('Commercial');
    setCatFormInstructions('');
    setShowCategoryModal(true);
  };

  const handleOpenEditCategory = (cat: SeoCategory) => {
    setEditingCategory(cat);
    setCatFormName(cat.name);
    setCatFormPrimary(cat.primary_keyword || '');
    setCatFormSecondary((cat.secondary_keywords || []).join(', '));
    setCatFormAudience(cat.target_audience || '');
    setCatFormIntent(cat.search_intent || 'Commercial');
    setCatFormInstructions(cat.instructions || '');
    setShowCategoryModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catFormName.trim()) return;

    setIsSavingCategory(true);
    const secondaryArr = catFormSecondary.split(',').map(s => s.trim()).filter(Boolean);

    try {
      if (editingCategory) {
        const res = await fetch(`/api/admin/seo-ai/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catFormName.trim(),
            primary_keyword: catFormPrimary.trim(),
            secondary_keywords: secondaryArr,
            target_audience: catFormAudience.trim(),
            search_intent: catFormIntent,
            instructions: catFormInstructions.trim()
          })
        });
        if (!res.ok) throw new Error('Failed to update category');
      } else {
        const res = await fetch('/api/admin/seo-ai/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: catFormName.trim(),
            primary_keyword: catFormPrimary.trim(),
            secondary_keywords: secondaryArr,
            target_audience: catFormAudience.trim(),
            search_intent: catFormIntent,
            instructions: catFormInstructions.trim()
          })
        });
        if (!res.ok) throw new Error('Failed to create category');
      }

      setShowCategoryModal(false);
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: SeoCategory) => {
    if (!confirm(`Are you sure you want to remove the category "${cat.name}"? Existing blog articles will safely keep their category name.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/seo-ai/categories/${cat.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      fetchCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner & Gemini Connection State */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-[#C7FF4D]" />
              AI SEO Management Studio
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30">
              v7.1.8
            </span>
          </div>
          <p className="text-sm text-[#A5A5A5]">
            Official Google Gemini API integration • Real Search Console & GA4 Grounded Topics • Manual Bulk Scheduling
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141414] border border-[#252525] text-xs">
            <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-[#C7FF4D] animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[#A5A5A5]">Gemini Engine:</span>
            <span className="text-white font-mono font-semibold">
              {status?.connected ? `${status.activeModel} (Live)` : 'Connecting / Check Key'}
            </span>
          </div>

          <button
            onClick={() => { fetchStatus(); fetchCategories(); fetchDraftBlogs(); }}
            className="p-2.5 rounded-xl bg-[#141414] border border-[#252525] text-[#A5A5A5] hover:text-white hover:border-[#C7FF4D] transition-colors"
            title="Refresh Status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#252525] pb-4">
        {[
          { id: 'copilot', label: 'MCP AI Copilot', icon: Bot },
          { id: 'generator', label: 'AI Blog Generator', icon: Sparkles },
          { id: 'topics', label: 'Suggested Topics (GSC & GA4)', icon: BarChart2 },
          { id: 'scheduler', label: 'Manual Bulk Scheduler', icon: Calendar },
          { id: 'categories', label: 'Dynamic SEO Categories', icon: Layers },
          { id: 'telemetry', label: 'Gemini Operational Telemetry', icon: Sliders }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#C7FF4D] text-black shadow-lg shadow-[#C7FF4D]/10'
                  : 'bg-[#0B0B0B] text-[#A5A5A5] hover:text-white border border-[#252525] hover:border-[#333]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: MCP AI COPILOT                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'copilot' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex flex-col h-[700px]">
            {/* Header */}
            <div className="pb-4 border-b border-[#202020] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#C7FF4D]" />
                  Unified Gemini + MCP Administrative Copilot
                </h3>
                <p className="text-xs text-[#A5A5A5] mt-1">
                  Executes authorized Dawnexus MCP tools directly (Search Console, GA4, Visitor Telemetry, CMS Drafts, Content Rollback) with Gemini reasoning.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/20 font-mono">
                  45 Tools Available
                </span>
              </div>
            </div>

            {/* Quick Action Chips */}
            <div className="py-3 flex flex-wrap gap-2 border-b border-[#1c1c1c]">
              {[
                'Fetch top Search Console queries (28d)',
                'Inspect 7-step conversion funnel drop-offs',
                'List editable service pages in CMS',
                'Audit recent blog drafts for SEO score >= 90',
                'Check visitor tracking health and retention'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendCopilotMessage(chip)}
                  disabled={isCopilotLoading}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[#141414] border border-[#252525] text-neutral-300 hover:text-white hover:border-[#C7FF4D]/50 hover:bg-[#C7FF4D]/5 transition-all text-left disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {copilotMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-[#141414] border border-white/10 flex-shrink-0 flex items-center justify-center mt-1">
                      <Bot className="w-4 h-4 text-[#C7FF4D]" />
                    </div>
                  )}

                  <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-[#C7FF4D] text-black font-medium'
                      : 'bg-[#141414] border border-[#252525] text-neutral-200'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>

                    {/* Tool executions summary */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                        <div className="text-[11px] font-mono text-[#C7FF4D] flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5" />
                          <span>MCP Tool Calls Executed ({msg.toolCalls.length}):</span>
                        </div>
                        {msg.toolCalls.map((tc, idx) => (
                          <details key={idx} className="group rounded-lg bg-black/40 border border-white/10 p-2 text-xs">
                            <summary className="font-mono text-neutral-300 cursor-pointer flex items-center justify-between hover:text-white">
                              <span>🔧 {tc.tool}</span>
                              <span className="text-[10px] text-neutral-500 group-open:rotate-90 transition-transform">▸</span>
                            </summary>
                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1 text-[11px] font-mono text-neutral-400">
                              <div><span className="text-neutral-500">Args:</span> {JSON.stringify(tc.args)}</div>
                              <pre className="max-h-32 overflow-y-auto bg-black/60 p-2 rounded text-emerald-400 whitespace-pre-wrap">
                                {JSON.stringify(tc.result, null, 2)}
                              </pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}

                    <div className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-black/60' : 'text-neutral-500'}`}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-[#C7FF4D]/20 border border-[#C7FF4D]/40 flex-shrink-0 flex items-center justify-center mt-1">
                      <span className="text-xs font-bold text-[#C7FF4D]">AD</span>
                    </div>
                  )}
                </div>
              ))}

              {isCopilotLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-[#141414] border border-white/10 flex-shrink-0 flex items-center justify-center mt-1">
                    <Bot className="w-4 h-4 text-[#C7FF4D] animate-spin" />
                  </div>
                  <div className="bg-[#141414] border border-[#252525] rounded-2xl p-4 text-neutral-400 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C7FF4D]" />
                    <span className="text-xs font-mono">Gemini dispatching MCP tools & analyzing live telemetry...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="pt-3 border-t border-[#202020]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendCopilotMessage();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  value={copilotInput}
                  onChange={(e) => setCopilotInput(e.target.value)}
                  placeholder="Ask MCP Copilot to research queries, audit drafts, inspect funnels, or draft articles..."
                  disabled={isCopilotLoading}
                  className="flex-1 px-4 py-3 rounded-xl bg-black/70 border border-[#252525] text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-[#C7FF4D] focus:ring-1 focus:ring-[#C7FF4D]"
                />
                <button
                  type="submit"
                  disabled={!copilotInput.trim() || isCopilotLoading}
                  className="px-5 py-3 rounded-xl bg-[#C7FF4D] text-black font-semibold text-sm flex items-center gap-2 hover:bg-[#b5f233] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Execute</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: AI BLOG GENERATOR                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Form (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#202020]">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C7FF4D]" />
                  Article Parameters
                </h3>
                <span className="text-xs text-[#A5A5A5] font-mono">Text-Only • Zero AI Images</span>
              </div>

              {genError && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              {saveSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 text-xs text-[#C7FF4D] flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Target Content Category
                </label>
                <select
                  value={genCategory}
                  onChange={e => setGenCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {categories.length === 0 && <option value="Website Development">Website Development</option>}
                </select>
              </div>

              {/* Primary Keyword */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider flex items-center justify-between">
                  <span>Primary Target Keyword *</span>
                  <span className="text-[10px] text-[#C7FF4D] font-mono font-normal">Mandatory</span>
                </label>
                <input
                  type="text"
                  value={genPrimaryKeyword}
                  onChange={e => setGenPrimaryKeyword(e.target.value)}
                  placeholder="e.g. custom web design agency bangalore"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none placeholder-[#555]"
                />
              </div>

              {/* Optional Title */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Working Headline (Optional)
                </label>
                <input
                  type="text"
                  value={genTitle}
                  onChange={e => setGenTitle(e.target.value)}
                  placeholder="Leave empty for Gemini to propose the highest-CTR headline"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none placeholder-[#555]"
                />
              </div>

              {/* Secondary Keywords */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Secondary Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={genSecondaryKeywords}
                  onChange={e => setGenSecondaryKeywords(e.target.value)}
                  placeholder="e.g. responsive website, fast loading, UI/UX design"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none placeholder-[#555]"
                />
              </div>

              {/* Search Intent & Audience */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                    Search Intent
                  </label>
                  <select
                    value={genIntent}
                    onChange={e => setGenIntent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] outline-none"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Informational">Informational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                    Audience
                  </label>
                  <input
                    type="text"
                    value={genAudience}
                    onChange={e => setGenAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] outline-none"
                  />
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Writing Instructions / Tone Notes
                </label>
                <textarea
                  rows={3}
                  value={genInstructions}
                  onChange={e => setGenInstructions(e.target.value)}
                  placeholder="e.g. Include comparison table, focus on technical Core Web Vitals, emphasize conversion CTA..."
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] outline-none placeholder-[#555]"
                />
              </div>

              {/* Generate Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleGenerateBlog(false)}
                  disabled={isGenerating || !genPrimaryKeyword.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-[#C7FF4D] hover:bg-[#b5f035] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[#C7FF4D]/10"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>{isGenerating ? 'Generating Structured Article...' : 'Generate Blog Draft with Gemini'}</span>
                </button>

                <button
                  onClick={() => handleGenerateBlog(true)}
                  disabled={isGenerating || !genPrimaryKeyword.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] hover:border-[#333] text-white font-medium text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>Generate & Save Directly to CMS Drafts</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#141414] border border-[#222] text-[11px] text-[#888] space-y-1">
                <p className="flex items-center gap-1.5 text-[#A5A5A5] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  Production Guardrails Enforced:
                </p>
                <p>• Zero AI images or external watermarks generated.</p>
                <p>• Automatic verification of internal service links.</p>
                <p>• Saves strictly as a Draft requiring human review before publishing.</p>
              </div>
            </div>
          </div>

          {/* Right Preview (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {generatedDraft ? (
              <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#202020]">
                  <div>
                    <span className="text-xs font-mono text-[#C7FF4D] uppercase font-bold tracking-wider">
                      Structured Draft Preview
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1">{generatedDraft.title}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveDraftToCms}
                      disabled={isGenerating}
                      className="px-4 py-2 rounded-xl bg-[#C7FF4D] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#b5f035] transition-all shadow-md"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Save Draft in CMS</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#222]">
                    <span className="text-[#888] block text-[10px] uppercase font-mono">SEO Title Tag</span>
                    <span className="text-white font-medium">{generatedDraft.seoTitle}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#222]">
                    <span className="text-[#888] block text-[10px] uppercase font-mono">Suggested URL Slug</span>
                    <span className="text-[#C7FF4D] font-mono font-medium">/blog/{generatedDraft.slug}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#222] sm:col-span-2">
                    <span className="text-[#888] block text-[10px] uppercase font-mono">Meta Description</span>
                    <span className="text-[#DDD]">{generatedDraft.metaDescription}</span>
                  </div>
                </div>

                {/* Internal Links & FAQs */}
                {generatedDraft.suggestedInternalLinks.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#141414] border border-[#222] space-y-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-[#C7FF4D]" />
                      Verified Internal Links Injected:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {generatedDraft.suggestedInternalLinks.map((link, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded bg-[#202020] text-xs text-[#C7FF4D] font-mono">
                          "{link.anchor}" → {link.url}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content Body Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Article Body (Markdown Output)
                  </span>
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#222] max-h-[480px] overflow-y-auto text-xs text-[#CCC] whitespace-pre-wrap font-mono leading-relaxed">
                    {generatedDraft.content}
                  </div>
                </div>

                {/* FAQ List */}
                {generatedDraft.faqs.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Generated FAQ Schema ({generatedDraft.faqs.length} Questions)
                    </span>
                    <div className="space-y-2">
                      {generatedDraft.faqs.map((faq, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#141414] border border-[#222] text-xs space-y-1">
                          <p className="font-bold text-white">Q: {faq.question}</p>
                          <p className="text-[#AAA]">A: {faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-[#0B0B0B] border border-dashed border-[#252525] flex flex-col items-center justify-center text-center space-y-3 text-[#777] min-h-[400px]">
                <FileText className="w-12 h-12 text-[#333]" />
                <h3 className="text-base font-semibold text-[#AAA]">No Article Generated Yet</h3>
                <p className="text-xs max-w-sm text-[#777]">
                  Configure your primary keyword and parameters on the left, then click "Generate Blog Draft with Gemini".
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI-SUGGESTED TOPICS GROUNDED IN GSC & GA4                          */}
      {/* ========================================================================= */}
      {activeTab === 'topics' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#C7FF4D]" />
                Data-Grounded SEO Topic Recommendations
              </h2>
              <p className="text-xs text-[#A5A5A5] mt-1">
                Gemini analyzes real Google Search Console query impressions and GA4 top landing pages to propose high-impact commercial topics.
              </p>
            </div>

            <button
              onClick={handleFetchTopics}
              disabled={isLoadingTopics}
              className="px-5 py-2.5 rounded-xl bg-[#C7FF4D] hover:bg-[#b5f035] text-black font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#C7FF4D]/10 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTopics ? 'animate-spin' : ''}`} />
              <span>{isLoadingTopics ? 'Analyzing Signals...' : 'Analyze & Suggest Topics'}</span>
            </button>
          </div>

          {topicSignals && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${topicSignals.gscConnected ? 'bg-[#C7FF4D]' : 'bg-zinc-600'}`} />
                <div>
                  <span className="text-xs text-white font-medium">Search Console</span>
                  <p className="text-[11px] text-[#888]">
                    {topicSignals.gscConnected ? `Grounded in ${topicSignals.gscQueriesCount} search queries` : 'Disconnected (Fallback to services)'}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${topicSignals.ga4Connected ? 'bg-[#C7FF4D]' : 'bg-zinc-600'}`} />
                <div>
                  <span className="text-xs text-white font-medium">Google Analytics 4</span>
                  <p className="text-[11px] text-[#888]">
                    {topicSignals.ga4Connected ? 'Landing page traffic analyzed' : 'Disconnected (Fallback to site pages)'}
                  </p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#0B0B0B] border border-[#252525] flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-[#C7FF4D]" />
                <div>
                  <span className="text-xs text-white font-medium">Cannibalization Shield</span>
                  <p className="text-[11px] text-[#888]">Existing published titles cross-checked</p>
                </div>
              </div>
            </div>
          )}

          {topics.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topics.map(t => (
                <div key={t.id} className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex flex-col justify-between space-y-4 hover:border-[#333] transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#C7FF4D]/10 text-[#C7FF4D]">
                        {t.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1E1E] text-[#AAA]">
                        {t.searchIntent}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white">{t.title}</h3>
                    <p className="text-xs text-[#C7FF4D] font-mono font-semibold">
                      Primary Keyword: "{t.primaryKeyword}"
                    </p>
                    <p className="text-xs text-[#AAA] leading-relaxed">{t.reason}</p>

                    {t.supportingMetrics && (
                      <div className="flex items-center gap-3 pt-1 text-[11px] text-[#888] font-mono">
                        {t.supportingMetrics.impressions !== undefined && <span>Impr: {t.supportingMetrics.impressions}</span>}
                        {t.supportingMetrics.avgPosition !== undefined && <span>Pos: {t.supportingMetrics.avgPosition.toFixed(1)}</span>}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between">
                    <span className="text-[11px] text-[#666]">Ready for drafting</span>
                    <button
                      onClick={() => handleUseTopic(t)}
                      className="px-3 py-1.5 rounded-lg bg-[#C7FF4D]/10 hover:bg-[#C7FF4D] text-[#C7FF4D] hover:text-black font-semibold text-xs flex items-center gap-1.5 transition-all"
                    >
                      <span>Draft this Article</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-[#0B0B0B] border border-dashed border-[#252525] text-center space-y-3">
              <BarChart2 className="w-10 h-10 text-[#444] mx-auto" />
              <h3 className="text-base font-semibold text-white">No Topics Loaded Yet</h3>
              <p className="text-xs text-[#888] max-w-sm mx-auto">
                Click "Analyze & Suggest Topics" to have Gemini synthesize your Search Console queries and GA4 metrics into high-converting article titles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MANUAL BULK BLOG SCHEDULER                                         */}
      {/* ========================================================================= */}
      {activeTab === 'scheduler' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Scheduler Parameters (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-[#202020]">
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#C7FF4D]" />
                  Batch Scheduling Controls
                </h3>
                <span className="text-xs text-[#C7FF4D] font-mono">Asia/Kolkata (+05:30)</span>
              </div>

              {scheduleResult && (
                <div className="p-3.5 rounded-xl bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 text-xs text-[#C7FF4D] flex items-center gap-2.5">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Successfully scheduled {scheduleResult.scheduledCount} posts in Asia/Kolkata timezone!</span>
                </div>
              )}

              {/* Start Date */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Campaign Start Date *
                </label>
                <input
                  type="date"
                  value={schedStartDate}
                  onChange={e => setSchedStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none"
                />
              </div>

              {/* Posts Per Day */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#A5A5A5] uppercase tracking-wider">
                  Posts Per Day (User-Controlled)
                </label>
                <select
                  value={schedPostsPerDay}
                  onChange={e => setSchedPostsPerDay(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] outline-none"
                >
                  <option value={1}>1 post per day</option>
                  <option value={2}>2 posts per day</option>
                  <option value={3}>3 posts per day</option>
                </select>
              </div>

              {/* Designated Publication Times */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#A5A5A5] uppercase tracking-wider">
                    Slot 1 Time
                  </label>
                  <input
                    type="time"
                    value={schedTime1}
                    onChange={e => setSchedTime1(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] outline-none"
                  />
                </div>
                {schedPostsPerDay > 1 && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#A5A5A5] uppercase tracking-wider">
                      Slot 2 Time
                    </label>
                    <input
                      type="time"
                      value={schedTime2}
                      onChange={e => setSchedTime2(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Summary Stats */}
              <div className="p-4 rounded-xl bg-[#141414] border border-[#222] space-y-2 text-xs">
                <div className="flex justify-between text-[#AAA]">
                  <span>Selected Drafts:</span>
                  <span className="text-white font-bold">{selectedBlogIds.length} posts</span>
                </div>
                <div className="flex justify-between text-[#AAA]">
                  <span>Estimated Duration:</span>
                  <span className="text-[#C7FF4D] font-bold">
                    {Math.ceil(selectedBlogIds.length / schedPostsPerDay)} days
                  </span>
                </div>
                <div className="flex justify-between text-[#AAA]">
                  <span>Idempotent Worker:</span>
                  <span className="text-white font-mono">/api/cron/publish</span>
                </div>
              </div>

              <button
                onClick={handleBulkSchedule}
                disabled={isScheduling || selectedBlogIds.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-[#C7FF4D] hover:bg-[#b5f035] text-black font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-[#C7FF4D]/10"
              >
                <Clock className={`w-4 h-4 ${isScheduling ? 'animate-spin' : ''}`} />
                <span>{isScheduling ? 'Committing Atomic Schedule...' : `Schedule ${selectedBlogIds.length} Selected Posts`}</span>
              </button>
            </div>
          </div>

          {/* Draft Selection List (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
                <div>
                  <h3 className="font-bold text-white text-base">Select Articles to Schedule</h3>
                  <p className="text-xs text-[#888]">Showing Drafts & Scheduled posts from your CMS</p>
                </div>

                <button
                  onClick={() => {
                    if (selectedBlogIds.length === draftBlogs.length) {
                      setSelectedBlogIds([]);
                    } else {
                      setSelectedBlogIds(draftBlogs.map(b => b.id));
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-xs text-[#AAA] hover:text-white"
                >
                  {selectedBlogIds.length === draftBlogs.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {draftBlogs.length > 0 ? (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {draftBlogs.map(blog => {
                    const isSelected = selectedBlogIds.includes(blog.id);
                    return (
                      <div
                        key={blog.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedBlogIds(selectedBlogIds.filter(id => id !== blog.id));
                          } else {
                            setSelectedBlogIds([...selectedBlogIds, blog.id]);
                          }
                        }}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-[#C7FF4D]/10 border-[#C7FF4D]/40 text-white'
                            : 'bg-[#141414] border-[#222] text-[#AAA] hover:border-[#333]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent onClick
                            className="w-4 h-4 rounded accent-[#C7FF4D] cursor-pointer"
                          />
                          <div>
                            <p className="font-semibold text-white text-xs">{blog.title}</p>
                            <span className="text-[10px] text-[#777] font-mono">
                              #{blog.id} • {blog.category} • Current Status: {blog.status}
                              {blog.scheduled_at && ` (Scheduled for: ${new Date(blog.scheduled_at).toLocaleDateString()})`}
                            </span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          blog.status === 'Scheduled' ? 'bg-amber-400/10 text-amber-300' : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {blog.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#777]">
                  No draft articles found in the database. Generate new drafts above to schedule them!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: DYNAMIC SEO CATEGORIES                                             */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C7FF4D]" />
                Configurable SEO Categories
              </h2>
              <p className="text-xs text-[#A5A5A5] mt-1">
                Define and customize your agency's content categories with target keywords, audiences, and search intent.
              </p>
            </div>

            <button
              onClick={handleOpenAddCategory}
              className="px-4 py-2.5 rounded-xl bg-[#C7FF4D] hover:bg-[#b5f035] text-black font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-[#C7FF4D]/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex flex-col justify-between space-y-4 hover:border-[#333] transition-colors">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#1E1E1E] text-[#C7FF4D]">
                      {cat.search_intent}
                    </span>
                    <span className="text-[10px] font-mono text-[#666]">
                      ID #{cat.id}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">{cat.name}</h3>
                  <p className="text-xs text-[#C7FF4D] font-mono font-medium">
                    Primary: "{cat.primary_keyword}"
                  </p>

                  {cat.secondary_keywords && cat.secondary_keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {cat.secondary_keywords.map((sec, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-[#161616] text-[10px] text-[#888]">
                          {sec}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-[#888] pt-1">
                    Audience: <span className="text-zinc-300">{cat.target_audience}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between">
                  <button
                    onClick={() => handleOpenEditCategory(cat)}
                    className="p-1.5 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] text-[#AAA] hover:text-white transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded-lg bg-[#141414] hover:bg-red-950/40 text-[#AAA] hover:text-red-400 transition-colors"
                    title="Delete Category (Safe)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GEMINI OPERATIONAL TELEMETRY                                       */}
      {/* ========================================================================= */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-1">
              <span className="text-[11px] font-mono text-[#888] uppercase">Total Invocations</span>
              <p className="text-2xl font-extrabold text-white">{telemetry?.totalCalls || 0}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-1">
              <span className="text-[11px] font-mono text-[#888] uppercase">Successful Calls</span>
              <p className="text-2xl font-extrabold text-[#C7FF4D]">{telemetry?.successfulCalls || 0}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-1">
              <span className="text-[11px] font-mono text-[#888] uppercase">Tokens Processed</span>
              <p className="text-2xl font-extrabold text-white">{(telemetry?.totalTokens || 0).toLocaleString()}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-1">
              <span className="text-[11px] font-mono text-[#888] uppercase">Active Model</span>
              <p className="text-sm font-mono font-bold text-[#C7FF4D] truncate">{telemetry?.activeModel || 'gemini-3.6-flash'}</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C7FF4D]" />
              Security & Environment Isolation
            </h3>
            <div className="space-y-2 text-xs text-[#AAA]">
              <p>• API Key is isolated strictly on the server (`GEMINI_API_KEY`).</p>
              <p>• Automatic secret redaction prevents key leakage in any error messages or logs.</p>
              <p>• Bounded exponential retries ensure resiliency against transient high demand spikes.</p>
              <p>• All generated content requires explicit administrative review before publication.</p>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit/Create Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#202020]">
              <h3 className="font-bold text-white text-base">
                {editingCategory ? 'Edit SEO Category' : 'Create SEO Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-[#888] hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[#AAA] uppercase font-semibold">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={e => setCatFormName(e.target.value)}
                  placeholder="e.g. Website Development"
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#AAA] uppercase font-semibold">Primary Target Keyword</label>
                <input
                  type="text"
                  value={catFormPrimary}
                  onChange={e => setCatFormPrimary(e.target.value)}
                  placeholder="e.g. custom website development services"
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[#AAA] uppercase font-semibold">Secondary Keywords (Comma-separated)</label>
                <input
                  type="text"
                  value={catFormSecondary}
                  onChange={e => setCatFormSecondary(e.target.value)}
                  placeholder="e.g. responsive web design, business website"
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[#AAA] uppercase font-semibold">Search Intent</label>
                  <select
                    value={catFormIntent}
                    onChange={e => setCatFormIntent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Informational">Informational</option>
                    <option value="Transactional">Transactional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[#AAA] uppercase font-semibold">Target Audience</label>
                  <input
                    type="text"
                    value={catFormAudience}
                    onChange={e => setCatFormAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[#AAA] uppercase font-semibold">Writing Instructions / Focus</label>
                <textarea
                  rows={2}
                  value={catFormInstructions}
                  onChange={e => setCatFormInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs outline-none focus:border-[#C7FF4D]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#141414] text-[#AAA] hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-5 py-2 rounded-xl bg-[#C7FF4D] text-black font-bold text-xs hover:bg-[#b5f035]"
                >
                  {isSavingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

