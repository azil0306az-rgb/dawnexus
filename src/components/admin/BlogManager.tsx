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
  X
} from 'lucide-react';
import { BlogRecord, BlogStats, BlogInput } from '../../types';
import { BlogList } from './BlogList';
import { BlogEditor } from './BlogEditor';
import { BlogCalendar } from './BlogCalendar';

export const BlogManager: React.FC = () => {
  const [subView, setSubView] = useState<'list' | 'calendar' | 'editor'>('list');
  const [editingBlog, setEditingBlog] = useState<BlogRecord | null>(null);
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

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blogs/stats');
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

      const res = await fetch(`/api/admin/blogs?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setBlogs(data.items);
        setTotal(data.total);
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
      const res = await fetch('/api/admin/blogs?limit=100');
      if (res.ok) {
        const data = await res.json();
        setCalendarBlogs(data.items);
      }
    } catch (err) {
      console.error('Failed to fetch calendar blogs:', err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchBlogs();
  }, [fetchStats, fetchBlogs]);

  useEffect(() => {
    if (subView === 'calendar') {
      fetchCalendarBlogs();
    }
  }, [subView, fetchCalendarBlogs]);

  // Save Blog Handler
  const handleSave = async (data: BlogInput, id?: number): Promise<boolean> => {
    try {
      const url = id ? `/api/admin/blogs/${id}` : '/api/admin/blogs';
      const method = id ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        const result = await res.json();
        setEditingBlog(result.blog);
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
      const res = await fetch(`/api/admin/blogs/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        fetchStats();
        fetchBlogs();
        setEditingBlog(data.blog);
        setSubView('editor');
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
      const res = await fetch(`/api/admin/blogs/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteTarget(null);
        if (editingBlog?.id === deleteTarget.id) {
          setEditingBlog(null);
          setSubView('list');
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
            onClick={() => {
              setSubView('list');
              setEditingBlog(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
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
            onClick={() => {
              setSubView('calendar');
              setEditingBlog(null);
            }}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
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
              <span>{editingBlog ? 'Edit Article' : 'New Article'}</span>
            </div>
          )}
        </div>

        {subView !== 'editor' && (
          <button
            type="button"
            onClick={() => {
              setEditingBlog(null);
              setInitialDateForNew(null);
              setSubView('editor');
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs rounded-lg transition shadow-md shadow-[#C7FF4D]/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create Article</span>
          </button>
        )}
      </div>

      {/* View Switch */}
      {subView === 'list' && (
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
          onSelectBlog={blog => {
            setEditingBlog(blog);
            setSubView('editor');
          }}
          onCreateNew={() => {
            setEditingBlog(null);
            setSubView('editor');
          }}
          onDuplicate={handleDuplicate}
          onDelete={blog => setDeleteTarget(blog)}
        />
      )}

      {subView === 'calendar' && (
        <BlogCalendar
          blogs={calendarBlogs}
          onSelectBlog={blog => {
            setEditingBlog(blog);
            setSubView('editor');
          }}
          onCreateBlogForDate={dateStr => {
            setEditingBlog(null);
            setInitialDateForNew(dateStr);
            setSubView('editor');
          }}
          onRefresh={() => {
            fetchStats();
            fetchCalendarBlogs();
          }}
        />
      )}

      {subView === 'editor' && (
        <BlogEditor
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
          onCancel={() => {
            setSubView('list');
            setEditingBlog(null);
          }}
          onDuplicate={handleDuplicate}
          onDelete={async id => {
            const b = blogs.find(item => item.id === id) || editingBlog;
            if (b) setDeleteTarget(b);
          }}
        />
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
