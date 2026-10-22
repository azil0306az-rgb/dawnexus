import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  Share2,
  CheckCircle,
  HelpCircle,
  Sparkles,
  MapPin,
  ChevronRight,
  Bookmark
} from 'lucide-react';
import { BlogRecord, CitationAnswerBlockData } from '../../types';
import { navigateTo } from '../../utils/navigation';
import { usePageSeo } from '../../utils/seo';
import { buildArticleJsonLd } from '../../utils/jsonLd';
import { CitationAnswerBlock } from '../../components/public/CitationAnswerBlock';
import { ContextualCtaBlock } from '../../components/public/ContextualCtaBlock';
import { ShieldCheck, Award } from 'lucide-react';

interface BlogPostPageProps {
  slug?: string;
}

export const BlogPostPage: React.FC<BlogPostPageProps> = ({ slug: propSlug }) => {
  const [blog, setBlog] = useState<BlogRecord | null>(null);
  const [related, setRelated] = useState<BlogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract slug from prop or window location
  const currentSlug = propSlug || window.location.pathname.replace(/^\/blog\//, '').split('?')[0];
  const isPreview = window.location.search.includes('preview=true');

  usePageSeo({
    title: blog ? `${blog.seo_title || blog.title} | Dawnexus` : 'Dawnexus Insights',
    description: blog ? (blog.meta_description || blog.excerpt) : 'Dawnexus digital marketing, web engineering and AI insights.',
    canonicalUrl: `https://www.dawnexus.in/blog/${currentSlug}`,
    ogImage: blog?.featured_image || 'https://www.dawnexus.in/brand/dawnexus-logo-original.png',
    schema: blog ? buildArticleJsonLd(blog) : undefined
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchArticle = async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        const previewQuery = isPreview ? '?preview=true' : '';
        const res = await fetch(`/api/blogs/${currentSlug}${previewQuery}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setBlog(data.blog);
        setRelated(data.related || []);
      } catch (err) {
        console.error('Failed to load article:', err);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentSlug) {
      fetchArticle();
    }
  }, [currentSlug, isPreview]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <main className="flex-1 py-40 text-center">
        <div className="w-8 h-8 border-2 border-[#C7FF4D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-mono text-neutral-400">Loading article...</p>
      </main>
    );
  }

  if (notFound || !blog) {
    return (
      <main className="flex-1 max-w-xl mx-auto py-40 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#0B0B0B] border border-[#252525] flex items-center justify-center mx-auto text-[#C7FF4D]">
          <Bookmark className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-white">Article Not Found</h1>
        <p className="text-sm text-neutral-400">
          The article you are looking for does not exist or has not been published yet.
        </p>
        <button
          onClick={() => navigateTo('/blog')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-semibold text-xs transition hover:bg-[#d6ff73]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Insights Hub</span>
        </button>
      </main>
    );
  }

  // Parse questions and tags
  let parsedQuestions: string[] = [];
  try {
    parsedQuestions = JSON.parse(blog.target_questions || '[]');
  } catch {
    //
  }

  let parsedTags: string[] = [];
  try {
    parsedTags = JSON.parse(blog.tags || '[]');
  } catch {
    //
  }

  // Parse Citation Answer Blocks (Version 8.3.0)
  let citationBlocks: CitationAnswerBlockData[] = [];
  try {
    citationBlocks = typeof blog.citation_answer_blocks === 'string'
      ? JSON.parse(blog.citation_answer_blocks)
      : (blog.citation_answer_blocks || []);
  } catch {
    //
  }

  // Map category to contextual service key
  const getServiceKey = (cat: string): 'website-design' | 'seo-services' | 'ai-video-creation' | 'digital-marketing' => {
    const c = (cat || '').toLowerCase();
    if (c.includes('web') || c.includes('design') || c.includes('cost')) return 'website-design';
    if (c.includes('seo') || c.includes('search') || c.includes('maps')) return 'seo-services';
    if (c.includes('video') || c.includes('ai')) return 'ai-video-creation';
    return 'digital-marketing';
  };
  const targetServiceKey = getServiceKey(blog.category);

  // Calculate approximate reading time
  const plainText = (blog.content || '').replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim().split(/\s+/).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <main className="flex-1 pt-32 pb-24">
      {/* Draft Preview Indicator Banner */}
      {isPreview && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-center text-xs font-semibold flex items-center justify-center gap-2 sticky top-20 z-40 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ADMINISTRATOR PREVIEW MODE — Article Status: {blog.status}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
        <nav className="flex items-center space-x-2 text-xs font-mono text-neutral-500">
          <a
            href="/"
            onClick={e => {
              e.preventDefault();
              navigateTo('/');
            }}
            className="hover:text-white transition"
          >
            Home
          </a>
          <ChevronRight className="w-3 h-3" />
          <a
            href="/blog"
            onClick={e => {
              e.preventDefault();
              navigateTo('/blog');
            }}
            className="hover:text-white transition"
          >
            Insights
          </a>
          <ChevronRight className="w-3 h-3" />
          <span className="text-neutral-400">{blog.category}</span>
        </nav>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6">
        <header className="space-y-6 pb-10 border-b border-[#202020]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30 text-xs font-semibold">
              {blog.category}
            </span>
            {blog.target_location && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#121212] border border-[#252525] text-xs text-neutral-400">
                <MapPin className="w-3 h-3 text-[#C7FF4D]" />
                <span>{blog.target_location}</span>
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg sm:text-xl text-neutral-300 leading-relaxed font-normal">
              {blog.excerpt}
            </p>
          )}

          {/* Author and Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#121212] border border-[#252525] flex items-center justify-center text-[#C7FF4D]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="text-white font-sans font-medium">{blog.author}</span>
              </div>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                <span>
                  {new Date(blog.published_at || blog.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                <span>~{readTime} min read</span>
              </span>
            </div>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121212] hover:bg-[#1a1a1a] border border-[#252525] text-neutral-300 hover:text-white transition"
              title="Copy Article Link"
            >
              <Share2 className="w-3.5 h-3.5 text-[#C7FF4D]" />
              <span>{copied ? 'Link Copied!' : 'Share'}</span>
            </button>
          </div>
        </header>

        {/* Featured Image */}
        {blog.featured_image && (
          <div className="my-10 aspect-[16/9] rounded-2xl overflow-hidden bg-[#101010] border border-[#202020]">
            <img
              src={blog.featured_image}
              alt={blog.image_alt || blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Body Content Typography */}
        <div className="py-8 text-neutral-200 text-base sm:text-lg leading-relaxed space-y-6 article-body">
          <div
            dangerouslySetInnerHTML={{ __html: blog.content }}
            className="prose prose-invert max-w-none space-y-6 [&>h2]:text-2xl [&>h2]:sm:text-3xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:tracking-tight [&>h3]:text-xl [&>h3]:sm:text-2xl [&>h3]:font-bold [&>h3]:text-white [&>h3]:mt-8 [&>h3]:mb-3 [&>p]:leading-relaxed [&>p]:text-neutral-300 [&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:space-y-2 [&>ul]:text-neutral-300 [&>ol]:list-decimal [&>ol]:pl-6 [&>ol]:space-y-2 [&>ol]:text-neutral-300 [&>blockquote]:border-l-2 [&>blockquote]:border-[#C7FF4D] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-neutral-400 [&>a]:text-[#C7FF4D] [&>a]:underline [&>a]:underline-offset-4 hover:[&>a]:text-white [&>strong]:text-white"
          />
        </div>

        {/* Target Questions / FAQ Section */}
        {parsedQuestions.length > 0 && (
          <div className="my-12 p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#C7FF4D]" />
              <h3 className="text-xl font-bold text-white tracking-tight">
                Frequently Addressed Strategic Questions
              </h3>
            </div>
            <div className="space-y-4">
              {parsedQuestions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#121212] border border-[#202020] text-sm text-neutral-300">
                  <span className="font-semibold text-white block mb-1">Q: {q}</span>
                  <span className="text-xs text-neutral-400">
                    Detailed within the strategic framework above. Contact Dawnexus engineering for customized project scope audits.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Citation Answer Blocks (Version 8.3.0 AI Discovery) */}
        {citationBlocks.length > 0 && (
          <section className="my-12 space-y-6" aria-label="Key Strategic Answers">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C7FF4D]" />
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Key Strategic Direct Answers
              </h3>
            </div>
            <div className="space-y-4">
              {citationBlocks.map((block, idx) => (
                <CitationAnswerBlock
                  key={block.id || idx}
                  question={block.question}
                  answer={block.answer}
                  supportingDetails={block.supporting_details}
                  headingTag={block.heading_tag || 'h3'}
                  categoryBadge={blog.category}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {parsedTags.length > 0 && (
          <div className="pt-6 border-t border-[#202020] flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500 font-mono mr-2">Topics:</span>
            {parsedTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-md bg-[#121212] border border-[#222] text-xs text-neutral-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* E-E-A-T Author & Reviewer Credibility Box */}
        <section className="my-12 p-6 sm:p-8 rounded-2xl bg-[#0B0B0B] border border-[#252525] space-y-5" aria-label="Author Credibility">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center text-[#C7FF4D] shrink-0 font-extrabold text-xl font-mono">
              {blog.author.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-[#C7FF4D] uppercase tracking-wider">
                  Written by
                </span>
                <span className="text-neutral-500">•</span>
                <h4 className="text-base sm:text-lg font-bold text-white">{blog.author}</h4>
                {blog.author_role && (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#181818] border border-[#303030] text-[11px] text-neutral-300">
                    {blog.author_role}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pt-1">
                {blog.author_bio || 'Dawnexus delivers bespoke website design, performance technical SEO, AI video marketing, and digital growth systems for ambitious Indian SMBs and enterprises.'}
              </p>
            </div>
          </div>

          {/* Verification Credentials & Reviewer Details */}
          {(blog.author_credentials || blog.reviewer_name || blog.editorial_notes) && (
            <div className="pt-4 border-t border-[#1C1C1C] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {blog.author_credentials && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <Award className="w-4 h-4 text-[#C7FF4D] shrink-0" />
                  <span><strong>Credentials:</strong> {blog.author_credentials}</span>
                </div>
              )}
              {blog.reviewer_name && (
                <div className="flex items-center gap-2 text-neutral-300">
                  <ShieldCheck className="w-4 h-4 text-[#C7FF4D] shrink-0" />
                  <span><strong>Reviewed by:</strong> {blog.reviewer_name}</span>
                </div>
              )}
              {blog.editorial_notes && (
                <div className="sm:col-span-2 text-neutral-400 text-[11px] font-mono bg-[#111] p-2.5 rounded-lg border border-[#202020]">
                  <strong>Editorial Note:</strong> {blog.editorial_notes}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Contextual Conversion CTA (Version 8.3.0 Core Value Path) */}
        <ContextualCtaBlock
          serviceKey={targetServiceKey}
          mode="inline"
          pageSlug={blog.slug}
        />

        {/* Floating Contextual CTA (Triggered on Scroll/Dwell) */}
        <ContextualCtaBlock
          serviceKey={targetServiceKey}
          mode="floating"
          pageSlug={blog.slug}
          scrollThreshold={50}
          dwellTimeSeconds={25}
        />
      </article>

      {/* Related Articles Section */}
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 border-t border-[#202020]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Related Playbooks in {blog.category}
            </h3>
            <button
              onClick={() => navigateTo('/blog')}
              className="text-xs text-[#C7FF4D] hover:underline flex items-center gap-1 font-semibold"
            >
              <span>View All Articles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map(item => (
              <a
                key={item.id}
                href={`/blog/${item.slug}`}
                onClick={e => {
                  e.preventDefault();
                  navigateTo(`/blog/${item.slug}`);
                }}
                className="group bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D]/40 rounded-2xl p-6 transition flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#C7FF4D]">
                    {item.category}
                  </span>
                  <h4 className="text-base font-bold text-white group-hover:text-[#C7FF4D] transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#A5A5A5] line-clamp-2">
                    {item.excerpt}
                  </p>
                </div>
                <div className="text-xs text-white group-hover:text-[#C7FF4D] flex items-center gap-1 font-semibold pt-2">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};

