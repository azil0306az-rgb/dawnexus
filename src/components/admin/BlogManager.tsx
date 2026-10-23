import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Calendar as CalendarIcon,
  Plus,
  Layers,
  Clock,
  CheckCircle,
  AlertCircle,
  Archive,
  RefreshCw,
  Trash2,
  AlertTriangle,
  X,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { BlogRecord, BlogStats, BlogInput } from '../../types';
import { BlogList } from './BlogList';
import { BlogEditor } from './BlogEditor';
import { BlogCalendar } from './BlogCalendar';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface BlogManagerProps {
  initialBlogId?: string | number | null;
  initialIsNew?: boolean;
}

export const BlogManager: React.FC<BlogManagerProps> = ({
  initialBlogId,
  initialIsNew
}) => {
  const getInitialSubView = (): 'list' | 'calendar' | 'editor' => {
    if (initialIsNew || initialBlogId) return 'editor';
    if (typeof window !== 'undefined' && window.location.search.includes('view=calendar')) {
      return 'calendar';
    }
    return 'list';
  };

  const [subView, setSubView] = useState<'list' | 'calendar' | 'editor'>(getInitialSubView);
  const [editingBlog, setEditingBlog] = useState<BlogRecord | null>(null);
  const [isLoadingBlog, setIsLoadingBlog] = useState<boolean>(Boolean(initialBlogId));
  const [blogLoadError, setBlogLoadError] = useState<string | null>(null);

  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [calendarBlogs, setCalendarBlogs] = useState<BlogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'scheduled' | 'updated'>('newest');
  const [isLoading, setIsLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<BlogStats>({
    total: 0,
    published: 0,
    scheduled: 0,
    drafts: 0,
    failed: 0
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<BlogRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pre-filled date for new post when created from calendar
  const [initialDateForNew, setInitialDateForNew] = useState<string | null>(null);

  // Fetch single blog by ID or slug
  const fetchSingleBlog = useCallback(async (idOrSlug: string | number) => {
    setIsLoadingBlog(true);
    setBlogLoadError(null);
    try {
      const res = await fetch(`/api/admin/blogs/${encodeURIComponent(String(idOrSlug))}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (res.status === 404) {
        setBlogLoadError(`Article #${idOrSlug} was not found in the database.`);
        setEditingBlog(null);
        return;
      }

      if (!res.ok) {
        setBlogLoadError(`Failed to load article #${idOrSlug} (Server returned HTTP ${res.status}).`);
        setEditingBlog(null);
        return;
      }

      const blogData = await res.json();
      setEditingBlog(blogData);
      setSubView('editor');
    } catch (err: any) {
      console.error('[BlogManager Fetch Single Blog Error]:', err);
      setBlogLoadError(err.message || 'Network connection failed while fetching article.');
      setEditingBlog(null);
    } finally {
      setIsLoadingBlog(false);
    }
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blogs/stats', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch blog stats:', err);
    }
  }, []);

  // Fetch Blogs for table
  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy
      });
      if (search.trim()) q.set('search', search.trim());
      if (statusFilter !== 'All') q.set('status', statusFilter);
      if (categoryFilter !== 'All') q.set('category', categoryFilter);

      const res = await fetch(`/api/admin/blogs?${q.toString()}`, {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.items || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch blogs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter, sortBy]);

  // Fetch all blogs for calendar view (up to 100)
  const fetchCalendarBlogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blogs?limit=100', {
        credentials: 'include',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setCalendarBlogs(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch calendar blogs:', err);
    }
  }, []);

  // Sync with initial props
  useEffect(() => {
    if (initialBlogId) {
      fetchSingleBlog(initialBlogId);
    } else if (initialIsNew) {
      setEditingBlog(null);
      setBlogLoadError(null);
      setSubView('editor');
    }
  }, [initialBlogId, initialIsNew, fetchSingleBlog]);

  useEffect(() => {
    fetchStats();
    fetchBlogs();
  }, [fetchStats, fetchBlogs]);

  useEffect(() => {
    if (subView === 'calendar') {
      fetchCalendarBlogs();
    }
  }, [subView, fetchCalendarBlogs]);

  // Handle browser Back and Forward navigation inside BlogManager
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
      const segments = path.split('/').filter(s => s !== 'admin');
      const searchParams = window.location.search;

      if (segments[0] === 'blogs' || segments[0] === 'blog') {
        if (segments[1] === 'new') {
          setEditingBlog(null);
          setBlogLoadError(null);
          setSubView('editor');
        } else if (segments[1]) {
          fetchSingleBlog(segments[1]);
        } else if (searchParams.includes('view=calendar')) {
          setSubView('calendar');
          setEditingBlog(null);
          setBlogLoadError(null);
        } else {
          setSubView('list');
          setEditingBlog(null);
          setBlogLoadError(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [fetchSingleBlog]);

  // Navigation action handlers with URL synchronization
  const handleSelectBlog = (blog: BlogRecord) => {
    setEditingBlog(blog);
    setBlogLoadError(null);
    setSubView('editor');
    const targetUrl = `/admin/blogs/${blog.id}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  const handleCreateNew = () => {
    setEditingBlog(null);
    setBlogLoadError(null);
    setInitialDateForNew(null);
    setSubView('editor');
    const targetUrl = '/admin/blogs/new';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  const handleReturnToList = () => {
    setEditingBlog(null);
    setBlogLoadError(null);
    setSubView('list');
    const targetUrl = '/admin/blogs';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  const handleSwitchToCalendar = () => {
    setEditingBlog(null);
    setBlogLoadError(null);
    setSubView('calendar');
    const targetUrl = '/admin/blogs?view=calendar';
    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Save Blog Handler
  const handleSave = async (data: BlogInput, id?: number): Promise<boolean> => {
    try {
      const url = id ? `/api/admin/blogs/${id}` : '/api/admin/blogs';
      const method = id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        setEditingBlog(result.blog);
        if (!id && result.blog?.id) {
          window.history.replaceState(null, '', `/admin/blogs/${result.blog.id}`);
        }
        fetchStats();
        fetchBlogs();
        fetchCalendarBlogs();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving blog:', err);
      return false;
    }
  };

  // Duplicate Blog Handler
  const handleDuplicate = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/blogs/${id}/duplicate`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        fetchStats();
        fetchBlogs();
        setEditingBlog(data.blog);
        setSubView('editor');
        if (data.blog?.id) {
          window.history.pushState(null, '', `/admin/blogs/${data.blog.id}`);
        }
      }
    } catch (err) {
      console.error('Error duplicating blog:', err);
    }
  };

  // Delete Blog Handler
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/blogs/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        const deletedId = deleteTarget.id;
        setDeleteTarget(null);
        if (editingBlog?.id === deletedId) {
          handleReturnToList();
        }
        fetchStats();
        fetchBlogs();
        fetchCalendarBlogs();
      }
    } catch (err) {
      console.error('Error deleting blog:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="text-xs text-neutral-400 font-medium">Total Articles</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="text-xs text-[#C7FF4D] font-medium flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Published</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.published}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="text-xs text-cyan-400 font-medium flex items-center space-x-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.scheduled}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4">
          <div className="text-xs text-neutral-400 font-medium flex items-center space-x-1">
            <Archive className="w-3.5 h-3.5" />
            <span>Drafts</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.drafts}</div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl p-4 col-span-2 md:col-span-1">
          <div className="text-xs text-red-400 font-medium flex items-center space-x-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Attention / Failed</span>
          </div>
          <div className="text-2xl font-bold text-white mt-1">{stats.failed}</div>
        </div>
      </div>

      {/* Sub-Navigation (List vs Calendar vs Editor) */}
      <div className="flex items-center justify-between border-b border-[#202020] pb-3">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleReturnToList}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              subView === 'list'
                ? 'bg-[#181818] text-[#C7FF4D] border border-[#2a2a2a]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Articles</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToCalendar}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              subView === 'calendar'
                ? 'bg-[#181818] text-[#C7FF4D] border border-[#2a2a2a]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Publishing Calendar</span>
          </button>

          {subView === 'editor' && (
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#181818] text-[#C7FF4D] border border-[#2a2a2a]">
              <span>{editingBlog ? `Edit: ${editingBlog.title.slice(0, 32)}${editingBlog.title.length > 32 ? '...' : ''}` : 'New Article'}</span>
            </div>
          )}
        </div>

        {subView !== 'editor' && (
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs rounded-lg transition shadow-md shadow-[#C7FF4D]/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        )}
      </div>

      {/* Single Blog Loading State */}
      {isLoadingBlog && (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center space-y-4 bg-[#0D0D0D] border border-[#202020] rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D]" />
          <div className="space-y-1">
            <h4 className="text-base font-semibold text-white">Loading Article</h4>
            <p className="text-xs font-mono text-neutral-400">Retrieving article data and editorial metadata...</p>
          </div>
        </div>
      )}

      {/* Single Blog Error / Not Found State */}
      {blogLoadError && !isLoadingBlog && (
        <div className="min-h-[350px] flex flex-col items-center justify-center p-8 text-center space-y-5 bg-[#0D0D0D] border border-amber-500/30 rounded-2xl max-w-xl mx-auto my-6 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-lg font-bold text-white">Unable to Open Article</h4>
            <p className="text-sm text-neutral-400 leading-relaxed">{blogLoadError}</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (initialBlogId) fetchSingleBlog(initialBlogId);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            <button
              type="button"
              onClick={handleReturnToList}
              className="flex items-center space-x-2 px-4 py-2 bg-[#181818] hover:bg-[#222] text-neutral-300 hover:text-white font-medium text-xs rounded-xl border border-[#2e2e2e] transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to All Articles</span>
            </button>
          </div>
        </div>
      )}

      {/* View Switch */}
      {subView === 'list' && !isLoadingBlog && !blogLoadError && (
        <BlogList
          blogs={blogs}
          total={total}
          page={page}
          totalPages={totalPages}
          isLoading={isLoading}
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          onPageChange={setPage}
          onSelectBlog={handleSelectBlog}
          onCreateNew={handleCreateNew}
          onDuplicate={handleDuplicate}
          onDelete={blog => setDeleteTarget(blog)}
        />
      )}

      {subView === 'calendar' && !isLoadingBlog && !blogLoadError && (
        <BlogCalendar
          blogs={calendarBlogs}
          onSelectBlog={handleSelectBlog}
          onCreateBlogForDate={dateStr => {
            setEditingBlog(null);
            setInitialDateForNew(dateStr);
            setSubView('editor');
            window.history.pushState(null, '', '/admin/blogs/new');
          }}
          onRefresh={() => {
            fetchStats();
            fetchCalendarBlogs();
          }}
        />
      )}

      {subView === 'editor' && !isLoadingBlog && !blogLoadError && (
        <ErrorBoundary
          fallbackTitle="Article Editor Error"
          resetButtonText="Return to Article List"
          onReset={handleReturnToList}
        >
          <BlogEditor
            key={editingBlog?.id || 'new'}
            initialBlog={
              editingBlog ||
              (initialDateForNew
                ? ({
                    id: 0,
                    title: '',
                    slug: '',
                    excerpt: '',
                    content: '',
                    featured_image: '',
                    image_alt: '',
                    author: 'Dawnexus Editorial',
                    category: 'Website Design',
                    tags: '[]',
                    primary_keyword: '',
                    secondary_keywords: '[]',
                    target_location: 'Coimbatore, Tamil Nadu, India',
                    search_intent: 'Informational',
                    target_audience: '',
                    target_questions: '[]',
                    seo_title: '',
                    meta_description: '',
                    canonical_url: '',
                    status: 'Scheduled',
                    scheduled_at: `${initialDateForNew}T09:00:00Z`,
                    published_at: null,
                    publication_error: '',
                    admin_notes: '',
                    created_at: '',
                    updated_at: ''
                  } as BlogRecord)
                : null)
            }
            onSave={handleSave}
            onCancel={handleReturnToList}
            onDuplicate={handleDuplicate}
            onDelete={async id => {
              const b = blogs.find(item => item.id === id) || editingBlog;
              if (b) setDeleteTarget(b);
            }}
          />
        </ErrorBoundary>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B0B0B] border border-red-500/40 rounded-2xl max-w-md w-full p-6 sm:p-8 relative shadow-2xl space-y-6">
            <button
              onClick={() => setDeleteTarget(null)}
              className="absolute top-4 right-4 p-2 rounded-lg text-[#A5A5A5] hover:text-white hover:bg-[#161616] border border-[#252525] transition-colors"
              disabled={isDeleting}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete Article #{deleteTarget.id}</h3>
                <p className="text-xs text-[#A5A5A5] mt-0.5">Permanent article removal</p>
              </div>
            </div>

            <p className="text-sm text-[#A5A5A5] leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">&ldquo;{deleteTarget.title}&rdquo;</strong>? This action cannot be undone and will remove the post and its sitemap entry.
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#252525]">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525] text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
