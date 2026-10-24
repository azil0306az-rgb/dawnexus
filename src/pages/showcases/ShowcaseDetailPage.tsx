import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Share2,
  Star,
  Globe,
  Code2,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Check,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import { usePageSeo } from '../../utils/seo';

export interface ShowcaseDetailRecord {
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
  workflow_steps: Array<{ step: number; title: string; description: string; icon?: string }>;
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

interface ShowcaseDetailPageProps {
  slug?: string;
}

export const ShowcaseDetailPage: React.FC<ShowcaseDetailPageProps> = ({ slug: propSlug }) => {
  const [showcase, setShowcase] = useState<ShowcaseDetailRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract slug
  const currentSlug = propSlug || window.location.pathname.replace(/^\/showcases\//, '').split('?')[0];

  usePageSeo({
    title: showcase ? `${showcase.title} | Products & Showcases | Dawnexus` : 'Showcase | Dawnexus',
    description: showcase ? showcase.description : 'Explore interactive digital solutions and automated systems from Dawnexus.',
    canonicalUrl: `https://www.dawnexus.in/showcases/${currentSlug}`,
    ogImage: showcase?.screenshot_url?.startsWith('http')
      ? showcase.screenshot_url
      : (showcase?.screenshot_url ? `https://www.dawnexus.in${showcase.screenshot_url}` : 'https://www.dawnexus.in/brand/dawnexus-logo-original.png'),
    schema: showcase
      ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: showcase.title,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          description: showcase.description,
          url: `https://www.dawnexus.in/showcases/${showcase.slug}`,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR'
          }
        }
      : undefined
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fetchShowcase = async () => {
      setIsLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`/api/showcases/${currentSlug}`);
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        const data = await res.json();
        if (data.showcase) {
          setShowcase(data.showcase);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShowcase();
  }, [currentSlug]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleInquire = () => {
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('select-service', {
          detail: showcase?.title || 'Custom Development'
        })
      );
    }, 150);
  };

  if (isLoading) {
    return (
      <main className="flex-1 min-h-[60vh] flex flex-col items-center justify-center bg-[#050505] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#C7FF4D] mb-4" />
        <p className="text-sm font-mono text-[#A5A5A5]">Loading showcase details...</p>
      </main>
    );
  }

  if (notFound || !showcase) {
    return (
      <main className="flex-1 min-h-[60vh] flex flex-col items-center justify-center bg-[#050505] text-white px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[#141414] border border-[#252525] flex items-center justify-center text-[#A5A5A5] mb-4">
          <AlertCircle className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2">Showcase Not Found</h1>
        <p className="text-sm text-[#A5A5A5] max-w-md mb-6">
          The showcase you are looking for does not exist or may have been updated.
        </p>
        <button
          onClick={() => navigateTo('/#products-showcases')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-semibold text-sm hover:bg-[#b8f53b] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Showcases</span>
        </button>
      </main>
    );
  }

  const statusColor =
    showcase.status === 'Live'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : showcase.status === 'In Development'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : showcase.status === 'Coming Soon'
      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
      : 'bg-zinc-800 text-zinc-400 border-zinc-700';

  return (
    <main className="flex-1 bg-[#050505] text-white">
      {/* Breadcrumb Navigation */}
      <div className="border-b border-[#1c1c1c] bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs font-mono text-[#888888]">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 truncate">
            <button
              onClick={() => navigateTo('/')}
              className="hover:text-white transition-colors"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#444444]" />
            <button
              onClick={() => navigateTo('/#products-showcases')}
              className="hover:text-white transition-colors"
            >
              Showcases
            </button>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 text-[#444444]" />
            <span className="text-[#C7FF4D] truncate">{showcase.title}</span>
          </nav>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#252525] text-white transition-colors text-xs font-sans"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#C7FF4D]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied' : 'Share'}</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <section className="pt-12 pb-16 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#C7FF4D]/5 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              <span className="px-3 py-1 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] text-xs font-mono font-bold tracking-wide uppercase border border-[#C7FF4D]/25">
                {showcase.category}
              </span>
              {showcase.badge && (
                <span className="px-2.5 py-1 rounded-full bg-[#161616] text-[#A5A5A5] text-xs font-mono border border-[#2a2a2a]">
                  {showcase.badge}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono border ${statusColor}`}>
                {showcase.status}
              </span>
              {showcase.is_featured && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C7FF4D] text-[#050505] text-xs font-bold font-mono">
                  <Star className="w-3 h-3 fill-current" />
                  Featured
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] mb-4">
              {showcase.title}
            </h1>

            {showcase.subtitle && (
              <p className="text-lg sm:text-xl text-[#A5A5A5] font-medium leading-relaxed mb-6">
                {showcase.subtitle}
              </p>
            )}

            <p className="text-base text-[#CCCCCC] leading-relaxed mb-8">
              {showcase.description}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4">
              {showcase.demo_url ? (
                <a
                  href={showcase.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#b8f53b] transition-all shadow-lg shadow-[#C7FF4D]/10"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Live Interactive Demo</span>
                  <ExternalLink className="w-4 h-4 ml-0.5" />
                </a>
              ) : showcase.website_url ? (
                <a
                  href={showcase.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#b8f53b] transition-all shadow-lg shadow-[#C7FF4D]/10"
                >
                  <Globe className="w-4 h-4" />
                  <span>Visit Production Site</span>
                  <ExternalLink className="w-4 h-4 ml-0.5" />
                </a>
              ) : null}

              {showcase.client_inquiry_enabled && (
                <button
                  onClick={handleInquire}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#141414] hover:bg-[#1c1c1c] text-white border border-[#282828] font-semibold text-sm transition-colors"
                >
                  <MessageSquare className="w-4 h-4 text-[#C7FF4D]" />
                  <span>Request Custom Build</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase Visual Hero / Screenshot */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl sm:rounded-3xl bg-[#0a0a0a] border border-[#252525] p-3 sm:p-5 shadow-2xl relative overflow-hidden group">
            <div className="aspect-[16/9] sm:aspect-[16/9] rounded-xl sm:rounded-2xl overflow-hidden bg-[#121212] relative border border-[#202020]">
              {showcase.screenshot_url ? (
                <img
                  src={showcase.screenshot_url}
                  alt={`${showcase.title} hero interface`}
                  className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#555555]">
                  <Layers className="w-16 h-16 opacity-30" />
                </div>
              )}

              {/* Status Overlay Badge */}
              <div className="absolute top-4 right-4 bg-[#050505]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#252525] text-xs font-mono">
                {showcase.status === 'Live' ? (
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Verified Live
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {showcase.estimated_launch_date ? `Target: ${showcase.estimated_launch_date}` : 'Under Development'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid: In-depth Details + Workflow + Specs */}
      <section className="py-12 border-t border-[#1a1a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Left 8 Cols: Features, Workflow, Long Description */}
            <div className="lg:col-span-8 space-y-12">
              {/* Features & Key Capabilities */}
              {showcase.features && showcase.features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C7FF4D] uppercase tracking-widest mb-3">
                    // ARCHITECTURAL CAPABILITIES
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
                    Core Engineering Highlights
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {showcase.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-[#0c0c0c] border border-[#222222] hover:border-[#333333] transition-colors flex items-start gap-3.5"
                      >
                        <div className="p-1.5 rounded-lg bg-[#C7FF4D]/10 text-[#C7FF4D] flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-[#DDDDDD] font-medium leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Workflow Sequence */}
              {showcase.workflow_steps && showcase.workflow_steps.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C7FF4D] uppercase tracking-widest mb-3">
                    // STEP-BY-STEP OPERATION
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-6">
                    System Workflow Sequence
                  </h2>

                  <div className="space-y-4">
                    {showcase.workflow_steps.map((ws, wIdx) => (
                      <div
                        key={wIdx}
                        className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#222222] hover:border-[#383838] transition-all flex items-start gap-5 relative overflow-hidden"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#2a2a2a] text-[#C7FF4D] font-mono font-extrabold flex items-center justify-center flex-shrink-0 text-base shadow-sm">
                          {ws.step || wIdx + 1}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white mb-1">
                            {ws.title}
                          </h3>
                          <p className="text-sm text-[#A5A5A5] leading-relaxed">
                            {ws.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Long Description / Markdown narrative */}
              {showcase.long_description && (
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#C7FF4D] uppercase tracking-widest mb-3">
                    // SPECIFICATION & OVERVIEW
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                    Deep Dive &amp; Business Value
                  </h2>
                  <div className="prose prose-invert max-w-none text-base text-[#A5A5A5] leading-relaxed space-y-4">
                    {showcase.long_description.split('\n\n').map((paragraph, pIdx) => (
                      <p key={pIdx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 Cols: Technical Metadata & Inquiry Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              {/* Technology Stack Card */}
              <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#222222]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#C7FF4D]" />
                  <span>Tech Stack</span>
                </h3>

                <div className="flex flex-wrap gap-2">
                  {showcase.tech_stack && showcase.tech_stack.length > 0 ? (
                    showcase.tech_stack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#282828] text-xs font-mono text-[#DDDDDD]"
                      >
                        {tech}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[#666666]">Standard Dawnexus Web Stack</span>
                  )}
                </div>
              </div>

              {/* System Metadata Card */}
              <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-[#222222] space-y-4 text-xs font-mono">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 font-sans flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C7FF4D]" />
                  <span>Product Metadata</span>
                </h3>

                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <span className="text-[#888888]">Category</span>
                  <span className="text-white font-medium">{showcase.category}</span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                  <span className="text-[#888888]">Development Status</span>
                  <span className="text-white font-medium">{showcase.status}</span>
                </div>

                {showcase.estimated_launch_date && (
                  <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                    <span className="text-[#888888]">Launch Date</span>
                    <span className="text-white font-medium">{showcase.estimated_launch_date}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#888888]">Security Verification</span>
                  <span className="text-emerald-400 font-medium">SSRF Checked</span>
                </div>
              </div>

              {/* Conversion Inquiry Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#070707] border border-[#C7FF4D]/20 shadow-xl">
                <span className="text-[11px] font-mono text-[#C7FF4D] font-bold uppercase tracking-wider block mb-1">
                  CUSTOM IMPLEMENTATION
                </span>
                <h4 className="text-lg font-bold text-white mb-2">
                  Need a similar system for your business?
                </h4>
                <p className="text-xs text-[#A5A5A5] leading-relaxed mb-5">
                  We engineer tailor-made digital tools, custom booking automation, and high-conversion web applications built to your exact specifications.
                </p>

                <button
                  onClick={handleInquire}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-xs hover:bg-[#b8f53b] transition-all shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Discuss Your Requirements</span>
                </button>
              </div>

              {/* Back to Showcases Button */}
              <button
                onClick={() => navigateTo('/#products-showcases')}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#101010] hover:bg-[#181818] text-[#A5A5A5] hover:text-white border border-[#222222] transition-colors text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to All Showcases</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};