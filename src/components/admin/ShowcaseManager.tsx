import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layers,
  Plus,
  ExternalLink,
  Trash2,
  Edit2,
  Copy,
  Check,
  AlertCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  Upload,
  Globe,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  X,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Star,
  Clock,
  Calendar,
  ShieldCheck,
  Code2,
  ListPlus,
  Compass
} from 'lucide-react';

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  icon?: string;
}

export interface ShowcaseItem {
  id: number;
  title: string;
  slug: string;
  subtitle?: string | null;
  category: string;
  badge?: string | null;
  description: string;
  long_description?: string | null;
  website_url?: string | null;
  demo_url?: string | null;
  screenshot_url?: string | null;
  screenshot_thumbnail_url?: string | null;
  features: string[];
  workflow_steps: WorkflowStep[];
  tech_stack: string[];
  tags: string[];
  status: 'Live' | 'In Development' | 'Coming Soon' | 'Archived';
  publication_status: 'draft' | 'published' | 'archived';
  display_order: number;
  estimated_launch_date?: string | null;
  is_featured: boolean;
  client_inquiry_enabled: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORY_PRESETS = [
  'Automation & Workflows',
  'E-Commerce & Configurator',
  'Interactive & 3D WebGL',
  'Marketing, AI & SEO',
  'Analytics & Visitor Intelligence',
  'CRM & Customer Management'
];

export const ShowcaseManager: React.FC = () => {
  const [showcases, setShowcases] = useState<ShowcaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'display_order' | 'newest' | 'title'>('display_order');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'basics' | 'urls' | 'screenshot' | 'features' | 'workflow' | 'preview'>('basics');
  const [editingShowcase, setEditingShowcase] = useState<ShowcaseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShowcaseItem | null>(null);
  const [previewItem, setPreviewItem] = useState<ShowcaseItem | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotThumbnailUrl, setScreenshotThumbnailUrl] = useState('');
  const [status, setStatus] = useState<'Live' | 'In Development' | 'Coming Soon' | 'Archived'>('Live');
  const [publicationStatus, setPublicationStatus] = useState<'draft' | 'published' | 'archived'>('published');
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [estimatedLaunchDate, setEstimatedLaunchDate] = useState('');
  const [isFeatured, setIsFeatured] = useState<boolean>(false);
  const [clientInquiryEnabled, setClientInquiryEnabled] = useState<boolean>(true);

  // Features list state
  const [featuresList, setFeaturesList] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState('');

  // Tech stack & tags state
  const [techStackList, setTechStackList] = useState<string[]>([]);
  const [newTechInput, setNewTechInput] = useState('');
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Workflow steps state
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);

  // Auto screenshot & Reachability state
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureFeedback, setCaptureFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [urlTestResult, setUrlTestResult] = useState<{ safe: boolean; reachable?: boolean; message?: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all showcases
  const fetchShowcases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/showcases', {
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setShowcases(data.items || []);
      } else {
        const err = await res.json();
        setError(err.error || 'Failed to load product showcases.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading showcases.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchShowcases();
  }, [fetchShowcases]);

  // Toast / notification helper
  const notifySuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4500);
  };

  // Auto-generate slug from title
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (!editingShowcase) {
      const autoSlug = newTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setSlug(autoSlug);
    }
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingShowcase(null);
    setTitle('');
    setSlug('');
    setSubtitle('');
    setCategory(CATEGORY_PRESETS[0]);
    setCustomCategory('');
    setBadge('');
    setDescription('');
    setLongDescription('');
    setWebsiteUrl('');
    setDemoUrl('');
    setScreenshotUrl('');
    setScreenshotThumbnailUrl('');
    setStatus('Live');
    setPublicationStatus('published');
    setDisplayOrder(showcases.length);
    setEstimatedLaunchDate('');
    setIsFeatured(false);
    setClientInquiryEnabled(true);
    setFeaturesList([
      'Real-time automated sync',
      'Production-grade reliability & error logging',
      'Mobile-responsive client interface'
    ]);
    setTechStackList(['React', 'TypeScript', 'Tailwind CSS', 'Node.js']);
    setTagsList(['Automation', 'Workflow']);
    setWorkflowSteps([
      { step: 1, title: 'Submission', description: 'User submits information or triggers automated event' },
      { step: 2, title: 'Processing', description: 'System validates input, checks availability, or builds data' },
      { step: 3, title: 'Execution', description: 'Immediate confirmation, calendar sync, and persistent alert' }
    ]);
    setActiveModalTab('basics');
    setCaptureFeedback(null);
    setUrlTestResult(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item: ShowcaseItem) => {
    setEditingShowcase(item);
    setTitle(item.title);
    setSlug(item.slug);
    setSubtitle(item.subtitle || '');
    if (CATEGORY_PRESETS.includes(item.category)) {
      setCategory(item.category);
      setCustomCategory('');
    } else {
      setCategory('custom');
      setCustomCategory(item.category);
    }
    setBadge(item.badge || '');
    setDescription(item.description || '');
    setLongDescription(item.long_description || '');
    setWebsiteUrl(item.website_url || '');
    setDemoUrl(item.demo_url || '');
    setScreenshotUrl(item.screenshot_url || '');
    setScreenshotThumbnailUrl(item.screenshot_thumbnail_url || '');
    setStatus(item.status);
    setPublicationStatus(item.publication_status);
    setDisplayOrder(item.display_order);
    setEstimatedLaunchDate(item.estimated_launch_date || '');
    setIsFeatured(Boolean(item.is_featured));
    setClientInquiryEnabled(Boolean(item.client_inquiry_enabled));
    setFeaturesList(Array.isArray(item.features) ? [...item.features] : []);
    setTechStackList(Array.isArray(item.tech_stack) ? [...item.tech_stack] : []);
    setTagsList(Array.isArray(item.tags) ? [...item.tags] : []);
    setWorkflowSteps(
      Array.isArray(item.workflow_steps)
        ? item.workflow_steps.map(s => ({ ...s }))
        : []
    );
    setActiveModalTab('basics');
    setCaptureFeedback(null);
    setUrlTestResult(null);
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveShowcase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !slug.trim()) {
      alert('Title and Slug are required.');
      return;
    }

    const finalCategory = category === 'custom' ? customCategory.trim() : category;
    if (!finalCategory) {
      alert('Category is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        slug: slug.trim(),
        subtitle: subtitle.trim() || null,
        category: finalCategory,
        badge: badge.trim() || null,
        description: description.trim(),
        long_description: longDescription.trim() || null,
        website_url: websiteUrl.trim() || null,
        demo_url: demoUrl.trim() || null,
        screenshot_url: screenshotUrl.trim() || null,
        screenshot_thumbnail_url: screenshotThumbnailUrl.trim() || screenshotUrl.trim() || null,
        features: featuresList,
        workflow_steps: workflowSteps,
        tech_stack: techStackList,
        tags: tagsList,
        status,
        publication_status: publicationStatus,
        display_order: displayOrder,
        estimated_launch_date: estimatedLaunchDate.trim() || null,
        is_featured: isFeatured,
        client_inquiry_enabled: clientInquiryEnabled
      };

      const url = editingShowcase
        ? `/api/admin/showcases/${editingShowcase.id}`
        : '/api/admin/showcases';
      const method = editingShowcase ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save showcase.');
      }

      notifySuccess(
        editingShowcase
          ? `Showcase "${title}" updated successfully.`
          : `Showcase "${title}" created successfully.`
      );
      setIsModalOpen(false);
      await fetchShowcases();
    } catch (err: any) {
      alert(err.message || 'Error saving showcase');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Showcase
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/showcases/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        notifySuccess(`Deleted "${deleteTarget.title}"`);
        setDeleteTarget(null);
        await fetchShowcases();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete showcase');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  // Duplicate Showcase
  const handleDuplicate = async (item: ShowcaseItem) => {
    try {
      const res = await fetch(`/api/admin/showcases/${item.id}/duplicate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        notifySuccess(`Duplicated "${item.title}" -> "${data.item.title}"`);
        await fetchShowcases();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to duplicate showcase');
      }
    } catch (err: any) {
      alert(err.message || 'Error duplicating showcase');
    }
  };

  // Reorder Item (Move up or down)
  const handleMoveOrder = async (item: ShowcaseItem, direction: 'up' | 'down') => {
    const sorted = [...showcases].sort((a, b) => a.display_order - b.display_order);
    const currentIndex = sorted.findIndex(s => s.id === item.id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap items
    const reordered = [...sorted];
    const temp = reordered[currentIndex];
    reordered[currentIndex] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const orderedIds = reordered.map(s => s.id);

    // Optimistic UI update
    setShowcases(
      reordered.map((s, idx) => ({ ...s, display_order: idx }))
    );

    try {
      const res = await fetch('/api/admin/showcases/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ orderedIds })
      });
      if (!res.ok) {
        await fetchShowcases();
      } else {
        notifySuccess('Showcase display order updated');
      }
    } catch {
      await fetchShowcases();
    }
  };

  // Toggle Publication Status directly from row
  const handleTogglePublication = async (item: ShowcaseItem) => {
    const nextStatus = item.publication_status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch(`/api/admin/showcases/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ publication_status: nextStatus })
      });
      if (res.ok) {
        notifySuccess(`Updated ${item.title} to ${nextStatus}`);
        await fetchShowcases();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  // Auto-capture screenshot
  const handleAutoCapture = async () => {
    const targetUrl = demoUrl.trim() || websiteUrl.trim();
    if (!targetUrl) {
      setCaptureFeedback({ type: 'error', message: 'Enter a Website or Demo URL first.' });
      return;
    }

    setIsCapturing(true);
    setCaptureFeedback(null);
    try {
      const res = await fetch('/api/admin/showcases/auto-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: targetUrl, slug: slug.trim() || 'showcase' })
      });

      const data = await res.json();
      if (res.ok && data.screenshotUrl) {
        setScreenshotUrl(data.screenshotUrl);
        setScreenshotThumbnailUrl(data.screenshotUrl);
        setCaptureFeedback({
          type: 'success',
          message: `Screenshot captured successfully via ${data.provider}!`
        });
      } else {
        setCaptureFeedback({
          type: 'error',
          message: data.error || 'Failed to capture automated screenshot.'
        });
      }
    } catch (err: any) {
      setCaptureFeedback({
        type: 'error',
        message: err.message || 'Network error triggering screenshot engine.'
      });
    } finally {
      setIsCapturing(false);
    }
  };

  // Test URL reachability with SSRF protection
  const handleTestUrl = async (urlToTest: string) => {
    if (!urlToTest.trim()) {
      setUrlTestResult({ safe: false, message: 'Please provide a URL to test.' });
      return;
    }

    setIsTestingUrl(true);
    setUrlTestResult(null);
    try {
      const res = await fetch('/api/admin/showcases/check-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url: urlToTest.trim() })
      });
      const data = await res.json();
      if (data.reachable) {
        setUrlTestResult({
          safe: true,
          reachable: true,
          message: `URL is live and responsive (HTTP ${data.status} ${data.statusText})`
        });
      } else {
        setUrlTestResult({
          safe: false,
          reachable: false,
          message: data.error || `Destination unreachable (Status: ${data.status || 'offline'})`
        });
      }
    } catch (err: any) {
      setUrlTestResult({
        safe: false,
        reachable: false,
        message: err.message || 'Verification request failed'
      });
    } finally {
      setIsTestingUrl(false);
    }
  };

  // Manual Screenshot Upload
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Selected file must be an image (PNG, JPG, WebP, GIF)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Image file size must be under 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch('/api/admin/showcases/upload-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ image: dataUrl, slug: slug.trim() || 'showcase' })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          setScreenshotUrl(data.url);
          setScreenshotThumbnailUrl(data.url);
          setCaptureFeedback({ type: 'success', message: 'Screenshot uploaded and saved to storage.' });
        } else {
          setCaptureFeedback({ type: 'error', message: data.error || 'Failed to upload screenshot.' });
        }
      } catch (err: any) {
        setCaptureFeedback({ type: 'error', message: err.message || 'Upload failed.' });
      }
    };
    reader.readAsDataURL(file);
  };

  // Filter & Search computation
  const filteredShowcases = showcases
    .filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesSubtitle = item.subtitle?.toLowerCase().includes(q) || false;
        const matchesDesc = item.description?.toLowerCase().includes(q) || false;
        const matchesCategory = item.category.toLowerCase().includes(q);
        const matchesTags = item.tags.some(t => t.toLowerCase().includes(q));
        const matchesTech = item.tech_stack.some(t => t.toLowerCase().includes(q));
        return matchesTitle || matchesSubtitle || matchesDesc || matchesCategory || matchesTags || matchesTech;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return a.display_order - b.display_order;
    });

  // Unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(showcases.map(s => s.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0a0a0a] border border-[#252525]">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Products & Showcases
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#C7FF4D]/20 text-[#C7FF4D] font-mono font-semibold">
                  v8.4.0
                </span>
              </h1>
              <p className="text-sm text-[#A5A5A5] mt-0.5">
                Manage dynamic showcase items, visual previews, automated screenshots, and interactive workflows
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchShowcases}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium bg-[#141414] hover:bg-[#1a1a1a] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
            title="Refresh items"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C7FF4D]' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] transition-all shadow-lg shadow-[#C7FF4D]/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Showcase Item</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 text-[#C7FF4D] text-sm font-medium animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar: Search, Category Filter, Status Filter, Sort */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 rounded-2xl bg-[#0a0a0a] border border-[#252525]">
        {/* Search */}
        <div className="relative md:col-span-5">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
          <input
            type="text"
            placeholder="Search showcases by title, tech, or tags..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm placeholder-[#666666] focus:border-[#C7FF4D] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
          >
            <option value="all">All Categories ({showcases.length})</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Live">🟢 Live</option>
            <option value="In Development">🟡 In Development</option>
            <option value="Coming Soon">🔵 Coming Soon</option>
            <option value="Archived">⚪ Archived</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
          >
            <option value="display_order">Order: Custom Order</option>
            <option value="newest">Order: Newest First</option>
            <option value="title">Order: Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Showcases List / Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl bg-[#0a0a0a] border border-[#252525]">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D] mb-3" />
          <p className="text-sm text-[#A5A5A5]">Loading showcase items from database...</p>
        </div>
      ) : filteredShowcases.length === 0 ? (
        <div className="text-center p-16 rounded-2xl bg-[#0a0a0a] border border-[#252525]">
          <div className="w-14 h-14 rounded-full bg-[#141414] flex items-center justify-center mx-auto mb-4 text-[#A5A5A5]">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Showcase Items Found</h3>
          <p className="text-sm text-[#A5A5A5] max-w-md mx-auto mb-6">
            {searchQuery || filterStatus !== 'all' || filterCategory !== 'all'
              ? 'Try resetting your search or filter options.'
              : 'Add your first showcase item to showcase your interactive products and solutions.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Showcase Item</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShowcases.map((item, index) => {
            const statusColor =
              item.status === 'Live'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : item.status === 'In Development'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : item.status === 'Coming Soon'
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

            const pubColor =
              item.publication_status === 'published'
                ? 'bg-[#C7FF4D]/10 text-[#C7FF4D] border-[#C7FF4D]/30'
                : item.publication_status === 'draft'
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

            return (
              <div
                key={item.id}
                className="group p-5 rounded-2xl bg-[#0a0a0a] border border-[#252525] hover:border-[#383838] transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Left side: Order Controls + Thumbnail + Content */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col items-center gap-1 text-[#666666]">
                    <button
                      onClick={() => handleMoveOrder(item, 'up')}
                      disabled={index === 0}
                      className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-[#888888] font-bold">
                      #{item.display_order + 1}
                    </span>
                    <button
                      onClick={() => handleMoveOrder(item, 'down')}
                      disabled={index === filteredShowcases.length - 1}
                      className="p-1 rounded hover:bg-[#1f1f1f] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-xl bg-[#141414] border border-[#252525] overflow-hidden flex-shrink-0 relative group-hover:border-[#444444] transition-colors">
                    {item.screenshot_thumbnail_url || item.screenshot_url ? (
                      <img
                        src={item.screenshot_thumbnail_url || item.screenshot_url || ''}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#555555]">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    {item.is_featured && (
                      <div className="absolute top-1 right-1 p-0.5 rounded bg-[#C7FF4D] text-[#050505]">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Showcase Meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-medium text-[#C7FF4D] uppercase tracking-wider">
                        {item.category}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1f1f] text-[#A5A5A5] border border-[#333333] font-mono">
                          {item.badge}
                        </span>
                      )}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleTogglePublication(item)}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full border hover:brightness-125 transition-all ${pubColor}`}
                        title="Click to toggle publication"
                      >
                        {item.publication_status}
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-white truncate flex items-center gap-2">
                      <span>{item.title}</span>
                      {item.subtitle && (
                        <span className="text-xs text-[#888888] font-normal truncate hidden md:inline">
                          — {item.subtitle}
                        </span>
                      )}
                    </h3>

                    <p className="text-xs text-[#A5A5A5] line-clamp-1 mt-0.5">
                      {item.description}
                    </p>

                    {/* Tech Badges */}
                    {item.tech_stack && item.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {item.tech_stack.slice(0, 4).map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#161616] text-[#A5A5A5] font-mono border border-[#252525]"
                          >
                            {tech}
                          </span>
                        ))}
                        {item.tech_stack.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 text-[#666666] font-mono">
                            +{item.tech_stack.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center flex-shrink-0 pt-2 lg:pt-0 border-t border-[#1a1a1a] lg:border-t-0 w-full lg:w-auto justify-end">
                  {/* Live Link / Demo */}
                  {item.demo_url ? (
                    <a
                      href={item.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-[#A5A5A5] hover:text-[#C7FF4D] border border-[#252525] transition-colors"
                      title="Open Live Sandbox / Demo"
                    >
                      <Sparkles className="w-4 h-4" />
                    </a>
                  ) : item.website_url ? (
                    <a
                      href={item.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
                      title="Open Target Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : null}

                  {/* Public Detail Preview */}
                  <a
                    href={`/showcases/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-[#A5A5A5] hover:text-[#C7FF4D] border border-[#252525] transition-colors"
                    title="View Public Detail Page"
                  >
                    <Eye className="w-4 h-4" />
                  </a>

                  {/* Duplicate */}
                  <button
                    onClick={() => handleDuplicate(item)}
                    className="p-2 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
                    title="Duplicate Showcase Item"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] text-white text-xs font-semibold border border-[#333333] transition-colors"
                    title="Edit Showcase Item"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    <span>Edit</span>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => setDeleteTarget(item)}
                    className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    title="Delete Showcase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#0e0e0e] border border-[#252525] shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4 border border-red-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Delete Showcase Item</h3>
            <p className="text-sm text-[#A5A5A5] mb-6">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{deleteTarget.title}"</strong>? This will remove its
              database entry and public detail page.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333]"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0c0c0c] border border-[#252525] shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#252525] bg-[#101010]">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-[#C7FF4D]/10 text-[#C7FF4D]">
                  <Layers className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {editingShowcase ? `Edit Showcase: ${editingShowcase.title}` : 'Add New Product Showcase'}
                  </h2>
                  <p className="text-xs text-[#888888]">
                    Configure showcase metadata, screenshots, workflow steps, and features
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-[#1f1f1f] text-[#888888] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#202020] bg-[#0c0c0c] overflow-x-auto text-xs font-medium">
              {[
                { id: 'basics', label: '1. Basic Info' },
                { id: 'urls', label: '2. Destination & URLs' },
                { id: 'screenshot', label: '3. Screenshot & Visuals' },
                { id: 'features', label: '4. Features & Tech' },
                { id: 'workflow', label: '5. Workflow Steps' },
                { id: 'preview', label: '6. Live Preview' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                    activeModalTab === tab.id
                      ? 'border-[#C7FF4D] text-[#C7FF4D] bg-[#141414]'
                      : 'border-transparent text-[#888888] hover:text-white hover:bg-[#141414]/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveShowcase} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: BASIC INFO */}
              {activeModalTab === 'basics' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={e => handleTitleChange(e.target.value)}
                        placeholder="e.g. Appointment Booking Automation"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                        placeholder="e.g. appointment-booking-automation"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm font-mono focus:border-[#C7FF4D] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={subtitle}
                        onChange={e => setSubtitle(e.target.value)}
                        placeholder="e.g. Real-time calendar synchronization & instant notifications"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Badge Text (Optional)
                      </label>
                      <input
                        type="text"
                        value={badge}
                        onChange={e => setBadge(e.target.value)}
                        placeholder="e.g. Popular, New, Automated, 3D WebGL"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Category Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Category Preset
                      </label>
                      <select
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      >
                        {CATEGORY_PRESETS.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="custom">+ Custom Category</option>
                      </select>
                    </div>

                    {category === 'custom' && (
                      <div>
                        <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                          Custom Category Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={customCategory}
                          onChange={e => setCustomCategory(e.target.value)}
                          placeholder="e.g. Fintech & Invoicing"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Status & Publication */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Development Status
                      </label>
                      <select
                        value={status}
                        onChange={e => setStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      >
                        <option value="Live">Live (Production Ready)</option>
                        <option value="In Development">In Development</option>
                        <option value="Coming Soon">Coming Soon</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        CMS Publication
                      </label>
                      <select
                        value={publicationStatus}
                        onChange={e => setPublicationStatus(e.target.value as any)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      >
                        <option value="published">Published (Visible on site)</option>
                        <option value="draft">Draft (Hidden from public)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                        Estimated Launch (Optional)
                      </label>
                      <input
                        type="text"
                        value={estimatedLaunchDate}
                        onChange={e => setEstimatedLaunchDate(e.target.value)}
                        placeholder="e.g. Q1 2026 or Dec 2026"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap items-center gap-6 p-4 rounded-xl bg-[#141414] border border-[#252525]">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={e => setIsFeatured(e.target.checked)}
                        className="w-4 h-4 rounded border-[#333333] text-[#C7FF4D] focus:ring-0 accent-[#C7FF4D]"
                      />
                      <span className="text-sm font-medium text-white flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-[#C7FF4D]" />
                        Featured Product
                      </span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={clientInquiryEnabled}
                        onChange={e => setClientInquiryEnabled(e.target.checked)}
                        className="w-4 h-4 rounded border-[#333333] text-[#C7FF4D] focus:ring-0 accent-[#C7FF4D]"
                      />
                      <span className="text-sm font-medium text-white">
                        Enable Inquiry Form CTA
                      </span>
                    </label>
                  </div>

                  {/* Short Description */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                      Short Description (Hero card summary) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Brief overview explaining what this solution accomplishes..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                    />
                  </div>

                  {/* Long Description */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                      Comprehensive Description (Detail page markdown content)
                    </label>
                    <textarea
                      rows={4}
                      value={longDescription}
                      onChange={e => setLongDescription(e.target.value)}
                      placeholder="Extended explanation covering business advantages, technical implementation, and customization options..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: DESTINATION & URLS */}
              {activeModalTab === 'urls' && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#252525] text-xs text-[#A5A5A5] flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-[#C7FF4D] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white mb-0.5">Enterprise SSRF Security Shield</p>
                      <p>
                        Destination URLs are validated against private IP ranges, cloud metadata services, and loopback addresses.
                        External users will be securely redirected to verified live deployments.
                      </p>
                    </div>
                  </div>

                  {/* Website URL */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                      Website URL (Live Project Destination)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                        <input
                          type="url"
                          value={websiteUrl}
                          onChange={e => setWebsiteUrl(e.target.value)}
                          placeholder="https://example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTestUrl(websiteUrl)}
                        disabled={isTestingUrl || !websiteUrl.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C7FF4D]" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#C7FF4D]" />}
                        <span>Verify Reachability</span>
                      </button>
                    </div>
                  </div>

                  {/* Demo URL */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-1.5">
                      Interactive Demo / Sandbox URL (Optional)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Sparkles className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#666666]" />
                        <input
                          type="url"
                          value={demoUrl}
                          onChange={e => setDemoUrl(e.target.value)}
                          placeholder="https://demo.example.com/live"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm focus:border-[#C7FF4D] focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTestUrl(demoUrl)}
                        disabled={isTestingUrl || !demoUrl.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isTestingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C7FF4D]" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#C7FF4D]" />}
                        <span>Verify Demo</span>
                      </button>
                    </div>
                  </div>

                  {/* Reachability Feedback */}
                  {urlTestResult && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                        urlTestResult.reachable
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}
                    >
                      {urlTestResult.reachable ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{urlTestResult.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: SCREENSHOT & VISUALS */}
              {activeModalTab === 'screenshot' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Screenshot Preview Box */}
                  <div className="p-4 rounded-2xl bg-[#141414] border border-[#252525] flex flex-col items-center">
                    <div className="w-full max-w-lg aspect-video rounded-xl bg-[#090909] border border-[#282828] overflow-hidden flex items-center justify-center relative group">
                      {screenshotUrl ? (
                        <>
                          <img
                            src={screenshotUrl}
                            alt="Showcase Preview"
                            className="w-full h-full object-cover"
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute top-3 right-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this screenshot photo? Remember to click "Save Changes" to save to the database.')) {
                                  setScreenshotUrl('');
                                  setScreenshotThumbnailUrl('');
                                  setCaptureFeedback({
                                    type: 'success',
                                    message: 'Screenshot deleted. Click "Save Changes" below to apply to the database.'
                                  });
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xl shadow-black/80 transition-all hover:scale-105"
                              title="Delete this screenshot photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Photo</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 text-[#555555]">
                          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                          <p className="text-xs">No screenshot image assigned</p>
                        </div>
                      )}
                    </div>
                    {screenshotUrl && (
                      <div className="mt-3 flex items-center justify-between w-full max-w-lg gap-2">
                        <p className="text-[11px] font-mono text-[#888888] truncate flex-1">
                          {screenshotUrl}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this screenshot photo? Remember to click "Save Changes" to save to the database.')) {
                              setScreenshotUrl('');
                              setScreenshotThumbnailUrl('');
                              setCaptureFeedback({
                                type: 'success',
                                message: 'Screenshot deleted. Click "Save Changes" below to apply.'
                              });
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 flex-shrink-0 hover:underline"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Photo</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Capture Feedback */}
                  {captureFeedback && (
                    <div
                      className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
                        captureFeedback.type === 'success'
                          ? 'bg-[#C7FF4D]/10 border border-[#C7FF4D]/30 text-[#C7FF4D]'
                          : 'bg-red-500/10 border border-red-500/30 text-red-400'
                      }`}
                    >
                      {captureFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{captureFeedback.message}</span>
                    </div>
                  )}

                  {/* 3 Screenshot Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Option 1: Auto Capture */}
                    <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles className="w-4 h-4 text-[#C7FF4D]" />
                          <h4 className="text-sm font-bold text-white">Option 1: Auto-Capture</h4>
                        </div>
                        <p className="text-xs text-[#888888] mb-4">
                          Renders a clean 1440x900 desktop viewport screenshot of the target or demo URL and uploads directly to CDN.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoCapture}
                        disabled={isCapturing}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] transition-colors disabled:opacity-50"
                      >
                        {isCapturing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Capturing Browser Viewport...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Capture Website Screenshot</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Option 2: Upload Custom Image */}
                    <div className="p-5 rounded-xl bg-[#101010] border border-[#222222] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Upload className="w-4 h-4 text-[#C7FF4D]" />
                          <h4 className="text-sm font-bold text-white">Option 2: Upload Custom Image</h4>
                        </div>
                        <p className="text-xs text-[#888888] mb-4">
                          Upload high-resolution mockups or webp screenshots directly from your device (Max 8MB).
                        </p>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleManualUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C7FF4D]" />
                        <span>Choose File From Device</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 3: Direct URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono font-medium text-[#A5A5A5]">
                        Option 3: Direct Screenshot URL or Local Asset Path
                      </label>
                      {screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this screenshot image? Click "Save Changes" to save to the database.')) {
                              setScreenshotUrl('');
                              setScreenshotThumbnailUrl('');
                              setCaptureFeedback({
                                type: 'success',
                                message: 'Screenshot deleted. Remember to click "Save Changes" below to apply.'
                              });
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 transition-colors hover:underline"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Photo</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={screenshotUrl}
                        onChange={e => {
                          setScreenshotUrl(e.target.value);
                          setScreenshotThumbnailUrl(e.target.value);
                        }}
                        placeholder="e.g. /showcases/website-quotation-builder.webp or https://..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#141414] border border-[#252525] text-white text-sm font-mono focus:border-[#C7FF4D] focus:outline-none"
                      />
                      {screenshotUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this screenshot image? Click "Save Changes" to save to the database.')) {
                              setScreenshotUrl('');
                              setScreenshotThumbnailUrl('');
                              setCaptureFeedback({
                                type: 'success',
                                message: 'Screenshot deleted. Remember to click "Save Changes" below to apply.'
                              });
                            }
                          }}
                          className="px-3.5 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 border border-red-800/40 text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FEATURES & TECH STACK */}
              {activeModalTab === 'features' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Features List */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-2 flex items-center gap-1.5">
                      <ListPlus className="w-4 h-4 text-[#C7FF4D]" />
                      Features & Key Highlights
                    </label>

                    <div className="space-y-2 mb-3">
                      {featuresList.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={feat}
                            onChange={e => {
                              const updated = [...featuresList];
                              updated[fIdx] = e.target.value;
                              setFeaturesList(updated);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFeaturesList(featuresList.filter((_, idx) => idx !== fIdx));
                            }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Remove feature"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add new feature highlight..."
                        value={newFeatureInput}
                        onChange={e => setNewFeatureInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newFeatureInput.trim()) {
                              setFeaturesList([...featuresList, newFeatureInput.trim()]);
                              setNewFeatureInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newFeatureInput.trim()) {
                            setFeaturesList([...featuresList, newFeatureInput.trim()]);
                            setNewFeatureInput('');
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors"
                      >
                        Add Feature
                      </button>
                    </div>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-2 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-[#C7FF4D]" />
                      Technology Stack
                    </label>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {techStackList.map((tech, tIdx) => (
                        <span
                          key={tIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141414] border border-[#252525] text-white text-xs font-mono"
                        >
                          {tech}
                          <button
                            type="button"
                            onClick={() => setTechStackList(techStackList.filter((_, idx) => idx !== tIdx))}
                            className="text-[#666666] hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Next.js, Three.js, Supabase, Tailwind, Python..."
                        value={newTechInput}
                        onChange={e => setNewTechInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTechInput.trim()) {
                              setTechStackList([...techStackList, newTechInput.trim()]);
                              setNewTechInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTechInput.trim()) {
                            setTechStackList([...techStackList, newTechInput.trim()]);
                            setNewTechInput('');
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors"
                      >
                        Add Tech
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs font-mono font-medium text-[#A5A5A5] mb-2 flex items-center gap-1.5">
                      <Compass className="w-4 h-4 text-[#C7FF4D]" />
                      Tags & Search Keywords
                    </label>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {tagsList.map((tag, tagIdx) => (
                        <span
                          key={tagIdx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141414] border border-[#252525] text-[#A5A5A5] text-xs font-mono"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => setTagsList(tagsList.filter((_, idx) => idx !== tagIdx))}
                            className="text-[#666666] hover:text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Real-Time, Analytics, SEO, 3D"
                        value={newTagInput}
                        onChange={e => setNewTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTagInput.trim()) {
                              setTagsList([...tagsList, newTagInput.trim()]);
                              setNewTagInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 rounded-xl bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTagInput.trim()) {
                            setTagsList([...tagsList, newTagInput.trim()]);
                            setNewTagInput('');
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: WORKFLOW STEPS */}
              {activeModalTab === 'workflow' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-[#141414] border border-[#252525] text-xs text-[#A5A5A5]">
                    Define step-by-step interactive workflow sequences that explain how this product or system functions end-to-end.
                  </div>

                  <div className="space-y-3">
                    {workflowSteps.map((ws, wIdx) => (
                      <div
                        key={wIdx}
                        className="p-4 rounded-xl bg-[#101010] border border-[#222222] space-y-2 relative"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#C7FF4D]">
                            Step {wIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setWorkflowSteps(workflowSteps.filter((_, idx) => idx !== wIdx))}
                            className="p-1 rounded text-[#666666] hover:text-red-400"
                            title="Remove step"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <input
                          type="text"
                          value={ws.title}
                          placeholder="Step Title (e.g. Instant Scheduling)"
                          onChange={e => {
                            const updated = [...workflowSteps];
                            updated[wIdx].title = e.target.value;
                            setWorkflowSteps(updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#252525] text-white text-xs font-medium focus:border-[#C7FF4D] focus:outline-none"
                        />

                        <textarea
                          rows={2}
                          value={ws.description}
                          placeholder="Step description..."
                          onChange={e => {
                            const updated = [...workflowSteps];
                            updated[wIdx].description = e.target.value;
                            setWorkflowSteps(updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#252525] text-white text-xs focus:border-[#C7FF4D] focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkflowSteps([
                        ...workflowSteps,
                        {
                          step: workflowSteps.length + 1,
                          title: `Workflow Stage ${workflowSteps.length + 1}`,
                          description: 'Description of the operation performed at this stage.'
                        }
                      ]);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#333333] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C7FF4D]" />
                    <span>Add Workflow Step</span>
                  </button>
                </div>
              )}

              {/* TAB 6: LIVE PREVIEW */}
              {activeModalTab === 'preview' && (
                <div className="space-y-4 animate-fadeIn">
                  <p className="text-xs text-[#888888]">
                    This is how your showcase card will appear inside the "Our Products & Showcases" grid on the public website:
                  </p>

                  <div className="max-w-md mx-auto p-5 rounded-2xl bg-[#0e0e0e] border border-[#252525] shadow-xl">
                    <div className="aspect-video w-full rounded-xl bg-[#141414] border border-[#252525] overflow-hidden mb-4 relative">
                      {screenshotUrl ? (
                        <img src={screenshotUrl} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#555555]">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                      {badge && (
                        <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#050505]/80 backdrop-blur-md text-[#C7FF4D] text-[10px] font-mono font-semibold border border-[#C7FF4D]/30">
                          {badge}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#C7FF4D] mb-1">
                      <span>{category === 'custom' ? customCategory : category}</span>
                      <span>•</span>
                      <span className="text-[#888888]">{status}</span>
                    </div>

                    <h4 className="text-base font-bold text-white mb-1.5">{title || 'Showcase Title'}</h4>
                    <p className="text-xs text-[#A5A5A5] line-clamp-2 mb-3">
                      {description || 'Showcase description summary will be displayed here...'}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {techStackList.slice(0, 3).map((t, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-[#161616] text-[#A5A5A5] font-mono">
                          {t}
                        </span>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-[#1a1a1a] flex items-center justify-between text-xs font-semibold text-[#C7FF4D]">
                      <span>Explore Solution</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-5 border-t border-[#202020] bg-[#0c0c0c]">
                <div className="text-xs text-[#666666]">
                  {editingShowcase ? `ID: #${editingShowcase.id}` : 'Creating new item'}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#141414] hover:bg-[#1f1f1f] text-[#A5A5A5] hover:text-white border border-[#252525] transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#C7FF4D] text-[#050505] hover:bg-[#b8f53b] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{editingShowcase ? 'Save Changes' : 'Create Showcase'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
