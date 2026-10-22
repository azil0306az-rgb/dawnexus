/**
 * Dawnexus Version 8.3.0 — Contextual CTA & Core Value Path Lead Generation
 * 
 * Guides visitors from educational content to relevant service solutions
 * with privacy-first attribution, scroll/dwell triggers, and accessible controls.
 * 
 * PRIVACY RULES:
 * - Zero third-party tracking cookies
 * - No personal information stored in telemetry events
 * - Clear dismissal and session frequency caps
 */

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, X, Sparkles, Compass } from 'lucide-react';
import { navigateTo } from '../../utils/navigation';
import { tracker } from '../../utils/tracker';

export interface ContextualCtaBlockProps {
  serviceKey: 'website-design' | 'seo-services' | 'ai-video-creation' | 'digital-marketing';
  title?: string;
  headline?: string;
  description?: string;
  buttonText?: string;
  targetUrl?: string;
  scrollThreshold?: number; // e.g. 50 (%)
  dwellTimeSeconds?: number; // e.g. 20 (seconds)
  mode?: 'inline' | 'floating' | 'both';
  pageSlug?: string;
}

const SERVICE_PRESETS: Record<string, {
  title: string;
  headline: string;
  description: string;
  buttonText: string;
  targetUrl: string;
}> = {
  'website-design': {
    title: 'Website Engineering & Redesign',
    headline: 'Planning a high-conversion website redesign in 2026?',
    description: 'Calculate an instant, feature-by-feature cost estimate for your new website with our interactive estimator.',
    buttonText: 'Open Website Cost Calculator',
    targetUrl: '/website-cost-calculator'
  },
  'seo-services': {
    title: 'Technical & Local SEO Services',
    headline: 'Ready to build durable organic search authority?',
    description: 'We audit crawlability, Core Web Vitals, and local Google Business Profile rankings for Coimbatore businesses.',
    buttonText: 'Request Technical SEO Audit',
    targetUrl: '/services/seo-services#contact'
  },
  'ai-video-creation': {
    title: 'High-Velocity AI Video Marketing',
    headline: 'Scale video marketing without studio overhead?',
    description: 'Deploy hyper-realistic digital avatars, multilingual dubbing, and automated product explainers tailored for ROI.',
    buttonText: 'Explore AI Video Packages',
    targetUrl: '/services/ai-video-creation#contact'
  },
  'digital-marketing': {
    title: 'Full-Funnel Performance Marketing',
    headline: 'Looking for predictable demand generation?',
    description: 'Data-driven paid ads, landing page conversion rate optimization, and privacy-first attribution architecture.',
    buttonText: 'Book Strategy Consultation',
    targetUrl: '/services/digital-marketing#contact'
  }
};

export const ContextualCtaBlock: React.FC<ContextualCtaBlockProps> = ({
  serviceKey,
  title,
  headline,
  description,
  buttonText,
  targetUrl,
  scrollThreshold = 50,
  dwellTimeSeconds = 20,
  mode = 'inline',
  pageSlug
}) => {
  const preset = SERVICE_PRESETS[serviceKey] || SERVICE_PRESETS['website-design'];
  const finalTitle = title || preset.title;
  const finalHeadline = headline || preset.headline;
  const finalDescription = description || preset.description;
  const finalButtonText = buttonText || preset.buttonText;
  const finalTargetUrl = targetUrl || preset.targetUrl;

  const [isDismissed, setIsDismissed] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const hasTriggeredEvent = useRef(false);

  const sessionDismissKey = `dawnexus_cta_dismissed_${serviceKey}`;

  useEffect(() => {
    // Check if dismissed in this browser session
    try {
      if (sessionStorage.getItem(sessionDismissKey)) {
        setIsDismissed(true);
        return;
      }
    } catch {}

    // Track Core Value Path: Stage 3 (CTA Displayed) when thresholds met
    const checkTriggers = () => {
      if (hasTriggeredEvent.current || isDismissed) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (scrollPercent >= scrollThreshold) {
        setShowFloating(true);
        triggerCtaDisplayed();
      }
    };

    const triggerCtaDisplayed = () => {
      if (!hasTriggeredEvent.current) {
        hasTriggeredEvent.current = true;
        // Core Value Path: Stage 3 (CTA displayed)
        try {
          tracker.track('cta_displayed', {
            service: serviceKey,
            page_slug: pageSlug || window.location.pathname,
            headline: finalHeadline
          });
        } catch {}
      }
    };

    // Dwell timer
    const dwellTimer = setTimeout(() => {
      if (!isDismissed) {
        setShowFloating(true);
        triggerCtaDisplayed();
      }
    }, dwellTimeSeconds * 1000);

    window.addEventListener('scroll', checkTriggers, { passive: true });
    return () => {
      clearTimeout(dwellTimer);
      window.removeEventListener('scroll', checkTriggers);
    };
  }, [serviceKey, scrollThreshold, dwellTimeSeconds, isDismissed, pageSlug, finalHeadline]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setShowFloating(false);
    try {
      sessionStorage.setItem(sessionDismissKey, '1');
    } catch {}
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Core Value Path: Stage 4 (CTA Clicked)
    try {
      tracker.track('cta_clicked', {
        service: serviceKey,
        target_url: finalTargetUrl,
        page_slug: pageSlug || window.location.pathname
      });
    } catch {}
    navigateTo(finalTargetUrl);
  };

  // Keyboard accessibility for escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showFloating) {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFloating]);

  // Render Inline Mode
  if (mode === 'inline') {
    return (
      <aside
        className="contextual-cta-inline my-12 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#0D0D0D] to-[#141414] border border-[#252525] relative overflow-hidden transition hover:border-[#353535]"
        aria-label={finalTitle}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#C7FF4D]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C7FF4D]/10 text-[#C7FF4D] border border-[#C7FF4D]/30 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{finalTitle}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {finalHeadline}
          </h3>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
            {finalDescription}
          </p>

          <div className="pt-2">
            <a
              href={finalTargetUrl}
              onClick={handleClick}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C7FF4D] text-black font-bold text-sm transition hover:bg-[#d6ff73] shadow-lg shadow-[#C7FF4D]/10 focus:outline-none focus:ring-2 focus:ring-[#C7FF4D]"
            >
              <span>{finalButtonText}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </aside>
    );
  }

  // Render Floating Mode (if triggered and not dismissed)
  if (showFloating && !isDismissed) {
    return (
      <aside
        className="fixed bottom-6 right-6 z-40 max-w-sm sm:max-w-md p-5 rounded-2xl bg-[#0D0D0D]/95 backdrop-blur-xl border border-[#303030] shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-5 duration-300"
        role="complementary"
        aria-label="Recommended next step"
      >
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#202020] transition"
          aria-label="Dismiss recommendation"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-3 pr-6">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#C7FF4D]">
            <Compass className="w-3.5 h-3.5" />
            <span>RECOMMENDED NEXT STEP</span>
          </div>

          <h4 className="text-sm sm:text-base font-bold text-white leading-snug">
            {finalHeadline}
          </h4>

          <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
            {finalDescription}
          </p>

          <div className="pt-1 flex items-center gap-3">
            <a
              href={finalTargetUrl}
              onClick={handleClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#C7FF4D] text-black font-bold text-xs transition hover:bg-[#d6ff73]"
            >
              <span>{finalButtonText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={handleDismiss}
              className="text-xs text-neutral-400 hover:text-white transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      </aside>
    );
  }

  return null;
};
