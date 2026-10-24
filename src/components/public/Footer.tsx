import React, { useState, useEffect } from 'react';
import { ArrowUp, Phone, Mail, MapPin } from 'lucide-react';
import { InstagramIcon, FacebookIcon, LinkedInIcon } from '../common/BrandSocialIcons';
import { navigateTo } from '../../utils/navigation';

export interface ContactSettingsState {
  phone: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  address?: string;
}

const DEFAULT_CONTACT: ContactSettingsState = {
  phone: '+91 95669 88995',
  email: 'contact@dawnexus.in',
  instagram_url: 'https://www.instagram.com/dawnexus',
  facebook_url: 'https://www.facebook.com/dawnexus',
  linkedin_url: 'https://www.linkedin.com/company/dawnexus',
  address: 'Coimbatore, Tamil Nadu, India'
};

export const Footer: React.FC = () => {
  const [contact, setContact] = useState<ContactSettingsState>(DEFAULT_CONTACT);

  useEffect(() => {
    let isMounted = true;
    const fetchContactSettings = async () => {
      try {
        const res = await fetch('/api/contact-settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings && isMounted) {
            setContact({
              phone: data.settings.phone || DEFAULT_CONTACT.phone,
              email: data.settings.email || DEFAULT_CONTACT.email,
              instagram_url: data.settings.instagram_url || DEFAULT_CONTACT.instagram_url,
              facebook_url: data.settings.facebook_url || DEFAULT_CONTACT.facebook_url,
              linkedin_url: data.settings.linkedin_url || DEFAULT_CONTACT.linkedin_url,
              address: data.settings.address !== undefined ? data.settings.address : DEFAULT_CONTACT.address
            });
          }
        }
      } catch {
        // Graceful fallback to static defaults
      }
    };

    fetchContactSettings();
    return () => {
      isMounted = false;
    };
  }, []);

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#252525]">
          
          {/* Brand Info (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <picture>
              <source srcSet="/brand/dawnexus-horizontal.webp" type="image/webp" />
              <img
                src="/brand/dawnexus-horizontal.png"
                alt="Dawnexus Logo"
                width="160"
                height="32"
                loading="lazy"
                decoding="async"
                className="h-8 w-auto object-contain"
              />
            </picture>
            <p className="text-sm text-[#A5A5A5] max-w-sm leading-relaxed">
              Modern digital marketing and AI-powered creative agency helping ambitious businesses engineer their next stage of digital growth.
            </p>
            <div className="pt-2 text-xs font-mono text-[#A5A5A5]">
              <span className="inline-block w-2 h-2 rounded-full bg-[#C7FF4D] mr-2" />
              <span>Available for new projects & retainers</span>
            </div>
          </div>

          {/* Quick Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
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

          {/* Core Services (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
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

          {/* Direct Contact & Social (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#FFFFFF] font-bold">
              Get in Touch
            </h4>
            
            <ul className="space-y-2.5 text-sm text-[#A5A5A5]">
              {/* Phone */}
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-2.5 hover:text-[#C7FF4D] transition-colors group"
                >
                  <span className="p-1.5 rounded-lg bg-[#0E0E0E] border border-[#252525] group-hover:border-[#C7FF4D]/40 text-[#C7FF4D] transition-colors shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </span>
                  <span className="font-mono text-xs text-white group-hover:text-[#C7FF4D]">{contact.phone}</span>
                </a>
              </li>

              {/* Email */}
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2.5 hover:text-[#C7FF4D] transition-colors group"
                >
                  <span className="p-1.5 rounded-lg bg-[#0E0E0E] border border-[#252525] group-hover:border-[#C7FF4D]/40 text-[#C7FF4D] transition-colors shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs text-white group-hover:text-[#C7FF4D] truncate">{contact.email}</span>
                </a>
              </li>

              {/* Address (Optional) */}
              {contact.address && contact.address.trim() && (
                <li className="flex items-start gap-2.5 pt-1">
                  <span className="p-1.5 rounded-lg bg-[#0E0E0E] border border-[#252525] text-[#C7FF4D] shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs text-[#888] leading-relaxed whitespace-pre-line">
                    {contact.address}
                  </span>
                </li>
              )}
            </ul>

            {/* Dedicated Social Channel Icons */}
            <div className="pt-2">
              <div className="text-[11px] font-mono uppercase text-[#777] mb-2">Connect:</div>
              <div className="flex items-center gap-2.5">
                {/* Instagram */}
                <a
                  href={contact.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Dawnexus on Instagram"
                  className="w-8 h-8 rounded-lg bg-[#0E0E0E] border border-[#252525] hover:border-[#C7FF4D] hover:bg-[#141414] text-[#A5A5A5] hover:text-[#C7FF4D] flex items-center justify-center transition-all group"
                >
                  <InstagramIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

                {/* Facebook */}
                <a
                  href={contact.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Dawnexus on Facebook"
                  className="w-8 h-8 rounded-lg bg-[#0E0E0E] border border-[#252525] hover:border-[#C7FF4D] hover:bg-[#141414] text-[#A5A5A5] hover:text-[#C7FF4D] flex items-center justify-center transition-all group"
                >
                  <FacebookIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>

                {/* LinkedIn */}
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Dawnexus on LinkedIn"
                  className="w-8 h-8 rounded-lg bg-[#0E0E0E] border border-[#252525] hover:border-[#C7FF4D] hover:bg-[#141414] text-[#A5A5A5] hover:text-[#C7FF4D] flex items-center justify-center transition-all group"
                >
                  <LinkedInIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </a>
              </div>
            </div>

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
              className="p-2 rounded-lg bg-[#0B0B0B] border border-[#252525] hover:border-[#C7FF4D] hover:text-white transition-colors cursor-pointer"
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
