import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export const Hero: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="hero" className="relative min-h-[92vh] flex items-center justify-center pt-28 pb-20 overflow-hidden bg-grid-pattern">
      {/* Restrained decorative lighting gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-[#C7FF4D]/5 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline and CTAs */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0B0B0B] border border-[#252525] text-xs font-semibold tracking-wider text-[#C7FF4D] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C7FF4D] animate-pulse" />
              <span>DIGITAL GROWTH, REIMAGINED.</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#FFFFFF] tracking-tight leading-[1.1]">
              Your next stage of <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[#A5A5A5]">
                growth starts here.
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-[#A5A5A5] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              We build powerful websites, create AI-driven video content, manage smarter advertising, and optimize your search presence to help your business move forward.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={() => scrollTo('contact')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-[#C7FF4D] text-[#050505] font-bold text-base hover:bg-[#d4ff70] active:scale-[0.98] transition-all glow-lime-hover shadow-lg"
              >
                <span>Let's Build Something</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => scrollTo('services')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-[#0B0B0B] text-[#FFFFFF] hover:text-[#C7FF4D] font-medium text-base border border-[#252525] hover:border-[#C7FF4D]/40 transition-all"
              >
                <span>Explore Our Services</span>
              </button>
            </div>

            {/* Agency Core Highlights */}
            <div className="pt-8 border-t border-[#252525]/80 grid grid-cols-3 gap-4 text-left">
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">AI + Human</div>
                <div className="text-xs text-[#A5A5A5] mt-1">Smarter Production Workflows</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white tracking-tight">Strategy</div>
                <div className="text-xs text-[#A5A5A5] mt-1">ROI & Conversion Focused</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#C7FF4D] tracking-tight">End-to-End</div>
                <div className="text-xs text-[#A5A5A5] mt-1">Web, Video, SEO & Ads</div>
              </div>
            </div>
          </div>

          {/* Right Column: Restrained Geometric Visual with D Symbol */}
          <div className="lg:col-span-5 flex justify-center items-center">
            <div className="relative w-full max-w-[420px] aspect-square rounded-2xl bg-gradient-to-br from-[#0B0B0B] via-[#080808] to-[#050505] border border-[#252525] p-8 flex flex-col justify-between overflow-hidden shadow-2xl group">
              {/* Subtle accent corner glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#C7FF4D]/10 blur-2xl rounded-full" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#C7FF4D]/5 blur-2xl rounded-full" />
              
              {/* Top tag */}
              <div className="flex items-center justify-between text-xs text-[#A5A5A5] font-mono border-b border-[#252525] pb-4">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C7FF4D]" />
                  <span>DAWNEXUS INTELLIGENCE</span>
                </span>
                <span className="text-[#C7FF4D] font-bold">SYSTEM ACTIVE</span>
              </div>

              {/* Center D Icon Showcase */}
              <div className="my-auto py-6 flex flex-col items-center justify-center relative">
                <div className="relative p-6 rounded-2xl bg-[#050505]/80 border border-[#252525] glow-lime-subtle transition-transform duration-500 group-hover:scale-105">
                  <picture>
                    <source srcSet="/brand/dawnexus-d-symbol.webp" type="image/webp" />
                    <img
                      src="/brand/dawnexus-d-symbol.png"
                      alt="Dawnexus D Symbol"
                      width="144"
                      height="144"
                      fetchPriority="high"
                      decoding="async"
                      className="w-36 h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                    />
                  </picture>
                </div>
              </div>

              {/* Bottom Metrics Pill */}
              <div className="bg-[#0B0B0B]/90 border border-[#252525] rounded-xl p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[#A5A5A5] block">Execution Architecture</span>
                  <span className="text-white font-medium">Digital Marketing & Creative</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#C7FF4D]" />
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

