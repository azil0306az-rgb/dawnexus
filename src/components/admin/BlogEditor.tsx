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
  ExternalLink,
  Upload,
  X,
  Loader2,
  Award,
  BookOpen,
  HelpCircle,
  Plus,
  RotateCcw,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { BlogRecord, BlogInput, BlogStatus, CitationAnswerBlockConfig } from '../../types';
import { SeoWritingAssistant } from './SeoWritingAssistant';

interface BlogEditorProps {
  initialBlog?: BlogRecord | null;
  onSave: (data: BlogInput, id?: number) => Promise<{ success: boolean; error?: string } | boolean>;
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
  const [tagsInput, setTagsInput] = useState(() => {
    if (!initialBlog?.tags) return '';
    try {
      const parsed = typeof initialBlog.tags === 'string' ? JSON.parse(initialBlog.tags) : initialBlog.tags;
      return Array.isArray(parsed) ? parsed.join(', ') : String(initialBlog.tags);
    } catch {
      return String(initialBlog.tags);
    }
  });

  // SEO & Intent
  const [primaryKeyword, setPrimaryKeyword] = useState(initialBlog?.primary_keyword || '');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState(() => {
    if (!initialBlog?.secondary_keywords) return '';
    try {
      const parsed = typeof initialBlog.secondary_keywords === 'string' ? JSON.parse(initialBlog.secondary_keywords) : initialBlog.secondary_keywords;
      return Array.isArray(parsed) ? parsed.join(', ') : String(initialBlog.secondary_keywords);
    } catch {
      return String(initialBlog.secondary_keywords);
    }
  });
  const [targetLocation, setTargetLocation] = useState(
    initialBlog?.target_location || 'Coimbatore, Tamil Nadu, India'
  );
  const [searchIntent, setSearchIntent] = useState(initialBlog?.search_intent || 'Informational');
  const [targetAudience, setTargetAudience] = useState(initialBlog?.target_audience || '');
  const [targetQuestionsInput, setTargetQuestionsInput] = useState(() => {
    if (!initialBlog?.target_questions) return '';
    try {
      const parsed = typeof initialBlog.target_questions === 'string' ? JSON.parse(initialBlog.target_questions) : initialBlog.target_questions;
      return Array.isArray(parsed) ? parsed.join('\n') : String(initialBlog.target_questions);
    } catch {
      return String(initialBlog.target_questions);
    }
  });
  const [seoTitle, setSeoTitle] = useState(initialBlog?.seo_title || '');
  const [metaDescription, setMetaDescription] = useState(initialBlog?.meta_description || '');
  const [canonicalUrl, setCanonicalUrl] = useState(initialBlog?.canonical_url || '');

  // Status & Scheduling
  const [status, setStatus] = useState<BlogStatus>(initialBlog?.status || 'Draft');
  
  // Format existing scheduled_at to IST datetime-local input string (Asia/Kolkata: UTC+5:30)
  const getInitialScheduledIst = () => {
    if (!initialBlog?.scheduled_at) return '';
    try {
      const date = new Date(initialBlog.scheduled_at);
      if (isNaN(date.getTime())) return '';
      // Shift to UTC+5:30
      const istTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
      const pad = (n: number) => (n < 10 ? '0' + n : n);
      return `${istTime.getUTCFullYear()}-${pad(istTime.getUTCMonth() + 1)}-${pad(istTime.getUTCDate())}T${pad(istTime.getUTCHours())}:${pad(istTime.getUTCMinutes())}`;
    } catch {
      return '';
    }
  };

  const [scheduledAtIst, setScheduledAtIst] = useState<string>(getInitialScheduledIst());
  const [adminNotes, setAdminNotes] = useState(initialBlog?.admin_notes || '');

  // Version 8.3.0: Information Gain, E-E-A-T & AI Discovery State
  const [firsthandObservations, setFirsthandObservations] = useState(initialBlog?.firsthand_observations || '');
  const [projectExamples, setProjectExamples] = useState(initialBlog?.project_examples || '');
  const [caseStudies, setCaseStudies] = useState(initialBlog?.case_studies || '');
  const [originalResearchData, setOriginalResearchData] = useState(initialBlog?.original_research_data || '');
  const [implementationProcess, setImplementationProcess] = useState(initialBlog?.implementation_process || '');
  const [externalSourcesInput, setExternalSourcesInput] = useState(() => {
    if (!initialBlog?.external_sources) return '';
    try {
      const parsed = typeof initialBlog.external_sources === 'string'
        ? JSON.parse(initialBlog.external_sources)
        : initialBlog.external_sources;
      return Array.isArray(parsed) ? parsed.join('\n') : '';
    } catch {
      return '';
    }
  });
  const [limitationsLessons, setLimitationsLessons] = useState(initialBlog?.limitations_lessons || '');
  const [authorRole, setAuthorRole] = useState(initialBlog?.author_role || 'Lead Web & SEO Consultant');
  const [authorBio, setAuthorBio] = useState(initialBlog?.author_bio || '');
  const [authorCredentials, setAuthorCredentials] = useState(initialBlog?.author_credentials || '');
  const [reviewerName, setReviewerName] = useState(initialBlog?.reviewer_name || '');
  const [editorialNotes, setEditorialNotes] = useState(initialBlog?.editorial_notes || '');
  const [reviewCycleDays, setReviewCycleDays] = useState<number>(initialBlog?.review_cycle_days || 90);
  const [citationBlocks, setCitationBlocks] = useState<CitationAnswerBlockConfig[]>(() => {
    if (!initialBlog?.citation_answer_blocks) return [];
    try {
      const parsed = typeof initialBlog.citation_answer_blocks === 'string'
        ? JSON.parse(initialBlog.citation_answer_blocks)
        : initialBlog.citation_answer_blocks;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // UI state
  const [activeTab, setActiveTab] = useState<'content' | 'evidence' | 'citation_blocks' | 'seo' | 'intent' | 'schedule'>('content');
  const [showSeoAssistant, setShowSeoAssistant] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Image Upload & Insertion state
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const [isUploadingBody, setIsUploadingBody] = useState(false);
  const [showBodyImageModal, setShowBodyImageModal] = useState(false);
  const [bodyImageUrl, setBodyImageUrl] = useState('');
  const [bodyImageAlt, setBodyImageAlt] = useState('');
  const [bodyImageCaption, setBodyImageCaption] = useState('');
  const featuredFileInputRef = useRef<HTMLInputElement>(null);
  const bodyFileInputRef = useRef<HTMLInputElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to compress & scale image locally
  const processImageUpload = (file: File, maxDim: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const uploadImageToServer = async (file: File): Promise<string> => {
    const dataUrl = await processImageUpload(file, 1600, 0.85);
    const res = await fetch('/api/admin/blogs/upload-image', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload image');
    }
    const data = await res.json();
    return data.url;
  };

  const handleFeaturedFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFeatured(true);
    try {
      const url = await uploadImageToServer(file);
      setFeaturedImage(url);
    } catch (err: any) {
      alert('Failed to upload featured image: ' + (err.message || 'Error'));
    } finally {
      setIsUploadingFeatured(false);
      if (featuredFileInputRef.current) {
        featuredFileInputRef.current.value = '';
      }
    }
  };

  const handleBodyFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBody(true);
    try {
      const url = await uploadImageToServer(file);
      setBodyImageUrl(url);
    } catch (err: any) {
      alert('Failed to upload image: ' + (err.message || 'Error'));
    } finally {
      setIsUploadingBody(false);
      if (bodyFileInputRef.current) {
        bodyFileInputRef.current.value = '';
      }
    }
  };

  const handleInsertBodyImage = () => {
    if (!bodyImageUrl.trim()) {
      alert('Please provide an image URL or upload an image first.');
      return;
    }
    const safeAlt = bodyImageAlt.trim() || title.trim() || 'Article illustration';
    const captionHtml = bodyImageCaption.trim()
      ? `  <figcaption class="text-xs text-center text-neutral-400 mt-2">${bodyImageCaption.trim()}</figcaption>\n`
      : '';
    const figureHtml = `\n<figure class="my-6">\n  <img src="${bodyImageUrl.trim()}" alt="${safeAlt}" class="w-full rounded-xl object-cover shadow-lg" />\n${captionHtml}</figure>\n`;

    insertFormatting(figureHtml, '');
    setShowBodyImageModal(false);
    setBodyImageUrl('');
    setBodyImageAlt('');
    setBodyImageCaption('');
  };

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
          message: 'Please choose a future date and time (IST) for scheduled publication.'
        });
        setActiveTab('schedule');
        return;
      }
      // Parse timestamp as Asia/Kolkata (+05:30)
      const cleanIst = scheduledAtIst.trim();
      const istString = cleanIst.includes('+') || cleanIst.endsWith('Z') ? cleanIst : `${cleanIst}:00+05:30`;
      const selectedDate = new Date(istString);
      if (isNaN(selectedDate.getTime())) {
        setFeedback({ type: 'error', message: 'Invalid publication date selected.' });
        return;
      }
      if (selectedDate.getTime() <= Date.now() + 60000) {
        setFeedback({
          type: 'error',
          message: 'Scheduled publication time must be in the future (Asia/Kolkata IST).'
        });
        return;
      }
      scheduledUtc = selectedDate.toISOString();
    } else if (scheduledAtIst) {
      const cleanIst = scheduledAtIst.trim();
      const istString = cleanIst.includes('+') || cleanIst.endsWith('Z') ? cleanIst : `${cleanIst}:00+05:30`;
      const parsed = new Date(istString);
      if (!isNaN(parsed.getTime())) {
        scheduledUtc = parsed.toISOString();
      }
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
      canonical_url: canonicalUrl.trim() || `https://www.dawnexus.in/blog/${slug.trim()}`,
      status: resolvedStatus,
      scheduled_at: scheduledUtc,
      published_at: resolvedStatus === 'Published' ? (initialBlog?.published_at || new Date().toISOString()) : null,
      admin_notes: adminNotes.trim(),

      // Version 8.3.0 Evidence & AI Discovery
      firsthand_observations: firsthandObservations.trim(),
      project_examples: projectExamples.trim(),
      case_studies: caseStudies.trim(),
      original_research_data: originalResearchData.trim(),
      implementation_process: implementationProcess.trim(),
      external_sources: externalSourcesInput.split('\n').map(s => s.trim()).filter(Boolean),
      limitations_lessons: limitationsLessons.trim(),
      author_role: authorRole.trim(),
      author_bio: authorBio.trim(),
      author_credentials: authorCredentials.trim(),
      reviewer_name: reviewerName.trim(),
      editorial_notes: editorialNotes.trim(),
      citation_answer_blocks: citationBlocks,
      review_cycle_days: Number(reviewCycleDays) || 90
    };

    try {
      const result = await onSave(inputData, initialBlog?.id);
      const isOk = typeof result === 'boolean' ? result : Boolean(result?.success);
      const errorMsg = (typeof result === 'object' && result?.error) ? result.error : 'Failed to save article. Please try again.';

      if (isOk) {
        setFeedback({
          type: 'success',
          message: `Article successfully ${resolvedStatus === 'Published' ? 'published' : resolvedStatus === 'Scheduled' ? 'scheduled' : 'saved'}!`
        });
        setStatus(resolvedStatus);
      } else {
        setFeedback({ type: 'error', message: errorMsg });
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
              <span>URL: https://www.dawnexus.in/blog/{slug || 'your-slug'}</span>
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
              if (!scheduledAtIst) {
                setActiveTab('schedule');
                setFeedback({
                  type: 'error',
                  message: 'Please choose a publication date & time (IST) in the Schedule tab below.'
                });
              } else {
                handleSubmit('Scheduled');
              }
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
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
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
                onClick={() => setActiveTab('evidence')}
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'evidence'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Evidence & E-E-A-T</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('citation_blocks')}
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'citation_blocks'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Citation Blocks ({citationBlocks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
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
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
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
                className={`px-3 py-2.5 text-xs font-semibold transition border-b-2 -mb-px flex items-center space-x-1.5 ${
                  activeTab === 'schedule'
                    ? 'border-[#C7FF4D] text-[#C7FF4D]'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Publishing & Review</span>
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
                  <button
                    type="button"
                    onClick={() => setShowBodyImageModal(true)}
                    className="p-1.5 rounded hover:bg-[#202020] text-neutral-300 hover:text-[#C7FF4D] transition flex items-center space-x-1.5 px-2"
                    title="Insert Image with Caption"
                  >
                    <ImageIcon className="w-4 h-4 text-[#C7FF4D]" />
                    <span className="text-xs font-sans text-neutral-300">Insert Image</span>
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Featured Media & Author
                  </h4>
                  <span className="text-[11px] text-neutral-500">
                    Uploaded directly to Supabase Storage
                  </span>
                </div>

                <input
                  ref={featuredFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFeaturedFileChange}
                />

                {featuredImage ? (
                  <div className="rounded-xl border border-[#262626] bg-[#141414] overflow-hidden p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="w-full md:w-56 h-36 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-[#222] relative group">
                      <img
                        src={featuredImage}
                        alt={imageAlt || 'Featured preview'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-3 w-full">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={isUploadingFeatured}
                          onClick={() => featuredFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] text-white text-xs font-medium rounded-lg border border-[#333] transition flex items-center space-x-1.5"
                        >
                          {isUploadingFeatured ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C7FF4D]" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-[#C7FF4D]" />
                          )}
                          <span>Replace Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFeaturedImage('')}
                          className="px-3 py-1.5 bg-red-950/30 hover:bg-red-950/50 text-red-400 text-xs font-medium rounded-lg border border-red-900/40 transition flex items-center space-x-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate max-w-lg">
                        URL: <span className="text-neutral-400 select-all font-mono">{featuredImage}</span>
                      </div>
                      <div>
                        <label className="block text-[11px] text-neutral-400 mb-1 font-medium">
                          Image Alt Text (SEO & Accessibility)
                        </label>
                        <input
                          type="text"
                          value={imageAlt}
                          onChange={e => setImageAlt(e.target.value)}
                          placeholder="Descriptive explanation for screen readers and search engines..."
                          className="w-full px-3 py-2 bg-[#0e0e0e] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => !isUploadingFeatured && featuredFileInputRef.current?.click()}
                      className={`border-2 border-dashed border-[#282828] hover:border-[#C7FF4D]/60 rounded-xl p-6 text-center cursor-pointer transition bg-[#141414]/50 flex flex-col items-center justify-center min-h-[140px] group ${
                        isUploadingFeatured ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    >
                      {isUploadingFeatured ? (
                        <>
                          <Loader2 className="w-8 h-8 text-[#C7FF4D] animate-spin mb-2" />
                          <p className="text-xs text-neutral-300">Uploading to Supabase Storage...</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-neutral-500 mb-2 group-hover:text-[#C7FF4D] transition" />
                          <p className="text-xs font-medium text-white mb-0.5">Click to upload featured image</p>
                          <p className="text-[11px] text-neutral-500">PNG, JPG, WebP up to 5MB</p>
                        </>
                      )}
                    </div>

                    <div className="space-y-3 flex flex-col justify-center">
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Or paste Image URL</label>
                        <input
                          type="text"
                          value={featuredImage}
                          onChange={e => setFeaturedImage(e.target.value)}
                          placeholder="https://images.unsplash.com/... or Supabase URL"
                          className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Image Alt Text (SEO)</label>
                        <input
                          type="text"
                          value={imageAlt}
                          onChange={e => setImageAlt(e.target.value)}
                          placeholder="Descriptive text for SEO"
                          className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                )}

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

          {/* TAB: ORIGINAL EVIDENCE & E-E-A-T */}
          {activeTab === 'evidence' && (
            <div className="space-y-5">
              {/* Author Credibility Card */}
              <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#1f1f1f]">
                  <Award className="w-4 h-4 text-[#C7FF4D]" />
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Author Credibility & Editorial Verification (E-E-A-T)
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Author Role / Title
                    </label>
                    <input
                      type="text"
                      value={authorRole}
                      onChange={e => setAuthorRole(e.target.value)}
                      placeholder="e.g. Lead Web & SEO Architect, Dawnexus"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Author Credentials / Track Record
                    </label>
                    <input
                      type="text"
                      value={authorCredentials}
                      onChange={e => setAuthorCredentials(e.target.value)}
                      placeholder="e.g. 8+ years enterprise web development; 50+ Coimbatore client rollouts"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Author Bio / Professional Context
                  </label>
                  <textarea
                    rows={2}
                    value={authorBio}
                    onChange={e => setAuthorBio(e.target.value)}
                    placeholder="Short biography establishing hands-on experience and professional background..."
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#1f1f1f]">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Reviewed / Fact-Checked By
                    </label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={e => setReviewerName(e.target.value)}
                      placeholder="e.g. Dawnexus Technical Review Board"
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Maintenance Review Cycle
                    </label>
                    <select
                      value={reviewCycleDays}
                      onChange={e => setReviewCycleDays(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    >
                      <option value={30}>Every 30 Days (Fast-evolving topics / Pricing)</option>
                      <option value={60}>Every 60 Days</option>
                      <option value={90}>Every 90 Days (Recommended standard)</option>
                      <option value={180}>Every 180 Days (Evergreen foundations)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Information Gain Evidence Pillars */}
              <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-4">
                <div className="flex items-center space-x-2 pb-3 border-b border-[#1f1f1f]">
                  <BookOpen className="w-4 h-4 text-[#C7FF4D]" />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      Information Gain & Originality Evidence
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      These fields provide unique value beyond generic regurgitation and directly power Google Information Gain & AI citation signals.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Firsthand Observations & Field Insights
                  </label>
                  <textarea
                    rows={3}
                    value={firsthandObservations}
                    onChange={e => setFirsthandObservations(e.target.value)}
                    placeholder="Document direct observations from client projects, local trade dynamics, or real implementation encounters..."
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Real Project Examples & Scenarios
                    </label>
                    <textarea
                      rows={3}
                      value={projectExamples}
                      onChange={e => setProjectExamples(e.target.value)}
                      placeholder="Actual technical challenges, architecture decisions, or website builds handled for clients..."
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Case Studies & Measurable Metrics
                    </label>
                    <textarea
                      rows={3}
                      value={caseStudies}
                      onChange={e => setCaseStudies(e.target.value)}
                      placeholder="Documented before/after results, conversion rate improvements, speed gains, or traffic shifts..."
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Original Research Data / Internal Benchmarks
                    </label>
                    <textarea
                      rows={3}
                      value={originalResearchData}
                      onChange={e => setOriginalResearchData(e.target.value)}
                      placeholder="Dawnexus performance audits, local cost distributions, test results, or primary survey data..."
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Implementation Process / Methodology
                    </label>
                    <textarea
                      rows={3}
                      value={implementationProcess}
                      onChange={e => setImplementationProcess(e.target.value)}
                      placeholder="The exact step-by-step engineering or SEO process used to deliver this outcome..."
                      className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Limitations, Caveats & Lessons Learned
                  </label>
                  <textarea
                    rows={2}
                    value={limitationsLessons}
                    onChange={e => setLimitationsLessons(e.target.value)}
                    placeholder="Engineering honesty: edge cases where this approach is not recommended, past failures, or tradeoffs..."
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Verified External Sources (One URL per line)
                  </label>
                  <textarea
                    rows={2}
                    value={externalSourcesInput}
                    onChange={e => setExternalSourcesInput(e.target.value)}
                    placeholder="https://developers.google.com/search/docs&#10;https://web.dev/vitals/"
                    className="w-full px-3 py-2 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm font-mono text-xs focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB: CITATION ANSWER BLOCKS */}
          {activeTab === 'citation_blocks' && (
            <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
                <div>
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="w-4 h-4 text-[#C7FF4D]" />
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      AI Discovery Citation Answer Blocks
                    </h3>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Structured answer modules designed for direct citation by AI engines (Perplexity, ChatGPT, Claude, Google AI Overviews).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newBlock: CitationAnswerBlockConfig = {
                      id: `cab_${Date.now()}`,
                      heading_text: '',
                      heading_level: 'h2',
                      concise_answer: '',
                      supporting_points: [],
                      source_reference: 'Dawnexus Production Research'
                    };
                    setCitationBlocks([...citationBlocks, newBlock]);
                  }}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#C7FF4D] hover:bg-[#b8f53a] text-black text-xs font-bold rounded-lg transition shadow"
                >
                  <Plus className="w-3.5 h-3.5 text-black" />
                  <span>Add Answer Block</span>
                </button>
              </div>

              {citationBlocks.length === 0 ? (
                <div className="p-8 border border-dashed border-[#282828] rounded-xl text-center space-y-3">
                  <HelpCircle className="w-8 h-8 text-neutral-500 mx-auto" />
                  <div className="text-sm font-semibold text-neutral-300">No Citation Answer Blocks Defined</div>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Add concise, factual question-and-answer blocks (40-60 words) targeting high-intent questions. They automatically render on the article page and power AI search citations.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const newBlock: CitationAnswerBlockConfig = {
                        id: `cab_${Date.now()}`,
                        heading_text: primaryKeyword ? `What is ${primaryKeyword}?` : 'Key Industry Question',
                        heading_level: 'h2',
                        concise_answer: '',
                        supporting_points: [],
                        source_reference: 'Dawnexus Production Benchmark'
                      };
                      setCitationBlocks([newBlock]);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#252525] border border-[#333] text-neutral-200 text-xs font-medium rounded-lg transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    <span>Create First Answer Block</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {citationBlocks.map((block, idx) => {
                    const wordCount = block.concise_answer
                      ? block.concise_answer.trim().split(/\s+/).filter(Boolean).length
                      : 0;
                    const isOptimalLength = wordCount >= 40 && wordCount <= 60;

                    return (
                      <div
                        key={block.id || idx}
                        className="bg-[#121212] border border-[#252525] rounded-xl p-4 space-y-3.5"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
                          <span className="text-xs font-bold text-[#C7FF4D] uppercase tracking-wider">
                            Answer Block #{idx + 1}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => {
                                if (idx === 0) return;
                                const updated = [...citationBlocks];
                                const temp = updated[idx - 1];
                                updated[idx - 1] = updated[idx];
                                updated[idx] = temp;
                                setCitationBlocks(updated);
                              }}
                              className="text-[11px] p-1 rounded hover:bg-[#252525] text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                              title="Move Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === citationBlocks.length - 1}
                              onClick={() => {
                                if (idx === citationBlocks.length - 1) return;
                                const updated = [...citationBlocks];
                                const temp = updated[idx + 1];
                                updated[idx + 1] = updated[idx];
                                updated[idx] = temp;
                                setCitationBlocks(updated);
                              }}
                              className="text-[11px] p-1 rounded hover:bg-[#252525] text-neutral-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition"
                              title="Move Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const snippet = `\n<div class="dawnexus-citation-block" data-citation-id="${block.id || idx}">\n  <${block.heading_level || block.heading_tag || 'h2'}>${block.heading_text || block.question || ''}</${block.heading_level || block.heading_tag || 'h2'}>\n  <p><strong>Direct Answer:</strong> ${block.concise_answer || block.answer || ''}</p>\n</div>\n`;
                                insertFormatting(snippet);
                              }}
                              className="text-[11px] px-2 py-0.5 rounded bg-[#1f1f1f] hover:bg-[#2a2a2a] text-neutral-300 transition"
                              title="Paste citation HTML into article body"
                            >
                              Insert HTML
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCitationBlocks(citationBlocks.filter((_, i) => i !== idx));
                              }}
                              className="text-[11px] p-1 rounded hover:bg-red-500/10 text-red-400 transition"
                              title="Remove Answer Block"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div className="md:col-span-3">
                            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                              Target Question / Heading Text
                            </label>
                            <input
                              type="text"
                              value={block.heading_text || block.question || ''}
                              onChange={e => {
                                const updated = [...citationBlocks];
                                updated[idx].heading_text = e.target.value;
                                updated[idx].question = e.target.value;
                                setCitationBlocks(updated);
                              }}
                              placeholder="e.g. How much does a custom business website cost in Coimbatore?"
                              className="w-full px-3 py-1.5 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                              Heading Level
                            </label>
                            <select
                              value={block.heading_level || block.heading_tag || 'h2'}
                              onChange={e => {
                                const updated = [...citationBlocks];
                                const tag = e.target.value as 'h2' | 'h3';
                                updated[idx].heading_level = tag;
                                updated[idx].heading_tag = tag;
                                setCitationBlocks(updated);
                              }}
                              className="w-full px-3 py-1.5 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                            >
                              <option value="h2">H2 (Major Section)</option>
                              <option value="h3">H3 (Sub-section)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                              Concise Direct Answer (Target: 40-60 words)
                            </label>
                            <span className={`text-[10px] font-mono ${
                              isOptimalLength ? 'text-[#C7FF4D]' : 'text-neutral-500'
                            }`}>
                              {wordCount} words {isOptimalLength ? '✓ Optimal for AI' : '(40-60 recommended)'}
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            value={block.concise_answer || block.answer || ''}
                            onChange={e => {
                              const updated = [...citationBlocks];
                              updated[idx].concise_answer = e.target.value;
                              updated[idx].answer = e.target.value;
                              setCitationBlocks(updated);
                            }}
                            placeholder="Provide a definitive, factual, self-contained answer without fluff or generic filler..."
                            className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                              Supporting Points (One per line)
                            </label>
                            <textarea
                              rows={2}
                              value={(block.supporting_points || []).join('\n')}
                              onChange={e => {
                                const updated = [...citationBlocks];
                                updated[idx].supporting_points = e.target.value.split('\n').filter(Boolean);
                                setCitationBlocks(updated);
                              }}
                              placeholder="Key factor 1&#10;Key factor 2"
                              className="w-full px-3 py-1.5 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                              Attribution / Source Reference
                            </label>
                            <input
                              type="text"
                              value={block.source_reference || ''}
                              onChange={e => {
                                const updated = [...citationBlocks];
                                updated[idx].source_reference = e.target.value;
                                setCitationBlocks(updated);
                              }}
                              placeholder="e.g. Dawnexus Coimbatore Web Pricing Benchmark 2026"
                              className="w-full px-3 py-1.5 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                  placeholder={`https://www.dawnexus.in/blog/${slug || 'your-slug'}`}
                  className="w-full px-4 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm font-mono text-xs focus:outline-none transition"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Leave as canonical URL on https://www.dawnexus.in/ to prevent duplicate content indexing.
                </p>
              </div>

              {/* SERP Preview Simulation */}
              <div className="pt-4 border-t border-[#202020] space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Google Search Snippet Preview
                </span>
                <div className="p-4 bg-[#141414] border border-[#252525] rounded-lg max-w-xl">
                  <div className="text-xs text-neutral-400 flex items-center space-x-1.5 mb-1">
                    <span className="text-white font-medium">www.dawnexus.in</span>
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

              {scheduledAtIst && (() => {
                const clean = scheduledAtIst.trim();
                const istStr = clean.includes('+') || clean.endsWith('Z') ? clean : `${clean}:00+05:30`;
                const d = new Date(istStr);
                if (isNaN(d.getTime())) return null;
                return (
                  <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="text-neutral-400">Target Publication: </span>
                      <span className="text-cyan-300 font-semibold">
                        {d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })} IST
                      </span>
                      <span className="text-neutral-500 text-[10px] ml-2">({d.toISOString()})</span>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSubmit('Scheduled')}
                      className="self-start sm:self-auto flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition shadow-sm"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Schedule Article Now (IST)</span>
                    </button>
                  </div>
                );
              })()}

              {initialBlog?.publication_error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  <div className="font-semibold mb-1">Previous Publication Error:</div>
                  <div>{initialBlog.publication_error}</div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#1f1f1f]">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Freshness Review Cycle
                  </label>
                  <select
                    value={reviewCycleDays}
                    onChange={e => setReviewCycleDays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[#141414] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-sm focus:outline-none transition"
                  >
                    <option value={30}>Every 30 Days (Rapid market & price changes)</option>
                    <option value={60}>Every 60 Days</option>
                    <option value={90}>Every 90 Days (Standard SEO freshness)</option>
                    <option value={180}>Every 180 Days (Evergreen pillars)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Last Verified / Reviewed At
                  </label>
                  <div className="px-3 py-2.5 bg-[#141414] border border-[#282828] rounded-lg text-xs text-neutral-300">
                    {initialBlog?.last_reviewed_at
                      ? new Date(initialBlog.last_reviewed_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })
                      : 'Not yet recorded (will register upon review)'}
                  </div>
                </div>
              </div>

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
              blogData={{
                firsthand_observations: firsthandObservations,
                project_examples: projectExamples,
                case_studies: caseStudies,
                original_research_data: originalResearchData,
                implementation_process: implementationProcess,
                external_sources: externalSourcesInput.split('\n').map(s => s.trim()).filter(Boolean),
                limitations_lessons: limitationsLessons,
                author_role: authorRole,
                author_credentials: authorCredentials,
                citation_answer_blocks: citationBlocks
              }}
              onInsertText={snippet => insertFormatting(`\n${snippet}\n`)}
            />
          </div>
        )}
      </div>

      {/* Body Image Insert Modal */}
      {showBodyImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#282828] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#222]">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-[#C7FF4D]" />
                <h3 className="text-base font-bold text-white">Insert Image into Article</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBodyImageModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202020] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={bodyFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleBodyFileChange}
            />

            {/* Upload Area */}
            <div>
              <label className="block text-xs text-neutral-400 font-semibold uppercase tracking-wider mb-2">
                Upload Image to Supabase
              </label>
              <div
                onClick={() => !isUploadingBody && bodyFileInputRef.current?.click()}
                className={`border-2 border-dashed border-[#282828] hover:border-[#C7FF4D]/60 rounded-xl p-5 text-center cursor-pointer transition bg-[#161616] flex flex-col items-center justify-center ${
                  isUploadingBody ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isUploadingBody ? (
                  <>
                    <Loader2 className="w-7 h-7 text-[#C7FF4D] animate-spin mb-2" />
                    <p className="text-xs text-neutral-300">Uploading to Supabase Storage...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                    <p className="text-xs font-medium text-white mb-0.5">Click to browse or upload file</p>
                    <p className="text-[11px] text-neutral-500">PNG, JPG, WebP up to 5MB</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Or direct Image URL</label>
              <input
                type="text"
                value={bodyImageUrl}
                onChange={e => setBodyImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
              />
            </div>

            {bodyImageUrl && (
              <div className="rounded-xl border border-[#252525] bg-black p-2 flex items-center space-x-3">
                <img
                  src={bodyImageUrl}
                  alt="Preview"
                  className="w-20 h-14 object-cover rounded-lg border border-[#333]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-neutral-300 truncate">{bodyImageUrl}</p>
                  <p className="text-[11px] text-[#C7FF4D]">Image ready to insert</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Alt Text (Accessibility & SEO)</label>
              <input
                type="text"
                value={bodyImageAlt}
                onChange={e => setBodyImageAlt(e.target.value)}
                placeholder="Describe what is shown in this image..."
                className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Caption (Optional)</label>
              <input
                type="text"
                value={bodyImageCaption}
                onChange={e => setBodyImageCaption(e.target.value)}
                placeholder="Figure caption displayed beneath image..."
                className="w-full px-3 py-2 bg-[#161616] border border-[#282828] focus:border-[#C7FF4D] rounded-lg text-white text-xs focus:outline-none transition"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#222]">
              <button
                type="button"
                onClick={() => setShowBodyImageModal(false)}
                className="px-4 py-2 bg-[#1f1f1f] hover:bg-[#282828] text-neutral-300 text-xs font-semibold rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bodyImageUrl || isUploadingBody}
                onClick={handleInsertBodyImage}
                className="px-4 py-2 bg-[#C7FF4D] hover:bg-[#b8f53a] text-black text-xs font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Insert into Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
