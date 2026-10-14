import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  Calendar,
  ArrowRight,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { BlogRecord } from '../../types';
import { navigateTo } from '../../utils/navigation';
import { usePageSeo } from '../../utils/seo';

const CATEGORIES = [
  'All',
  'Website Design',
  'SEO Strategy',
  'AI Creative',
  'Digital Marketing',
  'Digital Strategy'
];

export const BlogListingPage: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  usePageSeo({
    title: 'Insights, Guides & Digital Strategy | Dawnexus',
    description: 'Transparent frameworks, pricing analyses, and strategic execution guides across web design, search engine optimization, and AI video production.',
    canonicalUrl: 'https://dawnexus.in/blog',
    ogImage: 'https://dawnexus.in/brand/dawnexus-logo-original.png',
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      'name': 'Dawnexus Perspectives & Playbooks',
      'url': 'https://dawnexus.in/blog',
      'description': 'Strategic playbooks on web architecture, SEO discoverability, and AI creative production.'
    }
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const fetchBlogs = async () => {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: '9'
        });
        if (selectedCategory !== 'All') queryParams.set('category', selectedCategory);
        if (search.trim()) queryParams.set('search', search.trim());

        const res = await fetch(`/api/blogs?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setBlogs(data.items);
          setTotal(data.total);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error('Failed to load blog posts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBlogs();
  }, [page, selectedCategory, search]);

  const featuredPost = blogs.length > 0 && page === 1 && !search && selectedCategory === 'All' ? blogs[0] : null;
  const regularPosts = featuredPost ? blogs.slice(1) : blogs;

  return (
    <main className="flex-1 pt-32 pb-24">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121212] border border-[#252525] text-xs font-mono text-[#C7FF4D] mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>DAWNEXUS PERSPECTIVES & PLAYBOOKS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
            Engineered Insights for Modern Digital Growth.
          </h1>
          <p className="text-lg sm:text-xl text-[#A5A5A5] leading-relaxed">
            Transparent frameworks, pricing analyses, and strategic execution guides across web design, search engine optimization, and AI video production.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-[#252525]">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#C7FF4D] text-black shadow-md shadow-[#C7FF4D]/10'
                    : 'bg-[#0B0B0B] text-[#A5A5A5] hover:text-white border border-[#252525] hover:border-[#383838]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#0B0B0B] border border-[#252525] focus:border-[#C7FF4D] rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-2 border-[#C7FF4D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-400">Loading published insights...</p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-24 text-center bg-[#0B0B0B] border border-[#252525] rounded-3xl p-10 space-y-4 max-w-2xl mx-auto my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#141414] border border-[#222] flex items-center justify-center mx-auto text-[#C7FF4D]">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              {!search && selectedCategory === 'All'
                ? 'Fresh Insights Coming Soon'
                : 'No Articles Found'}
            </h3>
            <p className="text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
              {!search && selectedCategory === 'All'
                ? 'We are preparing brand new articles and digital playbooks. Check back soon for fresh tactical insights.'
                : 'No articles matched your criteria. Try adjusting your search term or selecting another category.'}
            </p>
            {!search && selectedCategory === 'All' ? (
              <a
                href="/#contact"
                onClick={e => {
                  e.preventDefault();
                  navigateTo('/#contact');
                }}
                className="inline-block px-5 py-2.5 bg-[#C7FF4D] hover:bg-[#b8f53a] text-black rounded-xl text-xs font-bold transition"
              >
                Start an Inquiry
              </a>
            ) : (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 bg-[#141414] hover:bg-[#202020] text-[#C7FF4D] border border-[#282828] rounded-xl text-xs font-semibold transition"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured Hero Post */}
            {featuredPost && (
              <a
                href={`/blog/${featuredPost.slug}`}
                onClick={e => {
                  e.preventDefault();
                  navigateTo(`/blog/${featuredPost.slug}`);
                }}
                className="group block bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D]/40 rounded-3xl p-6 sm:p-8 lg:p-10 transition-all hover:shadow-2xl hover:shadow-[#C7FF4D]/5 cursor-pointer"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-5">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30 text-xs font-semibold">
                        {featuredPost.category}
                      </span>
                      <span className="text-xs text-neutral-500 font-mono">Featured Playbook</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white group-hover:text-[#C7FF4D] transition-colors tracking-tight leading-tight">
                      {featuredPost.title}
                    </h2>

                    <p className="text-sm sm:text-base text-[#A5A5A5] leading-relaxed line-clamp-3">
                      {featuredPost.excerpt}
                    </p>

                    <div className="flex items-center gap-6 pt-2 text-xs text-neutral-400 font-mono">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#C7FF4D]" />
                        <span>
                          {new Date(featuredPost.published_at || featuredPost.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{featuredPost.author}</span>
                    </div>

                    <div className="inline-flex items-center gap-2 text-xs font-bold text-white group-hover:text-[#C7FF4D] transition-colors pt-2">
                      <span>Read In-Depth Guide</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className="aspect-[16/10] bg-[#121212] border border-[#202020] rounded-2xl overflow-hidden relative flex items-center justify-center group-hover:border-[#C7FF4D]/30 transition">
                      {featuredPost.featured_image ? (
                        <img
                          src={featuredPost.featured_image}
                          alt={featuredPost.image_alt || featuredPost.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="p-8 text-center space-y-3">
                          <div className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto text-[#C7FF4D]">
                            <FileText className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-mono text-neutral-500 block">Dawnexus Digital Guide</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Grid of Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {regularPosts.map(post => (
                <a
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  onClick={e => {
                    e.preventDefault();
                    navigateTo(`/blog/${post.slug}`);
                  }}
                  className="group bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D]/40 rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-[#C7FF4D]/5 cursor-pointer"
                >
                  <div className="aspect-[16/9] bg-[#121212] border-b border-[#202020] overflow-hidden relative flex items-center justify-center">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt={post.image_alt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="p-6 text-center space-y-2">
                        <span className="text-xs font-mono text-neutral-600 uppercase tracking-wider block">
                          {post.category}
                        </span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#050505]/90 backdrop-blur-sm text-[11px] font-semibold text-[#C7FF4D] border border-[#252525]">
                      {post.category}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3 className="text-lg font-bold text-white group-hover:text-[#C7FF4D] transition-colors leading-snug line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#A5A5A5] leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#1e1e1e] flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>
                        {new Date(post.published_at || post.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-1 text-white group-hover:text-[#C7FF4D] transition-colors font-sans font-medium text-xs">
                        <span>Read</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pt-8 flex items-center justify-center gap-3">
                <button
                  disabled={page <= 1}
                  onClick={() => {
                    setPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="p-2.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-mono text-neutral-400 px-3">
                  Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => {
                    setPage(p => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="p-2.5 rounded-xl bg-[#0B0B0B] border border-[#252525] text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

