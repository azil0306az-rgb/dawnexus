import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { BlogRecord, BlogStatus } from '../../types';

interface BlogListProps {
  blogs: BlogRecord[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  sortBy: string;
  onSortByChange: (val: any) => void;
  onPageChange: (newPage: number) => void;
  onSelectBlog: (blog: BlogRecord) => void;
  onCreateNew: () => void;
  onDuplicate: (id: number) => void;
  onDelete: (blog: BlogRecord) => void;
}

const CATEGORIES = [
  'All',
  'Website Design',
  'SEO Strategy',
  'AI Creative',
  'Digital Marketing',
  'Digital Strategy',
  'Case Studies'
];

export const BlogList: React.FC<BlogListProps> = ({
  blogs,
  total,
  page,
  totalPages,
  isLoading,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  sortBy,
  onSortByChange,
  onPageChange,
  onSelectBlog,
  onCreateNew,
  onDuplicate,
  onDelete
}) => {
  return (
    <div className="space-y-5">
      {/* Search, Filters, and New Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search articles by title, keyword, slug..."
            className="w-full pl-10 pr-4 py-2 bg-[#121212] border border-[#252525] focus:border-[#C7FF4D] rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none transition"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => onStatusFilterChange(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#252525] rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF4D] transition"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Draft">Draft</option>
            <option value="Failed">Failed</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#252525] rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF4D] transition"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => onSortByChange(e.target.value)}
            className="px-3 py-2 bg-[#121212] border border-[#252525] rounded-lg text-white text-xs focus:outline-none focus:border-[#C7FF4D] transition"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="scheduled">Scheduled Date</option>
            <option value="updated">Recently Updated</option>
          </select>

          <button
            type="button"
            onClick={onCreateNew}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#C7FF4D] hover:bg-[#d6ff73] text-black font-semibold text-xs rounded-lg transition shadow-md shadow-[#C7FF4D]/10"
          >
            <Plus className="w-4 h-4" />
            <span>New Article</span>
          </button>
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-[#0D0D0D] border border-[#202020] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-neutral-400 text-sm">Loading articles...</div>
        ) : blogs.length === 0 ? (
          <div className="py-20 text-center text-neutral-400 text-sm space-y-3">
            <FileText className="w-8 h-8 text-neutral-600 mx-auto" />
            <p>No articles found matching your criteria.</p>
            <button
              onClick={onCreateNew}
              className="text-xs text-[#C7FF4D] hover:underline"
            >
              Create your first article
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#121212] text-neutral-400 text-xs uppercase tracking-wider border-b border-[#202020]">
                <tr>
                  <th className="py-3.5 px-4">Article</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Target Keyword</th>
                  <th className="py-3.5 px-4">Date (IST)</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1c1c] text-neutral-300">
                {blogs.map(blog => {
                  let statusBadge = 'bg-neutral-800 text-neutral-300';
                  if (blog.status === 'Published') statusBadge = 'bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30';
                  else if (blog.status === 'Scheduled') statusBadge = 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
                  else if (blog.status === 'Failed') statusBadge = 'bg-red-500/10 text-red-400 border border-red-500/30';

                  const displayDate = blog.scheduled_at || blog.published_at || blog.created_at;

                  return (
                    <tr
                      key={blog.id}
                      className="hover:bg-[#141414] transition cursor-pointer"
                      onClick={() => onSelectBlog(blog)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white hover:text-[#C7FF4D] transition">
                          {blog.title}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono mt-0.5">
                          /blog/{blog.slug}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-400">
                        {blog.category}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge}`}>
                          {blog.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-400">
                        {blog.primary_keyword || <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-neutral-400 whitespace-nowrap">
                        {displayDate ? new Date(displayDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectBlog(blog)}
                            className="p-1.5 rounded hover:bg-[#202020] text-neutral-400 hover:text-white transition"
                            title="Edit Article"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <a
                            href={`/blog/${blog.slug}?preview=true`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#202020] text-neutral-400 hover:text-[#C7FF4D] transition"
                            title="Preview Article"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => onDuplicate(blog.id)}
                            className="p-1.5 rounded hover:bg-[#202020] text-neutral-400 hover:text-white transition"
                            title="Duplicate Draft"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(blog)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition"
                            title="Delete Article"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#121212] border-t border-[#202020] flex items-center justify-between text-xs text-neutral-400">
            <div>
              Showing page {page} of {totalPages} ({total} total articles)
            </div>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="p-1.5 rounded bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="p-1.5 rounded bg-[#181818] hover:bg-[#222] border border-[#2a2a2a] disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
