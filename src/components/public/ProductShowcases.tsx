import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ExternalLink, 
  MessageSquare, 
  Layers, 
  Clock, 
  CheckCircle2, 
  Compass 
} from 'lucide-react';
import { PRODUCT_SHOWCASES_DATA, ProductShowcaseItem } from '../../data/productShowcases';
import { navigateTo } from '../../utils/navigation';

export const ProductShowcases: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(PRODUCT_SHOWCASES_DATA.map(p => p.category)))];

  const filteredItems = selectedCategory === 'All'
    ? PRODUCT_SHOWCASES_DATA
    : PRODUCT_SHOWCASES_DATA.filter(p => p.category === selectedCategory);

  const handleDiscussClick = (product: ProductShowcaseItem) => {
    navigateTo('/#contact');
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('select-service', { detail: product.inquiryService }));
    }, 150);
  };

  const handleGeneralDiscuss = () => {
    navigateTo('/#contact');
  };

  const getStatusBadge = (status: ProductShowcaseItem['status']) => {
    switch (status) {
      case 'Demo Available':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[#C7FF4D]/15 text-[#C7FF4D] border border-[#C7FF4D]/30 shadow-[0_0_12px_rgba(199,255,77,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D] animate-pulse" />
            <span>Demo Available</span>
          </span>
        );
      case 'In Development':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>In Development</span>
          </span>
        );
      case 'Coming Soon':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
            <Compass className="w-3 h-3" />
            <span>Coming Soon</span>
          </span>
        );
    }
  };

  return (
    <section id="products-showcases" className="py-24 bg-[#080808] border-t border-[#252525] relative overflow-hidden">
      {/* Subtle lighting backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-[#C7FF4D]/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="text-[#C7FF4D] text-xs font-mono font-semibold tracking-widest uppercase mb-3">
            // INNOVATION & DIGITAL CAPABILITIES
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#FFFFFF] tracking-tight leading-tight">
            Our Products &amp; Showcases
          </h2>
          <p className="mt-4 text-[#A5A5A5] text-lg leading-relaxed">
            Explore the interactive digital experiences, smart business tools, and innovative web applications Dawnexus can build to help businesses work smarter, engage customers, and grow.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-[#C7FF4D] text-[#050505] font-bold shadow'
                  : 'bg-[#050505] text-[#A5A5A5] hover:text-white border border-[#252525]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-[#050505] border border-[#252525] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#C7FF4D]/40 transition-all duration-300 group shadow-lg"
            >
              <div>
                {/* Visual Thumbnail */}
                <div className="relative aspect-video bg-[#121212] overflow-hidden border-b border-[#252525]">
                  <img
                    src={item.thumbnailUrl}
                    alt={`${item.name} concept showcase`}
                    loading="lazy"
                    decoding="async"
                    width="1376"
                    height="768"
                    onError={(e) => {
                      // Graceful fallback to dark branded placeholder if load fails
                      const target = e.currentTarget;
                      target.onerror = null;
                      target.src = '/brand/dawnexus-logo-original.webp';
                      target.className = 'w-full h-full object-contain p-8 opacity-40 bg-[#121212]';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Category Pill */}
                  <div className="absolute top-3 left-3 bg-[#050505]/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-mono text-[#A5A5A5] border border-[#252525]">
                    {item.category}
                  </div>

                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white group-hover:text-[#C7FF4D] transition-colors mb-2.5">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[#A5A5A5] leading-relaxed line-clamp-3">
                    {item.shortDescription}
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-6 py-4 bg-[#0B0B0B] border-t border-[#252525] flex items-center justify-between gap-3 text-xs">
                {item.demoUrl ? (
                  <button
                    onClick={() => navigateTo(item.demoUrl!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C7FF4D] text-[#050505] font-bold text-xs hover:bg-[#d4ff70] transition-colors"
                  >
                    <span>Explore Live Demo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="text-[11px] font-mono text-[#737373]">
                    {item.status === 'In Development' ? 'Engineering In Progress' : 'Roadmap Concept'}
                  </span>
                )}

                <button
                  onClick={() => handleDiscussClick(item)}
                  className="text-[#A5A5A5] hover:text-[#C7FF4D] font-medium transition-colors inline-flex items-center gap-1 ml-auto"
                >
                  <span>Discuss Similar</span>
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Section Conversion CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0B0B0B] via-[#0e0e0e] to-[#050505] border border-[#252525] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 max-w-2xl text-center md:text-left">
            <div className="text-xs font-mono text-[#C7FF4D] tracking-widest uppercase">
              // CUSTOM DIGITAL ARCHITECTURE
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Have an Idea for Your Business?
            </h3>
            <p className="text-sm sm:text-base text-[#A5A5A5] leading-relaxed">
              Let&rsquo;s turn your idea into a working digital experience.
            </p>
          </div>

          <button
            onClick={handleGeneralDiscuss}
            className="shrink-0 inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-sm hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
          >
            <span>Discuss Your Project</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
};

