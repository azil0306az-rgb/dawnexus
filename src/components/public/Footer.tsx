import React from 'react';
import { ArrowUp } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPrivacy = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-privacy-modal'));
  };

  return (
    <footer className="bg-[#050505] border-t border-[#252525] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-12 border-b border-[#252525]">
          
          {/* Brand Info */}
          <div className="lg:col-span-5 space-y-4">
            <img
              src="/brand/dawnexus-horizontal.png"
              alt="Dawnexus Logo"
              className="h-8 w-auto object-contain"
            />
            <p className="text-sm text-[#A5A5A5] max-w-sm leading-relaxed">
              Modern digital marketing and AI-powered creative agency helping ambitious businesses engineer their next stage of digital growth.
            </p>
            <div className="pt-2 text-xs font-mono text-[#A5A5A5]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C7FF4D] mr-2" />
              <span>Available for new projects & retainers</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
              Navigation
            </h4>
            <ul className="space-y-2 text-sm text-[#A5A5A5]">
              <li>
                <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }} className="hover:text-[#C7FF4D] transition-colors">Home</a>
              </li>
              <li>
                <a href="/#services" onClick={(e) => { e.preventDefault(); navigateTo('/#services'); }} className="hover:text-[#C7FF4D] transition-colors">Services</a>
              </li>
              <li>
                <a href="/blog" onClick={(e) => { e.preventDefault(); navigateTo('/blog'); }} className="hover:text-[#C7FF4D] transition-colors">Blog & Insights</a>
              </li>
              <li>
                <a href="/#work" onClick={(e) => { e.preventDefault(); navigateTo('/#work'); }} className="hover:text-[#C7FF4D] transition-colors">Selected Work</a>
              </li>
              <li>
                <a href="/#contact" onClick={(e) => { e.preventDefault(); navigateTo('/#contact'); }} className="hover:text-[#C7FF4D] transition-colors">Contact</a>
              </li>
            </ul>
          </div>

          {/* Core Services */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
              Capabilities
            </h4>
            <ul className="space-y-2 text-sm text-[#A5A5A5]">
              <li>
                <a href="/services/website-design" onClick={(e) => { e.preventDefault(); navigateTo('/services/website-design'); }} className="hover:text-[#C7FF4D] transition-colors">
                  Website Design & Development
                </a>
              </li>
              <li>
                <a href="/services/seo-services" onClick={(e) => { e.preventDefault(); navigateTo('/services/seo-services'); }} className="hover:text-[#C7FF4D] transition-colors">
                  Search Engine Optimization (SEO)
                </a>
              </li>
              <li>
                <a href="/services/ai-video-creation" onClick={(e) => { e.preventDefault(); navigateTo('/services/ai-video-creation'); }} className="hover:text-[#C7FF4D] transition-colors">
                  AI Video Creation
                </a>
              </li>
              <li>
                <a href="/services/digital-marketing" onClick={(e) => { e.preventDefault(); navigateTo('/services/digital-marketing'); }} className="hover:text-[#C7FF4D] transition-colors">
                  Performance Digital Marketing
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#A5A5A5]">
          <div>
            &copy; {new Date().getFullYear()} Dawnexus. All rights reserved.
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#privacy"
              onClick={openPrivacy}
              className="hover:text-[#C7FF4D] transition-colors"
            >
              Privacy Policy
            </a>

            <button
              onClick={scrollToTop}
              className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D] hover:text-white transition-colors"
              aria-label="Scroll to Top"
            >
              <ArrowUp className="w-3.5 h-3.5 text-[#C7FF4D]" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
};

