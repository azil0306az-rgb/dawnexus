import React, { useState, useEffect, useRef } from 'react';
import {
  Save,
  Clock,
  Send,
  Eye,
  ArrowLeft,
  Calendar,
  Sparkles,
  Link,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Copy,
  Trash2,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { BlogRecord, BlogInput, BlogStatus } from '../../types';
import { SeoWritingAssistant } from './SeoWritingAssistant';

interface BlogEditorProps {
  initialBlog?: BlogRecord | null;
  onSave: (data: BlogInput, id?: number) => Promise<boolean>;
  onCancel: () => void;
  onDelete?: (id: number) => Promise<void>;
  onDuplicate?: (id: number) => Promise<void>;
}

const CATEGORIES = [
  'Website Design',
  'SEO Strategy',
  'AI Creative',
  'Digital Marketing',
  'Digital Strategy',
  'Conversion Optimization',
  'Case Studies'
];

const SEARCH_INTENTS = [
  'Informational',
  'Commercial Investigation',
  'Transactional',
  'Navigational'
];

export const BlogEditor: React.FC<BlogEditorProps> = ({
  initialBlog,
  onSave,
  onCancel,
  onDelete,
  onDuplicate
}) => {
  const [title, setTitle] = useState(initialBlog?.title || '');
  const [slug, setSlug] = useState(initialBlog?.slug || '');
  const [isSlugCustom, setIsSlugCustom] = useState(Boolean(initialBlog?.slug));
  const [excerpt, setExcerpt] = useState(initialBlog?.excerpt || '');
  const [content, setContent] = useState(initialBlog?.content || '');
  const [featuredImage, setFeaturedImage] = useState(initialBlog?.featured_image || '');
  const [imageAlt, setImageAlt] = useState(initialBlog?.image_alt || '');
  const [author, setAuthor] = useState(initialBlog?.author || 'Dawnexus Editorial');
  const [category, setCategory] = useState(initialBlog?.category || 'Website Design');
  const [tagsInput, setTagsInput] = useState(
    initialBlog ? JSON.parse(initialBlog.tags || '[]').join(', ') : ''
  );

  // SEO & Intent
  const [primaryKeyword, setPrimaryKeyword] = useState(initialBlog?.primary_keyword || '');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState(
    initialBlog ? JSON.parse(initialBlog.secondary_keywords || '[]').join(', ') : ''
  );
  const [targetLocation, setTargetLocation] = useState(
    initialBlog?.target_location || 'Coimbatore, Tamil Nadu, India'
  );
  const [searchIntent, setSearchIntent] = useState(initialBlog?.search_intent || 'Informational');
  const [targetAudience, setTargetAudience] = useState(initialBlog?.target_audience || '');
  const [targetQuestionsInput, setTargetQuestionsInput] = useState(
    initialBlog ? JSON.parse(initialBlog.target_questions || '[]').join('\n') : ''
  );
  const [seoTitle, setSeoTitle] = useState(initialBlog?.seo_title || '');
  const [metaDescription, setMetaDescription] = useState(initialBlog?.meta_description || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialBlog?.canonical_url || '');

  // Status & Scheduling
  const [status, setStatus] = useState<BlogStatus>(initialBlog?.status || 'Draft');
  
  // Format existing scheduled_at to IST datetime-local input string
  const getInitialScheduledIst = () => {
    if (!initialBlog?.scheduled_at) return '';
    try {
      const date = new Date(initialBlog.scheduled_at);
      // Format as YYYY-MM-DDTHH:mm in local browser/IST
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [scheduledAtIst, setScheduledAtIst] = useState<string>(getInitialScheduledIst());
  const [adminNotes, setAdminNotes] = useState(initialBlog?.admin_notes || '');

  // UI state
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'intent' | 'schedule'>('content');
  const [showSeoAssistant, setShowSeoAssistant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-generate slug from title if not manually edited
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isSlugCustom) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setSlug(generated);
      if (!seoTitle || seoTitle === title) {
        setSeoTitle(val);
      }
    }
  };

  // Insert formatted text or tags at current cursor in content textarea
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) {
      setContent(prev => prev + prefix + suffix);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = el.value.substring(start, end);
    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = el.value.substring(0, start) + replacement + el.value.substring(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 10);
  };

  // Handle Form Submission
  const handleSubmit = async (targetStatus?: BlogStatus) => {
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Article title is required.' });
      return;
    }

    const resolvedStatus = targetStatus || status;

    // Validate scheduled date if Scheduling
    let scheduledUtc: string | null = null;
    if (resolvedStatus === 'Scheduled') {
      if (!scheduledAtIst) {
        setFeedback({
          type: 'error',
          message: 'Please choose a future date and time for scheduled publication.'
        });
        setActiveTab('schedule');
        return;
      }
      const selectedDate = new Date(scheduledAtIst);
      if (isNaN(selectedDate.getTime())) {
        setFeedback({ type: 'error', message: 'Invalid publication date selected.' });
        return;
      }
      if (selectedDate.getTime() <= Date.now()) {
        setFeedback({
          type: 'error',
          message: 'Scheduled publication time must be in the future.'
        });
        return;
      }
      scheduledUtc = selectedDate.toISOString();
    } else if (scheduledAtIst) {
      scheduledUtc = new Date(scheduledAtIst).toISOString();
    }

    setIsSubmitting(true);
    setFeedback(null);

    const tags = tagsInput
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const secondaryKeywords = secondaryKeywordsInput
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean);

    const targetQuestions = targetQuestionsInput
      .split('\n')
      .map((q: string) => q.trim())
      .filter(Boolean);

    const inputData: BlogInput = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim(),
      content: content.trim(),
      featured_image: featuredImage.trim(),
      image_alt: imageAlt.trim(),
      author: author.trim() || 'Dawnexus Editorial',
      category: category.trim(),
      tags,
      primary_keyword: primaryKeyword.trim(),
      secondary_keywords: secondaryKeywords,
      target_location: targetLocation.trim(),
      search_intent: searchIntent,
      target_audience: targetAudience.trim(),
      target_questions: targetQuestions,
      seo_title: seoTitle.trim() || title.trim(),
      meta_description: metaDescription.trim() || excerpt.trim(),
      canonical_url: canonicalUrl.trim() || `https://dawnexus.in/blog/${slug.trim()}`,
      status: resolvedStatus,
      scheduled_at: scheduledUtc,
      published_at: resolvedStatus === 'Published' ? (initialBlog?.published_at || new Date().toISOString()) : null,
      admin_notes: adminNotes.trim()
    };

    try {
      const ok = await onSave(inputData, initialBlog?.id);
      if (ok) {
        setFeedback({
          type: 'success',
          message: `Article successfully ${resolvedStatus === 'Published' ? 'published' : resolvedStatus === 'Scheduled' ? 'scheduled' : 'saved'}!`
        });
        setStatus(resolvedStatus);
      } else {
        setFeedback({ type: 'error', message: 'Failed to save article. Please try again.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Server error saving article' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-[#202020]">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] text-neutral-400 hover:text-white transition"
            title="Back to Articles"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {initialBlog ? `Edit: ${initialBlog.title}` : 'Create New Article'}
            </h2>
            <div className="flex items-center space-x-2 text-xs text-neutral-400 mt-1">
              <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                status === 'Published' ? 'bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30' :
                status === 'Scheduled' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                status === 'Failed' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                'bg-neutral-800 text-neutral-300'
              }`}>
                {status}
              </span>
              <span>•</span>
              <span>URL: https://dawnexus.in/blog/{slug || 'your-slug'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {initialBlog && (
            <a
              href={`/blog/${slug}?preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1e1e1e] border border-[#252525] text-neutral-300 hover:text-white text-xs font-medium transition"
            >
              <Eye className="w-4 h-4 text-neutral-400" />
              <span>Live Preview</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </a>
          )}

          {initialBlog && onDuplicate && (
            <button
              type="button"
              onClick={() => onDuplicate(initialBlog.id)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1e1e1e] border border-[#252525] text-neutral-300 hover:text-white text-xs font-medium transition"
              title="Duplicate as new draft"
            >
              <Copy className="w-4 h-4 text-neutral-400" />
              <span>Duplicate</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('Draft')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-white text-xs font-medium transition disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-neutral-400" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setActiveTab('schedule');
              handleSubmit('Scheduled');
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition disabled:opacity-50"
          >
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Schedule</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('Published')}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs transition disabled:opacity-50 shadow-md shadow-[#C7FF4D]/10"
          >
            <Send className="w-4 h-4 text-black" />
            <span>Publish Now</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          feedback.type === 'success'
            ? 'bg-[#C7FF4D]/10 border-[#C7FF4D]/30 text-[#C7FF4D]'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="text-sm font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Editor Tabs vs SEO Assistant Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Editor Main Column (7 or 12 cols depending on panel toggle) */}
        <div className={`${showSeoAssistant ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} space-y-6`}>
          {/* Title & Slug Bar */}
          <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                Article Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="e.g. Website Design Costs in Coimbatore: What Businesses Should Know in 2026"
                className="w-full px-4 py-3 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white font-semibold text-lg placeholder-neutral-600 focus:outline-none transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  URL Slug
                </label>
                <div className="flex items-center bg-[#141414] border border-[#282828] rounded-lg px-3 py-2 text-sm focus-within:border-[#C7FF4D]">
                  <span className="text-neutral-500 text-xs mr-1 select-none">/blog/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => {
                      setIsSlugCustom(true);
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    }}
                    placeholder="website-design-cost-coimbatore"
                    className="w-full bg-transparent text-white focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-[#202020]">
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'content'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Content & Body</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'seo'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>SEO Metadata</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('intent')}
                className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'intent'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Intent & Targeting</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'schedule'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Publishing & Calendar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSeoAssistant(!showSeoAssistant)}
              className="text-xs text-neutral-400 hover:text-[#C7FF4D] flex items-center space-x-1 py-1 px-2 rounded hover:bg-[#1a1a1a] transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D]" />
              <span>{showSeoAssistant ? 'Hide SEO Assistant' : 'Show SEO Assistant'}</span>
            </button>
          </div>

          {/* TAB 1: CONTENT & BODY */}
          {activeTab === 'content' && (
            <div className="space-y-4">
              {/* Excerpt */}
              <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Article Excerpt / Summary
                </label>
                <textarea
                  rows={2}
                  value={excerpt}
                  onChange={e => setExcerpt(e.target.value)}
                  placeholder="A concise, compelling overview displayed on article cards and search previews..."
                  className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none transition resize-none"
                />
              </div>

              {/* Editor Toolbar & Body */}
              <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="bg-[#121212] border-b border-[#202020] px-3 py-2 flex items-center flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h2>', '</h2>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Insert H2 Heading"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h3>', '</h3>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Insert H3 Heading"
                  >
                    <Heading3 className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-[#252525] mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Bold text"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Italic text"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-[#252525] mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Bullet list"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ol>\n  <li>', '</li>\n</ol>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Numbered list"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Blockquote"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<code>', '</code>')}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-white transition"
                    title="Inline Code"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                  <span className="w-px h-4 bg-[#252525] mx-1" />
                  <button
                    type="button"
                    onClick={() => {
                      const url = prompt('Enter link URL (e.g. /services/website-design or https://):');
                      if (url) insertFormatting(`<a href="${url}">`, '</a>');
                    }}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-[#C7FF4D] transition"
                    title="Insert Link"
                  >
                    <Link className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Textarea */}
                <textarea
                  ref={textareaRef}
                  rows={20}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write your article in semantic HTML or standard Markdown... Use <h2>, <h3>, <p>, <ul>, <li>, and <a> tags for maximum SEO structure."
                  className="w-full px-4 py-3 bg-[#101010] text-neutral-200 text-sm font-mono leading-relaxed focus:outline-none resize-y min-h-[420px]"
                />
              </div>

              {/* Media & Author Section */}
              <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Featured Media & Author
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Featured Image URL</label>
                    <input
                      type="text"
                      value={featuredImage}
                      onChange={e => setFeaturedImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or /images/..."
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Image Alt Text (SEO)</label>
                    <input
                      type="text"
                      value={imageAlt}
                      onChange={e => setImageAlt(e.target.value)}
                      placeholder="Descriptive explanation for screen readers & search engines"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={author}
                      onChange={e => setAuthor(e.target.value)}
                      placeholder="Dawnexus Editorial"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-400 mb-1">Tags (Comma-separated)</label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                      placeholder="Web Design, Coimbatore, ROI, SEO"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SEO METADATA */}
          {activeTab === 'seo' && (
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Search Engine Optimization Metadata
              </h3>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    SEO Page Title
                  </label>
                  <span className={`text-[11px] ${
                    seoTitle.length >= 40 && seoTitle.length <= 60 ? 'text-[#C7FF4D]' : 'text-neutral-500'
                  }`}>
                    {seoTitle.length}/60 chars recommended
                  </span>
                </div>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={e => setSeoTitle(e.target.value)}
                  placeholder="Website Design Costs in Coimbatore: 2026 Pricing Guide"
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Meta Description
                  </label>
                  <span className={`text-[11px] ${
                    metaDescription.length >= 120 && metaDescription.length <= 160 ? 'text-[#C7FF4D]' : 'text-neutral-500'
                  }`}>
                    {metaDescription.length}/160 chars recommended
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={e => setMetaDescription(e.target.value)}
                  placeholder="Transparent guide to business website design costs in Coimbatore. Learn what factors determine development pricing, timeline, and ROI for your brand."
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Canonical URL
                </label>
                <input
                  type="text"
                  value={canonicalUrl}
                  onChange={e => setCanonicalUrl(e.target.value)}
                  placeholder={`https://dawnexus.in/blog/${slug || 'your-slug'}`}
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm font-mono text-xs focus:outline-none transition"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Leave as canonical URL on https://dawnexus.in/ to prevent duplicate content indexing.
                </p>
              </div>

              {/* SERP Preview Simulation */}
              <div className="pt-4 border-t border-[#202020] space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Google Search Snippet Preview
                </span>
                <div className="p-4 bg-[#141414] border border-[#252525] rounded-lg max-w-xl">
                  <div className="text-xs text-neutral-400 flex items-center space-x-1.5 mb-1">
                    <span className="text-white font-medium">dawnexus.in</span>
                    <span>› blog › {slug || 'article-slug'}</span>
                  </div>
                  <h4 className="text-base font-medium text-[#8ab4f8] hover:underline cursor-pointer line-clamp-1">
                    {seoTitle || title || 'Your Article Title Displays Here'}
                  </h4>
                  <p className="text-xs text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                    {metaDescription || excerpt || 'Your meta description will appear here in search engine results snippets, persuading readers to click through.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INTENT & TARGETING */}
          {activeTab === 'intent' && (
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Audience & Search Intent Targeting
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Primary Keyword
                  </label>
                  <input
                    type="text"
                    value={primaryKeyword}
                    onChange={e => setPrimaryKeyword(e.target.value)}
                    placeholder="e.g. website design in Coimbatore"
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Search Intent
                  </label>
                  <select
                    value={searchIntent}
                    onChange={e => setSearchIntent(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  >
                    {SEARCH_INTENTS.map(intent => (
                      <option key={intent} value={intent}>
                        {intent}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Secondary Keywords (Comma-separated)
                </label>
                <input
                  type="text"
                  value={secondaryKeywordsInput}
                  onChange={e => setSecondaryKeywordsInput(e.target.value)}
                  placeholder="website development cost, business website designer, landing page agency"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Target Geographic Location (Local SEO)
                  </label>
                  <input
                    type="text"
                    value={targetLocation}
                    onChange={e => setTargetLocation(e.target.value)}
                    placeholder="Coimbatore, Tamil Nadu, India"
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Target Audience Persona
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value)}
                    placeholder="Coimbatore MSME business owners, textile founders, marketing heads"
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Key Buyer Questions Answered (One per line)
                </label>
                <textarea
                  rows={3}
                  value={targetQuestionsInput}
                  onChange={e => setTargetQuestionsInput(e.target.value)}
                  placeholder="What is the average price of a website in Coimbatore?&#10;How long does development take?&#10;What is included in custom web design?"
                  className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 4: PUBLISHING & SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Publication Workflow & Scheduling
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Current Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as BlogStatus)}
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  >
                    <option value="Draft">Draft (Private, not published)</option>
                    <option value="Scheduled">Scheduled (Auto-publish at designated time)</option>
                    <option value="Published">Published (Live immediately)</option>
                    <option value="Archived">Archived (Unpublished)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Scheduled Date & Time (IST — Asia/Kolkata)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAtIst}
                    onChange={e => {
                      setScheduledAtIst(e.target.value);
                      if (e.target.value && status === 'Draft') {
                        setStatus('Scheduled');
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    The backend scheduler automatically publishes this post when this time arrives.
                  </p>
                </div>
              </div>

              {initialBlog?.publication_error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  <div className="font-semibold mb-1">Previous Publication Error:</div>
                  <div>{initialBlog.publication_error}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                  Internal Editorial Notes (Admin only)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Notes for editorial team (e.g., target client personas, requested edits, scheduled push reasons)..."
                  className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm placeholder-neutral-600 focus:outline-none transition resize-none"
                />
              </div>

              {initialBlog && onDelete && (
                <div className="pt-4 border-t border-[#202020] flex items-center justify-between">
                  <div className="text-xs text-neutral-500">
                    Created on {new Date(initialBlog.created_at).toLocaleDateString()}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(initialBlog.id)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium border border-red-500/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Article</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Real-time SEO Writing Assistant */}
        {showSeoAssistant && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <SeoWritingAssistant
              input={{
                title,
                slug,
                excerpt,
                content,
                featured_image: featuredImage,
                image_alt: imageAlt,
                primary_keyword: primaryKeyword,
                secondary_keywords: secondaryKeywordsInput.split(',').map((s: string) => s.trim()).filter(Boolean),
                target_location: targetLocation,
                search_intent: searchIntent,
                seo_title: seoTitle,
                meta_description: metaDescription
              }}
              onInsertText={snippet => insertFormatting(`\n${snippet}\n`)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
