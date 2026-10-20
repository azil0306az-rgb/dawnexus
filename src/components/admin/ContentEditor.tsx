import React, { useState, useEffect, useCallback } from 'react';
import {
  FileEdit,
  Save,
  Send,
  RotateCcw,
  History,
  CheckCircle2,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  ExternalLink,
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';

interface ContentItem {
  slug: string;
  title: string;
  canonical_url: string;
  hero_badge?: string;
  hero_subtitle?: string;
  hero_description?: string;
  hero_primary_cta?: string;
  hero_secondary_cta?: string;
  capabilities?: Array<{ icon?: string; title: string; desc: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  cta_section?: { title: string; desc: string; buttonText: string };
  meta_title?: string;
  meta_description?: string;
  og_image?: string;
}

interface VersionRecord {
  id: number;
  version_number: number;
  change_summary: string;
  created_at: string;
  created_by: string;
  is_published: boolean;
}

const SERVICE_PAGES = [
  { slug: 'website-design', name: 'Website Design & Web Apps' },
  { slug: 'seo-services', name: 'SEO & Organic Growth' },
  { slug: 'ai-video-creation', name: 'AI Video Creation' },
  { slug: 'digital-marketing', name: 'Digital Marketing & Ads' }
];

export const ContentEditor: React.FC = () => {
  const [selectedSlug, setSelectedSlug] = useState<string>('website-design');
  const [pageData, setPageData] = useState<ContentItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Version history
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [versions, setVersions] = useState<VersionRecord[]>([]);

  // Active form section
  const [activeSection, setActiveSection] = useState<'hero' | 'capabilities' | 'faqs' | 'cta' | 'meta'>('hero');

  const fetchPage = useCallback(async (slug: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/content/pages/${slug}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPageData(data.content || null);
      }
    } catch (err) {
      console.error('Failed to load page content:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchVersions = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/admin/content/pages/${slug}/versions`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }, []);

  useEffect(() => {
    fetchPage(selectedSlug);
    fetchVersions(selectedSlug);
  }, [selectedSlug, fetchPage, fetchVersions]);

  const handleSaveDraft = async () => {
    if (!pageData) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: selectedSlug, content: pageData })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Draft saved successfully.' });
        fetchVersions(selectedSlug);
      } else {
        setMessage({ type: 'error', text: 'Failed to save draft.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error saving draft.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!pageData) return;
    if (!window.confirm('Publish these changes directly to the live website? No GitHub commit or Vercel build required.')) {
      return;
    }
    setIsPublishing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: selectedSlug, content: pageData })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Published live to website! Changes are immediately active.' });
        fetchVersions(selectedSlug);
      } else {
        setMessage({ type: 'error', text: 'Publishing failed.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error publishing content.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async (versionNumber: number) => {
    if (!window.confirm(`Roll back ${selectedSlug} to version ${versionNumber}?`)) {
      return;
    }
    try {
      const res = await fetch('/api/admin/content/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ slug: selectedSlug, versionNumber })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: `Rolled back to version ${versionNumber}!` });
        setShowHistory(false);
        fetchPage(selectedSlug);
        fetchVersions(selectedSlug);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Rollback failed.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0B0B0B] border border-[#252525]">
        <div>
          <div className="flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-[#C7FF4D]" />
            <h2 className="text-xl font-bold text-white tracking-tight">Website Content Management</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#333] text-[10px] font-mono text-[#C7FF4D]">
              Database-Backed Live Publishing
            </span>
          </div>
          <p className="text-xs text-[#A5A5A5] mt-1">
            Edit service pages, pricing, capabilities, and FAQs. Changes publish instantly without redeploying Vercel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Version History ({versions.length})</span>
          </button>

          <a
            href={`/services/${selectedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Live</span>
          </a>

          <button
            onClick={handleSaveDraft}
            disabled={isSaving || !pageData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#151515] text-white hover:bg-[#202020] border border-[#333] transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing || !pageData}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#C7FF4D] text-black hover:bg-[#d4ff70] transition-colors shadow"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isPublishing ? 'Publishing...' : 'Publish Live'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            message.type === 'success'
              ? 'bg-[#0B0B0B] border-[#C7FF4D]/40 text-[#C7FF4D]'
              : 'bg-[#0B0B0B] border-red-500/40 text-red-400'
          }`}
        >
          {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Page Selector Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SERVICE_PAGES.map(sp => (
          <button
            key={sp.slug}
            onClick={() => setSelectedSlug(sp.slug)}
            className={`p-4 rounded-xl text-left border transition-all ${
              selectedSlug === sp.slug
                ? 'bg-[#0B0B0B] border-[#C7FF4D] text-white shadow'
                : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white'
            }`}
          >
            <span className="text-xs font-mono text-[#C7FF4D] block uppercase">/services/{sp.slug}</span>
            <span className="text-sm font-bold block mt-1">{sp.name}</span>
          </button>
        ))}
      </div>

      {/* Editor Main Content Area */}
      {isLoading || !pageData ? (
        <div className="p-12 text-center text-xs text-[#A5A5A5] rounded-2xl bg-[#0B0B0B] border border-[#252525]">
          Loading page content...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Section side navigation */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'hero', label: 'Hero Header' },
              { id: 'capabilities', label: `Capabilities (${pageData.capabilities?.length || 0})` },
              { id: 'faqs', label: `FAQ Items (${pageData.faqs?.length || 0})` },
              { id: 'cta', label: 'Bottom CTA' },
              { id: 'meta', label: 'SEO & Metadata' }
            ].map(sec => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`w-full p-3.5 rounded-xl text-left text-xs font-semibold border transition-all ${
                  activeSection === sec.id
                    ? 'bg-[#0B0B0B] border-[#C7FF4D] text-[#C7FF4D]'
                    : 'bg-[#050505] border-[#252525] text-[#A5A5A5] hover:text-white'
                }`}
              >
                {sec.label}
              </button>
            ))}

            {/* Read-only protection notice */}
            <div className="p-3.5 rounded-xl bg-[#0B0B0B] border border-[#252525] space-y-2 text-[11px] text-[#888]">
              <div className="flex items-center gap-1.5 text-[#C7FF4D]">
                <Lock className="w-3.5 h-3.5" />
                <span className="font-bold">Protected Architecture</span>
              </div>
              <p>
                Service page primary titles and canonical URLs are immutable to prevent accidental SEO regressions.
              </p>
            </div>
          </div>

          {/* Form Editor panel */}
          <div className="lg:col-span-9 p-6 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-6">
            {/* HERO SECTION */}
            {activeSection === 'hero' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-[#252525] pb-3">Hero Section</h3>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Badge Tagline</label>
                  <input
                    type="text"
                    value={pageData.hero_badge || ''}
                    onChange={e => setPageData({ ...pageData, hero_badge: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Hero Subtitle (Primary Hook)</label>
                  <input
                    type="text"
                    value={pageData.hero_subtitle || ''}
                    onChange={e => setPageData({ ...pageData, hero_subtitle: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Hero Description</label>
                  <textarea
                    rows={4}
                    value={pageData.hero_description || ''}
                    onChange={e => setPageData({ ...pageData, hero_description: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#A5A5A5] block mb-1">Primary CTA Button</label>
                    <input
                      type="text"
                      value={pageData.hero_primary_cta || ''}
                      onChange={e => setPageData({ ...pageData, hero_primary_cta: e.target.value })}
                      className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#A5A5A5] block mb-1">Secondary CTA Button</label>
                    <input
                      type="text"
                      value={pageData.hero_secondary_cta || ''}
                      onChange={e => setPageData({ ...pageData, hero_secondary_cta: e.target.value })}
                      className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#C7FF4D]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CAPABILITIES SECTION */}
            {activeSection === 'capabilities' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#252525] pb-3">
                  <h3 className="text-base font-bold text-white">Capabilities & Value Pillars</h3>
                  <button
                    onClick={() => {
                      const caps = [...(pageData.capabilities || [])];
                      caps.push({ icon: 'Sparkles', title: 'New Capability', desc: 'Describe this capability.' });
                      setPageData({ ...pageData, capabilities: caps });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7FF4D] text-black text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {pageData.capabilities?.map((cap, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#C7FF4D]">Capability #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const caps = pageData.capabilities?.filter((_, i) => i !== idx);
                            setPageData({ ...pageData, capabilities: caps });
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] text-[#A5A5A5] block mb-1">Icon Name</label>
                          <input
                            type="text"
                            value={cap.icon || 'Sparkles'}
                            onChange={e => {
                              const caps = [...(pageData.capabilities || [])];
                              caps[idx].icon = e.target.value;
                              setPageData({ ...pageData, capabilities: caps });
                            }}
                            className="w-full bg-[#0B0B0B] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[11px] text-[#A5A5A5] block mb-1">Title</label>
                          <input
                            type="text"
                            value={cap.title}
                            onChange={e => {
                              const caps = [...(pageData.capabilities || [])];
                              caps[idx].title = e.target.value;
                              setPageData({ ...pageData, capabilities: caps });
                            }}
                            className="w-full bg-[#0B0B0B] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#A5A5A5] block mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={cap.desc}
                          onChange={e => {
                            const caps = [...(pageData.capabilities || [])];
                            caps[idx].desc = e.target.value;
                            setPageData({ ...pageData, capabilities: caps });
                          }}
                          className="w-full bg-[#0B0B0B] border border-[#252525] rounded-lg p-2.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQS SECTION */}
            {activeSection === 'faqs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#252525] pb-3">
                  <h3 className="text-base font-bold text-white">Frequently Asked Questions</h3>
                  <button
                    onClick={() => {
                      const f = [...(pageData.faqs || [])];
                      f.push({ question: 'New Question?', answer: 'Answer details.' });
                      setPageData({ ...pageData, faqs: f });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7FF4D] text-black text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add FAQ</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {pageData.faqs?.map((faq, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-[#050505] border border-[#252525] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#C7FF4D]">FAQ #{idx + 1}</span>
                        <button
                          onClick={() => {
                            const f = pageData.faqs?.filter((_, i) => i !== idx);
                            setPageData({ ...pageData, faqs: f });
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#A5A5A5] block mb-1">Question</label>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={e => {
                            const f = [...(pageData.faqs || [])];
                            f[idx].question = e.target.value;
                            setPageData({ ...pageData, faqs: f });
                          }}
                          className="w-full bg-[#0B0B0B] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#A5A5A5] block mb-1">Answer</label>
                        <textarea
                          rows={3}
                          value={faq.answer}
                          onChange={e => {
                            const f = [...(pageData.faqs || [])];
                            f[idx].answer = e.target.value;
                            setPageData({ ...pageData, faqs: f });
                          }}
                          className="w-full bg-[#0B0B0B] border border-[#252525] rounded-lg p-2.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA SECTION */}
            {activeSection === 'cta' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-[#252525] pb-3">Bottom Call-to-Action</h3>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">CTA Headline</label>
                  <input
                    type="text"
                    value={pageData.cta_section?.title || ''}
                    onChange={e => setPageData({
                      ...pageData,
                      cta_section: { ...(pageData.cta_section || { desc: '', buttonText: '' }), title: e.target.value }
                    })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">CTA Description</label>
                  <textarea
                    rows={3}
                    value={pageData.cta_section?.desc || ''}
                    onChange={e => setPageData({
                      ...pageData,
                      cta_section: { ...(pageData.cta_section || { title: '', buttonText: '' }), desc: e.target.value }
                    })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl p-3.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Button Text</label>
                  <input
                    type="text"
                    value={pageData.cta_section?.buttonText || ''}
                    onChange={e => setPageData({
                      ...pageData,
                      cta_section: { ...(pageData.cta_section || { title: '', desc: '' }), buttonText: e.target.value }
                    })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            {/* META SECTION */}
            {activeSection === 'meta' && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white border-b border-[#252525] pb-3">SEO & Metadata</h3>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Meta Title</label>
                  <input
                    type="text"
                    value={pageData.meta_title || ''}
                    onChange={e => setPageData({ ...pageData, meta_title: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">Meta Description</label>
                  <textarea
                    rows={3}
                    value={pageData.meta_description || ''}
                    onChange={e => setPageData({ ...pageData, meta_description: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl p-3.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-[#A5A5A5] block mb-1">OpenGraph Image URL</label>
                  <input
                    type="text"
                    value={pageData.og_image || ''}
                    onChange={e => setPageData({ ...pageData, og_image: e.target.value })}
                    className="w-full bg-[#050505] border border-[#252525] rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0B0B0B] border border-[#252525] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-[#252525] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Version History: {selectedSlug}</h3>
                <p className="text-xs text-[#A5A5A5]">Roll back instantly to any previous published version.</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-[#A5A5A5] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {versions.length === 0 ? (
                <p className="text-xs text-[#A5A5A5] text-center py-6">No previous versions found.</p>
              ) : (
                versions.map(v => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl bg-[#050505] border border-[#252525] flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#C7FF4D]">v{v.version_number}</span>
                        {v.is_published && (
                          <span className="px-2 py-0.5 rounded-full bg-[#C7FF4D]/20 text-[#C7FF4D] text-[10px] font-semibold">
                            Published
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white mt-1">{v.change_summary || 'Content update'}</p>
                      <span className="text-[11px] font-mono text-[#A5A5A5] block mt-1">
                        {new Date(v.created_at).toLocaleString()} • by {v.created_by || 'admin'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleRollback(v.version_number)}
                      className="px-3 py-1.5 rounded-lg bg-[#151515] hover:bg-[#C7FF4D] hover:text-black text-[#A5A5A5] text-xs font-semibold border border-[#333] transition-colors"
                    >
                      Rollback
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

